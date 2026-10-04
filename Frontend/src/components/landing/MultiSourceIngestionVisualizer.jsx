import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  FileText, 
  Video, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Sparkles, 
  RefreshCw,
  Clock,
  ShieldAlert,
  Database
} from "lucide-react";

const INGESTION_SOURCES = [
  {
    id: "web",
    icon: Globe,
    colorClass: "emerald",
    title: "Recursive Web Documentation Crawler",
    subtitle: "Crawl entire developer doc trees without leaving your domain path.",
    features: [
      "Path-scoped recursive spidering (stays inside target domain /docs/)",
      "DOM noise & navigation boilerplate stripping",
      "H1/H2 heading-based section split for parent-child chunk mapping",
      "Automatic stale content change detection and background re-indexing"
    ],
    demoInput: "https://nextjs.org/docs/app/building-your-application",
    steps: [
      { num: "01", title: "Target URL Discovery", desc: "Extracts 24 clean internal documentation links from DOM tree" },
      { num: "02", title: "Markdown Cleanup", desc: "Strips headers, footers, and scripts; converts body into structured markdown" },
      { num: "03", title: "Parent-Child Vectorization", desc: "Generates 156 parent chunks and 420 micro-vector embeddings" }
    ],
    codePreview: `// Backend/src/modules/crawler/crawler.service.js
async function crawlDocs(rootUrl, maxDepth = 3) {
  const cleanMarkdown = await extractMainContent(rootUrl);
  const sections = splitByHeading(cleanMarkdown);
  return embedAndDeduplicate(sections);
}`
  },
  {
    id: "pdf",
    icon: FileText,
    colorClass: "cyan",
    title: "Native Technical PDF Engine",
    subtitle: "Extract complex technical manuals, architecture papers, and API specs.",
    features: [
      "Layout-aware multi-page text and table extraction",
      "Page number metadata preservation on every vector chunk",
      "Automatic document deduplication via SHA-256 content hashes",
      "Fast parallel vector embedding pipeline"
    ],
    demoInput: "architecture_whitepaper_v2.pdf (48 Pages)",
    steps: [
      { num: "01", title: "PDF Stream Parse", desc: "Reads document buffer, extracts page markers & structural headers" },
      { num: "02", title: "Context Window Chunking", desc: "Splits into overlapping 512-token windows with 50-token overlap" },
      { num: "03", title: "Vector Store Indexing", desc: "Stores dense vector embeddings with page metadata pointers" }
    ],
    codePreview: `// Backend/src/modules/pdf/pdf.service.js
async function processPdfBuffer(buffer, filename) {
  const parsed = await pdfParse(buffer);
  const chunks = chunkByTokenWindow(parsed.text, { size: 512, overlap: 50 });
  return vectorStore.upsert(chunks, { filename });
}`
  },
  {
    id: "youtube",
    icon: Video,
    colorClass: "amber",
    title: "YouTube Video Transcript Indexer",
    subtitle: "Turn video tutorials and tech talks into searchable knowledge bases.",
    features: [
      "Automatic subtitle & transcript extraction from YouTube video IDs",
      "Timestamped segment chunking (e.g. 02:15 - 03:40)",
      "Instant deep-linking back to exact video playback timestamps",
      "Cross-modal knowledge fusion alongside web docs"
    ],
    demoInput: "https://youtube.com/watch?v=dQw4w9WgXcQ (32 Min Tutorial)",
    steps: [
      { num: "01", title: "Transcript Extraction", desc: "Fetches auto-generated or manual subtitle JSON stream" },
      { num: "02", title: "Timestamped Segmentation", desc: "Groups sentences into 2-minute thematic video blocks" },
      { num: "03", title: "Citation Linking", desc: "Binds answer citations directly to video timestamp playback URLs" }
    ],
    codePreview: `// Backend/src/modules/youtube/youtube.service.js
async function indexVideoTranscript(videoUrl) {
  const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
  const segments = groupSegmentsByTime(transcript, 120); // 2 min blocks
  return storeVectorSegments(segments);
}`
  }
];

export default function MultiSourceIngestionVisualizer() {
  const [activeSource, setActiveSource] = useState(INGESTION_SOURCES[0]);

  return (
    <section className="ingestion-section" id="ingestion">
      <div className="ingestion-container">
        
        {/* Section Header */}
        <div className="section-header center">
          <div className="section-kicker">
            <Database className="kicker-icon" />
            <span>MULTI-SOURCE INGESTION ENGINE</span>
          </div>
          <h2 className="section-title">
            One Engine. Every Documentation Format.
          </h2>
          <p className="section-desc">
            Connect live developer documentation URLs, uploaded PDF whitepapers, or YouTube video playlists. DocuFlux cleans, chunks, and indexes all knowledge in unified isolated workspaces.
          </p>
        </div>

        {/* Source Switcher Buttons */}
        <div className="source-tabs">
          {INGESTION_SOURCES.map((src) => {
            const IconComp = src.icon;
            const isActive = activeSource.id === src.id;
            return (
              <button
                key={src.id}
                type="button"
                className={`source-tab-btn ${isActive ? "active " + src.colorClass : ""}`}
                onClick={() => setActiveSource(src)}
              >
                <IconComp className="src-tab-icon" />
                <span>{src.title}</span>
              </button>
            );
          })}
        </div>

        {/* Visualizer Stage Card */}
        <div className="ingestion-stage-card">
          
          <div className="stage-grid">
            
            {/* Left Column: Details & Steps */}
            <div className="stage-info">
              <div className="source-header">
                <span className={`src-badge ${activeSource.colorClass}`}>
                  <activeSource.icon className="badge-icon" />
                  <span>{activeSource.id.toUpperCase()} PIPELINE</span>
                </span>
                <h3 className="src-title">{activeSource.title}</h3>
                <p className="src-sub">{activeSource.subtitle}</p>
              </div>

              {/* Sample Input Bar */}
              <div className="demo-input-box">
                <span className="box-label">Target Knowledge Input:</span>
                <div className="box-value">
                  <code>{activeSource.demoInput}</code>
                  <span className="box-status">
                    <CheckCircle2 className="icon" /> Ready to Index
                  </span>
                </div>
              </div>

              {/* Pipeline Steps List */}
              <div className="pipeline-steps-list">
                <h4 className="steps-heading">Ingestion Steps:</h4>
                <div className="steps-container">
                  {activeSource.steps.map((st, i) => (
                    <div key={i} className="step-item">
                      <span className="item-num">{st.num}</span>
                      <div className="item-content">
                        <strong>{st.title}</strong>
                        <p>{st.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Features Bullet List */}
              <div className="features-bullets">
                {activeSource.features.map((feat, idx) => (
                  <div key={idx} className="feat-bullet">
                    <CheckCircle2 className="bullet-icon emerald" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Code Snippet & Terminal Output */}
            <div className="stage-code">
              <div className="code-header">
                <div className="terminal-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <span className="code-filename">{activeSource.id}-ingestion-service.js</span>
              </div>
              <pre className="code-body">
                <code>{activeSource.codePreview}</code>
              </pre>

              <div className="live-preview-badge">
                <RefreshCw className="spin-icon" />
                <span>Background Worker Processed 42 Pages in 1.4s</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
