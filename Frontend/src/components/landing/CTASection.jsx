import React from "react";
import { ArrowRight, Sparkles, Cpu, ShieldCheck, Zap } from "lucide-react";

export default function CTASection({ onGetStarted, onSignIn }) {
  return (
    <section className="cta-section">
      <div className="cta-container">
        
        <div className="cta-card">
          <div className="cta-badge">
            <Sparkles className="badge-icon" />
            <span>START INDEXING YOUR DOCS IN 60 SECONDS</span>
          </div>

          <h2 className="cta-title">
            Stop Guessing. Start Querying Grounded Docs.
          </h2>

          <p className="cta-desc">
            Index live web documentation, parse technical PDFs, or sync YouTube transcripts into isolated RAG workspaces with zero setup hassle.
          </p>

          <div className="cta-actions">
            <button className="btn-cta-primary" onClick={onGetStarted} type="button">
              <span>Launch Free Workspace</span>
              <ArrowRight className="btn-icon" />
            </button>
            <button className="btn-cta-secondary" onClick={onSignIn} type="button">
              <span>Sign In to Account</span>
            </button>
          </div>

          <div className="cta-highlights">
            <div className="highlight-item">
              <ShieldCheck className="h-icon emerald" />
              <span>100% Citation Grounded</span>
            </div>
            <div className="highlight-item">
              <Zap className="h-icon cyan" />
              <span>Sub-40ms Semantic Cache</span>
            </div>
            <div className="highlight-item">
              <Cpu className="h-icon amber" />
              <span>Hybrid Vector + BM25</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
