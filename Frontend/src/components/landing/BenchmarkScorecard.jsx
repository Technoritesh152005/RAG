import React from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Sparkles, 
  Activity, 
  Award, 
  CheckCircle2, 
  TrendingUp, 
  Zap, 
  FileText,
  BarChart3
} from "lucide-react";

export default function BenchmarkScorecard() {
  return (
    <section className="benchmarks-section" id="benchmarks">
      <div className="benchmarks-container">
        
        {/* Section Header */}
        <div className="section-header center">
          <div className="section-kicker">
            <Award className="kicker-icon" />
            <span>EMPIRICAL RAG TRIAD EVALUATIONS</span>
          </div>
          <h2 className="section-title">
            Validated by Automated RAG Benchmarks
          </h2>
          <p className="section-desc">
            We don't just claim our RAG engine works — we run automated test suites measuring Retrieval Hit Rate, Mean Reciprocal Rank (MRR), and LLM Faithfulness. Here are real benchmark metrics from our workspace evaluation runs.
          </p>
        </div>

        {/* Big Highlight Scorecard Banner */}
        <div className="scorecard-hero-card">
          <div className="scorecard-top">
            <div className="scorecard-meta">
              <span className="eval-tag">LATEST EVAL RUN #29784f98</span>
              <span className="eval-label">Supabase & Technical Glossary Test Set (11 Cases)</span>
            </div>
            <div className="eval-status">
              <CheckCircle2 className="status-icon" />
              <span>100% CONFIDENT PASS</span>
            </div>
          </div>

          <div className="metrics-grid">
            
            <div className="metric-box">
              <div className="metric-header">
                <span className="metric-title">Retrieval Hit Rate</span>
                <ShieldCheck className="metric-icon emerald" />
              </div>
              <div className="metric-value">100%</div>
              <div className="metric-bar">
                <div className="bar-fill emerald" style={{ width: "100%" }}></div>
              </div>
              <p className="metric-sub">Target chunks retrieved in top 3 results for 11/11 cases.</p>
            </div>

            <div className="metric-box">
              <div className="metric-header">
                <span className="metric-title">Mean Reciprocal Rank (MRR)</span>
                <Sparkles className="metric-icon amber" />
              </div>
              <div className="metric-value">1.00</div>
              <div className="metric-bar">
                <div className="bar-fill amber" style={{ width: "100%" }}></div>
              </div>
              <p className="metric-sub">Exact source chunk ranked #1 in every test scenario.</p>
            </div>

            <div className="metric-box">
              <div className="metric-header">
                <span className="metric-title">LLM Judge Fidelity Score</span>
                <Activity className="metric-icon cyan" />
              </div>
              <div className="metric-value">95.5%</div>
              <div className="metric-bar">
                <div className="bar-fill cyan" style={{ width: "95.5%" }}></div>
              </div>
              <p className="metric-sub">Verified by automated LLM judge for completeness & accuracy.</p>
            </div>

            <div className="metric-box">
              <div className="metric-header">
                <span className="metric-title">Absence Guard Safety</span>
                <CheckCircle2 className="metric-icon emerald" />
              </div>
              <div className="metric-value">100%</div>
              <div className="metric-bar">
                <div className="bar-fill emerald" style={{ width: "100%" }}></div>
              </div>
              <p className="metric-sub">0 hallucinations recorded when questions were out of context.</p>
            </div>

          </div>
        </div>

        {/* Real Sample Test Case Cards from evalrun-1.txt */}
        <div className="eval-cases-section">
          <h3 className="cases-title">Sample Benchmark Cases from evalrun-1.txt</h3>
          <div className="cases-grid">
            
            <div className="case-card">
              <div className="case-header">
                <span className="case-num">CASE #01</span>
                <span className="case-badge hit">HIT • MRR 1.0</span>
              </div>
              <p className="case-q">"What is an access token?"</p>
              <p className="case-a">
                "An access token is a short-lived token (typically no more than 1 hour) that authorizes a client to access resources on a server..."
              </p>
              <div className="case-footer">
                <span>Judge Score: <strong>1.0 / 1.0</strong></span>
                <span>Source: Supabase Auth Glossary</span>
              </div>
            </div>

            <div className="case-card">
              <div className="case-header">
                <span className="case-num">CASE #02</span>
                <span className="case-badge hit">HIT • MRR 1.0</span>
              </div>
              <p className="case-q">"What is the difference between auth & authorization?"</p>
              <p className="case-a">
                "Authentication is the process of verifying identity. Authorization is verifying whether that identity is allowed to access..."
              </p>
              <div className="case-footer">
                <span>Judge Score: <strong>1.0 / 1.0</strong></span>
                <span>Source: Supabase Resources</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
