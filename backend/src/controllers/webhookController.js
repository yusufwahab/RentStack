import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { verifyWebhookSignature, extractIncomingTransfer } from "../services/nombaService.js";
import { processIncomingTransfer } from "../services/reconciliationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// POST /api/webhooks/nomba
//
// This is the one route Nomba itself calls — it carries no landlord
// session, so it sits outside requireAuth entirely (see routes/index.js).
// Every request is logged to webhook_events first, signature-verified
// or not, so nothing is ever silently dropped.
export const receiveNombaWebhook = asyncHandler(async (req, res) => {
  const payload = req.body;
  const signatureValid = verifyWebhookSignature(req.headers, payload);

  // If we can't even write the audit log, something is badly wrong with
  // the DB connection — log locally and still respond, rather than crash
  // on a null `eventRow` below (a real 500 here would make Nomba retry
  // forever for what's actually a "our DB is down" situation).
  const { data: eventRow, error: logError } = await supabaseAdmin
    .from("webhook_events")
    .insert({
      event_type: payload?.event_type || null,
      request_id: payload?.requestId || null,
      payload,
      signature_valid: signatureValid,
    })
    .select()
    .single();
  if (logError) {
    // eslint-disable-next-line no-console
    console.error("Failed to write webhook_events row:", logError.message);
  }

  if (!signatureValid) {
    // Respond 401 so this doesn't look like a processed success in
    // Nomba's delivery logs, without leaking why to a potential attacker.
    return res.status(401).json({ error: "Invalid signature." });
  }

  async function markProcessed(fields) {
    if (!eventRow) return; // audit log write failed above — nothing to update
    await supabaseAdmin.from("webhook_events").update(fields).eq("id", eventRow.id);
  }

  // We only reconcile payment_success today. The other five event types
  // (payout_success, payment_failed, payment_reversal, payout_failed,
  // payout_refund) are logged above for audit but not acted on yet —
  // add handling here as those flows become relevant.
  if (payload.event_type !== "payment_success") {
    await markProcessed({ processed: true });
    return res.status(200).json({ received: true, acted: false });
  }

  try {
    const transfer = extractIncomingTransfer(payload);
    const result = await processIncomingTransfer(transfer);
    await markProcessed({ processed: true });
    res.status(200).json({ received: true, ...result });
  } catch (err) {
    await markProcessed({ processing_error: err.message });
    // Still 200 — we've recorded the event and the failure. Returning a
    // non-2XX here would make Nomba retry indefinitely for what's usually
    // a bug on our side (e.g. the field-name mismatch flagged in
    // nombaService.js), not a transient failure worth retrying.
    res.status(200).json({ received: true, processed: false, error: err.message });
  }
});
