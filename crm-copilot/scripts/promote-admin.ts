import { config } from "dotenv";
import { resolve } from "path";
import { createServiceRoleClient } from "../lib/supabase/server";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run promote-admin -- you@email.com");
    process.exit(1);
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("email", email)
    .select("id, email, role");

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    console.error(
      `No profile found for ${email}. Sign up / sign in once first, then rerun.`,
    );
    process.exit(1);
  }

  console.log("Promoted to admin:", data[0]);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
