import { useEffect, useState } from "react";
import LoanList from "./components/LoanList";
import DocumentList from "./components/DocumentList";
import {
  listLoans,
  getLoan,
  getMissing,
  classifyPending,
  type Loan,
  type Doc,
  type Missing,
} from "./lib/api";

export default function App() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [missing, setMissing] = useState<Missing | null>(null);
  const [missingError, setMissingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    listLoans().then(setLoans).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (selected === null) return;
    let active = true;
    setDocs([]);
    setMissing(null);
    setMissingError(null);
    getLoan(selected)
      .then((l) => { if (active) setDocs(l.documents); })
      .catch(() => { if (active) setDocs([]); });
    getMissing(selected)
      .then((m) => { if (active) setMissing(m); })
      .catch(() => {
        if (active) setMissingError("Could not load the missing-document report. Please try again.");
      });
    return () => { active = false; };
  }, [selected]);

  async function runClassifier() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const { classified } = await classifyPending();
      // Say what happened. Most of what this changes is not on screen -- the
      // loan list shows counts, not types -- so without this the button looks
      // like it did nothing.
      setResult(
        classified.length === 0
          ? "Nothing to classify. Everything already has a type."
          : `Classified ${classified.length} document${
              classified.length === 1 ? "" : "s"
            }.`
      );
      if (selected !== null) {
        const l = await getLoan(selected);
        setDocs(l.documents);
      }
      setLoans(await listLoans());
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <h1>Loan Intake Triage</h1>
      <p className="sub">
        Documents arrive against a loan file, get classified, and the file is
        checked against a per-product checklist.
      </p>

      {error && (
        <div className="card" style={{ marginBottom: 18, padding: "12px 14px" }}>
          <code>{error}</code>
        </div>
      )}

      <div className="actions">
        <button onClick={runClassifier} disabled={busy}>
          {busy ? "Classifying…" : "Classify unclassified documents"}
        </button>
        {result && <span className="result">{result}</span>}
      </div>

      <div className="grid">
        <LoanList loans={loans} selected={selected} onSelect={setSelected} />
        <DocumentList docs={docs} missing={missing} missingError={missingError} />
      </div>
    </div>
  );
}
