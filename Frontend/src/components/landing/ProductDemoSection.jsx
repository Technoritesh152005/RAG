import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  ArrowRight, 
  MessageSquare, 
  Layers, 
  FolderCheck, 
  Award, 
  Settings, 
  ChevronDown, 
  FileText, 
  Copy, 
  Check,
  Plus
} from "lucide-react";

export default function ProductDemoSection({ onGetStarted }) {
  const [activeSample, setActiveSample] = useState(0);

  const sampleQuestions = [
    {
      q: "How does useEffect handle cleanup?",
      answer: "The `useEffect` hook can return a cleanup function, which React will call when the component unmounts or before running the effect again if dependencies change. This is useful for clearing timers, subscriptions, or side effects.",
      code: `useEffect(() => {
  const timer = setInterval(...);
  return () => clearInterval(timer); // cleanup function
}, [dependencies]);`,
      sources: [
        { name: "React Docs > Reference > useEffect", lines: "Lines 42-57", url: "https://react.dev/reference/react/useEffect" },
        { name: "React Docs > Synchronizing with Effects", lines: "Lines 12-24", url: "https://react.dev/learn/synchronizing-with-effects" }
      ]
    },
    {
      q: "What is the difference between useState and useRef?",
      answer: "Changing a `useState` state variable triggers a component re-render, whereas mutating a `useRef` ref object updates the underlying value without causing any re-renders.",
      code: `const count = useRef(0);
function handleClick() {
  count.current++; // No re-render triggered
}`,
      sources: [
        { name: "React Docs > Reference > useRef", lines: "Lines 18-35", url: "https://react.dev/reference/react/useRef" }
      ]
    }
  ];

  const currentSample = sampleQuestions[activeSample];

  return (
    <section className="demo-section" id="demo">
      <div className="section-container">
        
        <div className="demo-layout">
          
          {/* Left Text & Actions */}
          <div className="demo-left-text">
            <span className="section-kicker-indigo">
              <span className="dot"></span> PRODUCT DEMO
            </span>
            <h2 className="demo-title">
              Ask your documentation.<br />
              Not your browser history.
            </h2>
            <p className="demo-subtitle">
              Get clear, accurate answers with citations from your own sources.
            </p>
            <div className="demo-actions">
              <button className="btn-demo-primary" onClick={onGetStarted} type="button">
                <span>Try Live Demo</span>
                <ArrowRight className="btn-icon" />
              </button>
              <button 
                className="btn-demo-secondary" 
                onClick={() => setActiveSample((prev) => (prev + 1) % sampleQuestions.length)}
                type="button"
              >
                <span>View Sample Questions</span>
              </button>
            </div>
          </div>

          {/* Right Sleek DocuFlux Interface Mockup */}
          <motion.div 
            className="demo-mockup-window"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Window Topbar */}
            <div className="mockup-header">
              <div className="window-dots">
                <span className="window-dot red"></span>
                <span className="window-dot yellow"></span>
                <span className="window-dot green"></span>
              </div>
              <div className="workspace-selector">
                <span className="brand-mark">DF</span>
                <span className="ws-name">React Documentation</span>
                <ChevronDown className="ws-chevron" />
              </div>
            </div>

            {/* Window Main Layout */}
            <div className="mockup-body">
              
              {/* Sidebar */}
              <div className="mockup-sidebar">
                <button className="new-chat-btn" type="button">
                  <Plus className="btn-icon" />
                  <span>New Chat</span>
                </button>

                <nav className="sidebar-nav">
                  <div className="nav-item active"><MessageSquare className="nav-icon" /> Sources</div>
                  <div className="nav-item"><Layers className="nav-icon" /> Workspaces</div>
                  <div className="nav-item"><Award className="nav-icon" /> Evaluation</div>
                  <div className="nav-item"><Settings className="nav-icon" /> Settings</div>
                </nav>

                <div className="recent-section">
                  <span className="recent-title">Recent</span>
                  <div className="recent-item active">useEffect cleanup</div>
                  <div className="recent-item">React state updates</div>
                  <div className="recent-item">Context API</div>
                </div>
              </div>

              {/* Chat View */}
              <div className="mockup-chat-area">
                
                {/* User Prompt Bubble */}
                <div className="chat-bubble user-bubble">
                  <span>{currentSample.q}</span>
                </div>

                {/* AI Grounded Answer Bubble */}
                <div className="chat-bubble ai-bubble">
                  <div className="ai-avatar">DF</div>
                  <div className="ai-answer-content">
                    <p>{currentSample.answer}</p>

                    <div className="code-block-wrap">
                      <div className="code-block-header">
                        <span>javascript</span>
                        <Copy className="copy-icon" />
                      </div>
                      <pre><code>{currentSample.code}</code></pre>
                    </div>

                    {/* Sources Cards */}
                    <div className="sources-container">
                      <span className="sources-heading">Sources</span>
                      {currentSample.sources.map((src, idx) => (
                        <div key={idx} className="source-citation-card">
                          <FileText className="source-icon" />
                          <div className="source-info">
                            <span className="source-name">{src.name}</span>
                            <span className="source-url">{src.url}</span>
                          </div>
                          <span className="source-lines">{src.lines}</span>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>

              </div>

            </div>

          </motion.div>

        </div>

      </div>
    </section>
  );
}
