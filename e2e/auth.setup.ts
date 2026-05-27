import { test as setup, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения из .env.local (и .env как fallback).
// Это критично для Playwright global setup — он запускается в отдельном Node-процессе
// и не получает env-переменные, которые Next.js загружает автоматически.
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

const resultLocal = dotenv.config({ path: envLocalPath });
if (resultLocal.error) {
  console.warn(`⚠️ Could not load ${envLocalPath}:`, resultLocal.error.message);
} else {
  console.log(`✅ Loaded environment variables from ${envLocalPath}`);
}

// Fallback на обычный .env (не перезаписываем значения из .env.local)
dotenv.config({ path: envPath, override: false });

// Определяем режим ДО любого использования
const USE_MOCK_AUTH = process.env.E2E_AUTH_MOCK === '1' || !process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`\n🧪 E2E Auth Setup — mode: ${USE_MOCK_AUTH ? 'MOCK (fast, no Supabase secrets needed)' : 'REAL Supabase (SERVICE_ROLE_KEY present)'}\n`);

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || 'owner@test.com';
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || 'testpassword123';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'testpassword123';

const ownerAuthFile = 'e2e/.auth/owner.json';
const adminAuthFile = 'e2e/.auth/admin.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BRANCHES = [
  { id: 'branch_central', name: 'Центральный' },
  { id: 'branch_north', name: 'Северный' },
  { id: 'branch_south', name: 'Южный' },
];

/** Создаёт/обновляет тестового пользователя + профиль через Service Role */
async function ensureTestUserExists(
  email: string,
  password: string,
  role: 'OWNER' | 'ADMIN',
  branchId?: string | null
) {
  const adminClient = createAdminClient();

  // Убедимся, что филиалы существуют
  for (const branch of BRANCHES) {
    await adminClient.from('branches').upsert(branch, { onConflict: 'id' });
  }

  // 1. Проверяем существование пользователя
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  let user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log(`  → Creating user ${email}...`);
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) throw new Error(`Failed to create user: ${createError.message}`);
    user = createData.user;
    console.log(`  ✅ User created`);
  }

  // 2. Обновляем/создаём профиль
  const profileUpdate: any = {
    id: user.id,
    email: user.email,
    display_name: role === 'OWNER' ? 'Test Owner' : 'Test Admin',
    role,
    updated_at: new Date().toISOString(),
  };

  if (role === 'ADMIN' && branchId) {
    profileUpdate.branch_id = branchId;
  } else if (role === 'OWNER') {
    profileUpdate.branch_id = null;
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert(profileUpdate, { onConflict: 'id' });

  if (profileError) {
    console.warn(`  ⚠️ Profile upsert warning: ${profileError.message}`);
  } else {
    console.log(`  ✅ Profile ensured (role=${role}${branchId ? `, branch=${branchId}` : ''})`);
  }
}

/** Пытается выполнить логин через UI */
async function tryUILogin(page: any, email: string, password: string): Promise<boolean> {
  try {
    await page.goto('/login', { timeout: 10000 });

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/пароль/i).fill(password);
    await page.getByRole('button', { name: /войти/i }).click();

    await Promise.race([
      page.waitForURL(/\/dashboard|\/shifts|\/$/, { timeout: 8000 }),
      page.waitForSelector('text=Ошибка входа', { timeout: 8000 }),
    ]);

    const currentUrl = page.url();
    const hasAuthError = await page.getByText(/ошибка входа|неверный/i).isVisible().catch(() => false);

    return !(currentUrl.includes('/login') || hasAuthError);
  } catch (error) {
    console.log(`[UI Login] Failed for ${email}:`, (error as Error).message);
    return false;
  }
}

/** Логин через Supabase API + установка сессии через cookies */
async function loginViaSupabaseAPI(page: any, email: string, password: string): Promise<boolean> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    console.error('   Make sure they are present in .env.local');
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const maxAttempts = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`   Attempt ${attempt}/${maxAttempts} to sign in via Supabase API...`);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error && data?.session) {
        console.log(`   ✅ Sign in successful on attempt ${attempt}`);
        const { access_token, refresh_token } = data.session;

        // Устанавливаем cookie
        const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
        const cookieName = `sb-${projectRef}-auth-token`;

        await page.context().addCookies([
          {
            name: cookieName,
            value: JSON.stringify({
              access_token,
              refresh_token,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              expires_in: 3600,
              token_type: 'bearer',
              user: data.user,
            }),
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
          },
        ]);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          console.warn(`⚠️ Still on login page after setting session for ${email}`);
          return false;
        }

        return true;
      }

      lastError = error;
      console.error(`   ❌ Attempt ${attempt} failed:`, error?.message || error);

      if (attempt < maxAttempts) {
        console.log(`   ⏳ Retrying in 1.5s...`);
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    console.error(`❌ Supabase API login failed for ${email} after ${maxAttempts} attempts`);
    console.error('   Last error message:', lastError?.message);
    console.error('   Last error code:', lastError?.code);
    return false;
  } catch (error) {
    console.error(`❌ Supabase API login error for ${email}:`, error);
    return false;
  }
}

/**
 * Fast mock auth path for E2E (recommended default).
 * Sets special cookies that are recognized by middleware.ts + getSessionUser()
 * when E2E_AUTH_MOCK=1. No real Supabase network calls during setup.
 */
async function setupMockAuthState(
  _page: any,
  role: 'OWNER' | 'ADMIN',
  authFile: string,
  branchId?: string | null
) {
  console.log(`\n🧪 [MOCK AUTH] Setting up ${role} session (no real Supabase login)...`);

  // We receive a page from the setup fixture — its context is perfect for injecting cookies.
  const cookies: Array<{ name: string; value: string; domain: string; path: string; httpOnly: boolean; sameSite: 'Lax' | 'Strict' | 'None' }> = [
    {
      name: 'e2e-test-role',
      value: role,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ];

  if (role === 'ADMIN') {
    const branchValue = branchId || 'branch_central';
    cookies.push({
      name: 'e2e-test-branch-id',
      value: branchValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      sameSite: 'Lax' as const,
    });
  }

  await _page.context().addCookies(cookies);

  // Navigate once so the app sees the cookies (middleware + RSC)
  await _page.goto('/', { waitUntil: 'domcontentloaded' });

  // Also set a minimal Supabase-looking cookie so any client-side @supabase/ssr code
  // doesn't immediately throw (the value is intentionally fake; server is already mocked).
  const fakeSupabaseCookie = {
    name: 'sb-localhost-auth-token',
    value: JSON.stringify({
      access_token: 'mock-e2e-token',
      refresh_token: 'mock-e2e-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: { id: role === 'OWNER' ? 'e2e-test-owner' : 'e2e-test-admin', email: role === 'OWNER' ? OWNER_EMAIL : ADMIN_EMAIL },
    }),
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  };
  await _page.context().addCookies([fakeSupabaseCookie]);

  await _page.context().storageState({ path: authFile });
  console.log(`✅ [MOCK] ${role} session saved to ${authFile} (using e2e-test-role cookie)\n`);
}

async function authenticateAndSaveState(
  page: any,
  email: string,
  password: string,
  authFile: string,
  role: 'OWNER' | 'ADMIN',
  branchId?: string | null
) {
  // Fast path — used by default (and recommended for most dev/CI)
  if (USE_MOCK_AUTH) {
    await setupMockAuthState(page, role, authFile, branchId);
    return;
  }

  // === Real Supabase auth path (only when SERVICE_ROLE_KEY + real credentials are available) ===
  console.log(`\n🔐 Authenticating as ${role} (${email}) via real Supabase...`);

  // 1. Автоматическое создание пользователя через Service Role (если доступно)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      await ensureTestUserExists(email, password, role, branchId);
      console.log(`   ⏳ Waiting 1.5s after user creation before attempting login...`);
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.warn(`⚠️ Could not ensure user via admin API: ${(e as Error).message}`);
    }
  } else {
    console.log('ℹ️ SUPABASE_SERVICE_ROLE_KEY not set — skipping automatic user creation');
  }

  // 2. Пытаемся войти (UI → Supabase API fallback)
  let success = await tryUILogin(page, email, password);

  if (success) {
    console.log(`✅ UI login successful for ${role}`);
  } else {
    console.log(`⚠️ UI login failed for ${role}. Trying Supabase API fallback...`);
    success = await loginViaSupabaseAPI(page, email, password);
  }

  if (!success) {
    throw new Error(`Failed to authenticate as ${role} using both UI and Supabase API`);
  }

  await page.context().storageState({ path: authFile });
  console.log(`✅ ${role} session saved to ${authFile}\n`);
}

setup('authenticate as OWNER', async ({ page }) => {
  await authenticateAndSaveState(page, OWNER_EMAIL, OWNER_PASSWORD, ownerAuthFile, 'OWNER');
});

setup('authenticate as ADMIN', async ({ page }) => {
  await authenticateAndSaveState(page, ADMIN_EMAIL, ADMIN_PASSWORD, adminAuthFile, 'ADMIN', 'branch_central');
});
