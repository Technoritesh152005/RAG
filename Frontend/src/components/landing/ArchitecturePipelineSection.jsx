import React from "react";
import { motion } from "framer-motion";
import { 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Database, 
  Sparkles, 
  Sliders, 
  GitBranch,
  Lock,
  Search
} from "lucide-react";

export default function ArchitecturePipelineSection() {
  return (
    <section className="architecture-section" id="architecture">
      <div className="architecture-container">
        
        {/* Section Header */}
        <div className="section-header center">
          <div className="section-kicker">
            <Cpu className="kicker-icon" />
            <span>ENTERPRISE ENGINE BLUEPRINT</span>
          </div>
          <h2 className="section-title">
            Engineered for Precision Knowledge Retrieval
          </h2>
          <p className="section-desc">
            Inside the core of DocuFlux's neural search stack — designed to eliminate context loss, overcome vector search blind spots, and guarantee full workspace data isolation.
          </p>
        </div>

        {/* 4 Deep Dive Architecture Cards */}
        <div className="arch-grid">
          
          <div className="arch-card">
            <div className="card-num">01</div>
            <div className="card-top">
              <GitBranch className="card-icon emerald" />
              <h3>Query-Adaptive Intent Router</h3>
            </div>
            <p className="card-text">
              Not all questions require heavy vector searches. Our classifier evaluates query intent to choose between cached fast lookup, sparse keyword matching, or full hybrid dense retrieval.
            </p>
            <div className="card-tag-row">
              <span className="arch-tag">Latency Reduction</span>
              <span className="arch-tag">Intent Classifier</span>
            </div>
          </div>

          <div className="arch-card">
            <div className="card-num">02</div>
            <div className="card-top">
              <Layers className="card-icon cyan" />
              <h3>Dense + BM25 Reciprocal Rank Fusion</h3>
            </div>
            <p className="card-text">
              Combines dense vector semantic similarity with sparse BM25 keyword matching via Reciprocal Rank Fusion (RRF). Resolves technical term mismatches that pure vector embeddings miss.
            </p>
            <div className="card-tag-row">
              <span className="arch-tag">BM25 Sparse</span>
              <span className="arch-tag">Dense Vectors</span>
              <span className="arch-tag">RRF Ranking</span>
            </div>
          </div>

          <div className="arch-card">
            <div className="card-num">03</div>
            <div className="card-top">
              <Database className="card-icon amber" />
              <h3>Parent-Child Context Chunking</h3>
            </div>
            <p className="card-text">
              Indexes micro-chunks (200 tokens) for high vector hit resolution, but passes full parent section context (1,000 tokens) to the LLM during answer synthesis so sentences are never truncated.
            </p>
            <div className="card-tag-row">
              <span className="arch-tag">Context Preservation</span>
              <span className="arch-tag">Parent Mapper</span>
            </div>
          </div>

          <div className="arch-card">
            <div className="card-num">04</div>
            <div className="card-top">
              <Lock className="card-icon emerald" />
              <h3>Multi-Tenant Workspace Canvas Isolation</h3>
            </div>
            <p className="card-text">
              Every indexed website, PDF, and video is isolated within strict workspace boundary keys. React docs will never leak into Vue workspaces, ensuring enterprise security.
            </p>
            <div className="card-tag-row">
              <span className="arch-tag">Strict Security</span>
              <span className="arch-tag">Workspace Isolation</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
