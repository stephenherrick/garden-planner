import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('adds a bed and opens its planting plan', async ({ page }) => {
  await page.getByRole('button', { name: 'Add bed' }).click();
  await expect(page.getByText('4 beds')).toBeVisible();

  await expect(page.getByRole('dialog', { name: 'New bed 4' })).toBeVisible();
  await expect(page.getByLabel('Bed width')).toHaveValue('6');
});

test('scrolls the bed editor without scrolling the page for a large garden', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.getByLabel('Garden width').fill('55');
  await page.getByLabel('Garden height').fill('25');
  await page.getByRole('button', { name: 'Update garden size' }).click();
  await page.getByRole('button', { name: 'Add bed' }).click();
  await page.getByLabel('Bed length').fill('25');
  await page.getByRole('button', { name: '＋ Add plant' }).click();

  const editor = page.getByRole('dialog', { name: 'New bed 4' });
  await page.mouse.move(1100, 250);
  await page.mouse.wheel(0, 500);

  await expect.poll(() => editor.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect.poll(() => page.locator('.bed-preview-scroll').evaluate((element) => element.scrollHeight))
    .toBeLessThanOrEqual(await page.locator('.bed-preview-scroll').evaluate((element) => element.clientHeight));

  await page.getByRole('button', { name: 'Place at 1, 25' }).click();
  await expect(page.getByRole('button', { name: 'New plant footprint 1 by 1 feet' }))
    .toHaveCSS('grid-row-start', '25');
});

test('adds a plant and shows its grown size in the bed', async ({ page }) => {
  await page.getByRole('button', { name: /Kitchen garden/ }).click();
  await page.getByRole('button', { name: 'Add plant' }).click();
  await page.getByRole('textbox', { name: 'Plant name' }).last().fill('Sweet peas');
  await page.getByLabel('Mature width').fill('2');
  await page.getByLabel('Mature depth').fill('2');
  await page.getByRole('button', { name: 'Place at 7, 3' }).click();

  await expect(page.getByText('Sweet peas')).toBeVisible();
  await expect(page.getByText('3 plants planned')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sweet peas footprint 2 by 2 feet' }))
    .toHaveCSS('grid-column-start', '7');
});

test('resizes the garden grid', async ({ page }) => {
  await page.getByLabel('Garden width').fill('18');
  await page.getByLabel('Garden height').fill('12');
  await page.getByRole('button', { name: 'Update garden size' }).click();

  await expect(page.getByText('18 × 12 ft')).toBeVisible();
});

test('moves a bed by dragging it across the garden map', async ({ page }) => {
  const kitchenBed = page.getByRole('button', { name: /Kitchen garden/ });
  await kitchenBed.dragTo(page.getByTestId('garden-board'), {
    targetPosition: { x: 12 * 38 + 5, y: 6 * 38 + 5 },
  });

  await expect(kitchenBed).toHaveCSS('grid-column-start', '13');
  await expect(kitchenBed).toHaveCSS('grid-row-start', '7');
});

test('rotates a bed and preserves its contents', async ({ page }) => {
  await page.getByRole('button', { name: /Kitchen garden/ }).click();
  await page.getByRole('button', { name: 'Rotate bed 90 degrees' }).click();

  await expect(page.getByLabel('Bed width')).toHaveValue('4');
  await expect(page.getByLabel('Bed length')).toHaveValue('8');
  await expect(page.getByRole('button', { name: /Kitchen garden, 4 by 8 feet/ })).toBeVisible();
});

test('plans many identical plants together as one group', async ({ page }) => {
  await page.getByRole('button', { name: /Kitchen garden/ }).click();
  await page.getByRole('button', { name: 'Add plant' }).click();
  await page.getByRole('textbox', { name: 'Plant name' }).last().fill('Carrots');
  await page.getByLabel('Plant count').fill('14');

  await expect(page.getByText('16 plants planned')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Carrots group of 14 footprint 1 by 1 feet' })).toContainText('×14');
});

test('creates and switches between separate gardens', async ({ page }) => {
  await page.getByRole('button', { name: 'New garden' }).click();
  await page.getByRole('button', { name: 'Save name' }).click();

  await expect(page.getByRole('heading', { name: 'Garden 2' })).toBeVisible();
  await expect(page.getByText('0 beds')).toBeVisible();
  await page.getByRole('navigation', { name: 'Your gardens' })
    .getByRole('button', { name: /Backyard garden/ }).click();

  await expect(page.getByRole('heading', { name: 'Backyard garden' })).toBeVisible();
  await expect(page.getByText('3 beds')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Garden 2/ })).toBeVisible();
});

test('deletes a garden after confirmation and keeps one garden available', async ({ page }) => {
  await page.getByRole('button', { name: 'New garden' }).click();
  await page.getByRole('button', { name: 'Save name' }).click();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete garden' }).click();

  await expect(page.getByRole('heading', { name: 'Backyard garden' })).toBeVisible();
  await expect(page.getByLabel('Select garden').locator('option')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Delete garden' })).toBeDisabled();
});

test('can add and switch gardens on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '＋ Garden' }).click();
  await page.getByRole('button', { name: 'Save name' }).click();

  await expect(page.getByRole('heading', { name: 'Garden 2' })).toBeVisible();
  await page.getByLabel('Select garden').selectOption({ label: 'Backyard garden' });
  await expect(page.getByRole('heading', { name: 'Backyard garden' })).toBeVisible();
});

test('names a new garden and renames it later', async ({ page }) => {
  await page.getByRole('button', { name: 'New garden' }).click();
  await page.getByLabel('Garden name').fill('Patio pots');
  await page.getByRole('button', { name: 'Save name' }).click();

  await expect(page.getByRole('heading', { name: 'Patio pots' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Your gardens' }).getByRole('button', { name: /Patio pots/ }))
    .toBeVisible();

  await page.getByRole('button', { name: 'Rename garden' }).click();
  await page.getByLabel('Garden name').fill('Summer patio');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { name: 'Summer patio' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Summer patio' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Your gardens' }).getByRole('button', { name: /Summer patio/ }))
    .toBeVisible();
});

test('requires a non-empty garden name', async ({ page }) => {
  await page.getByRole('button', { name: 'Rename garden' }).click();
  await page.getByLabel('Garden name').fill('  ');
  await page.getByRole('button', { name: 'Save name' }).click();

  await expect(page.getByRole('alert')).toHaveText('Garden name cannot be empty.');
  await expect(page.getByLabel('Garden name')).toBeVisible();
});
