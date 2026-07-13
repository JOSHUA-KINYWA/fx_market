require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY. Provide it via .env/.env.local or set it in your environment."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const emails = [
  "joshuakinywa96@gmail.com",
  "joshuakinywa087@gmail.com",
  "joshuakinywa087@yahoo.com",
  "joshuakinywa087@outlook.com",
];

async function findUsers() {
  console.log("🔍 Searching users...\n");

  for (const email of emails) {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error(`❌ Error listing users: ${error.message}`);
      return;
    }

    const matches = data.users.filter((u) => {
      const full = (u.email || "").toLowerCase();
      return (
        full === email.toLowerCase() ||
        full.startsWith("joshuakinywa087") ||
        full === "joshuakinywa96@gmail.com"
      );
    });

    if (matches.length === 0) {
      console.log(`ℹ️ No user found for: ${email}`);
    } else {
      console.log(`📧 Matches for "${email}":`);
      matches.forEach((u) => {
        console.log(`  • ${u.email} | id=${u.id} | confirmed=${!!u.email_confirmed_at}`);
      });
    }
  }
}

async function resetPassword(email, newPassword) {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error(`❌ Error listing users: ${error.message}`);
    return;
  }

  const user = data.users.find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    return;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
    email_confirm: true,
  });

  if (updateError) {
    console.error(`❌ Failed to reset password: ${updateError.message}`);
  } else {
    console.log(`✅ Password reset successful for ${email}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await findUsers();
    return;
  }

  if (args[0] === "reset" && args[1] && args[2]) {
    await resetPassword(args[1], args[2]);
    return;
  }

  console.log("Usage:");
  console.log("  node list-users.js");
  console.log('  node list-users.js reset <email> <newPassword>');
}

main();
