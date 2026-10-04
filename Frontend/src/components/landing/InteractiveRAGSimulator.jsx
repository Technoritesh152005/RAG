import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Sparkles, 
  Zap, 
  Database, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  FileText, 
  ExternalLink,
  Cpu,
  RefreshCw,
  Terminal,
  Activity,
  AlertTriangle
} from "lucide-react";

const SAMPLE_PRESETS = [
  {
    id: "auth-token",
    label: "Supabase Access Token",
    question: "What is an access token in Supabase Auth and how long is it valid?",
    route: "Hybrid Vector + BM25 Search",
    cacheHit: false,
    latency: "42ms",
    relevance: "98.4%",
    sources: [
      {
        title: "Supabase Auth Guides / Glossary",
        section: "Section 04 • Access Tokens",
        url: "https://supabase.com/docs/guides/resources/glossary",
        score: "0.984",
        snippet: "An access token is a short-lived token (typically no more than 1 hour) that authorizes a client to access resources on a server. It is usually issued as a JSON Web Token (JWT)."
      },
      {
        title: "Supabase Auth / JWT Validation",
        section: "Section 02 • Verification",
        url: "https://supabase.com/docs/guides/auth/jwts",
        score: "0.941",
        snippet: "Access tokens should be verified on every backend request using the workspace public signing key."
      }
    ],
    answer: "An access token in Supabase Auth is a short-lived JSON Web Token (JWT) — typically expiring in 1 hour — that authorizes a client application to access backend resources securely.",
    citations: ["Source 1: Glossary #Sec-04", "Source 2: JWTs #Sec-02"],
    tokens: 142,
    cost: "$0.00008"
  },
  {
    id: "auth-vs-author",
    label: "Auth vs Authorization",
    question: "What is the difference between authentication and authorization?",
    route: "Semantic Cache Hit",
    cacheHit: true,
    latency: "8ms",
    relevance: "99.8%",
    sources: [
      {
        title: "Supabase Auth Guides / Glossary",
        section: "Section 01 • Concepts",
        url: "https://supabase.com/docs/guides/resources/glossary",
        score: "0.998",
        snippet: "Authentication verifies WHO a user is. Authorization determines WHAT resources an authenticated user is permitted to access."
      }
    ],
    answer: "Authentication verifies a user's identity (e.g. credentials, biometric, or OAuth), whereas Authorization checks whether that verified identity has permissions to access a specific resource.",
    citations: ["Source 1: Glossary #Sec-01"],
    tokens: 0,
    cost: "$0.00000 (Served from Cache)"
  },
  {
    id: "query-router",
    label: "Query-Adaptive Router",
    question: "How does the Query-Adaptive Retrieval Router optimize latency?",
    route: "Query Classification Router",
    cacheHit: false,
    latency: "34ms",
    relevance: "96.7%",
    sources: [
      {
        title: "DocuFlux Architecture / Retrieval Engine",
        section: "Section 03 • Router Pipeline",
        url: "https://docuflux.io/docs/architecture/router",
        score: "0.967",
        snippet: "The router classifies prompt intent before execution to choose between direct response, sparse BM25, dense vector embedding, or multi-hop retrieval."
      }
    ],
    answer: "The Query-Adaptive Router classifies query intent before executing database lookups. Simple queries bypass heavy multi-hop vector retrieval, saving up to 70% in inference latency.",
    citations: ["Source 1: Router Pipeline #Sec-03"],
    tokens: 188,
    cost: "$0.00011"
  },
  {
    id: "absence-handling",
    label: "Absence Guard Test",
    question: "What is the secret recipe for baking chocolate cookies in DocuFlux?",
    route: "Negative Guard Active",
    cacheHit: false,
    latency: "28ms",
    relevance: "0.0%",
    sources: [],
    answer: "Not documented in the indexed context. DocuFlux strict absence handling forbids guessing or hallucinating non-technical content outside your workspace documents.",
    citations: ["No Matching Context Found"],
    tokens: 45,
    cost: "$0.00002",
    isAbsence: true
  }
];

export default function InteractiveRAGSimulator() {
  const [selectedPreset, setSelectedPreset] = useState(SAMPLE_PRESETS[0]);
  const [customQuery, setCustomQuery] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState(4); // 1: Router, 2: Cache, 3: Fusion, 4: Complete
  const [activeTab, setActiveTab] = useState("response"); // 'response' | 'chunks' | 'telemetry'

  const runSimulation = (preset) => {
    setSelectedPreset(preset);
    setCustomQuery(preset.question);
    setIsExecuting(true);
    setExecutionStep(1);

    setTimeout(() => setExecutionStep(2), 250);
    setTimeout(() => setExecutionStep(3), 500);
    setTimeout(() => {
      setExecutionStep(4);
      setIsExecuting(false);
    }, 750);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    
    // Pick or create simulation output
    const match = SAMPLE_PRESETS.find(p => p.question.toLowerCase().includes(customQuery.toLowerCase())) || {
      id: "custom-sim",
      label: "Custom Query",
      question: customQuery,
      route: "Dense Vector + BM25 Reciprocal Rank Fusion",
      cacheHit: false,
      latency: "38ms",
      relevance: "97.2%",
      sources: [
        {
          title: "Indexed Documentation Workspace",
          section: "Section 01 • Grounded Match",
          url: "https://docuflux.io/workspace",
          score: "0.972",
          snippet: `Relevant grounded snippet extracted for query: "${customQuery}". Cleaned DOM nodes, split by header, and embedded.`
        }
      ],
      answer: `Grounded answer synthesized from your indexed docs for: "${customQuery}". All claims are backed by exact section citations with zero hallucination.`,
      citations: ["Source 1: Workspace #Sec-01"],
      tokens: 165,
      cost: "$0.00009"
    };

    runSimulation(match);
  };

  return (
    <section className="simulator-section" id="simulator">
      <div className="simulator-container">
        
        {/* Section Header */}
        <div className="section-header center">
          <div className="section-kicker">
            <Sparkles className="kicker-icon" />
            <span>INTERACTIVE RAG ENGINE PLAYGROUND</span>
          </div>
          <h2 className="section-title">
            Test Live Retrieval & Citation Engine
          </h2>
          <p className="section-desc">
            Experience how DocuFlux routes developer queries, inspects semantic caches, fuses dense vector + BM25 keyword rankings, and enforces 100% cited answers.
          </p>
        </div>

        {/* Preset Selector Chips */}
        <div className="preset-bar">
          <span className="preset-title">Select Developer Scenario:</span>
          <div className="preset-buttons">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-btn ${selectedPreset.id === preset.id ? "active" : ""}`}
                onClick={() => runSimulation(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Playground Sandbox Card */}
        <div className="sandbox-card">
          
          {/* Query Bar Header */}
          <form className="sandbox-query-bar" onSubmit={handleCustomSubmit}>
            <div className="query-input-wrap">
              <Search className="search-icon" />
              <input
                type="text"
                className="query-input"
                value={customQuery || selectedPreset.question}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Type any developer question to simulate RAG pipeline..."
              />
            </div>
            <button type="submit" className="run-sim-btn" disabled={isExecuting}>
              {isExecuting ? (
                <>
                  <RefreshCw className="btn-spin-icon" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="btn-icon" />
                  <span>Execute Search</span>
                </>
              )}
            </button>
          </form>

          {/* Pipeline Live Step Tracker Bar */}
          <div className="pipeline-tracker">
            <div className={`tracker-step ${executionStep >= 1 ? "step-active" : ""}`}>
              <div className="step-num">01</div>
              <div className="step-text">
                <span className="step-label">Query Router</span>
                <span className="step-val">{selectedPreset.route}</span>
              </div>
            </div>

            <div className="step-arrow">→</div>

            <div className={`tracker-step ${executionStep >= 2 ? "step-active" : ""}`}>
              <div className="step-num">02</div>
              <div className="step-text">
                <span className="step-label">Semantic Cache</span>
                <span className={`step-val ${selectedPreset.cacheHit ? "hit" : "miss"}`}>
                  {selectedPreset.cacheHit ? "CACHE HIT (8ms)" : "CACHE MISS"}
                </span>
              </div>
            </div>

            <div className="step-arrow">→</div>

            <div className={`tracker-step ${executionStep >= 3 ? "step-active" : ""}`}>
              <div className="step-num">03</div>
              <div className="step-text">
                <span className="step-label">Hybrid Fusion</span>
                <span className="step-val">Dense + BM25 RRF ({selectedPreset.relevance})</span>
              </div>
            </div>

            <div className="step-arrow">→</div>

            <div className={`tracker-step ${executionStep >= 4 ? "step-active" : ""}`}>
              <div className="step-num">04</div>
              <div className="step-text">
                <span className="step-label">Grounded Synthesis</span>
                <span className="step-val">Verified Citations</span>
              </div>
            </div>
          </div>

          {/* Output Display Area */}
          <div className="sandbox-output">
            
            {/* View Tabs */}
            <div className="output-tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === "response" ? "active" : ""}`}
                onClick={() => setActiveTab("response")}
              >
                <Sparkles className="tab-icon" /> Grounded Answer
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "chunks" ? "active" : ""}`}
                onClick={() => setActiveTab("chunks")}
              >
                <Layers className="tab-icon" /> Retrieved Chunks ({selectedPreset.sources.length})
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "telemetry" ? "active" : ""}`}
                onClick={() => setActiveTab("telemetry")}
              >
                <Terminal className="tab-icon" /> Pipeline Telemetry
              </button>
            </div>

            {/* Tab Contents */}
            <div className="tab-content-area">
              
              {activeTab === "response" && (
                <motion.div 
                  className="response-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className={`answer-card ${selectedPreset.isAbsence ? "absence-card" : ""}`}>
                    <div className="answer-header">
                      <div className="answer-badge">
                        {selectedPreset.isAbsence ? (
                          <>
                            <AlertTriangle className="badge-icon alert" />
                            <span>STRICT NEGATIVE GUARD TRIGGERED</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="badge-icon emerald" />
                            <span>GROUNDED ANSWER • 100% CITED</span>
                          </>
                        )}
                      </div>
                      <div className="answer-metrics">
                        <span className="metric-pill">
                          <Zap className="pill-icon" /> {selectedPreset.latency}
                        </span>
                        <span className="metric-pill">
                          <Activity className="pill-icon" /> {selectedPreset.relevance} Score
                        </span>
                      </div>
                    </div>

                    <p className="answer-text">{selectedPreset.answer}</p>

                    {/* Citations Footer */}
                    <div className="citations-footer">
                      <span className="citations-label">Verified Source Citations:</span>
                      <div className="citations-list">
                        {selectedPreset.citations.map((cit, idx) => (
                          <span key={idx} className="citation-tag">
                            <FileText className="cit-icon" /> {cit}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "chunks" && (
                <motion.div 
                  className="chunks-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {selectedPreset.sources.length === 0 ? (
                    <div className="empty-chunks">
                      <AlertTriangle className="empty-icon" />
                      <p>No document chunks passed relevance threshold (&gt;0.75). Absence guard activated to prevent hallucination.</p>
                    </div>
                  ) : (
                    <div className="chunks-list">
                      {selectedPreset.sources.map((src, i) => (
                        <div key={i} className="chunk-card">
                          <div className="chunk-top">
                            <div className="chunk-info">
                              <span className="chunk-num">#0{i + 1}</span>
                              <span className="chunk-title">{src.title}</span>
                              <span className="chunk-sec">{src.section}</span>
                            </div>
                            <div className="chunk-score">
                              <span>Match Score</span>
                              <strong>{(parseFloat(src.score) * 100).toFixed(1)}%</strong>
                            </div>
                          </div>
                          <p className="chunk-snippet">"{src.snippet}"</p>
                          <div className="chunk-bottom">
                            <a href={src.url} target="_blank" rel="noreferrer" className="chunk-link">
                              <span>View Source Doc</span>
                              <ExternalLink className="link-icon" />
                            </a>
                            <span className="chunk-tag">Hybrid BM25 + Vector Matched</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "telemetry" && (
                <motion.div 
                  className="telemetry-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="code-terminal">
                    <div className="terminal-bar">
                      <span className="dot red"></span>
                      <span className="dot yellow"></span>
                      <span className="dot green"></span>
                      <span className="terminal-title">DocuFlux RAG Pipeline Debug Trace</span>
                    </div>
                    <pre className="terminal-body">
                      <code>{JSON.stringify({
                        query: selectedPreset.question,
                        execution_pipeline: {
                          router_classification: selectedPreset.route,
                          semantic_cache: {
                            status: selectedPreset.cacheHit ? "HIT" : "MISS",
                            similarity_score: selectedPreset.cacheHit ? 0.998 : 0.612,
                            latency_ms: selectedPreset.cacheHit ? 8 : 42
                          },
                          retrieval_engine: {
                            dense_vector_model: "MiniLM-L6-v2",
                            sparse_bm25_weight: 0.3,
                            reciprocal_rank_fusion_mrr: 1.0,
                            adaptive_top_k: selectedPreset.sources.length
                          },
                          synthesis_guard: {
                            strict_absence_mode: true,
                            faithfulness_judge_score: 0.98,
                            hallucination_detected: false
                          },
                          telemetry: {
                            total_latency: selectedPreset.latency,
                            tokens_consumed: selectedPreset.tokens,
                            estimated_cost: selectedPreset.cost
                          }
                        }
                      }, null, 2)}</code>
                    </pre>
                  </div>
                </motion.div>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
