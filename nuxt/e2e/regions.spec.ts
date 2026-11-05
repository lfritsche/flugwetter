import { test, expect, type Page } from "@playwright/test";

// Holfuy sperrt die IP dieser Maschine nach automatischen Zugriffen, deshalb hier nie anfragen
test.beforeEach(async ({ page }) => { await page.route(/holfuy/, r => r.abort()); });

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
  await expect(page).toHaveURL(/\/walgau\/hensler/);
  await expect(page.locator("h1")).toContainText("Walgau");
  await expect(page.getByRole("tab", { name: "Hensler" })).toBeVisible();
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.regions a[aria-current="page"]')).toHaveText("Walgau");

  await page.locator(".regions").getByRole("link", { name: "Prättigau" }).click();
  await expect(page).toHaveURL(/\/praettigau\/fanas/);
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

test("Adresse: Startplatz im Pfad, Level als Parameter", async ({ page }) => {
  await page.goto("/walgau");
  await expect(page).toHaveURL(/\/walgau\/hensler\?level=anfaenger$/);

  await page.getByRole("tab", { name: /^Bazora/ }).click();
  await expect(page).toHaveURL(/\/walgau\/bazora\?level=anfaenger$/);
  await page.locator('input[aria-label="Pilotenlevel"]').fill("2");
  await expect(page).toHaveURL(/\/walgau\/bazora\?level=erfahren$/);

  // Deep Link, Level wird beim Regionswechsel mitgenommen
  await page.goto("/pustertal/kronplatz?level=experte");
  await expect(page.getByRole("tab", { name: /^Kronplatz/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".level-top b")).toHaveText("Experte");
  await page.locator(".regions").getByRole("link", { name: "Prättigau" }).click();
  await expect(page).toHaveURL(/\/praettigau\/[a-z]+\?level=experte$/);

  // Unbekannter Startplatz fällt zurück, unbekannter Level wird ignoriert
  await page.goto("/walgau/gibtsnicht?level=quatsch");
  await expect(page).toHaveURL(/\/walgau\/[a-z]+\?level=/);
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });
});

test("Level aus dem Link wird nicht gespeichert", async ({ page }) => {
  await page.goto("/walgau/hensler?level=experte");
  await expect(page.locator(".level-top b")).toHaveText("Experte");
  await expect(page.locator(".controls .flag")).toContainText("Dein eigenes ist Anfänger");

  // Neuer Besuch ohne Parameter: wieder das eigene Level
  await page.goto("/walgau/hensler");
  await expect(page.locator(".level-top b")).toHaveText("Anfänger");
  await expect(page.locator(".controls .flag")).toHaveCount(0);

  // Zurück auf eigenes Level per Knopf
  await page.goto("/walgau/hensler?level=erfahren");
  await page.locator(".controls .flag button").click();
  await expect(page.locator(".level-top b")).toHaveText("Anfänger");
  await expect(page).toHaveURL(/level=anfaenger$/);

  // Selbst am Regler ändern speichert
  await page.goto("/walgau/hensler?level=experte");
  await page.locator('input[aria-label="Pilotenlevel"]').fill("1");
  await expect(page.locator(".controls .flag")).toHaveCount(0);
  await page.goto("/walgau/hensler");
  await expect(page.locator(".level-top b")).toHaveText("Fortgeschritten");
});

test("Handy: Karte erst auf Knopfdruck, Ebenen schlank", async ({ page }) => {
  await page.goto("/walgau/hensler");
  await expect(page.locator(".daycard").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "3D-Karte laden" })).toBeVisible();
  await expect(page.locator(".col-side")).toHaveCount(0);
});

test("Desktop: Karte lädt selbst neben der Tabelle, alle Ebenen, Zeitregler wirkt", async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/praettigau/fanas");
  await expect(page.locator(".col-side .map-layers")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".map-layers")).toContainText("Sperrzonen");
  await expect(page.locator(".map-layers")).toContainText("Windfeld");
  const slider = page.locator('input[aria-label="Stunde auf der Karte"]');
  await slider.fill("12");
  await expect(page.locator(".map-time .tltime")).toHaveText("12:00");
  await expect(page.locator(".htable .c.sel").first()).toBeVisible();   // gleiche Stunde in der Tabelle
  await expect(page.locator(".map-card .flag").first()).toContainText("Gleitpfad 12 Uhr");
  expect(errors).toEqual([]);
});
