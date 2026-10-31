"""
db/models.py - TaxSaathi SQLAlchemy ORM Models
"""

from datetime import datetime
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, JSON, Text
)
from sqlalchemy.orm import relationship

from .session import Base


def generate_uuid():
    return str(uuid.uuid4())


class Firm(Base):
    __tablename__ = "firms"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    users = relationship("User", back_populates="firm")
    cases = relationship("Case", back_populates="firm")


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="member")
    created_at = Column(DateTime, default=datetime.utcnow)
    firm = relationship("Firm", back_populates="users")


class Case(Base):
    __tablename__ = "cases"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    owner = Column(String, nullable=True, index=True)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=True, index=True)
    client = Column(String, nullable=False)
    scope = Column(String, nullable=False)
    gstin = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    firm = relationship("Firm", back_populates="cases")
    activities = relationship("Activity", back_populates="case", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="case", cascade="all, delete-orphan")
    ledger_entries = relationship("LedgerEntry", back_populates="case", cascade="all, delete-orphan")
    bank_entries = relationship("BankStatementEntry", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="case", cascade="all, delete-orphan")


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True, index=True)
    owner = Column(String, nullable=True, index=True)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)
    type = Column(String, nullable=False)
    client = Column(String, nullable=True)
    description = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    case = relationship("Case", back_populates="activities")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_hash = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    file_path = Column(String, nullable=True)
    status = Column(String, default="processing")
    extracted_json = Column(JSON, nullable=True)
    error_detail = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    case = relationship("Case", back_populates="documents")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)
    owner = Column(String, nullable=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    citations_json = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    case = relationship("Case", back_populates="chat_messages")


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)
    vendor = Column(String, nullable=True)
    date = Column(String, nullable=True)
    total_amount = Column(Float, nullable=True)
    file_url = Column(String, nullable=True)
    status = Column(String, default="EXTRACTED")
    case = relationship("Case", back_populates="invoices")
    line_items = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")


class LineItem(Base):
    __tablename__ = "line_items"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String, ForeignKey("invoices.id"))
    description = Column(String, nullable=True)
    quantity = Column(Float, nullable=True)
    unit_price = Column(Float, nullable=True)
    amount = Column(Float, nullable=True)
    invoice = relationship("Invoice", back_populates="line_items")


class Query(Base):
    __tablename__ = "queries"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=True)
    is_low_confidence = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    citations = relationship("Citation", back_populates="query", cascade="all, delete-orphan")


class Citation(Base):
    __tablename__ = "citations"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(String, ForeignKey("queries.id"))
    source_section = Column(String, nullable=True)
    source_text = Column(String, nullable=True)
    query = relationship("Query", back_populates="citations")


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"))
    date = Column(String, nullable=True)
    description = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    entry_type = Column(String, nullable=True)
    match_status = Column(String, default="UNMATCHED")
    case = relationship("Case", back_populates="ledger_entries")


class BankStatementEntry(Base):
    __tablename__ = "bank_entries"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"))
    date = Column(String, nullable=True)
    description = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    entry_type = Column(String, nullable=True)
    match_status = Column(String, default="UNMATCHED")
    case = relationship("Case", back_populates="bank_entries")


class ReconciledMatch(Base):
    __tablename__ = "reconciled_matches"
    __table_args__ = {"extend_existing": True}
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"))
    ledger_entry_id = Column(String, ForeignKey("ledger_entries.id"), nullable=True)
    bank_entry_id = Column(String, ForeignKey("bank_entries.id"), nullable=True)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=True)
    match_status = Column(String, nullable=False)
    variance = Column(Float, default=0.0)
