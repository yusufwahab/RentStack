import crypto from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

// ─────────────────────────────────────────────────────────────────────────
// Nomba API client.
//
// Endpoints/payload shapes below are taken directly from Nomba's published
// docs at developer.nomba.com (fetched while building this file), NOT
// guessed:
//   Auth              POST /v1/auth/token/issue                       (accountId header = PARENT)
//   Create VA         POST /v1/accounts/virtual/{subAccountId}        (accountId header = PARENT)
//   Bank codes        GET  /v1/transfers/banks                       (accountId header = PARENT)
//   Bank lookup       POST /v1/transfers/bank/lookup                 (accountId header = PARENT)
//   Bank transfer     POST /v2/transfers/bank/{subAccountId}          (accountId header = PARENT)
//   Webhook signature: HMAC-SHA256 over
//     event_type:requestId:userId:walletId:transactionId:type:time:responseCode:timestamp
//
// RentStack's Nomba credentials are a SUB-ACCOUNT under a parent business
// account. Nomba's docs confirm the `accountId` header is *always* the
// parent account id, on every call including sub-account-scoped ones — the
// sub-account id instead goes in the URL path, only on the two endpoints
// that move/collect money (virtual account creation, bank transfer). Bank
// codes/lookup are read-only reference data and stay parent-scoped.
// NOTE: Nomba's docs state "Sub-account transfers must be enabled by Nomba
// before use" — if `transferToBank` 403s, that's likely why; ask Nomba to
// enable it for your sub-account.
//
// ONE THING IS NOT CONFIRMED: the exact field names inside the `data`
// object of a `payment_success` webhook for a *virtual account credit*
// specifically (amount / sender bank / sender account name / which
// virtual account was credited). Nomba's docs confirm `accountRef` is
// the intended reconciliation key but don't publish a full example
// payload for this event. `extractIncomingTransfer()` below is written
// defensively (tries several plausible field names) — before going live,
// trigger one real test transfer in the Nomba sandbox, log
// `req.body` in the webhook route, and adjust the field list to match
// exactly what you see. See backend/README.md.
// ─────────────────────────────────────────────────────────────────────────

let cachedToken = null; // { accessToken, expiresAt: number(ms) }
let cachedBankCodes = null; // Nomba says these "rarely change"

function baseHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    accountId: env.nomba.parentAccountId,
    "Content-Type": "application/json",
  };
}

async function requestJson(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.code === "01") {
    const message = body?.description || body?.message || `Nomba request failed (${res.status})`;
    throw ApiError.internal(`Nomba: ${message}`);
  }
  return body;
}

// --- Auth ---------------------------------------------------------------

export async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const body = await requestJson(`${env.nomba.baseUrl}/v1/auth/token/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accountId: env.nomba.parentAccountId },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.nomba.clientId,
      client_secret: env.nomba.clientSecret,
    }),
  });

  const { access_token: accessToken, expiresAt } = body.data;
  cachedToken = { accessToken, expiresAt: new Date(expiresAt).getTime() };
  return accessToken;
}

// --- Virtual accounts -----------------------------------------------------

// `accountRef` must be 16-64 chars and unique — callers should pass
// something derived from the tenant's own id, e.g. `rentstack-<tenant.id>`.
export async function createVirtualAccount({ accountRef, accountName, bvn, expiryDate, expectedAmount }) {
  if (!accountRef || accountRef.length < 16 || accountRef.length > 64) {
    throw ApiError.badRequest("accountRef must be 16-64 characters.");
  }
  if (!accountName || accountName.length < 8) {
    throw ApiError.badRequest("accountName must be at least 8 characters (Nomba requirement).");
  }

  const accessToken = await getAccessToken();
  const body = await requestJson(`${env.nomba.baseUrl}/v1/accounts/virtual/${env.nomba.subAccountId}`, {
    method: "POST",
    headers: baseHeaders(accessToken),
    body: JSON.stringify({ accountRef, accountName, bvn, expiryDate, expectedAmount }),
  });

  // Real Nomba virtual accounts are issued under Nomba's own microfinance
  // bank ("Nombank MFB"), not the tenant's own bank — expect bankName to
  // always be that, not "Wema Bank"/"Sterling Bank" as the frontend mock
  // data currently shows.
  return {
    accountRef: body.data.accountRef,
    accountName: body.data.accountName,
    bankName: body.data.bankName,
    accountNumber: body.data.bankAccountNumber,
    accountHolderId: body.data.accountHolderId,
  };
}

// --- Bank lookups / transfers (used for returning misdirected payments) --

export async function fetchBankCodes() {
  if (cachedBankCodes) return cachedBankCodes;
  const accessToken = await getAccessToken();
  const body = await requestJson(`${env.nomba.baseUrl}/v1/transfers/banks`, {
    method: "GET",
    headers: baseHeaders(accessToken),
  });
  cachedBankCodes = body.data.results;
  return cachedBankCodes;
}

export async function lookupBankAccount({ accountNumber, bankCode }) {
  const accessToken = await getAccessToken();
  const body = await requestJson(`${env.nomba.baseUrl}/v1/transfers/bank/lookup`, {
    method: "POST",
    headers: baseHeaders(accessToken),
    body: JSON.stringify({ accountNumber, bankCode }),
  });
  return body.data; // { accountNumber, accountName }
}

// Sends money back out — used when a landlord chooses to return a
// misdirected payment to whoever sent it, rather than assign it to a
// tenant. Requires the original sender's bank code + account number,
// which we assume the webhook payload carries (see the same caveat as
// extractIncomingTransfer below).
export async function transferToBank({ amount, accountNumber, bankCode, accountName, merchantTxRef, narration }) {
  const accessToken = await getAccessToken();
  const body = await requestJson(`${env.nomba.baseUrl}/v2/transfers/bank/${env.nomba.subAccountId}`, {
    method: "POST",
    headers: { ...baseHeaders(accessToken), "X-Idempotent-key": crypto.randomUUID() },
    body: JSON.stringify({
      amount,
      accountNumber,
      bankCode,
      accountName,
      merchantTxRef,
      narration: narration || "RentStack misdirected payment return",
    }),
  });
  return body.data;
}

// --- Webhooks -------------------------------------------------------------

// Confirmed signing scheme from developer.nomba.com/docs/api-basics/webhook:
// HMAC-SHA256(secret, "event_type:requestId:userId:walletId:transactionId:type:time:responseCode:timestamp"),
// base64-encoded, compared against the `nomba-signature` header.
// `timestamp` in the signed string is the raw value of the `nomba-timestamp` header.
export function verifyWebhookSignature(headers, payload) {
  if (env.allowUnsignedWebhooks) return true; // dev-only escape hatch, see .env.example

  const signature = headers["nomba-signature"];
  const timestamp = headers["nomba-timestamp"];
  if (!signature || !timestamp || !env.nomba.webhookSecret) return false;

  const data = payload?.data || {};
  const signingString = [
    payload.event_type,
    payload.requestId,
    data.userId,
    data.walletId,
    data.transactionId,
    data.type,
    data.time,
    data.responseCode,
    timestamp,
  ].join(":");

  const expected = crypto.createHmac("sha256", env.nomba.webhookSecret).update(signingString).digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Pulls the fields reconciliationService needs out of a payment_success
// webhook body. See the big comment at the top of this file — the exact
// field names for a virtual-account credit are NOT confirmed from docs
// alone, so this tries several plausible shapes. Log `payload.data` on
// your first real sandbox transfer and tighten this up.
export function extractIncomingTransfer(payload) {
  const data = payload?.data || {};
  return {
    accountRef: data.accountRef || data.virtualAccountRef || data.merchantAccountRef || null,
    amount: Number(data.amount ?? data.transactionAmount ?? 0),
    reference: data.transactionId || data.reference || payload.requestId,
    senderBank: data.senderBankName || data.originatorBankName || data.senderBank || null,
    senderAccountName: data.senderAccountName || data.originatorAccountName || data.senderName || null,
    senderAccountNumber: data.senderAccountNumber || data.originatorAccountNumber || null,
    occurredAt: data.time || data.transactionDate || new Date().toISOString(),
  };
}
