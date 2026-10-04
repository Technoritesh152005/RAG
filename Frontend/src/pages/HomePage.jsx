import React from "react";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import WorkflowSection from "../components/landing/WorkflowSection";
import MultiSourceIngestionSection from "../components/landing/MultiSourceIngestionSection";
import BuiltForRetrievalSection from "../components/landing/BuiltForRetrievalSection";
import EvalAndWorkspaceSection from "../components/landing/EvalAndWorkspaceSection";
import TechStackSection from "../components/landing/TechStackSection";
import Footer from "../components/landing/Footer";

import "./HomePageStyles.css";

export default function HomePage({ onSignIn, onGetStarted }) {
  return (
    <main className="landing-page">
      {/* 1. Header Navigation Bar */}
      <Navbar onSignIn={onSignIn} onGetStarted={onGetStarted} />

      {/* 2. Full-Screen Hero Section (Screenshot 4) */}
      <HeroSection onGetStarted={onGetStarted} />

      {/* 3. How It Works Pipeline (Screenshot 1 Top) */}
      <WorkflowSection />

      {/* 4. Multi-Source Ingestion & 3D Isometric Stack (Screenshot 1 Bottom) */}
      <MultiSourceIngestionSection />

      {/* 5. Built For Retrieval 5 Feature Cards (Screenshot 2 Top) */}
      <BuiltForRetrievalSection />

      {/* 6. RAG Evaluation Metrics & Evaluation Trends Chart (Screenshot 2 Bottom) */}
      <EvalAndWorkspaceSection />

      {/* 7. Tech Stack 10-Logo Cards Grid (Screenshot 3) */}
      <TechStackSection />

      {/* 8. Footer */}
      <Footer onGetStarted={onGetStarted} />
    </main>
  );
}