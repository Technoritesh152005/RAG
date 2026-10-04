import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { GlobeIcon, PdfIcon, YoutubeIcon, GithubIcon } from "./Icons";
import ssImg from "../../assets/ss.png";

export default function HeroSection({ onGetStarted }) {
  return (
    <section className="hero-section-fullscreen" id="hero">
      <div className="hero-container-split">
        
        {/* Left Column: Headline, Subtitle, Badge & Actions */}
        <motion.div 
          className="hero-left-col"
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Tag Badge */}
          <div className="hero-badge-row">
            <span className="badge-pill badge-purple">RAG + Multi-Source Documentation</span>
          </div>

          {/* Main Headline */}
          <h1 className="hero-title-main">
            Your documentation,<br />
            now <span className="highlight-green">searchable with AI.</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtext-main">
            DocuFlux turns websites, PDFs, and YouTube videos into a searchable knowledge base and gives accurate, source-grounded answers with citations.
          </p>

          {/* Action Buttons */}
          <div className="hero-actions-main">
            <button className="btn-try-demo" onClick={onGetStarted} type="button">
              <span>Try Live Demo</span>
              <ArrowRight size={18} />
            </button>

            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="btn-github-view"
            >
              <GithubIcon width={22} height={22} color="#0F172A" />
              <div className="btn-github-text">
                <span className="gh-label">View on</span>
                <span className="gh-title">GitHub</span>
              </div>
            </a>
          </div>

          {/* Source Feature Pills (Websites, PDFs, YouTube) */}
          <div className="source-feature-pills">
            <div className="feature-pill-item">
              <GlobeIcon width={18} height={18} color="#0284C7" />
              <span>Websites</span>
            </div>

            <div className="feature-pill-item">
              <PdfIcon width={18} height={18} color="#7C3AED" />
              <span>PDFs</span>
            </div>

            <div className="feature-pill-item red-pill">
              <YoutubeIcon width={20} height={20} />
              <span>YouTube</span>
            </div>
          </div>

        </motion.div>

        {/* Right Column: Screenshot Window Card -> Transfers to Workspace */}
        <motion.div 
          className="hero-right-col"
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <motion.div 
            className="workspace-mockup-window interactive-clickable"
            onClick={onGetStarted}
            whileHover={{ scale: 1.015, translateY: -4 }}
            transition={{ duration: 0.2 }}
            title="Click to Open Workspace"
          >
            {/* Click Hover Hint Badge */}
            <div className="mockup-click-hint">
              <span>Launch Workspace</span>
              <ExternalLink size={14} />
            </div>

            {/* Window Top Controls Header */}
            <div className="hero-mockup-header">
              <div className="hero-dots-row">
                <span className="dot-red" />
                <span className="dot-yellow" />
                <span className="dot-green" />
              </div>
              <span className="hero-mockup-title">DocuFlux Workspace Live Demo</span>
            </div>

            {/* Product Screenshot Image (ss.png) */}
            <div className="hero-image-wrapper">
              <img 
                src={ssImg} 
                alt="DocuFlux RAG Workspace Interface Screenshot" 
                className="hero-ss-image" 
              />
            </div>

          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}

