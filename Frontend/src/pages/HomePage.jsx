import "./HomePageStyles.css";

export default function HomePage({ onSignIn, onGetStarted }) {
  return (
    <main className="home-page">
      <header className="home-nav">
        <a className="home-brand" href="#top" aria-label="DocuFlux home">
          <span className="home-brand-mark" aria-hidden="true">DF</span>
          <span>DocuFlux</span>
        </a>

        <nav aria-label="Main navigation">
          <a href="#why">Why DocuFlux</a>
          <a href="#workflow">How it works</a>
          <a href="#principles">Principles</a>
          <button className="home-nav-signin" type="button" onClick={onSignIn}>
            Sign in
          </button>
          <button className="home-nav-cta" type="button" onClick={onGetStarted}>
            Start indexing <span aria-hidden="true">→</span>
          </button>
        </nav>
      </header>

      <section className="home-hero" id="top" aria-labelledby="home-title">
        <div className="home-hero-inner">
          <div className="home-copy">
            <p className="home-kicker">FOR DEVELOPERS WHOSE DOCS THE MODEL HAS NEVER SEEN</p>
            <h1 id="home-title">
              Ask today’s docs.<br />
              <span>Not yesterday’s model.</span>
            </h1>
            <p className="home-intro">
              Paste a link to a docs section. We crawl it, index it, and answer from those pages only, with the exact page and section cited.
            </p>
            <div className="home-actions">
              <button className="home-primary" type="button" onClick={onGetStarted}>
                Start indexing <span aria-hidden="true">→</span>
              </button>
              <button className="home-secondary" type="button" onClick={onSignIn}>
                Sign in
              </button>
            </div>
            <p className="home-note">
              Framework docs <i /> Library references <i /> Internal wikis
            </p>
          </div>

          <div className="hero-visual" aria-label="Example of an indexed documentation answer">
            <div className="doc-window">
              <div className="doc-window-topline">
                <span><b>{"{}"}</b> SOURCE / NEXTJS.ORG</span>
                <span className="doc-indexed"><i /> INDEXED</span>
              </div>
              <div className="doc-window-body">
                <p className="doc-breadcrumb">01 / APP / BUILDING-YOUR-APPLICATION</p>
                <h2>Fetching Data</h2>
                <div className="code-lines" aria-label="Example documentation code">
                  <p><span>01</span><code><b>async function</b> Page() &#123;</code></p>
                  <p><span>02</span><code>  const data = <b>await</b> fetch(...)</code></p>
                  <p><span>03</span><code>  return &lt;main&gt;...&lt;/main&gt;</code></p>
                  <p><span>04</span><code>&#125;</code></p>
                </div>
                <p className="doc-section">SECTION 03 / SERVER COMPONENTS</p>
              </div>
              <div className="doc-match">SOURCE MATCHED <strong>0.98</strong><span>↳</span></div>
            </div>

            <div className="hero-answer">
              <div className="hero-answer-topline">
                <span>ANSWER / FROM YOUR DOCS</span>
                <span className="hero-cited"><i /> CITED</span>
              </div>
              <p>Make the component async and await your fetch directly.</p>
              <div className="hero-answer-source">
                <span>↗ Fetching Data</span>
                <span>Section 03</span>
                <strong>98% match</strong>
              </div>
            </div>
            <p className="hero-visual-caption">ILLUSTRATIVE ANSWER / GROUNDED IN A SOURCE</p>
          </div>
        </div>
      </section>

      <section className="home-comparison" id="why" aria-labelledby="comparison-title">
        <div className="comparison-intro">
          <div>
            <p className="home-section-kicker">SAME QUESTION, TWO ANSWERS</p>
            <h2 id="comparison-title">Fresh context changes the answer.</h2>
          </div>
          <p className="comparison-question">
            “How do I fetch data in a Next.js server component?”
          </p>
        </div>
        <div className="comparison-columns">
          <article className="comparison-answer comparison-answer-outdated">
            <div className="comparison-label">
              <span>PLAIN LLM</span>
              <span className="comparison-status">OUTDATED</span>
            </div>
            <p className="comparison-quote">
              Export <code>getServerSideProps</code> from your page file and read the result from props.
            </p>
            <p className="comparison-context">
              Pages Router pattern. Trained before the App Router became the default.
            </p>
          </article>
          <article className="comparison-answer comparison-answer-indexed">
            <div className="comparison-label">
              <span>YOUR INDEXED DOCS</span>
              <span className="comparison-status">CITED</span>
            </div>
            <p className="comparison-quote">
              Make the component <code>async</code> and await your fetch directly. No data-fetching export is needed.
              <sup>12</sup>
            </p>
            <p className="comparison-context">
              Answered from pages you indexed 4 minutes ago.
            </p>
          </article>
        </div>
      </section>

      <section className="home-how" id="workflow" aria-labelledby="workflow-title">
        <div className="home-workflow-heading">
          <h2 id="workflow-title">How it works</h2>
        </div>
        <div className="workflow-steps">
          <article className="workflow-step">
            <span className="workflow-number">01</span>
            <div>
              <h3>Paste a link</h3>
              <p>Pick a docs section. The crawler stays inside that path.</p>
            </div>
          </article>
          <article className="workflow-step">
            <span className="workflow-number">02</span>
            <div>
              <h3>We index it</h3>
              <p>Pages are cleaned, split by heading, and embedded in the background while you watch progress.</p>
            </div>
          </article>
          <article className="workflow-step">
            <span className="workflow-number">03</span>
            <div>
              <h3>Ask anything</h3>
              <p>Answers stream in with the pages they came from and how strong each match was.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="home-principles" id="principles" aria-labelledby="trust-title">
        <div className="principles-layout">
          <div className="principles-heading">
            <p className="home-section-kicker">PRINCIPLES</p>
            <h2 id="trust-title">Built to say “I don't know”.</h2>
          </div>
          <div className="trust-list">
          <article className="trust-point">
            <span className="trust-mark trust-mark-blue" aria-hidden="true">01</span>
            <div>
              <h3>Every claim has a source</h3>
              <p>See the page, the section, and the match score behind each answer.</p>
            </div>
          </article>
          <article className="trust-point">
            <span className="trust-mark trust-mark-green" aria-hidden="true">02</span>
            <div>
              <h3>Silence isn't a yes</h3>
              <p>If the docs don't say it, the answer says “not documented” instead of guessing.</p>
            </div>
          </article>
          <article className="trust-point">
            <span className="trust-mark trust-mark-green" aria-hidden="true">03</span>
            <div>
              <h3>Conflicts stay visible</h3>
              <p>When two pages disagree, you see both sides instead of a blended answer.</p>
            </div>
          </article>
          <article className="trust-point">
            <span className="trust-mark trust-mark-blue" aria-hidden="true">04</span>
            <div>
              <h3>Workspaces never mix</h3>
              <p>Your React docs can't leak into your Vue answers. Each workspace is isolated.</p>
            </div>
          </article>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <a className="home-brand" href="#top">
          <span className="home-brand-mark" aria-hidden="true">DF</span>
          <span>DocuFlux</span>
        </a>
        <p>Answers from the docs you indexed.</p>
        <button type="button" onClick={onGetStarted}>Start indexing <span aria-hidden="true">→</span></button>
      </footer>
    </main>
  );
}