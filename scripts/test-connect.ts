import assert from 'assert';
import { initDb, query } from '../server/db/index.js';
import { InstagramOAuthService } from '../server/services/instagramOAuthService.js';
import { InstagramService } from '../server/services/instagramService.js';
import { ConfigService } from '../server/services/configService.js';
import { decrypt, encrypt } from '../server/services/encryption.js';

async function runTests() {
  console.log('🧪 Starting InstaVault Connect & Security Verification Tests...\n');

  // 1. Database initialization and migrations
  await initDb();
  console.log('✅ 1. Database schema and migrations initialized successfully.');

  // Check columns on accounts table
  const tableInfo = await query.all<{ name: string; type: string }>("PRAGMA table_info('accounts')");
  const columnNames = tableInfo.map((c) => c.name);
  assert(columnNames.includes('auth_method'), 'accounts table missing auth_method column');
  assert(columnNames.includes('oauth_access_token'), 'accounts table missing oauth_access_token column');
  assert(columnNames.includes('oauth_token_expires_at'), 'accounts table missing oauth_token_expires_at column');
  assert(columnNames.includes('instagram_user_id'), 'accounts table missing instagram_user_id column');
  console.log('✅ 2. Account columns verified (auth_method, oauth_access_token, oauth_token_expires_at, instagram_user_id).');

  // 2. Encryption & Decryption roundtrip
  const testSecret = 'sessionid=6528919%3AbB7j9x1f82y%3A12%3AY4z9; ds_user_id=6528919';
  const ciphertext = encrypt(testSecret);
  assert.notStrictEqual(ciphertext, testSecret, 'Ciphertext should not equal plaintext');
  assert(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(ciphertext), 'Ciphertext must follow iv:tag:ciphertext format');

  const decrypted = decrypt(ciphertext);
  assert.strictEqual(decrypted, testSecret, 'Decrypted value must match original secret');

  const secretViaHelper = InstagramService.getDecryptedSecret(ciphertext);
  assert.strictEqual(secretViaHelper, testSecret, 'getDecryptedSecret helper must return decrypted plaintext');
  console.log('✅ 3. AES-256-GCM encryption/decryption round-trip verified.');

  // 3. Instagram OAuth Service tests
  const state = InstagramOAuthService.signState('usr_test_123');
  assert(typeof state === 'string' && state.includes('.'), 'OAuth state must be a signed payload');
  const verifiedState = InstagramOAuthService.verifyState(state);
  assert(verifiedState !== null, 'Valid OAuth state must verify');
  assert.strictEqual(verifiedState?.userId, 'usr_test_123', 'OAuth state userId must match');

  const tamperedState = state + 'tampered';
  assert.strictEqual(InstagramOAuthService.verifyState(tamperedState), null, 'Tampered state must fail verification');
  console.log('✅ 4. Instagram OAuth HMAC-SHA256 CSRF state signing & verification passed.');

  // 4. Session parsing and profile preview
  const parsed = InstagramService.parseSessionInput('sessionid=999888%3Aabc123xyz; ds_user_id=999888; csrftoken=csrftest');
  assert.strictEqual(parsed.sessionId, '999888%3Aabc123xyz', 'Parsed sessionid must match');
  assert.strictEqual(parsed.dsUserId, '999888', 'Parsed ds_user_id must match');
  assert.strictEqual(parsed.csrftoken, 'csrftest', 'Parsed csrftoken must match');

  const demoProfile = await InstagramService.fetchSessionDetails('sandbox_demo_user');
  assert.strictEqual(demoProfile.isSandbox, true, 'Demo session must be recognized as sandbox');
  assert(demoProfile.username.length > 0, 'Username must be populated');
  console.log(`✅ 5. Session parser and sandbox preview verified (User: @${demoProfile.username}).`);

  // 5. Connect with Session Auto — encryption at rest and auth_method tagging
  await query.run(`
    INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT (id) DO NOTHING
  `, ['usr_test_123', 'test@example.com', 'hash123', 'Test User', 'user', new Date().toISOString()]);

  const linkResult = await InstagramService.connectWithSessionAuto('sandbox_demo_test', 'usr_test_123', 'test_user_connect');
  assert.strictEqual(linkResult.success, true, 'connectWithSessionAuto must succeed');

  const storedAcc = await query.get<any>('SELECT * FROM accounts WHERE id = ?', [linkResult.accountId]);
  assert.strictEqual(storedAcc.auth_method, 'session', 'auth_method must be tagged as "session"');
  assert.strictEqual(storedAcc.oauth_access_token, null, 'oauth_access_token must be cleared on session connect');
  assert.notStrictEqual(storedAcc.session_cookie, 'sandbox_demo_test', 'Stored session_cookie must be encrypted, not plaintext');
  assert.strictEqual(
    InstagramService.getDecryptedSecret(storedAcc.session_cookie),
    linkResult.profile.cleanCookieString,
    'Stored encrypted cookie must decrypt to cleanCookieString'
  );
  console.log('✅ 6. connectWithSessionAuto correctly encrypts session cookie at rest and tags auth_method="session".');

  // 6. Sanitization of account record for API responses
  const sanitized = InstagramService.sanitizeAccount(storedAcc) as any;
  assert.strictEqual(sanitized.encrypted_password, undefined, 'Sanitized account must not expose encrypted_password');
  assert.strictEqual(sanitized.session_cookie, undefined, 'Sanitized account must not expose session_cookie');
  assert.strictEqual(sanitized.oauth_access_token, undefined, 'Sanitized account must not expose oauth_access_token');
  assert.strictEqual(sanitized.username, storedAcc.username, 'Sanitized account must retain username');
  assert.strictEqual(sanitized.auth_method, 'session', 'Sanitized account must retain auth_method');
  console.log('✅ 7. Account sanitization strictly prevents leaking ciphertext secrets over the API.');

  // 7. Dynamic Admin Configurations & Multi-Scope Support
  await ConfigService.updateConfig('app_base_url', 'https://insta.abishek.in');
  await ConfigService.updateConfig('ig_oauth_client_id', '123456789012345');
  await ConfigService.updateConfig('ig_oauth_client_secret', 'secret_abc_123');
  await ConfigService.updateConfig('ig_oauth_redirect_uri', ''); // Leave blank to test auto-calculation
  await ConfigService.updateConfig('ig_oauth_scopes', 'instagram_business_basic, instagram_business_content_publish, custom_scope_1');

  const liveSettings = await InstagramOAuthService.getSettings();
  assert.strictEqual(liveSettings.appBaseUrl, 'https://insta.abishek.in', 'appBaseUrl must match updated value');
  assert.strictEqual(liveSettings.clientId, '123456789012345', 'clientId must match updated value');
  assert.strictEqual(liveSettings.clientSecret, 'secret_abc_123', 'clientSecret must match updated value');
  assert.strictEqual(
    liveSettings.redirectUri,
    'https://insta.abishek.in/api/auth/instagram/oauth/callback',
    'Blank redirectUri must auto-derive from appBaseUrl'
  );
  assert.strictEqual(
    liveSettings.scopes,
    'instagram_business_basic,instagram_business_content_publish,custom_scope_1',
    'Scopes must parse multiple comma/space separated scopes cleanly'
  );
  assert.strictEqual(liveSettings.configured, true, 'OAuth must report configured=true when clientId & secret are set');

  const authUrl = await InstagramOAuthService.buildAuthorizeUrl('test_state_123');
  assert(authUrl.includes('client_id=123456789012345'), 'Authorize URL must include configured client_id');
  assert(authUrl.includes('redirect_uri=https%3A%2F%2Finsta.abishek.in%2Fapi%2Fauth%2Finstagram%2Foauth%2Fcallback'), 'Authorize URL must include calculated redirect URI');
  assert(authUrl.includes('scope=instagram_business_basic%2Cinstagram_business_content_publish%2Ccustom_scope_1'), 'Authorize URL must include multiple scopes');
  console.log('✅ 8. Dynamic admin OAuth configuration, auto-derived redirect URL, and multi-scopes verified.');

  // Clean up test account & restore clean configs
  await query.run('DELETE FROM accounts WHERE id = ?', [linkResult.accountId]);
  await query.run('DELETE FROM users WHERE id = ?', ['usr_test_123']);
  await ConfigService.updateConfig('app_base_url', 'http://localhost:5500');
  await ConfigService.updateConfig('ig_oauth_client_id', '');
  await ConfigService.updateConfig('ig_oauth_client_secret', '');
  await ConfigService.updateConfig('ig_oauth_redirect_uri', '');
  await ConfigService.updateConfig('ig_oauth_scopes', 'instagram_business_basic');
  console.log('✅ 9. Test configs & accounts cleanly restored.');

  console.log('\n🎉 ALL CONNECT, CONFIGURATION & SECURITY TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
