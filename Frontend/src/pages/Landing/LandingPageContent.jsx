import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LandingHeader from './LandingHeader';
import {
  LuPenTool,
  LuShare2,
  LuChartBar,
  LuZap,
  LuShield,
  LuUsers,
  LuCircleCheck
} from 'react-icons/lu';
import styles from './Landing.module.scss';
// Image import removed

const LandingPageContent = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => navigate('/register');

  const personas = [
    {
      title: "Product Managers",
      desc: "Validate ideas and gather user feedback instantly.",
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "HR Teams",
      desc: "Measure employee engagement and culture pulse.",
      color: "bg-purple-50 text-purple-600"
    },
    {
      title: "Researchers",
      desc: "Collect high-quality data with advanced logic.",
      color: "bg-teal-50 text-teal-600"
    }
  ];

  const steps = [
    { icon: LuPenTool, title: "Create", desc: "Build with AI or custom templates" },
    { icon: LuShare2, title: "Distribute", desc: "Share via Link, Email, or QR" },
    { icon: LuUsers, title: "Collect", desc: "Secure responses from any device" },
    { icon: LuChartBar, title: "Analyze", desc: "Real-time insights & export" }
  ];

  const features = [
    { icon: LuZap, title: "AI Generation", desc: "Draft surveys in seconds with simple text prompts." },
    { icon: LuShare2, title: "Multi-channel", desc: "Reach your audience wherever they are." },
    { icon: LuChartBar, title: "Deep Analytics", desc: "Auto-generated charts and cross-tabulation." },
    { icon: LuShield, title: "Enterprise Ready", desc: "RBAC, data encryption, and audit logs." }
  ];

  return (
    <div className={styles.pageWrapper}>
      <LandingHeader />

      <main>
        {/* HERO SECTION */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroContent}>
              <div className={styles.badge}>New: AI-Powered Analysis 🚀</div>
              <h1 className={styles.heroTitle}>
                The Operating System for <br />
                <span className={styles.highlight}>Business Insights</span>
              </h1>
              <p className={styles.heroSubtitle}>
                Create beautiful surveys, collect verifiable data, and gain actionable insights
                without the enterprise price tag.
              </p>

              <div className={styles.heroActions}>
                <button onClick={handleGetStarted} className={styles.primaryBtn}>
                  Get Started Free
                </button>
                <button onClick={() => navigate('/demo')} className={styles.secondaryBtn}>
                  View Live Demo
                </button>
              </div>

              <div className={styles.trustBadge}>
                <span>Trusted by modern teams at</span>
                <div className={styles.logos}>
                  <span>Acme Corp</span>
                  <span>Globex</span>
                  <span>Soylent</span>
                  <span>Initech</span>
                </div>
              </div>
            </div>

            {/* Pseudo Dashboard Preview */}
            <div className={styles.heroVisual}>
              <div className={styles.dashboardMock}>
                <div className={styles.mockHeader}>
                  <div className={styles.dots}><span /><span /><span /></div>
                  <div className={styles.bar} />
                </div>
                <div className={styles.mockBody}>
                  <div className={styles.sidebar} />
                  <div className={styles.content}>
                    <div className={styles.chartArea} />
                    <div className={styles.statsRow}>
                      <div className={styles.statBox} />
                      <div className={styles.statBox} />
                      <div className={styles.statBox} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PERSONAS SECTION */}
        <section className={styles.sectionLight}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2>Built for every team</h2>
              <p>Tailored features for your specific use case.</p>
            </div>

            <div className={styles.personaGrid}>
              {personas.map((p, idx) => (
                <div key={idx} className={styles.personaCard}>
                  <div className={styles.checkmark}><LuCircleCheck /></div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2>From question to insight</h2>
              <p>A complete workflow designed for speed and quality.</p>
            </div>

            <div className={styles.stepsGrid}>
              {steps.map((step, idx) => (
                <div key={idx} className={styles.stepCard}>
                  <div className={styles.stepIcon}>
                    <step.icon size={24} />
                  </div>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                  {idx < steps.length - 1 && <div className={styles.connector} />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className={styles.sectionLight}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2>Everything you need</h2>
              <p>Detailed features for power users.</p>
            </div>

            <div className={styles.featureGrid}>
              {features.map((f, idx) => (
                <div key={idx} className={styles.featureItem}>
                  <div className={styles.featureIconBox}>
                    <f.icon size={24} />
                  </div>
                  <div className={styles.featureText}>
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaContainer}>
            <h2>Start collecting insights today</h2>
            <p>Join key decision makers who trust ALLMTAGS.</p>
            <button onClick={handleGetStarted} className={styles.whiteBtn}>
              Create Free Account
            </button>
          </div>
        </section>

      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerRow}>
            <div className={styles.footerBrand}>
              <strong>ALLMTAGS</strong>
              <p>Advanced Survey Intelligence Platform</p>
            </div>
            <div className={styles.footerLinks}>
              <div className={styles.col}>
                <h4>Product</h4>
                <Link to="/">Features</Link>
                <Link to="/">Pricing</Link>
                <Link to="/">Enterprise</Link>
              </div>
              <div className={styles.col}>
                <h4>Company</h4>
                <Link to="/">About</Link>
                <Link to="/">Careers</Link>
                <Link to="/">Contact</Link>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© 2025 ALLMTAGS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageContent;
