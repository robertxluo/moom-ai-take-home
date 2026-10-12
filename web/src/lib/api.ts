const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export type Loan = {
  id: number;
  reference: string;
  borrower_name: string;
  product: string | null;
  status: string | null;
  opened_at: string;
  document_count: number;
};

export type Doc = {
  id: number;
  loan_file_id: number;
  filename: string;
  doc_type: string | null;
  confidence: string | null;
  uploaded_at: string;
  classified_at: string | null;
};

export type Missing = {
  loan_file_id: number;
  reference: string;
} & (
  | { product: string; evaluated: true; reason: null; missing: string[] }
  | { product: null; evaluated: false; reason: "unknown_product"; missing: null }
);

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const listLoans = () => get<Loan[]>("/loans");
export const getLoan = (id: number) =>
  get<Loan & { documents: Doc[] }>(`/loans/${id}`);
export const getMissing = (id: number) => get<Missing>(`/loans/${id}/missing`);
export type ClassifyResult = { doc_type: string | null; confidence: number | null };

export const classifyDoc = (id: number) =>
  post<ClassifyResult>(`/documents/${id}/classify`);
export const classifyPending = () =>
  post<{ classified: ClassifyResult[] }>("/documents/classify-pending");
