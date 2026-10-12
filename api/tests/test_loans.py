"""HTTP contract tests for the missing-document report; no database or model."""

from unittest.mock import Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import loans


@pytest.fixture
def client():
    # Mount only this router so unrelated model services are never imported.
    app = FastAPI()
    app.include_router(loans.router)
    with TestClient(app) as client:
        yield client


@pytest.fixture
def query(monkeypatch):
    mock = Mock()
    monkeypatch.setattr(loans.db, "query", mock)
    return mock


REVERSE_REQUIRED = [
    {"doc_type": doc_type}
    for doc_type in (
        "bank_statement",
        "photo_id",
        "homeowners_insurance",
        "property_tax_bill",
        "counseling_certificate",
    )
]


def test_missing_reports_only_absent_required_types(client, query):
    # LF-10021, as seeded: pay_stub is optional for a reverse loan.
    query.side_effect = [
        [{"id": 1, "reference": "LF-10021", "product": "reverse"}],
        REVERSE_REQUIRED,
        [
            {"doc_type": "pay_stub"},
            {"doc_type": "bank_statement"},
            {"doc_type": "photo_id"},
            {"doc_type": "homeowners_insurance"},
        ],
    ]

    response = client.get("/loans/1/missing")

    assert response.status_code == 200
    body = response.json()
    assert set(body["missing"]) == {"property_tax_bill", "counseling_certificate"}
    assert len(body["missing"]) == 2
    assert {key: value for key, value in body.items() if key != "missing"} == {
        "loan_file_id": 1,
        "reference": "LF-10021",
        "product": "reverse",
        "evaluated": True,
        "reason": None,
    }


def test_missing_is_empty_for_a_complete_known_product(client, query):
    # LF-10028 has every required reverse-loan document in the seed.
    query.side_effect = [
        [{"id": 8, "reference": "LF-10028", "product": "reverse"}],
        REVERSE_REQUIRED,
        REVERSE_REQUIRED,
    ]

    response = client.get("/loans/8/missing")

    assert response.status_code == 200
    assert response.json() == {
        "loan_file_id": 8,
        "reference": "LF-10028",
        "product": "reverse",
        "evaluated": True,
        "reason": None,
        "missing": [],
    }


def test_missing_cannot_evaluate_an_unknown_product(client, query):
    # LF-10027: NULL product yields no checklist rows, not proof of completeness.
    query.return_value = [{"id": 7, "reference": "LF-10027", "product": None}]

    response = client.get("/loans/7/missing")

    assert response.status_code == 200
    assert response.json() == {
        "loan_file_id": 7,
        "reference": "LF-10027",
        "product": None,
        "evaluated": False,
        "reason": "unknown_product",
        "missing": None,
    }
    query.assert_called_once_with("SELECT * FROM loan_file WHERE id = %s", (7,))


def test_missing_returns_not_found_for_an_absent_loan(client, query):
    query.return_value = []

    response = client.get("/loans/999/missing")

    assert response.status_code == 404
    assert response.json() == {"detail": "loan file not found"}
    query.assert_called_once_with("SELECT * FROM loan_file WHERE id = %s", (999,))
