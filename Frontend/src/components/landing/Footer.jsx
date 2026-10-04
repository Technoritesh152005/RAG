import React from "react";
import { ArrowUp } from "lucide-react";

export default function Footer({ onGetStarted }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="landing-footer">
      <div className="section-container">
        
        <div className="footer-top-row">
          <div className="footer-brand-box">
            <div className="brand-logo-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="footer-brand-name">DocuFlux</span>
            <span className="footer-brand-sub">Neural RAG Engine</span>
          </div>

          <div className="footer-links-group">
            <a href="#hero">Overview</a>
            <a href="#workflow">How It Works</a>
            <a href="#retrieval">Features</a>
            <a href="#evaluations">Evaluation</a>
            <a href="#hood">Tech Stack</a>
          </div>

          <button onClick={scrollToTop} className="btn-back-top" type="button">
            <span>Back to Top</span>
            <ArrowUp size={14} />
          </button>
        </div>

        <div className="footer-bottom-row">
          <p>© {new Date().getFullYear()} DocuFlux — Multi-Source Grounded RAG Architecture.</p>
          <p className="footer-privacy-text">Grounded Neural Retrieval • Zero Hallucinations</p>
        </div>

      </div>
    </footer>
  );
}

