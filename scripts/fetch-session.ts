import { query, initDb } from '../server/db/index.js';
import { InstagramService } from '../server/services/instagramService.js';

async function main() {
  const args = process.argv.slice(2);
  const sessionInput = args[0]?.trim();
  const targetEmailOrUser = args[1]?.trim();

  if (!sessionInput) {
    console.log('\n=============================================================');
    console.log('📸 InstaVault Pro - Instagram Session Auto-Fetcher CLI');
    console.log('=============================================================');
    console.log('Usage:');
    console.log('   npm run session:fetch -- <sessionid> [optionalEmail]');
    console.log('   npx tsx scripts/fetch-session.ts <sessionid> [optionalEmail]\n');
    console.log('Examples:');
    console.log('   npm run session:fetch -- "6528919%3AbB7j9x1f82y%3A12%3AY4z9"');
    console.log('   npm run session:fetch -- "sessionid=6528919%3A...; ds_user_id=6528919" admin@abishek.in');
    console.log('   npm run session:fetch -- "sandbox_demo_123"');
    console.log('=============================================================\n');
    process.exit(1);
  }

  console.log('\n⏳ Initializing database connection...');
  await initDb();

  console.log('🔍 Analyzing session token & querying Instagram API...');

  try {
    const profile = await InstagramService.fetchSessionDetails(sessionInput);

    console.log('\n=============================================================');
    console.log('✨ INSTAGRAM PROFILE SUCCESSFULLY FETCHED');
    console.log('=============================================================');
    console.log(`👤 Username:     @${profile.username}`);
    console.log(`📛 Full Name:    ${profile.fullName || '(Not specified)'}`);
    console.log(`🆔 Instagram ID: ${profile.userId || 'N/A'}`);
    console.log(`👥 Followers:    ${profile.followerCount.toLocaleString()}`);
    console.log(`👣 Following:    ${profile.followingCount.toLocaleString()}`);
    console.log(`🖼️  Avatar:       ${profile.avatarUrl}`);
    console.log(`🔒 Private:      ${profile.isPrivate ? 'Yes' : 'No'}`);
    console.log(`⭐ Verified:     ${profile.isVerified ? 'Yes' : 'No'}`);
    console.log(`🌐 Mode:         ${profile.isSandbox ? 'Sandbox Simulator' : 'Live Instagram Session'}`);
    console.log(`📡 Source:       ${profile.source || 'live_api'}`);
    console.log('=============================================================\n');

    // Find user to associate with if requested
    let targetUserId: string | undefined;
    if (targetEmailOrUser) {
      const user = await query.get<{ id: string; email: string }>(
        'SELECT id, email FROM users WHERE email = ? OR id = ?',
        [targetEmailOrUser.toLowerCase(), targetEmailOrUser]
      );
      if (user) {
        targetUserId = user.id;
        console.log(`🔗 Linking account to user: ${user.email} (${user.id})`);
      } else {
        console.log(`⚠️ User "${targetEmailOrUser}" not found in database. Linking as system active account.`);
      }
    } else {
      // Pick first user if exists
      const firstUser = await query.get<{ id: string; email: string }>('SELECT id, email FROM users ORDER BY created_at ASC LIMIT 1');
      if (firstUser) {
        targetUserId = firstUser.id;
        console.log(`🔗 Linking account to user: ${firstUser.email}`);
      }
    }

    const connectResult = await InstagramService.connectWithSessionAuto(sessionInput, targetUserId);

    console.log('🎉 SUCCESS: Instagram account linked into InstaVault database!');
    console.log(`Account ID: ${connectResult.accountId}`);
    console.log(`Status: Active and synchronized.\n`);
  } catch (err: any) {
    console.error('\n❌ Error fetching Instagram session:');
    console.error(err.message || err);
    console.error('\nTips:');
    console.error('1. Make sure your sessionid is copied directly from an active browser session.');
    console.error('2. You can also pass the full Cookie header string from DevTools.');
    console.error('3. Try running with a sandbox session: npm run session:fetch -- "sandbox_demo"\n');
    process.exit(1);
  }
}

main();
