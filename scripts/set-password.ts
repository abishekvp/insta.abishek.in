import { query, initDb } from '../server/db/index.js';
import { PasswordService } from '../server/services/passwordService.js';
import crypto from 'crypto';

async function setPassword() {
  const args = process.argv.slice(2);
  const email = args[0]?.trim().toLowerCase();
  const explicitPassword = args[1]?.trim();

  if (!email || !email.includes('@') || email.startsWith('-')) {
    console.error('\n=============================================================');
    console.error('❌ Error: Please provide a valid user email address.');
    console.error('Usage:');
    console.error('   npm run set:password -- <email> [newPassword]');
    console.error('   npm run password:set -- <email> [newPassword]');
    console.error('Examples:');
    console.error('   npm run set:password -- admin@abishek.in');
    console.error('   npm run set:password -- admin@abishek.in MyNewSecurePass#2026');
    console.error('Note: If [newPassword] is omitted, a strong temporary password is generated.');
    console.error('=============================================================\n');
    process.exit(1);
  }

  console.log(`Connecting to database to set password for: ${email}...`);
  await initDb();

  const user = await query.get<{ id: string; email: string; full_name: string; role: string; is_active: number }>(
    'SELECT id, email, full_name, role, is_active FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    const allUsers = await query.all<{ email: string; full_name: string; role: string }>(
      'SELECT email, full_name, role FROM users ORDER BY created_at DESC LIMIT 10'
    );

    console.error('\n=============================================================');
    console.error(`❌ Error: User with email "${email}" was not found.`);
    if (allUsers.length > 0) {
      console.error('\nRegistered accounts currently in the system:');
      for (const u of allUsers) {
        console.error(`  • ${u.email} (${u.full_name || 'No Name'}, ${u.role})`);
      }
    } else {
      console.error('\nNo registered users exist yet. Create an admin user first with:');
      console.error(`   npm run make:admin -- ${email}`);
    }
    console.error('=============================================================\n');
    process.exit(1);
  }

  let finalPassword = explicitPassword;
  if (!finalPassword) {
    finalPassword = `Vault!${crypto.randomBytes(4).toString('hex')}#2026`;
  } else if (finalPassword.length < 8) {
    console.error('\n=============================================================');
    console.error('❌ Error: Password must be at least 8 characters long.');
    console.error('=============================================================\n');
    process.exit(1);
  }

  const passwordHash = PasswordService.hashPassword(finalPassword);

  await query.run(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [passwordHash, user.id]
  );

  console.log('\n=============================================================');
  console.log('🎉 SUCCESS: User Password Updated Successfully!');
  console.log(`👤 Name:         ${user.full_name || 'InstaVault User'}`);
  console.log(`📧 Email:        ${user.email}`);
  console.log(`🛡️  Role:         ${user.role}`);
  console.log(`Status:        ${user.is_active === 1 ? 'Active' : 'Suspended'}`);
  console.log(`🔑 New Password: ${finalPassword}`);
  console.log('-------------------------------------------------------------');
  console.log('The user can now log in using this password on the site.');
  console.log('=============================================================\n');

  process.exit(0);
}

setPassword().catch((err) => {
  console.error('\n❌ Execution failed:', err.message);
  process.exit(1);
});
