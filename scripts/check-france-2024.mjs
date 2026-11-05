#!/usr/bin/env node
/** Browser smoke test for the marker-only manuscript log against out/. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDir = process.env.FRANCE_SCREENSHOT_DIR || path.join(os.tmpdir(), "france-2024-qa");
await fs.mkdir(screenshotDir, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const types = { ".html": "text/html", ".txt": "text/x-component", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = process.env.FRANCE_BASE_URL ? null : http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (name.endsWith("/")) name += req.headers.rsc === "1" ? "index.txt" : "index.html";
    const file = path.resolve(root, "out", `.${name}`);
    if (!file.startsWith(path.join(root, "out") + path.sep)) throw new Error("Invalid path");
    const bytes = await fs.readFile(file);
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
if (server) await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = process.env.FRANCE_BASE_URL?.replace(/\/$/, "") || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true,
  args: ["--no-proxy-server", "--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];
try {
  for (const width of [1440, 390]) for (const lang of ["en", "zh"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const failures = [];
    page.on("pageerror", error => failures.push(error.message));
    await page.goto(`${base}/travel/${lang === "zh" ? "zh/" : ""}france-2024/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-log-map] canvas", { timeout: 20000 });
    await page.waitForSelector('[data-map-visual-ready="true"]', { timeout: 20000 });
    await page.waitForFunction(() => !document.body.classList.contains("tl-veil-boot"), null, { timeout: 10000 });
    const textAxis = await page.evaluate(() => ({
      hero: document.querySelector('.fr-hero h1').getBoundingClientRect().left,
      day: document.querySelector('#day-0314 .fr-day-heading h2').getBoundingClientRect().left,
    }));
    assert(Math.abs(textAxis.hero - textAxis.day) <= 2, `hero and day text columns should align: ${JSON.stringify(textAxis)}`);
    assert.equal(await page.locator(".fr-day").count(), 12);
    assert.equal(await page.locator("[data-fr-block]").count(), 67, "80 manuscript fragments are grouped into 67 chapters");
    assert.equal(await page.locator(".fr-leg-row").count(), 0, "route controls must be absent");
    assert.equal(await page.locator(".fr-map-legend .fr-legend-symbol").count(), 3, "legend mirrors the three marker shapes");
    assert.equal(await page.locator(".fr-day-capsule").count(), 12);
    assert.equal(await page.locator('.fr-map-tools button[aria-label="跟随阅读"], .fr-map-tools button[aria-label="全程总览"]').count(), 0);
    assert.equal(await page.locator('.fr-map-tools button[aria-label="卫星影像"], .fr-map-tools button[aria-label="地形图"]').count(), 2);
    assert.equal(await page.locator('.fr-hero').evaluate(hero => getComputedStyle(hero).borderBottomWidth), '0px');
    assert.equal(await page.locator('.fr-day').first().evaluate(day => getComputedStyle(day).borderBottomWidth), '0px');
    assert.equal(await page.locator('.fr-block').first().evaluate(block => getComputedStyle(block).borderBottomWidth), '0px');
    const secondTitle = await page.locator("#day-0315 .fr-day-heading h2").innerText();
    assert.equal(await page.locator("#day-0315 .fr-day-capsule strong").innerText(), lang === "zh" ? `第 2 日：${secondTitle}` : "Day 2: Versailles and the Louvre");
    const expectedSubtitles = ["Arrival in Paris", "Versailles and the Louvre", "The Eiffel Tower and Museums", "Paris in the Rain", "The Left Bank", "A Day in Cologne", "Amsterdam", "Back to Paris", "The Right Bank", "Odds and Ends", "A Day in Rouen", "The Journey Home"];
    assert.deepEqual(await page.locator('.fr-day-subtitle').allInnerTexts(), expectedSubtitles);
    assert.equal(await page.locator("#day-0315 .fr-day-weather").innerText(), "小雨多云");
    const orsay = page.locator('#day-0314 [data-fr-block="s3039-03"]');
    assert.equal(await orsay.locator("h3").innerText(), "奥赛美术馆\nMusée d’Orsay");
    assert.equal(await orsay.locator("p").first().innerText().then(text => text.includes("奥赛美术馆")), false);
    const orsayText = await orsay.innerText();
    assert.equal((orsayText.match(/『[^』]+』（[^）]+）/g) || []).length, 16, "Orsay artworks align with sixteen artists");
    assert(orsayText.includes('『罗马人的堕落』（托马·库图尔）'));
    assert.equal(await page.locator('.fr-story').innerText().then(text => /[《》]/.test(text)), false, 'published work titles use 『』');
    assert.equal(await page.locator(".fr-block-top, .fr-place-dot").count(), 0, "source identifiers stay in data, not prose");
    assert.equal(await page.locator('#day-0316 [data-fr-place="eiffel"]').count(), 1, "Eiffel continuation and viewing list share a chapter");
    assert.equal(await page.locator('#day-0321 [data-fr-place="rijksmuseum"]').count(), 1, "Rijksmuseum notes share a chapter");
    assert.equal(await page.locator(".fr-review").count(), 17, "all 16 blog reviews plus one return visit");
    assert.equal(await page.locator(".fr-review-source").count(), 16, "each full review links to its source article section");
    assert(await page.locator('#day-0316 .fr-review').first().evaluate(review => {
      const kicker = review.querySelector('.fr-review-kicker').getBoundingClientRect();
      const link = review.querySelector('.fr-review-source').getBoundingClientRect();
      return Math.abs(kicker.top - link.top) < 8;
    }), "source link sits on the dining meta row");
    assert.equal(await page.locator(".fr-review-revisit").count(), 1, "the second Café du Marché visit does not duplicate the review");
    assert.equal(await page.locator("#day-0314 .fr-evidence").count(), 0, "days without visit times omit the control");
    assert.equal(await page.locator('#day-0321 .fr-review-source').last().getAttribute('href'), '/blog/2024/fr2024-cuisine/#café-du-marché-8-分');
    assert.equal(await page.locator('#day-0323 .fr-review-return-link').getAttribute('href'), '#cuisine-13-day-0321');
    assert.equal(await page.locator('#day-0316 .fr-review-order').count(), 2, "orders and prices are separated from commentary");
    assert.equal(await page.locator('.fr-cuisine-source a[href="/blog/2024/fr2024-cuisine/"]').count(), 1);
    for (const [day, restaurant, after] of [
      ["day-0314", "Les Rupins", "s3040-01"],
      ["day-0315", "Bouillon République", "s3040-03"],
      ["day-0317", "Pierre Herme", "s3044-04"],
      ["day-0319", "Augustiner am Heumarkt", "s3047-03"],
    ]) {
      assert.equal(await page.locator(`#${day} .fr-review`).filter({ hasText: restaurant }).count(), 1);
      assert(await page.locator(`#${day} .fr-blocks`).evaluate((root, [name, anchor]) => {
        const visit = root.querySelector(`[data-fr-block="${anchor}"]`);
        const dining = [...root.querySelectorAll(".fr-review")].find(el => el.textContent.includes(name));
        return Boolean(visit && dining && visit.parentElement === dining.parentElement && visit.nextElementSibling === dining);
      }, [restaurant, after]), `${restaurant} should appear after ${after}`);
    }
    if (lang === "zh") {
      assert(await page.locator('#day-0314 .fr-review').filter({ hasText: 'Les Rupins' }).locator('.fr-review-kicker').innerText().then(text => text.includes('晚餐')));
      assert(await page.locator('#day-0315 .fr-review').filter({ hasText: 'Bouillon République' }).locator('.fr-review-kicker').innerText().then(text => text.includes('午餐')));
      assert(await page.locator('#day-0317 .fr-review').filter({ hasText: 'Pierre Herme' }).locator('.fr-review-kicker').innerText().then(text => text.includes('下午茶')));
    }
    assert.equal(await page.locator('#day-0317 .fr-evidence li').filter({ hasText: "下午茶 · Pierre Hermé" }).count(), 1);
    const canvas = await page.locator("[data-log-map] canvas").boundingBox();
    assert(canvas && canvas.width > 200 && canvas.height > 200, "visible map canvas");
    await page.waitForFunction(() => document.querySelectorAll(".fr-marker.overview").length === 4, null, { timeout: 5000 });

    if (lang === "zh" && width === 390) {
      await page.mouse.move(95, 190); await page.mouse.down(); await page.mouse.move(135, 215, { steps: 8 }); await page.mouse.up();
      await page.waitForSelector(".resume-story", { timeout: 5000 });
      assert(await page.locator('.resume-story').evaluate(button => {
        const a = button.getBoundingClientRect();
        return [...document.querySelectorAll('.fr-map-caption, .fr-map-tools, .travel-log-back')].every(element => {
          const b = element.getBoundingClientRect();
          return a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        });
      }), "resume button must not overlap the map caption, toolbar or back button");
      assert(await page.locator('.fr-map-tools').evaluate(tools => {
        const a = tools.getBoundingClientRect();
        const b = document.querySelector('.travel-log-back').getBoundingClientRect();
        return a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
      }), "map toolbar must clear the back button");
      await page.screenshot({ path: path.join(screenshotDir, "france-2024-mobile-resume.png") });
      await page.locator(".resume-story").click();
      assert.equal(await page.locator(".fr-map-pane").getAttribute("data-camera-mode"), "follow");
    }

    if (lang === "zh" && width === 1440) {
      await page.locator(".fr-marker.overview").filter({ hasText: "Köln" }).click();
      await page.waitForFunction(() => document.querySelector(".fr-map-caption")?.textContent?.includes("03-19"), null, { timeout: 5000 });
      await page.waitForFunction(() => document.querySelectorAll(".fr-marker:not(.overview)").length > 4, null, { timeout: 5000 });
      await page.screenshot({ path: path.join(screenshotDir, "france-2024-markers-day-0319-1440.png") });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(() => document.querySelectorAll(".fr-marker.overview").length === 4, null, { timeout: 5000 });
      const sat = page.getByRole('button', { name: '卫星影像' });
      const topo = page.getByRole('button', { name: '地形图' });
      await sat.click();
      assert.equal(await sat.getAttribute('aria-pressed'), 'true');
      assert(await page.locator('.map-attrib').innerText().then(text => text.includes('Esri')));
      await topo.click();
      assert.equal(await sat.getAttribute('aria-pressed'), 'false');
      assert.equal(await topo.getAttribute('aria-pressed'), 'true');
      assert(await page.locator('.map-attrib').innerText().then(text => text.includes('OpenTopoMap')));
      await topo.click();
      assert.equal(await topo.getAttribute('aria-pressed'), 'false');
      assert(await page.locator('.map-attrib').innerText().then(text => text.includes('CARTO')));
      await page.mouse.move(280, 350); await page.mouse.down(); await page.mouse.move(330, 400, { steps: 10 }); await page.mouse.up();
      await page.waitForSelector(".resume-story", { timeout: 5000 });
      assert.equal(await page.locator('.fr-map-tools').evaluate(el => Math.round(el.getBoundingClientRect().top)), 14, 'map controls stay in place after dragging');
      await page.locator(".resume-story").click();
      assert.equal(await page.locator(".fr-map-pane").getAttribute("data-camera-mode"), "follow");
      const capsuleY = await page.locator('#day-0316').evaluate(day => day.getBoundingClientRect().top + scrollY + Number.parseFloat(getComputedStyle(day).paddingTop));
      await page.evaluate(y => window.scrollTo({ top: y - 180, behavior: 'instant' }), capsuleY);
      await page.waitForFunction(() => !document.querySelector('#day-0316 .fr-day-capsule').classList.contains('is-stuck'));
      const normalWidth = await page.locator('#day-0316 .fr-day-capsule').evaluate(el => el.getBoundingClientRect().width);
      await page.evaluate(y => window.scrollTo({ top: y + 90, behavior: 'instant' }), capsuleY);
      await page.waitForFunction(() => document.querySelector('#day-0316 .fr-day-capsule').classList.contains('is-stuck'));
      const stuckWidth = await page.locator('#day-0316 .fr-day-capsule').evaluate(el => el.getBoundingClientRect().width);
      assert(stuckWidth > normalWidth + 40, `sticky capsule should expand: ${normalWidth} -> ${stuckWidth}`);
      await page.evaluate(() => {
        const day = document.querySelector('#day-0316');
        window.scrollTo({ top: day.getBoundingClientRect().bottom + scrollY - 10, behavior: 'instant' });
      });
      await page.waitForFunction(() => !document.querySelector('#day-0316 .fr-day-capsule').classList.contains('is-stuck'));
      await page.evaluate(() => {
        const heading = document.querySelector("#day-0316 .fr-day-heading");
        window.scrollTo({ top: heading.getBoundingClientRect().top + scrollY - 210, behavior: "instant" });
      });
      await page.waitForTimeout(250);
      const alignment = await page.evaluate(() => {
        const rail = document.querySelector(".tnav-rail").getBoundingClientRect();
        const heading = document.querySelector("#day-0316 .fr-day-heading").getBoundingClientRect();
        const date = document.querySelector("#day-0316 .fr-day-capsule time").getBoundingClientRect();
        return { gutter: rail.left - heading.right, dateGap: rail.left - date.right };
      });
      assert(alignment.gutter >= 20 && alignment.gutter <= 70, `rail should align with story gutter: ${JSON.stringify(alignment)}`);
      assert(alignment.dateGap >= 12, `sticky date must clear the rail: ${JSON.stringify(alignment)}`);
    }

    await page.locator("#day-0321").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".fr-map-caption")?.textContent?.includes("03-21"), null, { timeout: 7000 });
    await page.waitForFunction(() => document.querySelectorAll(".fr-marker:not(.overview)").length > 0, null, { timeout: 7000 });
    assert(await page.locator(".fr-marker.dining").count() > 0, "dated dining marker is visible");
    assert.equal(await page.locator(".fr-marker:not(.overview)").first().evaluate(el => el.firstChild?.nodeType), 1, "place markers contain no numeric text");
    const markersBefore = await page.locator(".fr-marker").count();
    await page.locator("#day-0321 .fr-evidence summary").click();
    assert.equal(await page.locator("#day-0321 .fr-evidence li").count(), 7);
    assert.equal(await page.locator(".fr-marker").count(), markersBefore, "opening timetable must preserve map markers");
    const pantryReview = page.locator("#day-0321 .fr-review").first();
    assert(await pantryReview.innerText().then(text => text.includes("豌豆汤")));
    await page.locator("#day-0322").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".fr-map-caption")?.textContent?.includes("03-22"), null, { timeout: 7000 });
    const firstMarker = page.locator(".fr-marker.dining").first();
    const markerName = await firstMarker.getAttribute("title");
    assert(markerName, "marker has place label");
    await firstMarker.click();
    await page.waitForFunction(name => document.querySelector(".fr-map-caption")?.textContent?.includes(name), markerName, { timeout: 7000 });
    assert.equal(await page.locator(".fr-leg-row").count(), 0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(overflow <= 2, `horizontal overflow: ${overflow}px`);
    assert.equal(failures.length, 0, failures.join("; "));
    if (lang === "zh") await page.screenshot({ path: path.join(screenshotDir, `france-2024-markers-${width}.png`) });
    results.push(`${lang} ${width}px: 12 days, 67 manuscript chapters, 17 inline restaurant visits, marker/timetable interaction, no routes or overflow`);
    await page.close();
  }
  const widePage = await browser.newPage({ viewport: { width: 1920, height: 900 }, reducedMotion: 'reduce' });
  await widePage.goto(`${base}/travel/zh/france-2024/`, { waitUntil: 'domcontentloaded' });
  const wideAxis = await widePage.evaluate(() => ({
    hero: document.querySelector('.fr-hero h1').getBoundingClientRect().left,
    day: document.querySelector('#day-0314 .fr-day-heading h2').getBoundingClientRect().left,
  }));
  assert(Math.abs(wideAxis.hero - wideAxis.day) <= 2, `wide hero and day columns should align: ${JSON.stringify(wideAxis)}`);
  results.push('zh 1920px: hero and day text columns align');
  await widePage.close();
  const gallery = await browser.newPage();
  await gallery.goto(`${base}/travel/`, { waitUntil: "domcontentloaded" });
  assert(await gallery.locator('a[href="/travel/france-2024/"]').count() > 0, "France card appears on Travel hub");
  results.push("Travel hub: France draft card present");
  await gallery.close();
  console.log(results.join("\n"));
} finally { await browser.close(); server?.close(); }
