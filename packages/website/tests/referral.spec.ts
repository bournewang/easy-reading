import { test, expect, type Page } from '@playwright/test';

const apiPattern = (path: string) => new RegExp(`/(api|api-proxy)${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const pricingCatalog = [
  {
    id: 'free',
    isPopular: false,
    durationOptions: [
      {
        months: 1,
        originalPrice: 0,
        salePrice: 0,
        savings: 0,
      },
    ],
  },
  {
    id: 'pro',
    isPopular: true,
    durationOptions: [
      {
        months: 12,
        originalPrice: 199,
        salePrice: 99,
        savings: 50,
      },
    ],
  },
];

async function mockAnonymousLimits(page: Page) {
  await page.route(apiPattern('/public/anonymous-limits'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        translationDailyLimit: 20,
        ttsDailyLimit: 10,
        wordbookLimit: 100,
        historyLimit: 10,
      }),
    });
  });
}

async function mockAuthenticatedSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('easy_reading_auth_token', 'playwright-token');
  });

  await mockAnonymousLimits(page);

  await page.route(apiPattern('/auth/me'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 7,
          username: 'alice',
          fullName: 'Alice Reader',
          subscriptionTier: 'pro',
        },
      }),
    });
  });

  await page.route(apiPattern('/subscription/entitlements'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tier: 'pro',
        active: true,
        canUseWordBook: true,
        canTranslateSentences: true,
        canUseTextToSpeech: true,
        hasUnlimitedTranslation: true,
        hasUnlimitedTextToSpeech: true,
        translationDailyLimit: null,
        ttsDailyLimit: null,
      }),
    });
  });
}

test('register submits referral code from ref query', async ({ page }) => {
  const registerRequest = page.waitForRequest((request) => {
    return request.method() === 'POST' && /\/auth\/register\/?$/.test(request.url());
  });

  await mockAnonymousLimits(page);

  await page.route(/\/auth\/register\/?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'registered-token' }),
    });
  });

  await page.route(apiPattern('/auth/me'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 8,
          username: 'new-reader',
          fullName: 'New Reader',
          subscriptionTier: 'free',
        },
      }),
    });
  });

  await page.route(apiPattern('/subscription/entitlements'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tier: 'free',
        active: false,
        canUseWordBook: true,
        canTranslateSentences: true,
        canUseTextToSpeech: true,
        hasUnlimitedTranslation: false,
        hasUnlimitedTextToSpeech: false,
        translationDailyLimit: 20,
        ttsDailyLimit: 10,
      }),
    });
  });

  await page.goto('/register?ref=friend42', { waitUntil: 'networkidle' });

  await page.locator('#username').fill('new-reader');
  await page.locator('#fullName').fill('New Reader');
  await page.locator('#password').fill('secret123');
  await page.getByRole('button', { name: /Sign up|注册/ }).click();

  const requestBody = (await registerRequest).postDataJSON() as Record<string, unknown>;

  expect(requestBody).toMatchObject({
    username: 'new-reader',
    fullName: 'New Reader',
    password: 'secret123',
    referralCode: 'FRIEND42',
  });
});

test('pricing carries referral code into checkout promo field', async ({ page }) => {
  await mockAuthenticatedSession(page);

  await page.route(apiPattern('/pricing'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pricingCatalog),
    });
  });

  await page.route(apiPattern('/pricing/quote'), async (route) => {
    const body = route.request().postDataJSON() as { promoCode?: string };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tier: 'pro',
        duration: 12,
        originalAmount: 199,
        saleAmount: 99,
        discountAmount: 100,
        finalAmount: 89,
        promoCode: body.promoCode ?? null,
        couponDiscountAmount: 0,
        referralCode: body.promoCode ?? null,
        referralDiscountAmount: 10,
        commissionAmount: 5,
        commissionRate: 0.1,
        paymentMode: 'prepaid',
      }),
    });
  });

  await page.goto('/pricing?ref=friend42', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Proceed to Checkout|前往结账/ }).click();

  await expect(page).toHaveURL(/\/checkout\?.*ref=friend42/);
  await expect(page.getByLabel(/Promo code|优惠码/)).toHaveValue('friend42');
});

test('user page renders referral link and reward totals', async ({ page }) => {
  await mockAuthenticatedSession(page);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => undefined,
      },
    });
  });

  await page.route(apiPattern('/subscription'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subscriptionId: 77,
        tier: 'pro',
        expiresAt: '2030-01-01T00:00:00Z',
        active: true,
        billingMode: 'prepaid',
        intervalMonths: 12,
        autoRenew: false,
        cancelAtPeriodEnd: false,
      }),
    });
  });

  await page.route(apiPattern('/referral/summary'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        referralCode: 'ALICE88',
        referralLink: 'https://easyreading.com/register?ref=ALICE88',
        totalReferrals: 12,
        successfulReferrals: 9,
        pendingCommission: 18.5,
        paidCommission: 110,
        totalCommission: 128.5,
      }),
    });
  });

  await page.route(apiPattern('/wordbook'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(apiPattern('/history'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('/user', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Referral rewards|推广奖励/ })).toBeVisible();
  await expect(page.getByText('https://easyreading.com/register?ref=ALICE88')).toBeVisible();
  await page.getByRole('button', { name: /Copy referral link|复制推广链接/ }).click();
  await expect(page.getByText(/Referral link copied\.|推广链接已复制。/)).toBeVisible();
  await expect(page.getByText(/^12$/)).toBeVisible();
  await expect(page.getByText('¥128.50')).toBeVisible();
  await expect(page.getByText('¥18.50')).toBeVisible();
  await expect(page.getByText('¥110.00')).toBeVisible();
});

test('user page uses the same current plan tier as navigation when paid subscription is inactive', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('easy_reading_auth_token', 'playwright-token');
  });

  await mockAnonymousLimits(page);

  await page.route(apiPattern('/auth/me'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 7,
          username: 'alice',
          fullName: 'Alice Reader',
          subscriptionTier: 'pro',
        },
      }),
    });
  });

  await page.route(apiPattern('/subscription/entitlements'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tier: 'free',
        active: false,
        canUseWordBook: true,
        canTranslateSentences: true,
        canUseTextToSpeech: true,
        hasUnlimitedTranslation: false,
        hasUnlimitedTextToSpeech: false,
        translationDailyLimit: 20,
        ttsDailyLimit: 10,
      }),
    });
  });

  await page.route(apiPattern('/subscription'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subscriptionId: 77,
        tier: 'pro',
        expiresAt: '2020-01-01T00:00:00Z',
        active: false,
        billingMode: null,
        intervalMonths: 12,
        autoRenew: false,
        cancelAtPeriodEnd: false,
      }),
    });
  });

  await page.route(apiPattern('/referral/summary'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        referralCode: 'ALICE88',
        referralLink: 'https://easyreading.com/register?ref=ALICE88',
        totalReferrals: 12,
        successfulReferrals: 9,
        pendingCommission: 18.5,
        paidCommission: 110,
        totalCommission: 128.5,
      }),
    });
  });

  await page.route(apiPattern('/wordbook'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(apiPattern('/history'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('/user', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Current plan|当前方案/ })).toBeVisible();
  await expect(page.getByText(/Pro plan|专业版/)).toBeVisible();
  await expect(page.getByText(/Expired|已过期/)).toBeVisible();
  await expect(page.getByText(/Prepaid|预付费/)).toBeVisible();
  await expect(page.getByText(/No renewal scheduled|暂无续费安排/)).toBeVisible();
});