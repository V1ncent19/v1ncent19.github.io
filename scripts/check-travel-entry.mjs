#!/usr/bin/env node
/** Gallery -> travel log curtain continuity, against a successful out/ build. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const mime = { ".html": "text/html", ".txt": "text/x-component", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (name.endsWith("/")) name += req.headers.rsc === "1" ? "index.txt" : "index.html";
    const file = path.resolve(root, `.${name}`);
    if (!file.startsWith(root + path.sep)) throw new Error("Invalid path");
    if ((await fs.stat(file)).isDirectory()) { res.writeHead(308, { Location: `${name}/` }).end(); return; }
    res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const theme = process.argv.includes("--dark") ? "dark" : "light";
const reduced = process.argv.includes("--reduced");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true,
  args: ["--no-proxy-server", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  for (const width of process.argv.includes("--smoke") ? [390] : [1440, 390]) for (const lang of ["en", "zh"]) for (const id of ["ptes-2025", "just-because"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
    await page.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    await page.addInitScript(() => {
      window.__entryIdentity = {};
      window.__entryFrames = [];
      const sample = () => {
        const s = getComputedStyle(document.body, "::before");
        const sheet = s.content !== "none" && s.display !== "none";
        const source = document.querySelector(".story-tile[data-return-idle]");
        return { source: Boolean(source), target: Boolean(document.querySelector("[data-travel-log]")),
          sheet, scale: sheet ? new DOMMatrix(s.transform === "none" ? undefined : s.transform).a : 0,
          fixed: s.position === "fixed" && s.top === "0px" && s.left === "0px" && s.right === "0px" && s.bottom === "0px",
          animation: s.animationName, background: s.backgroundColor,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
      };
      const add = DOMTokenList.prototype.add;
      DOMTokenList.prototype.add = function (...tokens) {
        const result = add.apply(this, tokens);
        if (this === document.body?.classList && tokens.includes("travel-log-launch")) window.__sourceSheet = sample();
        return result;
      };
      const tick = () => {
        if (window.__recordEntry) window.__entryFrames.push(sample());
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const source = `/travel/${lang === "zh" ? "zh/" : ""}`;
    await page.goto(base + source);
    const identity = await page.evaluateHandle(() => window.__entryIdentity);
    const tile = page.locator(`.story-tile[data-gid="story-trip-${id}"]`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await tile.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__recordEntry = true; });
    await tile.click({ noWaitAfter: true });
    const target = `${source}${id}/`;
    await page.waitForURL(url => url.pathname === target, { waitUntil: "commit" });
    assert(await page.evaluate(token => token === window.__entryIdentity, identity), "Travel entry must stay in the same document");
    await page.waitForFunction(() => document.querySelector("[data-travel-log]") && !document.body.classList.contains("travel-log-launch") && !/\b(tl-veil-boot|pj-boot)\b/.test(document.body.className), undefined, { timeout: 10000 });
    const { frames, sheet } = await page.evaluate(() => { window.__recordEntry = false; return { frames: window.__entryFrames, sheet: window.__sourceSheet }; });
    if (!reduced) {
      assert(sheet?.sheet && sheet.scale === 1 && sheet.fixed, "Source must be covered before swapping routes");
      assert(!frames.some(f => f.source && !f.target && (!f.sheet || f.scale < .99)), "Never expose a reset source tile");
      const targetHold = frames.find(f => f.target && f.sheet && f.scale === 1);
      assert(targetHold, "Destination must hold the sheet before opening");
      assert.equal(sheet.background, targetHold.background, "Source and target curtain colors must match");
      assert(frames.some(f => ["travel-log-entry-open", "travel-log-entry-fallback"].includes(f.animation) && f.scale > 0 && f.scale < 1),
        `Destination must visibly open the blue curtain: ${JSON.stringify(frames.slice(-15))}`);
    } else {
      assert(!sheet, "Reduced motion must skip the source curtain");
      assert(!frames.some(f => f.sheet), "Reduced motion must skip the destination curtain");
    }
    assert(!frames.some(f => f.overflow), "No horizontal scrollbar during entry");
    assert.equal(await page.locator(".route-fade").evaluate(el => getComputedStyle(el).animationName), "none");
    await page.evaluate(() => history.back());
    await page.waitForURL(base + source, { waitUntil: "commit" });
    await tile.waitFor();
    assert(!await tile.evaluate(el => el.classList.contains("is-launching")));
    assert(await tile.evaluate(el => el.hasAttribute("data-return-idle")), "Client back must retain the return-idle guard");
    console.log(`PASS ${id} ${lang} @ ${width} ${theme}${reduced ? " reduced" : ""}: same-document handoff, curtain continuity, no horizontal overflow, clean back`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
