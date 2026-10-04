import React from "react";
import { ArrowRight } from "lucide-react";

export default function BottomCTASection({ onGetStarted, onSignIn }) {
  return (
    <section className="bottom-cta-section">
      <div className="section-container">
        
        <div className="cta-content-wrap">
          <span className="section-kicker-green">
            <span className="dot"></span> GET STARTED
          </span>

          <h2 className="cta-headline">
            Your documentation is already out there.<br />
            <span className="cta-green-highlight">Make it useful.</span>
          </h2>

          <p className="cta-subtext">
            Connect your sources, build your knowledge base, and start asking questions.
          </p>

          <div className="cta-btn-row">
            <button className="btn-cta-emerald" onClick={onGetStarted} type="button">
              <span>Create Free Workspace</span>
              <ArrowRight className="btn-icon" />
            </button>
            <button className="btn-cta-dark" onClick={onSignIn} type="button">
              <span>View Demo</span>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
