import React from "react";
import { ArrowRight, FileText } from "lucide-react";
import { GlobeIcon, PdfIcon, YoutubeIcon } from "./Icons";

export default function UnderTheHoodSection() {
  return (
    <section className="hood-section" id="hood">
      <div className="section-container">
        
        <div className="hood-layout">
          
          {/* Left Text Column */}
          <div className="hood-left-text">
            <span className="section-kicker-green">
              <span className="dot"></span> UNDER THE HOOD
            </span>
            <h2 className="hood-title">
              How it works<br />
              end-to-end.
            </h2>
            <p className="hood-subtitle">
              A simplified view of the pipeline that powers DocuFlux.
            </p>
          </div>

          {/* Right Flow Diagram */}
          <div className="hood-flow-diagram">
            
            {/* Step 1: Sources */}
            <div className="flow-column sources-col">
              <div className="flow-item">
                <GlobeIcon className="w-4 h-4" color="#0284C7" />
                <span>Website</span>
              </div>
              <div className="flow-item">
                <PdfIcon className="w-4 h-4" color="#DC2626" />
                <span>PDF</span>
              </div>
              <div className="flow-item">
                <YoutubeIcon className="w-4 h-4" />
                <span>YouTube</span>
              </div>
            </div>

            <div className="flow-arrow"><ArrowRight className="w-4 h-4" /></div>

            {/* Step 2: Ingestion */}
            <div className="flow-column pipeline-col">
              <span className="col-title">Ingestion</span>
              <div className="sub-item">Crawl / Parse</div>
              <div className="sub-item">Clean & Chunk</div>
              <div className="sub-item">Deduplicate</div>
              <div className="sub-item">Generate Embeddings</div>
              <div className="sub-item">Index (Async Queue)</div>
            </div>

            <div className="flow-arrow"><ArrowRight className="w-4 h-4" /></div>

            {/* Step 3: Retrieval */}
            <div className="flow-column pipeline-col">
              <span className="col-title">Retrieval</span>
              <div className="sub-item">Vector Search</div>
              <div className="sub-item">Keyword Search</div>
              <div className="sub-item">Hybrid Fusion</div>
              <div className="sub-item">Reranking</div>
              <div className="sub-item">Context Selection</div>
            </div>

            <div className="flow-arrow"><ArrowRight className="w-4 h-4" /></div>

            {/* Step 4: LLM */}
            <div className="flow-column pipeline-col">
              <span className="col-title">LLM</span>
              <div className="sub-item">Generate Answer</div>
              <div className="sub-item">Ground with Sources</div>
            </div>

            <div className="flow-arrow"><ArrowRight className="w-4 h-4" /></div>

            {/* Step 5: Final Output Card */}
            <div className="flow-column output-col">
              <div className="output-card">
                <FileText className="out-icon" />
                <span>Answer<br />with Citations</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
