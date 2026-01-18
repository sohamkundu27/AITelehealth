import { useEffect } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  // Intersection Observer for scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target); // Only animate once
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="landing-page">
        {/* Hero Section */}
        <section className="landing-hero">
          {/* Floating Background Elements */}
          <div className="hero-background-elements">
            <span className="float-icon" style={{ top: '10%', left: '15%', animationDelay: '0s' }}>💊</span>
            <span className="float-icon" style={{ top: '20%', right: '20%', animationDelay: '2s' }}>🏥</span>
            <span className="float-icon" style={{ top: '60%', left: '10%', animationDelay: '4s' }}>📋</span>
            <span className="float-icon" style={{ top: '70%', right: '15%', animationDelay: '1s' }}>⚕️</span>
            <span className="float-icon" style={{ top: '40%', left: '25%', animationDelay: '3s' }}>🔬</span>
            <span className="float-icon" style={{ top: '50%', right: '25%', animationDelay: '5s' }}>📊</span>
            <span className="float-icon" style={{ top: '15%', left: '50%', animationDelay: '2.5s' }}>🩺</span>
            <span className="float-icon" style={{ top: '80%', left: '45%', animationDelay: '1.5s' }}>💉</span>
          </div>

          {/* Hero Content */}
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="hero-word" style={{ '--delay': '0s' } as React.CSSProperties}>AI</span>{' '}
              <span className="hero-word" style={{ '--delay': '0.1s' } as React.CSSProperties}>Telehealth</span>
            </h1>

            <p className="hero-subtitle">Intelligent Healthcare, Anywhere</p>

            <p className="hero-description">
              Real-time video consultations with AI-powered drug interaction detection
            </p>

            <button className="hero-cta" onClick={onGetStarted}>
              <span>Start Your Consultation</span>
              <span className="hero-cta-arrow">→</span>
            </button>
          </div>

          {/* Scroll Indicator */}
          <button 
            className="hero-scroll-indicator"
            onClick={() => {
              const featuresSection = document.querySelector('.landing-features');
              if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            aria-label="Scroll to features section"
          >
            <span>Scroll to explore</span>
            <span className="scroll-arrow">↓</span>
          </button>
        </section>

        {/* Features Section */}
        <section className="landing-features">
          <h2 className="features-title">Powered by Advanced AI</h2>

          <div className="features-grid">
            <div className="feature-card" data-index="0">
              <div className="feature-icon">📹</div>
              <h3>Live Video Consultations</h3>
              <p>HD video calls powered by LiveKit with real-time communication and multi-participant support</p>
              <div className="feature-badge">LiveKit</div>
            </div>

            <div className="feature-card" data-index="1">
              <div className="feature-icon">💊</div>
              <h3>Smart Drug Detection</h3>
              <p>Real-time speech recognition identifies prescriptions automatically during consultations</p>
              <div className="feature-badge">STT + NLP</div>
            </div>

            <div className="feature-card" data-index="2">
              <div className="feature-icon">🗂️</div>
              <h3>FDA Integration</h3>
              <p>Instant access to comprehensive drug information, warnings, and official labeling data</p>
              <div className="feature-badge">FDA API</div>
            </div>

            <div className="feature-card" data-index="3">
              <div className="feature-icon">⚠️</div>
              <h3>Interaction Checking</h3>
              <p>RxNav integration detects dangerous drug interactions in real-time for patient safety</p>
              <div className="feature-badge">RxNav</div>
            </div>

            <div className="feature-card" data-index="4">
              <div className="feature-icon">🤖</div>
              <h3>AI Patient Monitoring</h3>
              <p>Overshoot SDK analyzes facial cues to track patient comprehension during consultations</p>
              <div className="feature-badge">Overshoot AI</div>
            </div>

            <div className="feature-card" data-index="5">
              <div className="feature-icon">📋</div>
              <h3>Document Intelligence</h3>
              <p>Automatic medication extraction from PDF medical records using advanced NLP</p>
              <div className="feature-badge">OCR + NLP</div>
            </div>
          </div>
        </section>

        {/* Technology Showcase */}
        <section className="landing-tech">
          <h2>Built with Modern Technology</h2>
          <div className="tech-stack">
            <div className="tech-badge">React 19</div>
            <div className="tech-badge">TypeScript</div>
            <div className="tech-badge">LiveKit</div>
            <div className="tech-badge">OpenAI</div>
            <div className="tech-badge">FDA API</div>
            <div className="tech-badge">RxNav</div>
            <div className="tech-badge">Overshoot SDK</div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="landing-cta-final">
          <div className="cta-final-content">
            <h2>Ready to Experience the Future of Telehealth?</h2>
            <p>Upload your medical documents and start your consultation now</p>
            <button className="cta-final-button" onClick={onGetStarted}>
              <span>Get Started</span>
              <span className="cta-arrow">→</span>
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .landing-page {
          width: 100%;
          overflow-x: hidden;
          scroll-behavior: smooth;
        }

        /* Hero Section */
        .landing-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 2rem 5rem 2rem;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
          background-size: 200% 200%;
          animation: gradientShift 15s ease infinite;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* Floating Background Icons */
        .hero-background-elements {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .float-icon {
          position: absolute;
          font-size: 3rem;
          opacity: 0.08;
          filter: blur(2px);
          animation: float 20s ease-in-out infinite;
          will-change: transform;
        }

        /* Hero Content */
        .hero-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 900px;
        }

        .hero-title {
          font-size: clamp(3rem, 8vw, 6rem);
          font-weight: 900;
          margin: 0 0 1.5rem 0;
          line-height: 1.1;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-success) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-word {
          display: inline-block;
          opacity: 0;
          animation: fadeSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: var(--delay);
        }

        .hero-subtitle {
          font-size: clamp(1.5rem, 3vw, 2rem);
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          overflow: hidden;
          white-space: nowrap;
          border-right: 3px solid var(--accent-primary);
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
          animation: typewriter 2s steps(30) 0.5s forwards, blink 0.75s step-end infinite;
          opacity: 0;
        }

        .hero-description {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: var(--text-secondary);
          margin: 0 0 3rem 0;
          opacity: 0;
          animation: fadeSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 2.5s;
        }

        .hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 2.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--bg-primary);
          background: var(--accent-primary);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          animation: pulse 2s ease-in-out infinite, fadeSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 0s, 3s;
          opacity: 0;
          will-change: transform;
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }

        .hero-cta:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 8px 32px rgba(0, 255, 136, 0.5);
        }

        .hero-cta:active {
          transform: translateY(-2px) scale(1.02);
        }

        .hero-cta-arrow {
          display: inline-block;
          transition: transform 0.3s ease;
        }

        .hero-cta:hover .hero-cta-arrow {
          transform: translateX(4px);
        }

        /* Scroll Indicator */
        .hero-scroll-indicator {
          position: absolute;
          bottom: 3rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: var(--text-tertiary);
          font-size: 0.875rem;
          opacity: 0;
          animation: fadeSlideUpCentered 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 3.5s;
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: 12px 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
          font-family: inherit;
          white-space: nowrap;
          width: auto;
          min-width: fit-content;
          margin: 0 auto;
        }

        .hero-scroll-indicator:hover {
          color: var(--text-primary);
          border-color: var(--accent-primary);
          background: var(--bg-overlay);
          backdrop-filter: blur(10px);
          transform: translateX(-50%) translateY(-4px);
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.2);
        }

        .hero-scroll-indicator:active {
          transform: translateX(-50%) translateY(-2px);
        }

        .scroll-arrow {
          font-size: 1.5rem;
          animation: bounce 2s ease-in-out infinite;
          transition: transform 0.3s ease;
        }

        .hero-scroll-indicator:hover .scroll-arrow {
          transform: translateY(4px);
          animation: none;
        }

        /* Features Section */
        .landing-features {
          padding: 6rem 2rem;
          background: var(--bg-primary);
        }

        .features-title {
          text-align: center;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          margin: 0 0 4rem 0;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-success) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .feature-card {
          position: relative;
          padding: 2.5rem 2rem;
          background: var(--bg-overlay);
          backdrop-filter: blur(14px) saturate(140%);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          opacity: 0;
          transform: translateY(60px) scale(0.95);
          will-change: transform, opacity;
        }

        .feature-card.animate-in {
          animation: slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: calc(var(--stagger, 0) * 0.15s);
        }

        .feature-card[data-index="0"] { --stagger: 0; }
        .feature-card[data-index="1"] { --stagger: 1; }
        .feature-card[data-index="2"] { --stagger: 2; }
        .feature-card[data-index="3"] { --stagger: 3; }
        .feature-card[data-index="4"] { --stagger: 4; }
        .feature-card[data-index="5"] { --stagger: 5; }

        .feature-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: var(--accent-primary);
          box-shadow: 0 12px 48px rgba(0, 255, 136, 0.2);
        }

        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
          display: inline-block;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .feature-card:hover .feature-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .feature-card h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 1rem 0;
          color: var(--text-primary);
        }

        .feature-card p {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0 0 1.5rem 0;
        }

        .feature-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--accent-primary);
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid var(--accent-primary);
          border-radius: 8px;
          opacity: 0;
          transform: translateY(10px);
          animation: fadeSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: calc(var(--stagger, 0) * 0.15s + 0.3s);
        }

        /* Technology Showcase */
        .landing-tech {
          padding: 4rem 2rem;
          background: var(--bg-secondary);
          text-align: center;
        }

        .landing-tech h2 {
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          font-weight: 700;
          margin: 0 0 2.5rem 0;
          color: var(--text-primary);
        }

        .tech-stack {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .tech-badge {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 255, 136, 0.05) 100%);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .tech-badge::before {
          content: '';
          position: absolute;
          top: 0;
          left: -200%;
          width: 200%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: shimmer 3s ease-in-out infinite;
        }

        .tech-badge:hover {
          transform: translateY(-4px) scale(1.05);
          border-color: var(--accent-primary);
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }

        /* Final CTA Section */
        .landing-cta-final {
          padding: 6rem 2rem;
          background: var(--bg-primary);
          text-align: center;
        }

        .cta-final-content {
          max-width: 700px;
          margin: 0 auto;
        }

        .cta-final-content h2 {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          margin: 0 0 1rem 0;
          color: var(--text-primary);
        }

        .cta-final-content p {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin: 0 0 2.5rem 0;
        }

        .cta-final-button {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 2.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--bg-primary);
          background: var(--accent-primary);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
        }

        .cta-final-button:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 8px 32px rgba(0, 255, 136, 0.5);
        }

        .cta-final-button:active {
          transform: translateY(-2px) scale(1.02);
        }

        .cta-arrow {
          display: inline-block;
          transition: transform 0.3s ease;
        }

        .cta-final-button:hover .cta-arrow {
          transform: translateX(4px);
        }

        /* Keyframe Animations */
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeSlideUpCentered {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(60px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(10px, -20px) rotate(5deg);
          }
          50% {
            transform: translate(-15px, -10px) rotate(-5deg);
          }
          75% {
            transform: translate(5px, -25px) rotate(3deg);
          }
        }

        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes typewriter {
          from {
            width: 0;
            opacity: 1;
          }
          to {
            width: 100%;
            opacity: 1;
          }
        }

        @keyframes blink {
          50% {
            border-color: transparent;
          }
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 16px rgba(0, 255, 136, 0.3);
          }
          50% {
            box-shadow: 0 8px 32px rgba(0, 255, 136, 0.5);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes shimmer {
          0% {
            left: -200%;
          }
          100% {
            left: 200%;
          }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .landing-hero {
            padding: 1rem;
            min-height: 100vh;
          }

          .hero-title {
            font-size: 3rem;
          }

          .hero-subtitle {
            font-size: 1.5rem;
          }

          .hero-scroll-indicator {
            bottom: 3rem;
            padding: 10px 16px;
            font-size: 0.8rem;
            border-radius: 20px;
            left: 50%;
            transform: translateX(-50%);
            max-width: calc(100vw - 2rem);
            width: auto;
          }

          .scroll-arrow {
            font-size: 1.25rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .landing-features {
            padding: 4rem 1.5rem;
            scroll-margin-top: 0;
          }

          .landing-tech {
            padding: 3rem 1.5rem;
          }

          .landing-cta-final {
            padding: 4rem 1.5rem;
          }

          .float-icon {
            font-size: 2rem;
          }
        }

        @media (max-width: 480px) {
          .hero-cta {
            padding: 1rem 2rem;
            font-size: 1rem;
          }

          .hero-scroll-indicator {
            bottom: 2.5rem;
            padding: 8px 14px;
            font-size: 0.75rem;
            gap: 0.4rem;
            left: 50%;
            transform: translateX(-50%);
            max-width: calc(100vw - 1rem);
            width: auto;
          }

          .scroll-arrow {
            font-size: 1.1rem;
          }

          .feature-card {
            padding: 2rem 1.5rem;
          }

          .tech-stack {
            gap: 0.75rem;
          }

          .tech-badge {
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
          }
        }

        /* Accessibility: Reduce Motion */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          .float-icon {
            animation: none;
          }

          .hero-subtitle {
            animation: none;
            opacity: 1;
            border-right: none;
            width: auto;
          }

          .scroll-arrow {
            animation: none;
          }

          .hero-scroll-indicator:hover .scroll-arrow {
            animation: none;
          }
        }

        /* Light Theme Adjustments */
        [data-theme="light"] .feature-card {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid var(--border-color);
        }

        [data-theme="light"] .feature-card:hover {
          border-color: var(--accent-primary);
          box-shadow: 0 12px 48px rgba(0, 102, 204, 0.15);
          background: var(--bg-overlay);
        }

        [data-theme="light"] .hero-cta,
        [data-theme="light"] .cta-final-button {
          color: #ffffff;
        }
      `}</style>
    </>
  );
}
