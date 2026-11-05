#!/usr/bin/env node
/** Run against the production export with PLAYWRIGHT_MODULE and CHROME_PATH. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const types = { ".html": "text/html", ".txt": "text/x-component", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (name.endsWith("/")) name += req.headers.rsc === "1" ? "index.txt" : "index.html";
    const file = path.resolve(root, `.${name}`);
    if (!file.startsWith(root + path.sep)) throw new Error("Invalid path");
    if ((await fs.stat(file)).isDirectory()) { res.writeHead(308, { Location: `${name}/` }).end(); return; }
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true,
  ignoreDefaultArgs: ["--disable-back-forward-cache"],
  args: ["--no-proxy-server", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let restoredSnapshots = 0;

async function checkIdle(link, restored = false) {
  await link.waitFor({ state: "visible" });
  assert(!await link.evaluate(el => el.classList.contains("is-launching")), "Confirmation must reset after back");
  const stamp = await link.evaluate(el => {
    const chip = el.querySelector(".gateway-stamp-chip");
    return el.classList.contains("story-tile") ? getComputedStyle(chip).opacity : getComputedStyle(chip, "::before").opacity;
  });
  assert.equal(stamp, "0", "Stamp must be hidden after back");
  if (restored && await link.evaluate(el => el.classList.contains("story-tile"))) {
    assert(await link.evaluate(el => el.hasAttribute("data-return-idle")), "Restored tile must await fresh interaction");
    const visual = await link.evaluate(el => ({
      cover: getComputedStyle(el.querySelector(".story-orb")).clipPath,
      translate: getComputedStyle(el).translate,
      hover: el.matches(":hover"),
      focus: el.matches(":focus-visible"),
      transition: getComputedStyle(el.querySelector(".story-orb")).transition,
    }));
    assert(/^circle\(0(?:%|px)?\s/.test(visual.cover), `Restored hover/focus must not expose the cover: ${JSON.stringify(visual)}`);
    assert(["none", "0px", "0px 0px"].includes(visual.translate), "Restored tile must not stay lifted");
  }
}

try {
  for (const width of [1440, 390]) for (const lang of ["en", "zh"]) for (const kind of ["home", "story"]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
    await page.addInitScript(() => {
      window.__restoreEvents = [];
      window.__launchTimers = 0;
      window.addEventListener("pageshow", e => window.__restoreEvents.push(e.persisted));
      const set = window.setTimeout.bind(window);
      window.setTimeout = (fn, ms, ...args) => {
        if ((ms === 320 || ms === 360) && document.querySelector(".is-launching")) window.__launchTimers++;
        return set(fn, ms, ...args);
      };
    });
    const source = kind === "home" ? (lang === "zh" ? "/zh/" : "/") : `/travel/${lang === "zh" ? "zh/" : ""}`;
    await page.goto(base + source);
    const selectors = kind === "home" ? [".gw-item[href^='/travel']"] : await page.locator(".story-tile").evaluateAll(els => els.filter(el => el.pathname.startsWith("/travel/")).map(el => `.story-tile[data-gid="${el.dataset.gid}"]`));
    assert(selectors.length >= (kind === "story" ? 2 : 1));
    for (const selector of selectors) for (let cycle = 0; cycle < 2; cycle++) {
      const link = page.locator(selector);
      await checkIdle(link);
      await link.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const href = await link.getAttribute("href");
      await link.click({ noWaitAfter: true });
      await page.waitForURL(url => url.pathname.replace(/\/$/, "") === new URL(href, base).pathname.replace(/\/$/, ""), { waitUntil: "domcontentloaded" });
      if (kind === "story") await page.keyboard.press("Alt+ArrowLeft");
      // BFCache restores do not emit DOMContentLoaded again.
      // Headless Chrome does not execute every browser accelerator. Preserve
      // keyboard modality and invoke the same history operation when needed.
      if (new URL(page.url()).pathname !== source) await page.evaluate(() => window.history.back());
      await page.waitForURL(base + source, { waitUntil: "commit" });
      await checkIdle(page.locator(selector), true);
      if (kind === "story") {
        const restored = page.locator(selector);
        await restored.focus();
        await checkIdle(restored, true);
        if (cycle === 0) {
          await page.mouse.move(0, 0);
          await restored.hover();
        } else {
          await page.keyboard.press("Shift+Tab");
          await page.keyboard.press("Tab");
          assert(await restored.evaluate(el => document.activeElement === el), "Tab must return focus to the tile");
        }
        assert(!await restored.evaluate(el => el.hasAttribute("data-return-idle")), "Fresh hover/Tab must re-enable the card");
        await page.waitForFunction(selector => {
          const orb = document.querySelector(selector)?.querySelector(".story-orb");
          return orb && parseFloat(getComputedStyle(orb).clipPath.slice(7)) > 100;
        }, selector, { timeout: 3000 });
        const cover = await restored.evaluate(el => getComputedStyle(el.querySelector(".story-orb")).clipPath);
        assert(parseFloat(cover.slice(7)) > 100, `Fresh hover/Tab must reveal the cover again: ${cover}`);
      }
      restoredSnapshots += await page.evaluate(() => window.__restoreEvents.filter(Boolean).length);
      console.log(`  returned from ${href}, cycle ${cycle + 1}`);
    }
    // Also cover persisted restoration while a confirmation timer is pending.
    const selector = selectors[0];
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const pending = await page.locator(selector).evaluate(el => {
      const before = window.__launchTimers;
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
      const result = { active: el.classList.contains("is-launching"), timers: window.__launchTimers - before };
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      return result;
    });
    assert(pending.active);
    assert.equal(pending.timers, 1, "Duplicate click must not queue another navigation");
    await page.waitForTimeout(450);
    assert.equal(new URL(page.url()).pathname, source, "Restoration must cancel pending navigation");
    await checkIdle(page.locator(selector), true);
    console.log(`PASS ${kind} ${lang} @ ${width}: repeated back, stamp reset, duplicate guard, persisted restore`);
    await page.close();
  }
  console.log(`Observed ${restoredSnapshots} persisted-snapshot reports across back checks.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
