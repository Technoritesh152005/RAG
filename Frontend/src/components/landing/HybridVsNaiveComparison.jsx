import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Sliders, 
  Cpu, 
  Activity 
} from "lucide-react";

const COMPARISON_SCENARIOS = [
  {
    id: "outdated",
    title: "Scenario 01: Breaking Doc Changes & API Deprecations",
    question: "How do I fetch data in Next.js Server Components?",
    plainLLM: {
      answer: "Export `getServerSideProps` from your page file and read the result from props.",
      status: "OUTDATED / HALLUCINATED",
      statusType: "bad",
      reason: "Uses pre-2022 Pages Router syntax. Trained on static snapshot; unaware of App Router defaults."
    },
    naiveRAG: {
      answer: "Use `fetch` with `getStaticProps` or `getServerSideProps` depending on revalidation.",
      status: "PARTIAL / CONFUSED",
      statusType: "warn",
      reason: "Retrieved mixed chunks from old and new docs. Lacks reciprocal rank fusion to prioritize active paths."
    },
    docuflux: {
      answer: "Make the component `async` and `await fetch(...)` directly inside the component body. No export required.",
      status: "100% ACCURATE & CITED",
      statusType: "good",
      citation: "Indexed 4 mins ago from nextjs.org/docs/app/building-your-application/data-fetching",
      reason: "Recursive live web crawler extracted the latest App Router docs with section-level parent-child grounding."
    }
  },
  {
    id: "missing",
    title: "Scenario 02: Uncovered / Non-Existent API Parameters",
    question: "What is the config flag for enabling quantum GPU acceleration in DocuFlux?",
    plainLLM: {
      answer: "Set `quantumGpu: true` inside your `docuflux.config.js` file under the `performance` block.",
      status: "FABRICATED / HALLUCINATED",
      statusType: "bad",
      reason: "Invented a realistic-sounding config parameter to satisfy the user request."
    },
    naiveRAG: {
      answer: "DocuFlux supports GPU options, set `gpuMode: 'quantum'` in your setup.",
      status: "HIGH RISK HALLUCINATION",
      statusType: "bad",
      reason: "Low similarity vector chunks matched unrelated GPU keywords, forcing the LLM to guess."
    },
    docuflux: {
      answer: "Not documented in your workspace. DocuFlux strict absence handling confirms no quantum GPU config exists.",
      status: "SAFE ABSENCE RESPONSE",
      statusType: "good",
      citation: "Absence prompt guard triggered (Confidence < 0.70 threshold)",
      reason: "Rejects ungrounded queries automatically instead of fabricating non-existent features."
    }
  },
  {
    id: "code-keyword",
    title: "Scenario 03: Exact Technical Symbol & Code Search",
    question: "Where is `avgJudgeScore` calculated in the eval system?",
    plainLLM: {
      answer: "Look in `eval.js` or `metrics.py` for average scoring functions.",
      status: "VAGUE GUESS",
      statusType: "warn",
      reason: "Cannot inspect workspace files or exact variable declarations."
    },
    naiveRAG: {
      answer: "Found in `analytics.js` with similarity score 0.71.",
      status: "MISMATCHED CONTEXT",
      statusType: "warn",
      reason: "Vector embeddings alone struggle with exact variable names (e.g. `avgJudgeScore`)."
    },
    docuflux: {
      answer: "Calculated in `Backend/src/modules/eval/eval.service.js` line 142 using reciprocal rank fusion.",
      status: "EXACT BM25 + VECTOR MATCH",
      statusType: "good",
      citation: "Backend/src/modules/eval/eval.service.js #L142",
      reason: "Hybrid BM25 keyword matching catches exact code symbols that vector models lose."
    }
  }
];

export default function HybridVsNaiveComparison() {
  const [activeScenario, setActiveScenario] = useState(COMPARISON_SCENARIOS[0]);

  return (
    <section className="comparison-section" id="comparison">
      <div className="comparison-container">
        
        {/* Section Header */}
        <div className="section-header center">
          <div className="section-kicker">
            <Sliders className="kicker-icon" />
            <span>ARCHITECTURAL ADVANTAGE</span>
          </div>
          <h2 className="section-title">
            Why Naive Vector RAG Fails Enterprise Devs
          </h2>
          <p className="section-desc">
            Standard RAG uses simple vector distance that loses exact code symbols and hallucinates on missing docs. DocuFlux combines BM25 keyword matching, Query-Adaptive Routing, and strict RAG Triad prompt guards.
          </p>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="scenario-tabs">
          {COMPARISON_SCENARIOS.map((scen) => (
            <button
              key={scen.id}
              type="button"
              className={`scenario-tab-btn ${activeScenario.id === scen.id ? "active" : ""}`}
              onClick={() => setActiveScenario(scen)}
            >
              {scen.title}
            </button>
          ))}
        </div>

        {/* Question Prompt Callout */}
        <div className="question-callout">
          <span className="q-label">PROMPT:</span>
          <span className="q-text">"{activeScenario.question}"</span>
        </div>

        {/* 3-Column Comparison Cards */}
        <div className="comparison-grid">
          
          {/* Card 1: Plain LLM */}
          <div className="comp-card plain-llm">
            <div className="card-badge bad">
              <XCircle className="badge-icon" />
              <span>PLAIN LLM (GPT-4 / Groq)</span>
            </div>
            <div className="card-body">
              <p className="quote">"{activeScenario.plainLLM.answer}"</p>
              <div className="status-tag bad">{activeScenario.plainLLM.status}</div>
              <p className="reason-text">{activeScenario.plainLLM.reason}</p>
            </div>
            <div className="card-footer">
              <span className="footer-metric text-red">0% Document Grounding</span>
            </div>
          </div>

          {/* Card 2: Naive Vector RAG */}
          <div className="comp-card naive-rag">
            <div className="card-badge warn">
              <AlertTriangle className="badge-icon" />
              <span>NAIVE VECTOR-ONLY RAG</span>
            </div>
            <div className="card-body">
              <p className="quote">"{activeScenario.naiveRAG.answer}"</p>
              <div className="status-tag warn">{activeScenario.naiveRAG.status}</div>
              <p className="reason-text">{activeScenario.naiveRAG.reason}</p>
            </div>
            <div className="card-footer">
              <span className="footer-metric text-amber">High Noise • Vector-Only</span>
            </div>
          </div>

          {/* Card 3: DocuFlux Hybrid RAG */}
          <div className="comp-card docuflux-engine">
            <div className="card-badge emerald">
              <ShieldCheck className="badge-icon" />
              <span>DOCUFLUX HYBRID RAG</span>
            </div>
            <div className="card-body">
              <p className="quote">"{activeScenario.docuflux.answer}"</p>
              <div className="status-tag emerald">{activeScenario.docuflux.status}</div>
              <div className="citation-box">
                <Sparkles className="cit-icon" />
                <span>{activeScenario.docuflux.citation}</span>
              </div>
              <p className="reason-text">{activeScenario.docuflux.reason}</p>
            </div>
            <div className="card-footer emerald-bg">
              <span className="footer-metric text-emerald">100% Grounded • 0 Hallucinations</span>
            </div>
          </div>

        </div>

        {/* Feature Comparison Matrix Table */}
        <div className="matrix-wrapper">
          <h3 className="matrix-title">Engine Capability Matrix</h3>
          <div className="table-responsive">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Architecture Feature</th>
                  <th>Plain LLM</th>
                  <th>Naive Vector RAG</th>
                  <th className="highlight-col">DocuFlux Neural Engine</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sparse BM25 Keyword Search</td>
                  <td><span className="cross">✕</span></td>
                  <td><span className="cross">✕ (Vector Only)</span></td>
                  <td className="highlight-col"><span className="check">✓ Included (RRF)</span></td>
                </tr>
                <tr>
                  <td>Live Recursive Web Crawling</td>
                  <td><span className="cross">✕</span></td>
                  <td><span className="cross">✕</span></td>
                  <td className="highlight-col"><span className="check">✓ Path Scoped</span></td>
                </tr>
                <tr>
                  <td>Sub-Millisecond Semantic Cache</td>
                  <td><span className="cross">✕</span></td>
                  <td><span className="cross">✕</span></td>
                  <td className="highlight-col"><span className="check">✓ Cosine Vector Cache</span></td>
                </tr>
                <tr>
                  <td>Parent-Child Section Chunking</td>
                  <td><span className="cross">✕</span></td>
                  <td><span className="cross">✕ (Fixed Chunks)</span></td>
                  <td className="highlight-col"><span className="check">✓ Parent Context Map</span></td>
                </tr>
                <tr>
                  <td>Absence Handling Guard ("I Don't Know")</td>
                  <td><span className="cross">✕ (Hallucinates)</span></td>
                  <td><span className="cross">✕ (Forces Output)</span></td>
                  <td className="highlight-col"><span className="check">✓ Prompt Threshold Guard</span></td>
                </tr>
                <tr>
                  <td>Automated RAG Evaluation Suite</td>
                  <td><span className="cross">✕</span></td>
                  <td><span className="cross">✕</span></td>
                  <td className="highlight-col"><span className="check">✓ RAG Triad Evals Built-in</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}
