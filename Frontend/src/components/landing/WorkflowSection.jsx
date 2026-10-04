import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Link2, FileText, Search, Zap } from "lucide-react";

const WORKFLOW_STEPS = [
  {
    num: "1",
    title: "Add Sources",
    desc: "Websites, PDFs, or YouTube URLs.",
    icon: Link2,
    iconColor: "#0284C7",
    iconBg: "blue"
  },
  {
    num: "2",
    title: "Ingestion",
    desc: "Crawl, parse, clean, chunk and index asynchronously.",
    icon: FileText,
    iconColor: "#059669",
    iconBg: "emerald"
  },
  {
    num: "3",
    title: "Retrieve",
    desc: "Hybrid search with semantic + keyword matching and reranking.",
    icon: Search,
    iconColor: "#0284C7",
    iconBg: "blue"
  },
  {
    num: "4",
    title: "Generate",
    desc: "Grounded answer with source citations.",
    icon: Zap,
    iconColor: "#7C3AED",
    iconBg: "purple"
  }
];

export default function WorkflowSection() {
  return (
    <section className="workflow-section-clean" id="workflow">
      <div className="section-container">
        
        {/* Section Header */}
        <div className="workflow-header-flex">
          <div className="workflow-header-text">
            <span className="section-kicker-blue">
              <span className="dot"></span> How It Works
            </span>
            <h2 className="section-title-large">
              From raw content<br />
              to <span className="highlight-green">reliable answers.</span>
            </h2>
            <p className="section-subtitle-text">
              A simplified view of the pipeline that powers DocuFlux.
            </p>
          </div>

          {/* 4 Step Cards Row */}
          <div className="workflow-steps-cards">
            {WORKFLOW_STEPS.map((step, idx) => {
              const IconComp = step.icon;
              return (
                <React.Fragment key={step.num}>
                  <motion.div 
                    className="workflow-step-card-box"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                  >
                    <div className={`step-icon-circle ${step.iconBg}`}>
                      <IconComp size={20} color={step.iconColor} />
                    </div>
                    <div className="step-card-text">
                      <span className="step-card-num-title">
                        {step.num}. {step.title}
                      </span>
                      <p className="step-card-desc">{step.desc}</p>
                    </div>
                  </motion.div>

                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div className="step-blue-arrow">
                      <ArrowRight size={18} color="#3B82F6" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

