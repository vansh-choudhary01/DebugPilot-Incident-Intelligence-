import { Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { apiPost } from "../api/client.js";

type AskResponse = {
  answer: string;
  relatedCode: Array<{ filePath: string; score?: number }>;
  similarIncidents: Array<{ _id: string; title: string; rootCause: string }>;
};

export function AskPage() {
  const [question, setQuestion] = useState("Why is payment service failing?");
  const [result, setResult] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(await apiPost<AskResponse>("/ask", { question }));
    setLoading(false);
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Ask</h1>
          <p>Ask debugging questions across logs, incident memory, and indexed code.</p>
        </div>
      </header>

      <form className="ask-box" onSubmit={ask}>
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
        <button type="submit" disabled={loading || question.length < 3}>
          <Send size={16} /> Ask
        </button>
      </form>

      {result && (
        <div className="detail-grid">
          <div className="panel answer-panel">
            <h2>Answer</h2>
            <p>{result.answer}</p>
          </div>
          <div className="panel">
            <h2>Evidence</h2>
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
