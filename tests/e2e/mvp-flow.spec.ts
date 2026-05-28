import { expect, test } from '@playwright/test';

test('mobile mvp flow exposes core screens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '远征' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始首通' })).toBeVisible();

  await page.getByRole('button', { name: '编成' }).click();
  await expect(page.getByText('连击/奥义槽')).toBeVisible();

  await page.getByRole('button', { name: '抽卡' }).click();
  await expect(page.getByRole('button', { name: '单抽' })).toBeVisible();

  await page.getByRole('button', { name: '仓库' }).click();
  await expect(page.getByRole('button', { name: '导出存档' })).toBeVisible();
});
