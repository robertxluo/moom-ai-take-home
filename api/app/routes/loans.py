"""Routes for loan files and the missing-document report."""

from fastapi import APIRouter, HTTPException

from app import db

router = APIRouter(prefix="/loans", tags=["loans"])


@router.get("")
def list_loans():
    """List every loan file with a count of its documents."""
    return db.query(
        """SELECT lf.id, lf.reference, lf.borrower_name, lf.product,
                  lf.status, lf.opened_at,
                  count(d.id) AS document_count
             FROM loan_file lf
             LEFT JOIN document d ON d.loan_file_id = lf.id
            GROUP BY lf.id
            ORDER BY lf.opened_at DESC"""
    )


@router.get("/{loan_id}")
def get_loan(loan_id: int):
    """Return one loan file with its documents."""
    rows = db.query("SELECT * FROM loan_file WHERE id = %s", (loan_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="loan file not found")

    loan = rows[0]
    loan["documents"] = db.query(
        """SELECT id, filename, doc_type, confidence, uploaded_at
             FROM document WHERE loan_file_id = %s ORDER BY uploaded_at""",
        (loan_id,),
    )
    return loan


@router.get("/{loan_id}/missing")
def missing_documents(loan_id: int):
    """Report which required documents this loan file is still missing.

    Compares the document types present on the file against the checklist for
    the file's product. An unknown product cannot be evaluated; missing is then
    null rather than an empty list that would imply the checklist passed.
    """
    rows = db.query("SELECT * FROM loan_file WHERE id = %s", (loan_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="loan file not found")

    loan = rows[0]

    if loan["product"] is None:
        return {
            "loan_file_id": loan_id,
            "reference": loan["reference"],
            "product": None,
            "evaluated": False,
            "reason": "unknown_product",
            "missing": None,
        }

    required = db.query(
        "SELECT doc_type FROM checklist_item WHERE product = %s AND required = true",
        (loan["product"],),
    )
    present = db.query(
        "SELECT DISTINCT doc_type FROM document WHERE loan_file_id = %s",
        (loan_id,),
    )

    present_types = {r["doc_type"] for r in present}
    missing = [r["doc_type"] for r in required if r["doc_type"] not in present_types]

    return {
        "loan_file_id": loan_id,
        "reference": loan["reference"],
        "product": loan["product"],
        "evaluated": True,
        "reason": None,
        "missing": missing,
    }
