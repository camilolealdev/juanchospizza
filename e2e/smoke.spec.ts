import { test, expect } from '@playwright/test';

test('home page loads with hero and nav', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Juancho's Pizza/);
  await expect(page.locator('header .logo')).toBeVisible();
  await expect(page.getByRole('heading', { name: /En Sabor y Calidad/i })).toBeVisible();
});

test('menu nav link switches to the menu page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Menú' }).click();
  await expect(page.locator('.page-container[data-page="menu"]')).toHaveClass(/active/);
});
