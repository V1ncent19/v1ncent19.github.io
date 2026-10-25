#!/usr/bin/env node
/** Browser regression against out/. No installed browser dependency is required by the site.
 * PLAYWRIGHT_MODULE=file:///.../playwright-core/index.mjs CHROME_PATH=... node scripts/check-travel-log.mjs
 * Starts its own loopback server; does not modify content or contact production.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const types = { ".html": "text/html", ".txt": "text/x-component", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (name.endsWith("/")) name += req.headers.rsc === "1" ? "index.txt" : "index.html";
    const file = path.resolve(root, "out", `.${name}`);
    if (!file.startsWith(path.join(root, "out") + path.sep)) throw new Error("Invalid path");
    if ((await fs.stat(file)).isDirectory()) {
      res.writeHead(308, { Location: `${name}/` }).end(); return;
    }
    const bytes = await fs.readFile(file);
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true,
  args: ["--no-proxy-server", "--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(page) {
  await page.waitForSelector("[data-log-map] canvas", { timeout: 15000 });
  await page.waitForFunction(() => !/\b(tl-veil-boot|pj-boot|tl-veil-open|pj-veil-open)\b/.test(document.body.className));
  await delay(600);
  const map = await page.locator("[data-log-map]").boundingBox();
  const canvas = await page.locator("[data-log-map] canvas").boundingBox();
  const strip = await page.locator(".map-attrib,.pj-attrib").boundingBox();
  assert(canvas.height >= map.height - strip.height - 2, "Map canvas must fill the visible map area");
}
async function drag(page, x, y, toY) {
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, toY, { steps: 12 }); await page.mouse.up(); await delay(350);
}
try {
  if (process.argv.includes("--entry") || process.argv.includes("--entry-spa")) {
    // Freeze the real CSS animation at animationstart, then sample its actual
    // transforms. A screenshot taken after loading would miss this regression.
    const watchEntry = () => {
      window.__entryFrames = [];
      window.__exitFrames = [];
      const initial = () => {
        if (/\b(tl-veil-boot|pj-boot)\b/.test(document.body?.className ?? "")) {
          const style = getComputedStyle(document.body, "::before");
          window.__entryFrames.push({ scale: new DOMMatrixReadOnly(style.transform).a, content: style.content });
          return;
        }
        requestAnimationFrame(initial);
      };
      requestAnimationFrame(initial);
      document.addEventListener("animationstart", e => {
        if (e.pseudoElement === "::before" && e.animationName === "travel-log-entry-open") {
          const animation = document.body.getAnimations({ subtree: true }).find(a => a.animationName === e.animationName);
          if (animation) { animation.pause(); animation.currentTime = 0; window.__entryAnimation = animation; }
        }
        if (e.animationName === "travel-log-wipe") {
          const el = document.querySelector(".travel-log-wipe");
          const animation = el?.getAnimations()[0];
          if (animation) {
            animation.pause();
            for (const fraction of [0, .5, 1]) {
              animation.currentTime = Number(animation.effect.getTiming().duration) * fraction;
              const style = getComputedStyle(el);
              window.__exitFrames.push({ scale: new DOMMatrixReadOnly(style.transform).a, origin: style.transformOrigin });
            }
            window.__saveExitFrames?.(window.__exitFrames);
          }
        }
      }, true);
    };
    for (const width of process.argv.includes("--entry-spa") ? [] : [1440, 390]) {
      for (const id of ["ptes-2025", "just-because"]) {
        for (const lang of ["en", "zh"]) {
          const page = await browser.newPage({ viewport: { width, height: 900 } });
          const errors = []; page.on("pageerror", e => errors.push(e.message));
          let exitFrames = [];
          await page.exposeFunction("__saveExitFrames", frames => { exitFrames = frames; });
          await page.addInitScript(watchEntry);
          await page.goto(`${base}/travel/${lang === "zh" ? "zh/" : ""}${id}/`);
          await page.waitForFunction(() => window.__entryAnimation);
          await page.evaluate(() => window.__entryAnimation.ready);
          assert.equal(await page.evaluate(() => window.__entryFrames[0]?.scale), 1, `${id}/${lang}: first paint covers full viewport`);
          const samples = [];
          for (const fraction of [0, .25, .5, .75, 1]) {
            const sample = await page.evaluate(async fraction => {
              const animation = window.__entryAnimation;
              // The true endpoint fires animationend and removes the pseudo-element.
              animation.currentTime = Number(animation.effect.getTiming().duration) * Math.min(fraction, .9999);
              await new Promise(requestAnimationFrame);
              await new Promise(requestAnimationFrame);
              const style = getComputedStyle(document.body, "::before");
              return { scale: new DOMMatrixReadOnly(style.transform).a, origin: style.transformOrigin,
                position: style.position, inset: style.inset };
            }, fraction);
            samples.push(sample);
            if (process.env.TRAVEL_ENTRY_SHOTS && lang === "en" && [0, .5, 1].includes(fraction)) {
              await fs.mkdir(process.env.TRAVEL_ENTRY_SHOTS, { recursive: true });
              await page.screenshot({ path: path.join(process.env.TRAVEL_ENTRY_SHOTS, `${id}-${width}-${fraction}.png`) });
            }
          }
          assert.equal(samples[0].scale, 1);
          assert(samples.at(-1).scale < .001);
          assert(samples[2].scale > 0 && samples[2].scale < 1, "Opening has a visible intermediate frame");
          assert(samples.every((s, i) => i === 0 || s.scale <= samples[i - 1].scale), "Coverage must shrink monotonically");
          assert(samples.every(s => s.origin === `${width}px 450px` && s.position === "fixed" && s.inset === "0px"), "Right edge stays fixed; reveal moves left to right");
          await page.evaluate(() => window.__entryAnimation.finish());
          await page.waitForFunction(() => !/\b(tl-veil-boot|pj-boot|tl-veil-open|pj-veil-open)\b/.test(document.body.className));
          await delay(1700);
          assert.equal(await page.evaluate(() => /\b(tl-veil-open|pj-veil-open)\b/.test(document.body.className)), false, "Late fallback must not re-add curtain classes");
          await page.locator(".travel-log-back").click();
          await page.waitForURL(`${base}/travel/${lang === "zh" ? "zh/" : ""}`);
          assert.equal(exitFrames[0]?.scale, 0);
          assert.equal(exitFrames.at(-1)?.scale, 1);
          assert(exitFrames[1].scale > 0 && exitFrames[1].scale < 1);
          assert(exitFrames.every(s => s.origin === `${width}px 450px`), "Exit grows from the same fixed right edge");
          assert.deepEqual(errors, [], `${id}/${lang}: entry browser errors`);
          console.log(`${id}/${lang}/${width}: full coverage -> rightward reveal -> clean exit OK`);
          await page.close();
        }
      }
    }
    // Real Next Link navigation must start the curtain without a fresh HTML parser.
    const spa = await browser.newPage();
    await spa.addInitScript(watchEntry);
    await spa.goto(`${base}/blog/`);
    await spa.getByRole("button", { name: /^Travel/ }).click();
    await spa.waitForURL("**/blog/#travel");
    await spa.evaluate(() => { window.__spaMarker = "same-document"; });
    await spa.locator('a[href^="/travel/just-because"]').first().click();
    await spa.waitForFunction(() => window.__entryAnimation);
    assert.equal(await spa.evaluate(() => window.__spaMarker), "same-document");
    assert.equal(await spa.evaluate(() => window.__entryFrames[0]?.scale), 1);
    await spa.evaluate(() => window.__entryAnimation.finish()); await spa.close();
    console.log("Next Link entry: pre-paint full curtain OK");

    // Let the CSS-only fallback run when application scripts cannot hydrate.
    const fallback = await browser.newPage();
    await fallback.route("**/_next/static/**/*.js", route => route.abort());
    await fallback.goto(`${base}/travel/ptes-2025/`);
    assert.equal(await fallback.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.body, "::before").transform).a), 1);
    if (process.env.TRAVEL_ENTRY_SHOTS) {
      await fs.mkdir(process.env.TRAVEL_ENTRY_SHOTS, { recursive: true });
      await fallback.screenshot({ path: path.join(process.env.TRAVEL_ENTRY_SHOTS, "initial-full-coverage.png") });
    }
    await delay(4200);
    assert.equal(await fallback.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.body, "::before").transform).a), 0);
    assert.equal(await fallback.locator(".tl-veil-band").evaluate(el => getComputedStyle(el).opacity), "0");
    await fallback.close(); console.log("Hydration unavailable: CSS curtain and wordmark fallback OK");

    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(`${base}/travel/zh/just-because/`); await ready(reduced);
    assert.equal(await reduced.evaluate(() => getComputedStyle(document.body, "::before").content), "none");
    await reduced.close(); console.log("Reduced motion: no curtain OK");
  } else {
  for (const id of ["ptes-2025", "just-because"]) {
    for (const lang of ["en", "zh"]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
      const errors = []; page.on("pageerror", e => errors.push(e.message));
      await page.goto(`${base}/travel/${lang === "zh" ? "zh/" : ""}${id}/`);
      await ready(page);
      const map = page.locator("[data-log-map]");
      const defaultH = id === "ptes-2025" ? 360 : 522;
      assert(Math.abs((await map.boundingBox()).height - defaultH) <= 1, `${id}: default height`);
      assert.equal(await page.locator(".travel-log-back").getAttribute("href"), lang === "zh" ? "/travel/zh" : "/travel");
      assert.equal(await page.locator(".site-chrome-header").isVisible(), false);
      const count = await page.locator("[data-log-section]").count();
      assert.equal(count, id === "ptes-2025" ? 69 : 38);

      // Dragging moves the map, divider and sticky geometry; persistence is per trip.
      let strip = await page.locator(".map-attrib,.pj-attrib").boundingBox();
      await drag(page, strip.x + strip.width - 12, strip.y + strip.height / 2, strip.y + strip.height / 2 + 80);
      assert(Math.abs((await map.boundingBox()).height - (defaultH + 80)) <= 2, `${id}: split drag`);
      await page.reload(); await ready(page);
      assert(Math.abs((await map.boundingBox()).height - (defaultH + 80)) <= 2, `${id}: split persistence`);
      for (const width of [1023, 1024, 1440, 390]) {
        await page.setViewportSize({ width, height: 900 }); await delay(700);
        const r = await map.boundingBox();
        assert(Math.abs(r.width - (width < 1024 ? width : width * .46)) < 2, `${id}: ${width} breakpoint width`);
        assert(Math.abs(r.height - (width < 1024 ? defaultH + 80 : 900)) < 2, `${id}: ${width} breakpoint height ${r.height}`);
      }
      // A slider gesture previews the chapter and moves the document continuously.
      const slider = page.locator(".tnav-scrub,.pjr-scrub");
      const r = await slider.boundingBox();
      await page.mouse.move(r.x + r.width * .25, r.y + r.height / 2); await page.mouse.down();
      await page.mouse.move(r.x + r.width * .6, r.y + r.height / 2, { steps: 8 });
      assert(await page.locator(".tnav-scrub-box,.pjr-scrub-box").evaluate(el => el.classList.contains("is-on")));
      assert((await page.locator(".tnav-scrub-text,.pjr-scrub-text").textContent()).length > 0);
      await page.mouse.up(); await delay(1200);
      assert.equal(await page.locator(".tnav-scrub-box,.pjr-scrub-box").evaluate(el => el.classList.contains("is-on")), false);
      const fraction = await page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight));
      assert(Math.abs(fraction - .6) < .025, `${id}: scrub fraction ${fraction}`);

      // Both drawers use the same close and jump contract.
      await page.locator(".tnav-toc-btn,.pjr-toc").click();
      await page.waitForSelector("aside.open[role=dialog]", { state: "visible" });
      assert(await page.locator("aside[role=dialog]").isVisible());
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector(".tnav-toc-btn,.pjr-toc").getAttribute("aria-expanded") === "false");
      assert.equal(await page.locator(".tnav-toc-btn,.pjr-toc").getAttribute("aria-expanded"), "false");
      await page.locator(".tnav-toc-btn,.pjr-toc").click();
      await page.waitForSelector("aside.open[role=dialog]", { state: "visible" });
      const rows = page.locator(".tnav-row,.pjr-row");
      await rows.nth(4).click(); await delay(1600);
      assert.equal(await page.locator(".tnav-toc-btn,.pjr-toc").getAttribute("aria-expanded"), "false");
      assert(await rows.nth(4).evaluate(el => el.classList.contains("active")), `${id}: selected chapter follows story`);

      if (id === "just-because" && lang === "en") {
        // Exercise actual map picking, including the map -> story jump and dismissal latch.
        const data = JSON.parse(await fs.readFile(path.join(root, "content/travel/just-because/page.json"), "utf8"));
        const stop = data.stops[12];
        await page.waitForFunction(() => window.__pjMap?.getLayer("pj-stops-hit"));
        if (await page.locator(".pj-popup-close").count()) await page.locator(".pj-popup-close").click();
        await page.evaluate(s => window.__pjMap.jumpTo({ center: [s.lon, s.lat], zoom: 18 }), stop);
        await page.waitForFunction(s => {
          const m = window.__pjMap;
          return m.queryRenderedFeatures(m.project([s.lon, s.lat]), { layers: ["pj-stops-hit"] }).some(f => f.properties.id === s.id);
        }, stop);
        const point = await page.evaluate(s => {
          const p = window.__pjMap.project([s.lon, s.lat]);
          const r = window.__pjMap.getCanvas().getBoundingClientRect();
          return { x: r.x + p.x, y: r.y + p.y };
        }, stop);
        await page.mouse.click(point.x, point.y);
        try {
          await page.waitForFunction(id => document.querySelector('[data-pj-active="1"]')?.getAttribute("data-pj-stop") === id, stop.id, { timeout: 8000 });
        } catch (error) {
          console.log(await page.evaluate(({ point, stop }) => ({ point, stop: stop.id,
            active: document.querySelector('[data-pj-active="1"]')?.getAttribute("data-pj-stop"),
            stack: document.elementsFromPoint(point.x, point.y).slice(0, 6).map(el => el.className),
          }), { point, stop }));
          throw error;
        }
        await page.waitForSelector(".pj-popup-close");
        await page.locator(".pj-popup-close").click(); await delay(250);
        await page.evaluate(() => scrollBy(0, 2)); await delay(250);
        assert.equal(await page.locator(".pj-popup").count(), 0, "Manual popup close survives same chapter");
        await page.locator(".pjr-toc").click();
        await page.waitForSelector("aside.open");
        await rows.nth(15).click();
        await page.waitForSelector(".pj-popup-close");
      }

      // Theme and camera ownership work after navigation and resizing.
      await page.locator('.travel-log-tools button[role="radio"]').nth(2).click(); await delay(500);
      assert(await page.locator("html").evaluate(el => el.classList.contains("dark")));
      await page.locator('.travel-log-tools button[role="radio"]').nth(1).click(); await delay(700);
      assert.equal(await page.locator("html").evaluate(el => el.classList.contains("dark")), false);
      await page.waitForFunction(() => (window.__tmap ?? window.__pjMap)?.isStyleLoaded(), null, { timeout: 30000 });
      const canvas = await page.locator("[data-log-map] canvas").boundingBox();
      const gestureInfo = await page.evaluate(({ x, y }) => ({
        stack: document.elementsFromPoint(x, y).slice(0, 6).map(el => el.className),
        dragEnabled: (window.__tmap ?? window.__pjMap).dragPan.isEnabled(),
        loaded: (window.__tmap ?? window.__pjMap).isStyleLoaded(),
      }), { x: canvas.x + canvas.width * .5, y: canvas.y + canvas.height * .55 });
      await drag(page, canvas.x + canvas.width * .5, canvas.y + canvas.height * .55, canvas.y + canvas.height * .7);
      await delay(400);
      assert.equal(await page.locator("[data-camera-mode]").getAttribute("data-camera-mode"), "manual", `${id}/${lang}: gesture should pause camera ${JSON.stringify({canvas, gestureInfo})}`);
      await page.evaluate(() => window.scrollBy(0, 500)); await delay(700);
      assert.equal(await page.locator("[data-camera-mode]").getAttribute("data-camera-mode"), "manual");
      if (id === "ptes-2025") {
        await page.locator(".resume-story").click();
      } else {
        await page.getByTitle("回到全貌（整条路线）").click();
        assert.equal(await page.locator("[data-camera-mode]").getAttribute("data-camera-mode"), "overview");
        await page.evaluate(() => window.scrollBy(0, 300)); await delay(400);
        assert.equal(await page.locator("[data-camera-mode]").getAttribute("data-camera-mode"), "overview");
        await page.getByTitle("随阅读移动镜头").click();
      }
      assert.equal(await page.locator("[data-camera-mode]").getAttribute("data-camera-mode"), "follow");
      assert.deepEqual(errors, [], `${id}/${lang}: browser exceptions`);
      results.push(`${id}/${lang}: layout, split, persistence, breakpoints, scrub, drawer, theme, camera OK`);
      console.log(results.at(-1));
      await page.locator(".travel-log-back").click();
      await page.waitForURL(`${base}/travel/${lang === "zh" ? "zh/" : ""}`);
      assert.equal(await page.locator(".site-chrome-header").isVisible(), true);
      assert.equal(await page.evaluate(() => document.body.classList.contains("tl-immersive")), false);
      await page.close();
    }
  }
  // Loading failure must release the curtain and show an intelligible error.
  const failed = await browser.newPage();
  await failed.route("**/data/travel/ptes-2025/track.json", route => route.fulfill({ status: 503, body: "unavailable" }));
  await failed.goto(`${base}/travel/ptes-2025/`);
  await failed.waitForSelector('[role="alert"]');
  await failed.waitForFunction(() => !document.body.classList.contains("tl-veil-boot"));
  results.push("GPS failure: visible error and released curtain OK");
  await failed.close();
  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto(`${base}/travel/zh/just-because/`); await ready(reduced);
  assert.equal(await reduced.evaluate(() => /\b(tl-veil-boot|pj-boot)\b/.test(document.body.className)), false);
  assert.equal(await reduced.evaluate(() => getComputedStyle(document.body, "::before").content), "none");
  results.push("Reduced motion: curtain disabled OK"); await reduced.close();

  const legacy = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await legacy.addInitScript(() => localStorage.setItem("tl-map-split", "410"));
  await legacy.goto(`${base}/travel/ptes-2025/`); await ready(legacy);
  assert(Math.abs((await legacy.locator("[data-log-map]").boundingBox()).height - 410) < 2);
  await legacy.goto(`${base}/travel/just-because/`); await ready(legacy);
  assert(Math.abs((await legacy.locator("[data-log-map]").boundingBox()).height - 522) < 2);
  results.push("Existing split preference retained; another trip keeps its own default OK");
  await legacy.close();
  console.log(results.join("\n"));
  }
} finally { await browser.close(); server.close(); }
