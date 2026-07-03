import { Brain, Code2, Send, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { apiPost } from "../api/client.js";

type AskResponse = {
  answer: string;
  relatedCode: Array<{ filePath: string; score?: number }>;
  similarIncidents: Array<{ _id: string; title: string; rootCause: string }>;
};

export function AskPage() {
  const [question, setQuestion] = useState("Why is cex-v2-boilercode failing?");
  const [result, setResult] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(await apiPost<AskResponse>("/ask", { question }));
    setLoading(false);
  }

  return (
    <section className="dashboard-page ask-page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Ask DebugPilot</span>
          <h1>Ask with incident context</h1>
          <p>Question the same evidence the RCA worker sees: logs, metrics, code chunks, and incident memory.</p>
        </div>
      </header>

      <div className="ask-workspace">
        <form className="ask-box" onSubmit={ask}>
          <div className="ask-box-header">
            <Sparkles size={18} />
            <strong>Investigation prompt</strong>
          </div>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
          <button type="submit" disabled={loading || question.length < 3}>
            <Send size={16} /> {loading ? "Thinking" : "Ask"}
          </button>
        </form>

        <div className="context-hints panel">
          <h2>Good questions</h2>
          <p>Why did this service degrade after the last deploy?</p>
          <p>Which files are most related to this fingerprint?</p>
          <p>Have we seen a similar failure before?</p>
        </div>
      </div>

      {result && (
        <div className="detail-grid">
          <div className="panel answer-panel">
            <div className="panel-title">
              <Brain size={18} />
              <h2>Answer</h2>
            </div>
            <p>{result.answer}</p>
          </div>
          <div className="panel">
            <div className="panel-title">
              <Code2 size={18} />
              <h2>Evidence</h2>
            </div>
            {result.relatedCode.map((code) => <p key={code.filePath}>{code.filePath}</p>)}
            {result.similarIncidents.map((incident) => (
              <p key={incident._id}><strong>{incident.title}</strong><br />{incident.rootCause}</p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
