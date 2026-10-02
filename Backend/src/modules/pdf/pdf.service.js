import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { extractPdfStructure, extractPageLines } from "./pdf-extractor.service.js";
import { downloadPdf } from "../../lib/supabase.storage.js";
import {
  buildFontHistogram,
  classifyHeadingSizes,
  reconstructMarkdown,
  detectDocumentTitle,
} from "./pdf-heading-detector.service.js";
import detectHeaderFooterLines, {
  stripHeaderFooterLines,
} from "./header-footer-detector.service.js";
import { chunkPage } from "../crawler/chunker.service.js";

export async function ingestPdfSource({
  sourceId,
  workspaceId,
  storagePath,
  onProgress,
}) {
  //the file download and keep it in temp dir or file
  if (onProgress) await onProgress({ status: "downloading_pdf" });
  const fileBuffer = await downloadPdf(storagePath);

  //write in temp storage of local disk
  const tempPath = path.join(
    os.tmpdir(),
    `pdf-${sourceId}-${crypto.randomBytes(4).toString("hex")}.pdf`,
  );
  await fs.writeFile(tempPath, fileBuffer);

  try {
    if (onProgress) await onProgress({ status: "extracting_pdf/" });

    /* What the extract pdf structure does is take a downloadable file  and returns an array of pags
    where inside each pages  each page pageNumber is given and also its items 
    coordination along x and y axis*/
    const pages = await extractPdfStructure(tempPath);

    const pagesWithLine = pages.map((page) => ({
      pageNumber: page.pageNumber,
      height: page.height,
      lines: extractPageLines(page),
    }));

    if (onProgress) await onProgress({ status: "detecting_headings" });
    const headerFooterSet = await detectHeaderFooterLines(pagesWithLine);

    //basically removes all lines which r in headerFooterSet
    const cleanedPages = pagesWithLine.map((page) => ({
      ...page,
      lines: stripHeaderFooterLines(page.lines, headerFooterSet),
    }));

    if (onProgress) await onProgress({ status: "detecting_headings" });
    const histogram = buildFontHistogram(cleanedPages);
    const { bodySize, sizeLevelMap } = classifyHeadingSizes(histogram);
    const documentTitle = detectDocumentTitle(cleanedPages, pages.length);

    const allChunks = [];

    //all pages are maintained in pages chunks. it looks like array of objects
    for (const page of cleanedPages) {
      if (onProgress)
        await onProgress({
          stage: "processing_page",
          page: page.pageNumber,
          total: pages.length,
        });

      const markdown = reconstructMarkdown(page.lines, bodySize, sizeLevelMap);
      if (!markdown.trim() || markdown.length < 20) continue;

      // SAME function the doc crawler uses — section-aware splitting
      // on the headings we just reconstructed, parent/child chunking,
      // deterministic IDs. Zero duplicate chunking logic between
      // source types.
      const pageChunks = await chunkPage({
        content: markdown,
        pageUrl: `document.pdf#page=${page.pageNumber}`,
        pageTitle: documentTitle,
        sourceId,
        workspaceId,
      });

      allChunks.push(...pageChunks);
    }
    console.log(
      `PDF ingestion: ${pages.length} pages, ${headerFooterSet.size} header/footer line(s) stripped, ` +
        `${sizeLevelMap.size} heading level(s) detected → ${allChunks.length} chunks`,
    );
    return { allChunks, pageCount: pages.length };
  } catch (error) {
    throw error;
  } finally {
    // always clean up the temp copy — the durable original stays in
    // Supabase Storage untouched, available for future re-indexing
    await fs.unlink(tempPath).catch(() => {});
  }

  function generateId(str) {
    return crypto.createHash("md5").update(str).digest("hex");
  }

  function reconstructLines(orderedItems) {
    const lines = [];
    let currentLine = [];
    let lastY = null;
    for (const item of orderedItems) {
      //the current item and last y if diff is greater than 3 then its said to be in new line
      if (lastY !== null && Math.abs(item.y - lastY) > 3) {
        lines.push(currentLine.map((i) => i.text).join(" "));
        currentLine = [];
      }
      //if not then push in same line
      currentLine.push(item);
      lastY = item.y;
    }
    //last meh kuch toh reh jayega if not found differentiator of y coordinates
    if (currentLine.length > 0)
      lines.push(currentLine.map((i) => i.text).join(" "));
    return lines.join("\n");
  }
}
