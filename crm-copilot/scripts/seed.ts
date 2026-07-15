import { config } from "dotenv";
import { resolve } from "path";
import { createServiceRoleClient } from "../lib/supabase/server";

// Load .env.local from project root (crm-copilot/)
config({ path: resolve(process.cwd(), ".env.local") });

const KB_ARTICLES = [
  {
    title: "Resetting your password",
    content:
      "Go to the login page and click Forgot password. Enter your account email and check your inbox (and spam) for a reset link valid for 24 hours. If you use SSO, contact your workspace admin — password resets must happen through your identity provider.",
  },
  {
    title: "Billing and subscription changes",
    content:
      "Workspace owners can open Settings → Billing to view invoices, update payment methods, or change plans. Downgrades take effect at the end of the current billing cycle. For failed payments, retry the card in Billing or email billing@example.com with your workspace ID.",
  },
  {
    title: "Connecting Slack integration",
    content:
      "In Settings → Integrations → Slack, click Connect and approve the OAuth scopes. Choose which channel receives ticket notifications. If messages stop, disconnect and reconnect Slack, then verify the bot is still invited to the channel.",
  },
  {
    title: "Exporting customer data (CSV)",
    content:
      "Open Reports → Export, pick Contacts or Deals, select a date range, and click Export CSV. Large exports (>50k rows) are emailed when ready. Required role: Admin or Export permission enabled on your profile.",
  },
  {
    title: "API rate limits and authentication",
    content:
      "API keys are created under Settings → Developer. Free tier: 100 requests/minute. Send Authorization: Bearer YOUR_API_KEY on every request. On HTTP 429, wait for the Retry-After header seconds before retrying. Rotate compromised keys immediately.",
  },
];

const TICKETS = [
  {
    subject: "Cannot log in after password reset",
    body: "Hi, I reset my password yesterday but every time I try to sign in I get 'Invalid credentials'. I'm sure I'm using the new password. Account email: jane@acme.io. Can you help?",
    status: "open",
  },
  {
    subject: "Invoice shows wrong plan amount",
    body: "Our March invoice charged $199 instead of $99 (Pro plan). We never upgraded. Workspace: acme-sales. Please correct the invoice or explain the charge.",
    status: "open",
  },
  {
    subject: "Slack notifications stopped working",
    body: "We connected Slack last month and it worked fine. Since Monday, new tickets no longer appear in #support-alerts. Nothing changed on our side. Can you check the integration?",
    status: "in_progress",
  },
  {
    subject: "How do I export all contacts to CSV?",
    body: "I need a full export of contacts created in Q1 for a marketing campaign. I looked in Settings but couldn't find export. Where is this feature?",
    status: "open",
  },
  {
    subject: "API returning 429 Too Many Requests",
    body: "Our nightly sync job started failing with 429 errors around 2am UTC. We send roughly 120 requests per minute. Is there a way to increase limits or should we batch differently?",
    status: "open",
  },
  {
    subject: "Duplicate contacts after CSV import",
    body: "Imported 2,000 contacts from a CSV and now many appear twice with slightly different emails. Is there a dedupe tool or rollback for the import?",
    status: "in_progress",
  },
  {
    subject: "Request to cancel subscription",
    body: "Please cancel our subscription at the end of this billing period. Workspace ID: ws_8842. We are moving to another CRM. Confirm cancellation by email.",
    status: "open",
  },
  {
    subject: "Mobile app crashes on ticket view",
    body: "On iOS 18, opening any ticket from the list crashes the app immediately. Android works fine. Version 3.4.1. Reinstall did not help.",
    status: "open",
  },
  {
    subject: "Need SSO with Okta",
    body: "Our security team requires Okta SAML SSO before we can roll out to 200 reps. Do you support Okta and what metadata do you need from us?",
    status: "in_progress",
  },
  {
    subject: "Webhook not firing on deal won",
    body: "We configured a webhook for deal.won events to our endpoint https://hooks.acme.io/crm but nothing arrives when we close deals in the UI. The URL works in Postman.",
    status: "open",
  },
  {
    subject: "User cannot access Reports tab",
    body: "New hire Sarah (sarah@acme.io) has Member role but says Reports is greyed out. She needs read-only access to pipeline reports. How do we fix permissions?",
    status: "resolved",
  },
  {
    subject: "Timezone wrong on activity timeline",
    body: "All activities show UTC but our team is in US/Eastern. Profile timezone is set correctly to America/New_York. Is this a known bug?",
    status: "open",
  },
  {
    subject: "Refund for accidental annual charge",
    body: "We meant to stay on monthly billing but accidentally switched to annual yesterday. Can you refund the difference and move us back to monthly?",
    status: "open",
  },
  {
    subject: "GDPR data deletion request",
    body: "Customer contact ID cnt_99281 requested full deletion under GDPR. What is the process to purge their data and get confirmation?",
    status: "in_progress",
  },
  {
    subject: "Custom field not showing on deal form",
    body: "I added a custom field 'Contract value' for Deals but it doesn't appear when reps create a new deal. It shows on existing records only.",
    status: "resolved",
  },
];

async function main() {
  const force = process.argv.includes("--force");
  const supabase = createServiceRoleClient();

  const { count: ticketCount, error: countError } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Could not read tickets table: ${countError.message}`);
  }

  if ((ticketCount ?? 0) > 0 && !force) {
    console.log(
      `Skipping seed: ${ticketCount} ticket(s) already exist. Run with --force to wipe and reseed.`,
    );
    return;
  }

  if (force) {
    console.log("Clearing existing tickets and kb_articles...");
    const { error: deleteTicketsError } = await supabase
      .from("tickets")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: deleteKbError } = await supabase
      .from("kb_articles")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteTicketsError) throw deleteTicketsError;
    if (deleteKbError) throw deleteKbError;
  }

  console.log(`Inserting ${KB_ARTICLES.length} KB articles...`);
  const { error: kbError } = await supabase.from("kb_articles").insert(KB_ARTICLES);
  if (kbError) throw kbError;

  console.log(`Inserting ${TICKETS.length} tickets...`);
  const { error: ticketError } = await supabase.from("tickets").insert(TICKETS);
  if (ticketError) throw ticketError;

  console.log("Seed complete.");
  console.log(`  · ${KB_ARTICLES.length} kb_articles`);
  console.log(`  · ${TICKETS.length} tickets (summary/reply empty until AI runs)`);
}

main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
