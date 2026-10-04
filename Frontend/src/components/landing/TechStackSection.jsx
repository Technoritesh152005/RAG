import React from "react";
import { motion } from "framer-motion";

const TECH_ITEMS_ROW1 = [
  { name: "React", icon: "⚛️", color: "#00d8ff" },
  { name: "Node.js", icon: "🟩", color: "#539e43" },
  { name: "PostgreSQL + pgvector", icon: "🐘", color: "#336791" },
  { name: "Redis", icon: "🟥", color: "#dc382d" },
  { name: "Docker", icon: "🐳", color: "#2496ed" }
];

const TECH_ITEMS_ROW2 = [
  { name: "Groq (LLM)", icon: "🔴", color: "#f55036" },
  { name: "Elastic / BM25", icon: "🔍", color: "#005571" },
  { name: "Playwright (Crawling)", icon: "🎭", color: "#2ead33" },
  { name: "BullMQ (Queue)", icon: "🌀", color: "#e84393" },
  { name: "Vercel", icon: "▲", color: "#000000" }
];

export default function TechStackSection() {
  return (
    <section className="techstack-section-clean" id="hood">
      <div className="section-container">
        
        <div className="techstack-section-layout">
          
          {/* Left Text */}
          <div className="techstack-left-content">
            <span className="section-kicker-purple">
              <span className="dot"></span> Tech Stack
            </span>

            <h2 className="techstack-headline-main">
              Modern stack.<br />
              Production-ready architecture.
            </h2>

            <p className="techstack-subtext-main">
              Built with a focus on scalability, async ingestion and accurate retrieval.
            </p>
          </div>

          {/* Right 2-Row Stack Card */}
          <div className="techstack-grid-card">
            
            {/* Row 1 */}
            <div className="tech-row">
              {TECH_ITEMS_ROW1.map((item, i) => (
                <div key={i} className="tech-badge-item">
                  <span className="tech-emoji">{item.icon}</span>
                  <span className="tech-name">{item.name}</span>
                </div>
              ))}
            </div>

            {/* Row 2 */}
            <div className="tech-row">
              {TECH_ITEMS_ROW2.map((item, i) => (
                <div key={i} className="tech-badge-item">
                  <span className="tech-emoji">{item.icon}</span>
                  <span className="tech-name">{item.name}</span>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
