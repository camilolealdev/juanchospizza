import { test, expect } from '@playwright/test';

// Selectores alineados con Header.tsx/Hero.tsx (SEO audit 2026-08-26): el
// test venia probando markup pre-React (header .logo, .nav-links,
// .page-container[data-page]) que ya no existe -- fallaba en cada deploy
// desde que se migro al header/hero/router actuales.
test('home page loads with hero and nav', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Juancho's Pizza/);
  await expect(page.getByRole('link', { name: 'Ir al inicio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /El Sabor Que No Tiene Igual/i })).toBeVisible();
});

test('menu nav link switches to the menu page', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Menú', exact: true })
    .click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page).toHaveTitle(/Menú Completo/);
});
