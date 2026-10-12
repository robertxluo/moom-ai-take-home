import type { Doc, Missing } from "../lib/api";

export default function DocumentList({
  docs,
  missing,
  missingError,
}: {
  docs: Doc[];
  missing: Missing | null;
  missingError: string | null;
}) {
  return (
    <div className="card">
      <h2>Documents</h2>
      {missingError && (
        <div className="bar" role="alert" style={{ color: "var(--warn)" }}>
          {missingError}
        </div>
      )}
      {missing && !missing.evaluated && (
        <div className="bar" role="status" style={{ color: "var(--warn)" }}>
          Cannot check missing documents because the loan product is unknown.
        </div>
      )}
      {missing?.evaluated && missing.missing.length === 0 && (
        <div className="bar" role="status">
          All required document types are present.
        </div>
      )}
      {missing?.evaluated && missing.missing.length > 0 && (
        <div className="bar">
          <span style={{ color: "var(--muted)", fontSize: 12 }}>Missing:</span>
          {missing.missing.map((m) => (
            <span key={m} className="pill miss">{m}</span>
          ))}
        </div>
      )}
      {docs.length === 0 ? (
        <div className="empty">Select a loan file.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Type</th>
              <th>Conf.</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td><code>{d.filename}</code></td>
                <td>
                  {d.doc_type ?? <span className="pill none">unclassified</span>}
                </td>
                <td><code>{d.confidence ?? "-"}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
