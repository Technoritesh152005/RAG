const EDGE_ZONE_RATIO = 0.1;
//skip top 10 and belo 10% content

const REPETITION_THRESHOLD = 0.6;
//the probability of whther the hear and footer is that content can be recognized by that they atleast appear in 60% of pagses

export default function detectHeaderFooterLines(pagesWithLines) {
  const lineOccurrences = new Map();
  const headerFooterSet = new Set();

  for (const page of pagesWithLines) {
    const topBoundary = page.height * EDGE_ZONE_RATIO;
    const bottomBoundary = page.height * (1 - EDGE_ZONE_RATIO);

    //getting the edge lines
    const edgeLines = page.lines.filter(
      (line) => line.y < topBoundary || line.y > bottomBoundary,
    );

    //ensure each line contribute only once per page. this helps to maintain our repeatition threshold
    const seenThisPage = new Set();

    for (const line of edgeLines) {
      const normalize = normalizeLine(line.text);
      if (!normalize || seenThisPage.has(normalize)) continue;
      seenThisPage.add(normalize);
      lineOccurrences.set(normalize, (lineOccurrences.get(normalize) || 0) + 1);
    }
  }

  const requiredCount = Math.ceil(pagesWithLines.length * REPETITION_THRESHOLD);
  for (const [normalized, count] of lineOccurrences) {
    if (count >= requiredCount) headerFooterSet.add(normalized);
  }

  console.log(
    `Header/footer detection: ${headerFooterSet.size} recurring line(s) found across ${pagesWithLines.length} pages`,
  );
  return headerFooterSet;
}
function normalizeLine(text) {
  return text.trim().toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ");
}

// strips detected header/footer lines from a single page's lines
export function stripHeaderFooterLines(lines, headerFooterSet) {
  return lines.filter(line => !headerFooterSet.has(normalizeLine(line.text)))
}