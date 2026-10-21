import { query, initDb } from '../server/db/index.js';
import { PasswordService } from '../server/services/passwordService.js';
import crypto from 'crypto';

async function makeAdmin() {
  const args = process.argv.slice(2);
  const email = args[0]?.trim().toLowerCase();
  const explicitPassword = args[1]?.trim();
  const explicitName = args[2]?.trim();

  if (!email || !email.includes('@')) {
    console.error('\n=============================================================');
    console.error('❌ Error: Please provide a valid user email address.');
    console.error('Usage:');
    console.error('   npm run make:admin -- user@example.com');
    console.error('   npm run make:admin -- user@example.com [optionalPassword] [optionalFullName]');
    console.error('=============================================================\n');
    process.exit(1);
  }

  console.log(`Connecting to database to configure admin privileges for: ${email}...`);
  await initDb();

  const now = new Date().toISOString();
  const existingUser = await query.get<{ id: string; email: string; role: string; full_name: string }>(
    'SELECT id, email, role, full_name FROM users WHERE email = ?',
    [email]
  );

  if (existingUser) {
    // User exists: promote to admin
    await query.run(`
      UPDATE users
      SET role = 'admin', is_active = 1
      WHERE id = ?
    `, [existingUser.id]);

    console.log('\n=============================================================');
    console.log('🎉 SUCCESS: User Promoted to Administrator!');
    console.log(`👤 Name:  ${existingUser.full_name || 'Admin User'}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🛡️  Role:  admin`);
    console.log(`Status: Active`);
    console.log('You can now log in and access the Admin Portal (/admin).');
    console.log('=============================================================\n');
  } else {
    // User does not exist: create new admin user
    const generatedPassword = explicitPassword || `Admin!${crypto.randomBytes(4).toString('hex')}#2026`;
    const passwordHash = PasswordService.hashPassword(generatedPassword);
    const userId = `usr_admin_${Date.now()}`;
    const fullName = explicitName || 'System Administrator';

    await query.run(`
      INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, last_login_at)
      VALUES (?, ?, ?, ?, 'admin', 1, ?, NULL)
    `, [userId, email, passwordHash, fullName, now]);

    console.log('\n=============================================================');
    console.log('🎉 SUCCESS: New Administrator Account Created!');
    console.log(`👤 Name:     ${fullName}`);
    console.log(`📧 Email:    ${email}`);
    console.log(`🔑 Password: ${generatedPassword}`);
    console.log(`🛡️  Role:     admin`);
    console.log(`Status:    Active`);
    console.log('\nIMPORTANT: Save these credentials securely to log in to the Admin Portal.');
    console.log('=============================================================\n');
  }

  process.exit(0);
}

makeAdmin().catch((err) => {
  console.error('\n❌ Execution failed:', err.message);
  process.exit(1);
});
