import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Sliders, 
  Sparkles, 
  CheckCircle2,
  Database
} from "lucide-react";

export default function CostSavingsCalculator() {
  const [queries, setQueries] = useState(35000);
  const [costPerQuery, setCostPerQuery] = useState(0.00035); // Groq / OpenAI average cost per query

  // Calculate savings assuming 45% semantic cache hit rate
  const cacheHitRate = 0.45;
  const cachedQueries = Math.round(queries * cacheHitRate);
  const monthlySavings = (cachedQueries * costPerQuery).toFixed(2);
  const yearlySavings = (cachedQueries * costPerQuery * 12).toFixed(2);
  const timeSavedHours = Math.round((cachedQueries * 3.4) / 3600); // 3.4 seconds saved per cache hit

  return (
    <section className="savings-section" id="savings">
      <div className="savings-container">
        
        {/* Section Header */}
        <div className="section-header center">
          <div className="section-kicker">
            <DollarSign className="kicker-icon" />
            <span>SEMANTIC CACHE COST ROI CALCULATOR</span>
          </div>
          <h2 className="section-title">
            Slash LLM Token Costs & Latency in Half
          </h2>
          <p className="section-desc">
            Developers constantly ask duplicate or semantically similar documentation questions. DocuFlux's vector cosine similarity cache answers repeat queries in under 8ms with $0 token expense.
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="calculator-grid">
          
          {/* Controls Column */}
          <div className="calc-controls">
            
            {/* Control 1: Monthly Queries */}
            <div className="control-group">
              <div className="control-header">
                <label>Monthly Developer Queries:</label>
                <span className="control-val">{queries.toLocaleString()} queries</span>
              </div>
              <input
                type="range"
                min="5000"
                max="200000"
                step="5000"
                value={queries}
                onChange={(e) => setQueries(Number(e.target.value))}
                className="calc-slider"
              />
              <div className="slider-labels">
                <span>5,000</span>
                <span>100,000</span>
                <span>200,000+</span>
              </div>
            </div>

            {/* Control 2: Cost Per Query */}
            <div className="control-group">
              <div className="control-header">
                <label>Est. Raw LLM Cost per Query:</label>
                <span className="control-val">${costPerQuery.toFixed(5)} / query</span>
              </div>
              <input
                type="range"
                min="0.00010"
                max="0.00100"
                step="0.00005"
                value={costPerQuery}
                onChange={(e) => setCostPerQuery(Number(e.target.value))}
                className="calc-slider"
              />
              <div className="slider-labels">
                <span>$0.0001 (Groq)</span>
                <span>$0.0005</span>
                <span>$0.0010 (GPT-4o)</span>
              </div>
            </div>

            {/* Cache Explanation Box */}
            <div className="cache-explain-box">
              <div className="explain-top">
                <Zap className="explain-icon emerald" />
                <span>How Semantic Caching Works:</span>
              </div>
              <p>
                When a query arrives, DocuFlux computes its dense embedding vector. If vector similarity with a prior query exceeds 0.96, the cached response streams instantly in &lt; 8ms without calling Groq/OpenAI.
              </p>
            </div>

          </div>

          {/* Results Display Column */}
          <div className="calc-results">
            
            <div className="result-card primary-card">
              <span className="res-label">Est. Monthly Token Savings</span>
              <div className="res-val">${monthlySavings}</div>
              <span className="res-sub">Saved per month with 45% semantic cache hit rate</span>
            </div>

            <div className="results-row">
              <div className="result-card secondary-card">
                <span className="res-label">Annual Savings</span>
                <div className="res-val-small text-emerald">${yearlySavings}</div>
                <span className="res-sub">Direct token budget reduction</span>
              </div>

              <div className="result-card secondary-card">
                <span className="res-label">Dev Time Saved</span>
                <div className="res-val-small text-cyan">{timeSavedHours} Hours</div>
                <span className="res-sub">From 3.8s down to 8ms latency</span>
              </div>
            </div>

            <div className="cached-count-banner">
              <CheckCircle2 className="banner-icon" />
              <span>{cachedQueries.toLocaleString()} queries/mo served instantly from Cache</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
