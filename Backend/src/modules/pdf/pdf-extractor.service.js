import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs/promises";
import { columnAwareReadingOrder } from "./column-detector.service.js";

export async function extractPdfStructure(filePath) {
  const data = await fs.readFile(filePath);
  const doc = await getDocument({ data: new Uint8Array(data) }).promise;

  const pages = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    const items = textContent.items
      .filter((item) => item.str && item.str.trim().length > 0)
      .map((item) => ({
        text: item.str,
        // pdf.js transform: [scaleX, skewX, skewY, scaleY, x, y]
        // y is measured from the BOTTOM of the page in PDF coordinate
        // space — flip it so top-of-page = 0, far more intuitive for
        // every reading-order and line-grouping calculation downstream
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        fontSize: Math.round(item.transform[0] * 10) / 10,
        fontName: item.fontName,
        width: item.width,
        height: item.height,
      }));

    pages.push({
      pageNumber: pageNum,
      width: viewport.width,
      items,
      height: viewport.height,
    });
    // free page resources immediately — long PDFs otherwise accumulate
    // memory across all pages before GC has a chance to run
    page.cleanup();
  }
  

  console.log(
    `Extracted ${pages.length} pages, ${pages.reduce((s, p) => s + p.items.length, 0)} text items total`,
  );
  return pages;
}


// reconstructs a page's raw text items into ordered lines, using
// column-aware reading order so multi-column pages don't interleave
// incorrectly. Each line carries its y-position (for header/footer
// zone detection), representative font size, and bold flag (for
// heading detection) — everything later phases need, computed once.
export function extractPageLines(page) {
  const ordered = columnAwareReadingOrder(page.items, page.width)

  const lines = []
  let currentLine = []
  let lastY = null

  const flush = () => {
    if (currentLine.length === 0) return
    lines.push({
      text: currentLine.map(i => i.text).join(' '),
      y: currentLine[0].y,
      // representative size = the LARGEST item in the line — a heading
      // is the dominant visual element of its line, not diluted by a
      // stray smaller-font superscript or footnote marker sharing the line
      fontSize: Math.max(...currentLine.map(i => i.fontSize)),
      isBold: currentLine.some(i => /bold|black|heavy/i.test(i.fontName))
    })
    currentLine = []
  }

  for (const item of ordered) {
    // different line if y jumped by more than a small tolerance —
    // tolerance absorbs minor baseline jitter within the same visual line
    if (lastY !== null && Math.abs(item.y - lastY) > 3) {
      flush()
    }
    currentLine.push(item)
    lastY = item.y
  }
  flush()   // last line never gets flushed inside the loop

  return lines
}