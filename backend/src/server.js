import cron from "node-cron";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { runRentReminders, runLeaseRenewalReminders } from "./services/reminderService.js";

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`RentStack API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

// Daily rent-reminder sweep across every landlord's tenants, 8am server
// time. Reminders are also dedup'd inside runRentReminders itself, so a
// missed/late tick (e.g. the host was asleep) just catches up safely
// rather than double-sending. See dashboardController.sendReminders for
// the manual "Send Reminders Now" trigger used in demos/tests.
cron.schedule("0 8 * * *", () => {
  runRentReminders().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Rent reminder sweep failed:", err);
  });
  runLeaseRenewalReminders().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Lease renewal reminder sweep failed:", err);
  });
});
