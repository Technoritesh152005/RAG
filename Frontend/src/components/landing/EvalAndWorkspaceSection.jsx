import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function EvalAndWorkspaceSection() {
  const [activeMetricFilter, setActiveMetricFilter] = useState("Hit Rate");

  return (
    <section className="evaluation-section-clean" id="evaluations">
      <div className="section-container">
        
        <div className="eval-section-layout">
          
          {/* Left Headline & Subtitle */}
          <div className="eval-left-content">
            <span className="section-kicker-purple">
              <span className="dot"></span> RAG Evaluation
            </span>

            <h2 className="eval-headline-main">
              We measure<br />
              retrieval quality.
            </h2>

            <p className="eval-subtext-main">
              Real metrics from automated evaluation runs on documentation datasets.
            </p>
          </div>

          {/* Middle Metric Cards Grid */}
          <div className="eval-metrics-grid">
            
            <div className="eval-metric-box">
              <span className="metric-big-num green">90%</span>
              <span className="metric-label-text">Hit Rate</span>
            </div>

            <div className="eval-metric-box">
              <span className="metric-big-num green">0.70</span>
              <span className="metric-label-text">MRR</span>
            </div>

            <div className="eval-metric-box">
              <span className="metric-big-num green">0.60</span>
              <span className="metric-label-text">Judge Score</span>
            </div>

            <div className="eval-metric-box">
              <span className="metric-big-num green">100%</span>
              <span className="metric-label-text">Confidence</span>
            </div>

            <div className="eval-metric-box">
              <span className="metric-big-num green">4.2s</span>
              <span className="metric-label-text">Avg Latency</span>
            </div>

            <div className="eval-metric-box">
              <span className="metric-big-num green">4.8s</span>
              <span className="metric-label-text">P95 Latency</span>
            </div>

          </div>

          {/* Right Evaluation Trends SVG Chart Card */}
          <div className="eval-chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Evaluation Trends</span>
              
              <div className="chart-dropdown">
                <span>{activeMetricFilter}</span>
                <ChevronDown size={14} color="#64748B" />
              </div>
            </div>

            {/* Area Line Chart SVG */}
            <div className="chart-svg-container">
              <svg width="100%" height="160" viewBox="0 0 320 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                
                {/* Horizontal Grid lines */}
                <line x1="0" y1="20" x2="320" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="70" x2="320" y2="70" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="120" x2="320" y2="120" stroke="#F1F5F9" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x="5" y="24" fill="#94A3B8" fontSize="10">100%</text>
                <text x="5" y="74" fill="#94A3B8" fontSize="10">50%</text>
                <text x="5" y="124" fill="#94A3B8" fontSize="10">0%</text>

                {/* Smooth Area Curve Fill */}
                <path
                  d="M 40 120 L 40 110 C 60 80, 80 70, 100 70 C 120 70, 140 60, 160 62 C 180 64, 200 50, 220 52 C 240 54, 260 40, 280 35 C 300 30, 310 32, 320 30 L 320 130 L 40 130 Z"
                  fill="url(#chart-area-grad)"
                />

                {/* Smooth Green Stroke Line */}
                <path
                  d="M 40 110 C 60 80, 80 70, 100 70 C 120 70, 140 60, 160 62 C 180 64, 200 50, 220 52 C 240 54, 260 40, 280 35 C 300 30, 310 32, 320 30"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>

              {/* X Axis Date Labels */}
              <div className="chart-dates-row">
                <span>Sep 1</span>
                <span>Sep 5</span>
                <span>Sep 10</span>
                <span>Sep 15</span>
                <span>Sep 20</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

