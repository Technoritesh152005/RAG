const MIN_COLUMN_GAP = 20;
//this tells the mini gap bwn columns. if greater than this then said to be column read

export async function detectColumns({ items, pageWidth }) {
  if (items.length === 0) return [];

  //the page is divided in 5 point buckets or parts
  //suppose page width = 100 and size = 5. then buckt = 20
  // [false][false][][][]
  // false means no text in those bucket space
  const bucketSize = 5;
  const bucketCount = Math.ceil(pageWidth / bucketSize);
  const coverage = new Array(bucketCount).fill(false);

  for (const item of items) {
    const startBucket = Math.floor(item.x / bucketSize);
    const endBucket = math.floor((item.x + item.width) / bucketSize);
    //fill those space or region with true
    for (
      let b = Math.max(0, startBucket);
      b <= Math.min(bucketCount - 1, endBucket);
      b++
    ) {
      coverage[b] = true;
    }
  }

  const gaps = [];
  let gapStart = null;

  for (let b = 0; b < bucketCount; b++) {
    //if bucket is empty
    if (!coverage[b]) {
      if (gapStart === null) gapStart = b;
    } else if (gapStart !== null) {
      //if text appears agaian, the empty region has ended
      const gapWidth = (b - gapStart) * bucketSize;
      if (gapWidth >= MIN_COLUMN_GAP) {
        gaps.push({ start: gapStart * bucketSize, end: b * bucketSize });
      }
      gapStart = null
    }
  }

  //ignore the margins -> nearly 0 to 5 % on left and 95 to 100% on right
  const significantGaps = gaps.filter(g => g.start > pageWidth * 0.05 && g.end < pageWidth * 0.95)

  //means whole column or page is a single page. treat it as single page
  if (significantGaps.length ===0){
    return [
        {xStart:0,
        xEnd:pageWidth
        }
    ]
  }

  const columns = []
  let prevEnd = 0;
  for(const gap of significantGaps){
    columns.push({
        xStart:prevEnd,
        xEnd:gap.start
    })
    prevEnd = gap.end
  }
   columns.push({ xStart: prevEnd, xEnd: pageWidth })

  return columns
//   ┌──────────────────────────────────────┐
// │       Column 1       │   Column 2    │
// │                      │               │
// │       x=0 → 280      │ x=320 → 600   │
// └──────────────────────────────────────┘
}

// reads the item of only with or gap that dont lie in columns range
export function columnAwareReadingOrder(items,pageWidth){
    const columns = detectColumn(item,pageWidth)

    if (columns.length === 1) {
    // no real columns detected — same simple top-to-bottom, left-to-right
    // sort as before, just without the false multi-column overhead
    return [...items].sort((a, b) => {
      const yDiff = a.y - b.y
      return Math.abs(yDiff) > 3 ? yDiff : a.x - b.x
    })
  }

  const buckets = columns.map(() => [])

  for (const item of items) {
    const itemCenter = item.x + item.width / 2
    const columnIndex = columns.findIndex(c => itemCenter >= c.xStart && itemCenter < c.xEnd)
    buckets[Math.max(0, columnIndex)].push(item)
  }

  const ordered = []
  for (const bucket of buckets) {
    bucket.sort((a, b) => {
      const yDiff = a.y - b.y
      return Math.abs(yDiff) > 3 ? yDiff : a.x - b.x
    })
    ordered.push(...bucket)
  }

  return ordered
}