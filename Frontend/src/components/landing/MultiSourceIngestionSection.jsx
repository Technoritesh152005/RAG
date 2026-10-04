import React from "react";
import { motion } from "framer-motion";
import { GlobeIcon, PdfIcon, YoutubeIcon, IsometricStackGraphic } from "./Icons";

export default function MultiSourceIngestionSection() {
  return (
    <section className="sources-section-clean" id="sources">
      <div className="section-container">
        
        <div className="sources-section-layout">
          
          {/* Left Graphic Box: Multiple Source Support + Dotted Connector + 3D Isometric Stack */}
          <motion.div 
            className="sources-graphic-card"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Mini Sources Stacked Column */}
            <div className="mini-sources-col">
              <span className="mini-sources-heading">Multiple Source Support</span>

              <div className="mini-source-card">
                <div className="mini-icon-circle blue">
                  <GlobeIcon width={18} height={18} color="#0284C7" />
                </div>
                <div className="mini-source-info">
                  <strong>Websites</strong>
                  <span>Crawl recursive docs</span>
                </div>
              </div>

              <div className="mini-source-card">
                <div className="mini-icon-circle red">
                  <PdfIcon width={18} height={18} color="#DC2626" />
                </div>
                <div className="mini-source-info">
                  <strong>PDFs</strong>
                  <span>Upload and extract text</span>
                </div>
              </div>

              <div className="mini-source-card">
                <div className="mini-icon-circle red-yt">
                  <YoutubeIcon width={20} height={20} />
                </div>
                <div className="mini-source-info">
                  <strong>YouTube</strong>
                  <span>Transcribe and index</span>
                </div>
              </div>
            </div>

            {/* Dotted Flow Connector SVG */}
            <div className="dotted-connector-svg">
              <svg width="60" height="120" viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 20C30 20 50 40 60 60C50 80 30 100 0 100" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" />
              </svg>
            </div>

            {/* Center 3D Knowledge Base Stack */}
            <div className="knowledge-stack-center">
              <IsometricStackGraphic width={180} height={180} />
              <div className="unified-kb-badge">Unified Knowledge Base</div>
              <span className="kb-metadata-sub">Chunks + Embeddings + Metadata</span>
            </div>

          </motion.div>

          {/* Right Text & List Column */}
          <motion.div 
            className="sources-right-content"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="section-kicker-purple">
              <span className="dot"></span> Multi-Source Ingestion
            </span>

            <h2 className="sources-headline-main">
              One knowledge base.<br />
              Multiple sources.
            </h2>

            <p className="sources-subtext-main">
              Bring all your important content together in one place and search across it.
            </p>

            <div className="sources-list-block">
              
              <div className="source-list-item">
                <div className="list-icon-box blue">
                  <GlobeIcon width={22} height={22} color="#0284C7" />
                </div>
                <div className="list-item-text">
                  <strong>Websites</strong>
                  <p>Crawl documentation paths and keep content in sync.</p>
                </div>
              </div>

              <div className="source-list-item">
                <div className="list-icon-box red">
                  <PdfIcon width={22} height={22} color="#DC2626" />
                </div>
                <div className="list-item-text">
                  <strong>PDFs</strong>
                  <p>Upload technical docs, manuals and internal knowledge.</p>
                </div>
              </div>

              <div className="source-list-item">
                <div className="list-icon-box red-yt">
                  <YoutubeIcon width={24} height={24} />
                </div>
                <div className="list-item-text">
                  <strong>YouTube</strong>
                  <p>Turn video transcripts into searchable knowledge.</p>
                </div>
              </div>

            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
