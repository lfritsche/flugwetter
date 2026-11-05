import { test, expect, type Page } from "@playwright/test";

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  return errors;
}

for (const [id, area, site] of [["pustertal", "Pustertal", "Ahornach"], ["walgau", "Walgau", "Hensler"], ["praettigau", "Prättigau", "Fanas"]]) {
  test(`${area} zeigt aktuelle Daten`, async ({ page, request }) => {
    const errors = trackErrors(page);
    const api = await (await request.get(`/api/region/${id}?days=3`)).json();
    expect(Date.now() - +new Date(api.fetchedAt)).toBeLessThan(11 * 60_000);   // nie veraltet aus dem Cache

    await page.goto(`/${id}`);
    await expect(page.locator("h1")).toContainText(area);
    await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".daycard")).toHaveCount(3);
    await expect(page.locator(".htable .c.amp").first()).toBeVisible();
    await expect(page.getByRole("tab", { name: new RegExp(`^${site}`) })).toHaveAttribute("aria-selected", "true");
    expect(errors).toEqual([]);
  });
}

test("Umschalter wechselt die Region samt Daten", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/pustertal");
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.regions a[aria-current="page"]')).toHaveText("Pustertal");

  await page.locator(".regions").getByRole("link", { name: "Walgau" }).click();
  await expect(page).toHaveURL(/\/walgau$/);
  await expect(page.locator("h1")).toContainText("Walgau");
  await expect(page.getByRole("tab", { name: "Hensler" })).toBeVisible();
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.regions a[aria-current="page"]')).toHaveText("Walgau");

  await page.locator(".regions").getByRole("link", { name: "Prättigau" }).click();
  await expect(page).toHaveURL(/\/praettigau$/);
  await expect(page.getByRole("tab", { name: "Vilan" })).toBeVisible();
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });

  await page.locator(".regions").getByRole("link", { name: "Pustertal" }).click();
  await expect(page.getByRole("tab", { name: "Ahornach" })).toBeVisible();
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test("Keine seitliche Scrollbar am Handy", async ({ page }) => {
  await page.goto("/pustertal");
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("API-Abrufe umgehen den Browser-Cache", async ({ page, context }) => {
  await page.goto("/pustertal");
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });

  // Zweiter Besuch: der Browser muss beim Server nachfragen, statt aus seinem Cache zu antworten
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  // ExtraInfo kann vor requestWillBeSent eintreffen: erst sammeln, dann zusammenführen
  const apiIds = new Set<string>(), headers = new Map<string, string>();
  cdp.on("Network.requestWillBeSent", (e: any) => { if (e.request.url.includes("/api/region/")) apiIds.add(e.requestId); });
  cdp.on("Network.requestWillBeSentExtraInfo", (e: any) => {
    const h = Object.fromEntries(Object.entries(e.headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
    headers.set(e.requestId, h["cache-control"] ?? "-");
  });
  await page.reload();
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });
  const sent = [...apiIds].map(id => headers.get(id)).filter(Boolean) as string[];
  expect(sent.length).toBeGreaterThan(0);                 // Anfrage ging wirklich ans Netz
  expect(sent.every(v => /no-cache|max-age=0/.test(v))).toBe(true);
});

test("Prättigau: Startplatz mit mehreren Starts wählt einen passenden Start", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/praettigau");
  await page.getByRole("tab", { name: /^Vilan/ }).click();
  await expect(page.locator(".htable .rh", { hasText: /^Start$/ })).toBeVisible({ timeout: 30_000 });
  for (const name of ["Aldur", "Stelserberg", "Sassauna", "Pizol", "Fanas"]) {
    await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
    await expect(page.locator(".hero .eyebrow")).toContainText(name);
  }
  expect(errors).toEqual([]);
});
