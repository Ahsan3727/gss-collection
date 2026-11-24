import { connectDB } from '../lib/db';
import { AdminUser } from '../lib/models/AdminUser';
import bcrypt from 'bcryptjs';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = 'Store Owner';

  if (!email || !password) {
    console.error('[Create-Admin] ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }

  console.log(`[Create-Admin] Initializing admin account: ${email}...`);
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.name = name;
    existing.failedLoginAttempts = 0;
    existing.lockoutUntil = undefined;
    await existing.save();
    console.log(`[Create-Admin] Existing admin account updated successfully.`);
  } else {
    await AdminUser.create({
      email,
      passwordHash,
      name,
      role: 'superadmin',
    });
    console.log(`[Create-Admin] New admin user created successfully.`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[Create-Admin] Error:', err);
  process.exit(1);
});
