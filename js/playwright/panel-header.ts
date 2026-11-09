import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The panel header's group headline and switcher. The headline names the
 * current group; its menu lists every group.
 * Locators pierce the panel's open shadow root.
 */
export const GROUP_SWITCHER = '#group-switcher';
export const GROUP_MENU = '#group-menu';

export function groupHeadline(page: Page): Locator {
  return page.locator('#group-name');
}

/** The menu item for one group (the menu may be closed; use it after openGroupMenu). */
export function groupItem(page: Page, entityId: string): Locator {
  return page.locator(`${GROUP_MENU} [role="menuitemradio"][data-entity="${entityId}"]`);
}

export async function openGroupMenu(page: Page): Promise<void> {
  await page.locator(GROUP_SWITCHER).click();
  await expect(page.locator(GROUP_MENU)).toBeVisible();
}

/** Open the switcher and pick a group from its menu. */
export async function chooseGroup(page: Page, entityId: string): Promise<void> {
  await openGroupMenu(page);
  await groupItem(page, entityId).click();
}

/** The checked menu item carries the current group's entity ID, open or not. */
export async function expectCurrentGroup(page: Page, entityId: string): Promise<void> {
  await expect(
    page.locator(`${GROUP_MENU} [role="menuitemradio"][aria-checked="true"]`)
  ).toHaveAttribute('data-entity', entityId);
}

/** The header ⋮ button. */
export function moreButton(page: Page): Locator {
  return page.getByRole('button', { name: 'More actions', exact: true });
}

/** Open the header ⋮ menu (it is closed on entry; clicking ⋮ again would close it). */
export async function openMoreMenu(page: Page): Promise<void> {
  await moreButton(page).click();
  await expect(page.locator('.more-menu')).toBeVisible();
}

/** Close the ⋮ menu by toggling ⋮. */
export async function closeMoreMenu(page: Page): Promise<void> {
  await moreButton(page).click();
  await expect(page.locator('.more-menu')).toHaveCount(0);
}

/**
 * New group… is a ⋮ menu item for administrators in the sidebar panel. The
 * item exists only while ⋮ is open, so open the menu before asserting on it,
 * including before asserting that it is absent.
 */
export function newGroupItem(page: Page): Locator {
  return page.locator('.more-menu .new-group-btn');
}
