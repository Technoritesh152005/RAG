import React from "react";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "./Icons";

export default function Navbar({ onSignIn, onGetStarted }) {
  return (
    <header className="landing-nav">
      <div className="nav-container">
        {/* Left Brand Logo */}
        <a href="#hero" className="nav-brand">
          <div className="brand-logo-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="brand-title">DocuFlux</span>
        </a>

        {/* Center Nav Items */}
        <nav className="nav-menu">
          <a href="#hero" className="nav-item active">Overview</a>
          <a href="#workflow" className="nav-item">How It Works</a>
          <a href="#retrieval" className="nav-item">Features</a>
          <a href="#evaluations" className="nav-item">Evaluation</a>
          <a href="#hood" className="nav-item">Tech Stack</a>
        </nav>

        {/* Right Action Buttons */}
        <div className="nav-actions">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noreferrer" 
            className="btn-nav-github"
            aria-label="GitHub Repository"
          >
            <GithubIcon width={20} height={20} color="#0F172A" />
          </a>

          <button className="btn-nav-livedemo" onClick={onGetStarted} type="button">
            <span>Live Demo</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

