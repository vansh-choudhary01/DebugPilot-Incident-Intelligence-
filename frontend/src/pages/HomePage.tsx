import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Bot,
  Brain,
  Code2,
  Database,
  GitBranch,
  RadioTower,
  Search,
  Server,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, type Incident, type ServiceHealth } from "../api/client.js";

const FEATURES = [
  { icon: <Search size={18} />, title: "Vector code search", desc: "Chunks your repo and stores embeddings in MongoDB Vector Search. RCA retrieves the exact files relevant to each failure." },
  { icon: <Brain size={18} />, title: "Incident memory", desc: "Every resolved incident is stored as a memory embedding. Future RCA jobs retrieve similar past incidents automatically." },
  { icon: <Zap size={18} />, title: "Log fingerprinting", desc: "Each log message is reduced to a semantic fingerprint. Repeated patterns are grouped, not duplicated." },
  { icon: <Bot size={18} />, title: "AI root-cause analysis", desc: "OpenAI or Gemini analyses logs, metrics, deployments, and code together to produce a structured RCA with confidence score." },
  { icon: <Bell size={18} />, title: "Alerts", desc: "Console and webhook alerts fire when an incident is created or updated. Every alert is stored for audit." },
  { icon: <Code2 size={18} />, title: "HTTP API", desc: "Every integration is a plain HTTP call. Push logs, metrics, and deployments from any language or platform." },
];

const STACK = [
  { label: "Node.js + TypeScript", role: "Backend API & worker" },
  { label: "MongoDB", role: "Logs, incidents, memories" },
  { label: "Vector Search", role: "Semantic code & memory retrieval" },
  { label: "Redis + BullMQ", role: "Background RCA jobs" },
  { label: "OpenAI / Gemini", role: "Root-cause analysis LLM" },
  { label: "React + Vite", role: "Dashboard frontend" },
];

const PIPELINE = [
  { icon: <Activity size={15} />, label: "Log ingested", color: "#f5f5f5" },
  { icon: <Zap size={15} />, label: "Fingerprint generated", color: "#e5e5e5" },
  { icon: <AlertTriangle size={15} />, label: "Incident created", color: "#d4d4d4" },
  { icon: <Database size={15} />, label: "RCA job enqueued", color: "#c4c4c4" },
  { icon: <Bot size={15} />, label: "Analysis saved", color: "#a3a3a3" },
  { icon: <Bell size={15} />, label: "Alert fired", color: "#8a8a8a" },
];

export function HomePage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<ServiceHealth[]>("/services"),
      apiGet<Incident[]>("/incidents"),
    ])
      .then(([s, i]) => { setServices(s); setIncidents(i); })
      .finally(() => setLoaded(true));
  }, []);

  const openIncidents = incidents.filter((i) => i.status === "open").length;
  const degraded = services.filter((s) => s.health === "degraded").length;
  const totalErrors = services.reduce((n, s) => n + s.errorCount, 0);
  const healthy = services.length - degraded;
  const recentIncidents = incidents.filter((i) => i.status === "open").slice(0, 3);

  return (
    <div className="lp">

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <div className="lp-logo-mark"><RadioTower size={16} /></div>
            <span>DebugPilot</span>
          </div>
          <div className="lp-nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#stack">Stack</a>
          </div>
          <button className="lp-nav-cta" onClick={() => navigate("/dashboard")}>
            Open Dashboard <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-noise" />
        <div className="lp-hero-glow" />
        <div className="lp-hero-inner">
          <div className="lp-eyebrow">
            <span className="lp-eyebrow-dot" />
            AI-powered incident intelligence for engineers
          </div>
          <h1 className="lp-h1">
            Stop guessing.<br />
            <em>Debug with context.</em>
          </h1>
          <p className="lp-hero-body">
            DebugPilot watches your logs, detects repeated failures, remembers
            past incidents, retrieves related source code, and generates
            root-cause hypotheses — automatically, while you sleep.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => navigate("/dashboard")}>
              Open Dashboard <ArrowRight size={16} />
            </button>
            <a className="lp-btn-ghost" href="#how-it-works">
              See how it works
            </a>
          </div>

          {/* live stats — only when data exists */}
          {loaded && services.length > 0 && (
            <div className="lp-hero-stats">
              <div className="lp-hero-stat">
                <strong>{services.length}</strong><span>services</span>
              </div>
              <div className="lp-hero-stat-div" />
              <div className="lp-hero-stat lp-hero-stat-warn">
                <strong>{openIncidents}</strong><span>open incidents</span>
              </div>
              <div className="lp-hero-stat-div" />
              <div className="lp-hero-stat lp-hero-stat-bad">
                <strong>{totalErrors}</strong><span>errors logged</span>
              </div>
              <div className="lp-hero-stat-div" />
              <div className="lp-hero-stat lp-hero-stat-good">
                <strong>{healthy}</strong><span>healthy</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section lp-section-alt" id="how-it-works">
        <div className="lp-section-inner">
          <div className="lp-section-label">How it works</div>
          <h2 className="lp-h2">From log line to root cause — automatically</h2>
          <p className="lp-section-body">
            Four steps, all wired together. No manual triage, no context switching.
          </p>
          <div className="lp-steps">
            {[
              { icon: <GitBranch size={20} />, n: "01", title: "Index your repo", desc: "Connect a GitHub repo. DebugPilot chunks and embeds your code into MongoDB Vector Search for semantic retrieval at RCA time." },
              { icon: <Activity size={20} />, n: "02", title: "Ingest logs & metrics", desc: "Push logs and service metrics via HTTP or the SDK. Fingerprints are generated and stored automatically on every ingest." },
              { icon: <AlertTriangle size={20} />, n: "03", title: "Incident detection", desc: "Repeated failures trigger incidents using transparent, tunable rules. A BullMQ worker picks up the RCA job immediately." },
              { icon: <Bot size={20} />, n: "04", title: "AI root-cause analysis", desc: "The LLM receives relevant code chunks, past incident memories, recent metrics, and deployment history to explain what broke." },
            ].map((s) => (
              <div className="lp-step" key={s.n}>
                <div className="lp-step-n">{s.n}</div>
                <div className="lp-step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-label">Features</div>
          <h2 className="lp-h2">Every piece of the pipeline, built and wired</h2>
          <p className="lp-section-body">
            Not a log viewer. Not a chatbot. A complete incident intelligence system.
          </p>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <div className="lp-feature" key={f.title}>
                <div className="lp-feature-icon">{f.icon}</div>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Detection rules + pipeline ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-inner lp-split">

          <div className="lp-split-left">
            <div className="lp-section-label">Incident detection</div>
            <h2 className="lp-h2">Simple rules.<br />No black-box ML.</h2>
            <p className="lp-section-body">
              You can read every rule in the source. Tune the thresholds to match your service's traffic.
            </p>
            <div className="lp-rules">
              <div className="lp-rule">
                <div className="lp-rule-left">
                  <span className="lp-rule-val">≥ 20×</span>
                  <span className="lp-rule-label">same fingerprint</span>
                </div>
                <span className="lp-rule-window">in 10 min</span>
              </div>
              <div className="lp-rule">
                <div className="lp-rule-left">
                  <span className="lp-rule-val">≥ 30</span>
                  <span className="lp-rule-label">error / fatal logs</span>
                </div>
                <span className="lp-rule-window">in 5 min</span>
              </div>
              <div className="lp-rule">
                <div className="lp-rule-left">
                  <span className="lp-rule-val">0×</span>
                  <span className="lp-rule-label">duplicate incidents</span>
                </div>
                <span className="lp-rule-window">open ones update</span>
              </div>
            </div>
          </div>

          <div className="lp-split-right">
            <div className="lp-pipeline-card">
              <div className="lp-pipeline-title">Request lifecycle</div>
              {PIPELINE.map((step, i) => (
                <div className="lp-pipeline-item" key={step.label}>
                  <div className="lp-pipeline-track">
                    <div className="lp-pipeline-node" style={{ color: step.color, borderColor: step.color }}>
                      {step.icon}
                    </div>
                    {i < PIPELINE.length - 1 && <div className="lp-pipeline-connector" />}
                  </div>
                  <span className="lp-pipeline-label">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Stack ── */}
      <section className="lp-section lp-section-alt" id="stack">
        <div className="lp-section-inner">
          <div className="lp-section-label">Stack</div>
          <h2 className="lp-h2">The stack behind the platform</h2>
          <p className="lp-section-body">
            Everything your services need to report errors, track metrics, and get AI-powered root cause analysis.
          </p>
          <div className="lp-stack">
            {STACK.map((s) => (
              <div className="lp-stack-item" key={s.label}>
                <strong>{s.role}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Active incidents ── */}
      {recentIncidents.length > 0 && (
        <section className="lp-section">
          <div className="lp-section-inner">
            <div className="lp-section-label">Live</div>
            <h2 className="lp-h2" style={{ marginBottom: 8 }}>
              Active incidents
              <Link to="/dashboard/incidents" className="lp-see-all">See all →</Link>
            </h2>
            <p className="lp-section-body" style={{ marginBottom: 28 }}>
              These are open right now in your environment.
            </p>
            <div className="lp-incidents">
              {recentIncidents.map((inc) => (
                <Link to={`/dashboard/incidents/${inc._id}`} className="lp-incident" key={inc._id}>
                  <div className="lp-incident-top">
                    <span className={`status-pill ${inc.severity === "high" ? "bad" : inc.severity === "medium" ? "warn" : "neutral"}`}>
                      {inc.severity}
                    </span>
                    <span className="lp-incident-count"><Zap size={11} />{inc.occurrenceCount}×</span>
                  </div>
                  <strong>{inc.title}</strong>
                  <span>{inc.service}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-glow" />
        <div className="lp-cta-inner">
          <h2 className="lp-cta-title">Ready to debug smarter?</h2>
          <p className="lp-cta-body">
            Open the dashboard to see your services, incidents, and AI analysis in real time.
          </p>
          <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate("/dashboard")}>
            Open Dashboard <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <div className="lp-logo-mark lp-logo-mark-sm"><RadioTower size={13} /></div>
          <span>DebugPilot</span>
        </div>
        <span className="lp-footer-stack">Node.js · MongoDB · Redis · BullMQ · OpenAI · React</span>
      </footer>

    </div>
  );
}
