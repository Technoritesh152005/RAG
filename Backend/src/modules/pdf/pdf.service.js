import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { extractPdfStructure, naiveReadingOrder } from "./";
import { downloadPdf } from "../../lib/supabase.storage";

const parentSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 100,
  separators: ["\n\n", "\n", ". ", ""],
});

const childSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 300,
  overlap: 30,
  separators: ["\n\n", "\n", ". ", ""],
});

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
    if (onProgress) await onProgress({ status: "extracting_pdf" });
    const pages = await extractPdfStructure(tempPath);

    const documentTitle = `Document (${pages.length}) pages`;
    const pendingChunks = [];
    // the above can be [  {childTextBatch1, parentText1, prntId,parentId, }]

    //all pages are maintained in pages chunks. it looks like array of objects
    for (const page of pages) {
      if (onProgress)
        await onProgress({
          stage: "processing_page",
          page: page.pageNumber,
          total: pages.length,
        });

      const ordered = naiveReadingOrder(page.items);
      const pageText = reconstructLines(ordered);

      if (!pageText.trim() || pageText.length < 20) continue;

      const parentChunks = await parentSplitter.splitText(pageText);

      //each parent may have multiple chunks
      // array.entries gives us [index,content], further u destructur
      for (const [parentIndex, parentText] of parentChunks.entries()) {
        const parentId = generateId(
          `${sourceId}-p${page.pageNumber}-parent-${parentIndex}`,
        );
        //return an array of string
        const childTextsBatch = await childSplitter.splitText(parentText);
        pendingChunks.push({
          childTextsBatch,
          parentText,
          parentId,
          parentIndex,
          page: page.pageNumber,
        });
      }
    }

    //final approach making structured way those chunks
    const finalChunks = [];
    for (const pc of pendingChunks) {
      pc.childTextsBatch.forEach((chunk, chunkIndex) => {
        if (!chunk.trim()) return;
        const chunkId = generateId(
          `${sourceId}-p${pc.page}-${pc.parentIndex}-${chunkIndex}-${chunk}`,
        );
        finalChunks.push({
          id: chunkId,
          childText: chunk,
          parentText: pc.parentText,
          metadata: {
            sourceId,
            workspaceId,
            pageUrl: `document.pdf#page=${pc.page}`,
            sectionHeading: `Page ${pc.page}`,
            parentIndex: pc.parentIndex,
            parentId: pc.parentId,
            chunkIndex,
            pageNumber: pc.page,
          },
        });
      });
    }

    console.log(
      `PDF ingestion: ${pages.length} pages → ${finalChunks.length} chunks`,
    );
    return { allChunks: finalChunks, pageCount: pages.length };
  } catch (error) {
    throw new error();
  } finally {
    // always clean up the temp copy — the durable original stays in
    // Supabase Storage untouched, available for future re-indexing
    await fs.unlink(tempPath).catch(() => {});
  }
}

function generateId(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

function reconstructLines(orderedItems){

    const lines =[]
    let currentLine = []
    let lastY = null
    for(const item of orderedItems){

        //the current item and last y if diff is greater than 3 then its said to be in new line
        if(lastY !== null && Math.abs(item.y - lastY)>3){
            lines.push(currentLine.map(i=>i.text).join(' '))
            currentLine = [];
        }
        //if not then push in same line
        currentLine.push(item)
        lastY = item.y
    }
    //last meh kuch toh reh jayega if not found differentiator of y coordinates
    if (currentLine.length > 0) lines.push(currentLine.map(i => i.text).join(' '))
    return lines.join('\n')
}