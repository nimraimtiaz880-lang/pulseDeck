import './landing_Page.css';
const features = [
    {
        icon: 'Q&A',
        title: 'Live Q&A',
        description: 'Collect audience questions, let participants vote, and help the most important questions get noticed.',
    },
    {
        icon: 'P',
        title: 'Live Polls',
        description: 'Launch interactive polls and watch audience responses come together in real time.',
    },
    {
        icon: 'Q',
        title: 'Quizzes & Surveys',
        description: 'Test knowledge, gather feedback, and make every session more engaging.',
    },
    {
        icon: '✓',
        title: 'Smart Moderation',
        description: 'Review submissions, manage questions, and keep discussions relevant.',
    },
    {
        icon: '↗',
        title: 'Live Analytics',
        description: 'Understand participation and review audience responses after your event.',
    },
    {
        icon: '◎',
        title: 'One Event Space',
        description: 'Manage your event activities from one convenient, easy-to-use workspace.',
    },
];
export default function LandingPage({ onGetStarted, onJoinEvent, onSignIn, }) {
    return (<main className="pulse-landing">
      <header className="pulse-nav">
        <a className="pulse-brand" href="#home" aria-label="PulseDeck home">
          <span className="pulse-brand-mark">P</span>
          <span>PulseDeck</span>
        </a>

        <nav className="pulse-nav-links" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>

        <div className="pulse-nav-actions">
          <button className="pulse-signin" onClick={onSignIn}>
            Sign in
          </button>
          <button className="pulse-button pulse-button-small" onClick={onGetStarted}>
            Get started
          </button>
        </div>
      </header>

      <section className="pulse-hero" id="home">
        <div className="pulse-hero-content">
          <span className="pulse-eyebrow">
            <span className="pulse-live-dot"/>
            Make every voice count
          </span>

          <h1>
            Turn every class into a <span>conversation.</span>
          </h1>

          <p className="pulse-hero-description">
            Bring your audience into the conversation with live Q&A,
            interactive polls, quizzes, and feedback — all in one place.
          </p>

          <div className="pulse-hero-actions">
            <button className="pulse-button" onClick={onGetStarted}>
              Get started <span aria-hidden="true">→</span>
            </button>
            <button className="pulse-button pulse-button-outline" onClick={onJoinEvent}>
              Join an event
            </button>
          </div>

          <p className="pulse-hero-note">
            No student app install. No complicated teacher setup.
          </p>
        </div>

        <div className="pulse-hero-visual" aria-label="Illustration of a live audience engagement dashboard">
          <div className="pulse-preview">
            <div className="pulse-preview-top">
              <div>
                <span className="pulse-preview-label">LIVE CLASS</span>
                <h3>Today’s lesson</h3>
              </div>
              <span className="pulse-preview-status">
                <span className="pulse-live-dot"/> Live
              </span>
            </div>

            <div className="pulse-preview-stats">
              <div>
                <span>Participants</span>
                <strong>128</strong>
              </div>
              <div>
                <span>Questions</span>
                <strong>24</strong>
              </div>
              <div>
                <span>Poll responses</span>
                <strong>86</strong>
              </div>
            </div>

            <div className="pulse-preview-question">
              <div className="pulse-question-icon">Q</div>
              <div className="pulse-question-copy">
                <span className="pulse-preview-label">TOP QUESTION</span>
                <p>What should we focus on in our next session?</p>
                <div className="pulse-votes">↑ 42 votes</div>
              </div>
            </div>

            <div className="pulse-preview-poll">
              <div className="pulse-poll-heading">
                <strong>Quick understanding check</strong>
                <span>86 responses</span>
              </div>
              <div className="pulse-poll-option">
                <div><span>Workshops</span><strong>54%</strong></div>
                <div className="pulse-poll-track">
                  <span style={{ width: '54%' }}/>
                </div>
              </div>
              <div className="pulse-poll-option">
                <div><span>Guest speakers</span><strong>31%</strong></div>
                <div className="pulse-poll-track">
                  <span style={{ width: '31%' }}/>
                </div>
              </div>
              <div className="pulse-poll-option">
                <div><span>Open discussion</span><strong>15%</strong></div>
                <div className="pulse-poll-track">
                  <span style={{ width: '15%' }}/>
                </div>
              </div>
            </div>
            <p className="pulse-demo-caption">
              Illustrative preview · Sample data
            </p>
          </div>
          <div className="pulse-decoration pulse-decoration-one"/>
          <div className="pulse-decoration pulse-decoration-two"/>
        </div>
      </section>

      <section className="pulse-features" id="features">
        <div className="pulse-section-heading">
          <span className="pulse-eyebrow">EVERYTHING IN ONE PLACE</span>
          <h2>More learning. Less hand-raising.</h2>
          <p>
            From school classrooms to university lectures, make it easy to check understanding without interrupting the flow of teaching.
          </p>
        </div>

        <div className="pulse-feature-grid">
          {features.map((feature) => (<article className="pulse-feature-card" key={feature.title}>
              <div className="pulse-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>))}
        </div>
      </section>

      <section className="pulse-how" id="how-it-works">
        <div className="pulse-section-heading">
          <span className="pulse-eyebrow">GET STARTED IN MINUTES</span>
          <h2>Three steps. More participation.</h2>
          <p>Start a session without making things complicated.</p>
        </div>

        <div className="pulse-steps">
          <article className="pulse-step">
            <span className="pulse-step-number">01</span>
            <h3>Start your class</h3>
            <p>
              Start a session in seconds and choose a poll, quiz, or anonymous Q&A.
            </p>
          </article>
          <article className="pulse-step">
            <span className="pulse-step-number">02</span>
            <h3>Invite your audience</h3>
            <p>
              Project the QR code or share a short join code. Students join in their phone browser.
            </p>
          </article>
          <article className="pulse-step">
            <span className="pulse-step-number">03</span>
            <h3>Teach without stopping</h3>
            <p>
              Keep your slides open in PowerPoint or Google Slides, then open PulseDeck alongside them to run live activities.
            </p>
          </article>
        </div>
      </section>

      <section className="pulse-cta">
        <div>
          <span className="pulse-eyebrow">YOUR NEXT SESSION STARTS HERE</span>
          <h2>Make your next lesson feel different.</h2>
          <p>Works for in-person, hybrid, and online teaching — across subjects and grade levels.</p>
        </div>
        <button className="pulse-button pulse-cta-button" onClick={onGetStarted}>
          Get started <span aria-hidden="true">→</span>
        </button>
      </section>

      <footer className="pulse-footer">
        <a className="pulse-brand" href="#home">
          <span className="pulse-brand-mark">P</span>
          <span>PulseDeck</span>
        </a>
        <p>Every learner. Every voice. Every class.</p>
        <a href="#home">Back to top ↑</a>
      </footer>
    </main>);
}
