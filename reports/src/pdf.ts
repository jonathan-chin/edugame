/**
 * Printing report HTML to PDF via headless Chrome.
 *
 * Chrome resolution is deliberately forgiving, because a bundled-Chromium download is exactly
 * what a locked-down (e.g. university) network tends to block at install time. We try, in order:
 *   1. Puppeteer's own bundled browser, if it was downloaded.
 *   2. A system Google Chrome / Edge install ("channel").
 * and report which was used, so a failure is legible rather than a stack trace.
 */

import puppeteer, { type Browser } from "puppeteer";

let browserPromise: Promise<Browser> | null = null;

async function launch(): Promise<Browser> {
  try {
    return await puppeteer.launch({ headless: true });
  } catch {
    // No bundled browser — fall back to a system install. `chrome` covers Google Chrome;
    // if that is also absent, the thrown error names the remedy.
    try {
      return await puppeteer.launch({ headless: true, channel: "chrome" });
    } catch (err) {
      throw new Error(
        "No usable Chrome found. Install Google Chrome, or run `npx puppeteer browsers install chrome`.\n" +
          `(underlying error: ${(err as Error).message})`,
      );
    }
  }
}

function browser(): Promise<Browser> {
  return (browserPromise ??= launch());
}

/** Render one HTML document to a PDF file. Letter size with modest margins. */
export async function htmlToPdf(html: string, outPath: string): Promise<void> {
  const page = await (await browser()).newPage();
  try {
    // Content is fully self-contained (inline CSS + inline SVG, no network), so "load" is enough.
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: outPath,
      format: "letter",
      printBackground: true,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });
  } finally {
    await page.close();
  }
}

/** Close the shared browser once all PDFs are written. */
export async function closePdf(): Promise<void> {
  if (browserPromise) {
    await (await browserPromise).close();
    browserPromise = null;
  }
}
