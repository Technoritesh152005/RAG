// minimum point difference above body size to count as a genuinely
// distinct, larger heading font — guards against rounding noise
// (11.9pt vs 12.0pt shouldn't register as two different sizes)
const SIZE_ROUND_PRECISION = 0.5
const MIN_HEADING_DELTA = 1.0

// bold-at-body-size headings are capped at this level — they're
// visually distinguished but we have no size signal to rank them
// relative to size-based headings, so they default to the lowest tier
const BOLD_FALLBACK_LEVEL = 3
const BOLD_HEADING_MAX_LENGTH = 80

// builds a frequency histogram of rounded font sizes across every
// line in the document — needs the WHOLE document first, same
// "global context before local decision" shape as header/footer
// detection in 3b
export function buildFontHistogram(pagesWithLines) {
  const histogram = new Map()

  for (const page of pagesWithLines) {
    for (const line of page.lines) {
      const rounded = roundSize(line.fontSize)
      histogram.set(rounded, (histogram.get(rounded) || 0) + 1)
    }
  }

  return histogram
}

// body text is whichever size appears most often — by far the most
// reliable signal, since body paragraphs always dominate a document's
// line count compared to the handful of headings
function detectBodySize(histogram) {
  let bodySize = null
  let maxCount = 0
  for (const [size, count] of histogram) {
    if (count > maxCount) {
      maxCount = count
      bodySize = size
    }
  }
  return bodySize
}

// ranks distinct sizes larger than body text into heading levels 1-3,
// largest size = level 1 (#), down to level 3 (###) — matching the
// same 3-level cap the doc chunker's splitBySections already expects
export function classifyHeadingSizes(histogram) {
  const bodySize = detectBodySize(histogram)

  const largerSizes = [...histogram.keys()]
    .filter(size => size >= bodySize + MIN_HEADING_DELTA)
    .sort((a, b) => b - a)   // largest first

  const sizeLevelMap = new Map()
  largerSizes.slice(0, 3).forEach((size, index) => {
    sizeLevelMap.set(size, index + 1)   // 1, 2, 3
  })

  console.log(
    `Heading detection: body size=${bodySize}pt, ` +
    `${sizeLevelMap.size} heading level(s) found: ` +
    `[${[...sizeLevelMap.entries()].map(([s, l]) => `${s}pt=H${l}`).join(', ')}]`
  )

  return { bodySize, sizeLevelMap }
}

// decides a single line's heading level, or null if it's body text.
// checks size-based classification first, falls back to bold-at-body-size
function classifyLine(line, bodySize, sizeLevelMap) {
  const rounded = roundSize(line.fontSize)

  if (sizeLevelMap.has(rounded)) {
    return sizeLevelMap.get(rounded)
  }

  // bold fallback — handles Word-exported PDFs where headings don't
  // change size, only weight
  if (
    line.isBold &&
    rounded >= bodySize &&
    line.text.trim().length > 0 &&
    line.text.trim().length < BOLD_HEADING_MAX_LENGTH
  ) {
    return BOLD_FALLBACK_LEVEL
  }

  return null
}

// reconstructs a page's lines into markdown text — heading lines get
// '#'/'##'/'###' prefixes the existing splitBySections regex already
// recognizes, so no new parsing logic is needed downstream
export function reconstructMarkdown(lines, bodySize, sizeLevelMap) {
  return lines
    .map(line => {
      const level = classifyLine(line, bodySize, sizeLevelMap)
      const cleanText = line.text.trim().replace(/^#+\s*/, '')   // strip stray # if present in source text
      if (!cleanText) return null
      return level ? `${'#'.repeat(level)} ${cleanText}` : cleanText
    })
    .filter(Boolean)
    .join('\n')
}

// document title — the single largest-font line on page 1, if it's
// short enough to plausibly be a title rather than a paragraph.
// falls back to a generic label when no clear candidate exists
export function detectDocumentTitle(pagesWithLines, pageCount) {
  const firstPage = pagesWithLines[0]
  if (!firstPage || firstPage.lines.length === 0) {
    return `Document (${pageCount} pages)`
  }

  const largest = firstPage.lines.reduce(
    (max, line) => (line.fontSize > max.fontSize ? line : max),
    firstPage.lines[0]
  )

  const candidate = largest.text.trim()
  if (candidate.length > 0 && candidate.length < 120) {
    return candidate
  }

  return `Document (${pageCount} pages)`
}

function roundSize(size) {
  return Math.round(size / SIZE_ROUND_PRECISION) * SIZE_ROUND_PRECISION
}