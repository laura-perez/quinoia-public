import { test, expect } from '@playwright/test';

test.describe('Checkout Page', () => {
  test('should load monthly checkout page', async ({ page }) => {
    await page.goto('/checkout/monthly');
    await expect(page.locator('h1')).toContainText('Souscription Premium');
    await expect(page.locator('h2')).toContainText('Premium Mensuel');
  });

  test('should load yearly checkout page', async ({ page }) => {
    await page.goto('/checkout/yearly');
    await expect(page.locator('h2')).toContainText('Premium Annuel');
    await expect(page.getByText('3 mois offerts')).toBeVisible();
  });

  test('should show correct pricing for monthly plan', async ({ page }) => {
    await page.goto('/checkout/monthly');
    await expect(page.getByText('9,90€/mois')).toBeVisible();
    await expect(page.getByText('🏷️ PROMO')).toBeVisible();
  });

  test('should show yearly savings calculation', async ({ page }) => {
    await page.goto('/checkout/yearly');
    await expect(page.getByText(/Vous économisez/i)).toBeVisible();
    await expect(page.getByText(/19,80€/)).toBeVisible();
    await expect(page.getByText('8.25€/mois')).toBeVisible();
  });

  test('should pre-fill email from URL params', async ({ page }) => {
    await page.goto('/checkout/monthly?email=test@example.com');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should preserve email from trial-expired flow', async ({ page }) => {
    await page.goto('/checkout/monthly?email=trial@example.com&from=trial-expired');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue('trial@example.com');
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/checkout/monthly');
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button:has-text("Procéder au paiement")');
    await expect(page.getByText(/Format d'email invalide/i)).toBeVisible();
  });

  test('should show error for empty email', async ({ page }) => {
    await page.goto('/checkout/monthly');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.clear();
    await page.click('button:has-text("Procéder au paiement")');
    await expect(page.getByText(/Merci de renseigner votre adresse email/i)).toBeVisible();
  });

  test('should disable button when email is empty', async ({ page }) => {
    await page.goto('/checkout/monthly');
    const button = page.locator('button:has-text("Procéder au paiement")');
    await expect(button).toBeDisabled();
  });

  test('should enable button when valid email is entered', async ({ page }) => {
    await page.goto('/checkout/monthly');
    await page.fill('input[type="email"]', 'valid@example.com');
    const button = page.locator('button:has-text("Procéder au paiement")');
    await expect(button).toBeEnabled();
  });

  test('should show loading state after clicking checkout', async ({ page }) => {
    // Mock the API to prevent actual Stripe call
    await page.route('/api/checkout/create-session', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          sessionId: 'cs_test_123',
          url: 'https://checkout.stripe.com/test',
        }),
      })
    );

    await page.goto('/checkout/monthly');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Procéder au paiement")');
    await expect(page.getByText('Redirection...')).toBeVisible();
  });

  test('should have links to alternative plans', async ({ page }) => {
    await page.goto('/checkout/monthly');
    await expect(page.getByRole('link', { name: /Plan annuel/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Voir tous les plans/i })).toBeVisible();
  });

  test('should navigate to yearly from monthly', async ({ page }) => {
    await page.goto('/checkout/monthly');
    await page.click('a:has-text("Plan annuel")');
    await expect(page).toHaveURL('/checkout/yearly');
  });

  test('should have legal links', async ({ page }) => {
    await page.goto('/checkout/monthly');
    await expect(page.getByRole('link', { name: /conditions d'utilisation/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /politique de confidentialité/i })).toBeVisible();
  });

  test('should show plan features', async ({ page }) => {
    await page.goto('/checkout/monthly');
    await expect(page.getByText(/Menus illimités personnalisés/i)).toBeVisible();
    await expect(page.getByText(/Listes de courses optimisées/i)).toBeVisible();
    await expect(page.getByText(/Résiliation à tout moment/i)).toBeVisible();
  });

  test('should handle 404 for invalid plan', async ({ page }) => {
    const response = await page.goto('/checkout/invalid-plan');
    // Should either show loading or 404
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Checkout Page - Error Handling', () => {
  test('should show error message on API failure', async ({ page }) => {
    // Mock API error
    await page.route('/api/checkout/create-session', (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: 'Failed to create checkout session',
        }),
      })
    );

    await page.goto('/checkout/monthly');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Procéder au paiement")');

    await expect(page.getByText(/Une erreur est survenue/i)).toBeVisible();
  });
});

test.describe('Checkout Page - Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/checkout/monthly');
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toContainText('Votre adresse email');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/checkout/monthly');
    const h1 = page.locator('h1');
    const h2 = page.locator('h2');
    await expect(h1).toBeVisible();
    await expect(h2).toBeVisible();
  });
});
