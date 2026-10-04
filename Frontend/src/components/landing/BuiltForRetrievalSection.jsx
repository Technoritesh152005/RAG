import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search, Target, FileText, BarChart2, Zap } from "lucide-react";

export default function BuiltForRetrievalSection() {
  return (
    <section className="retrieval-section-clean" id="retrieval">
      <div className="section-container">
        
        <div className="retrieval-section-layout">
          
          {/* Left Text & Explore Button */}
          <div className="retrieval-left-content">
            <span className="section-kicker-blue">
              <span className="dot"></span> RAG Engine
            </span>

            <h2 className="retrieval-headline-main">
              Built for retrieval,<br />
              not just generation.
            </h2>

            <p className="retrieval-subtext-main">
              Combines multiple techniques to retrieve the most relevant information for your query.
            </p>

            <button className="btn-explore-features" type="button">
              <span>Explore Features</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Right 5-Card Feature Grid */}
          <div className="retrieval-feature-grid">
            
            {/* Row 1 (3 Cards) */}
            <motion.div 
              className="feature-card-item"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
            >
              <div className="feat-icon-box blue">
                <Search size={20} color="#2563EB" />
              </div>
              <h3>Hybrid Search</h3>
              <p>Combines semantic similarity with keyword matching (Dense Vector + BM25).</p>
            </motion.div>

            <motion.div 
              className="feature-card-item"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.08 }}
            >
              <div className="feat-icon-box pink">
                <Target size={20} color="#DB2777" />
              </div>
              <h3>Query-Adaptive Retrieval</h3>
              <p>Adjusts retrieval depth based on the complexity of the question.</p>
            </motion.div>

            <motion.div 
              className="feature-card-item"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.16 }}
            >
              <div className="feat-icon-box cyan">
                <FileText size={20} color="#0891B2" />
              </div>
              <h3>Parent-Child Chunking</h3>
              <p>Retrieves precise chunks while preserving broader context.</p>
            </motion.div>

            {/* Row 2 (2 Cards) */}
            <motion.div 
              className="feature-card-item"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.24 }}
            >
              <div className="feat-icon-box purple">
                <BarChart2 size={20} color="#9333EA" />
              </div>
              <h3>Reranking</h3>
              <p>Re-evaluates candidates to improve relevance.</p>
            </motion.div>

            <motion.div 
              className="feature-card-item"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.32 }}
            >
              <div className="feat-icon-box indigo">
                <Zap size={20} color="#4F46E5" />
              </div>
              <h3>Semantic Cache</h3>
              <p>Reuses answers for similar queries to reduce token costs.</p>
            </motion.div>

          </div>

        </div>

      </div>
    </section>
  );
}

