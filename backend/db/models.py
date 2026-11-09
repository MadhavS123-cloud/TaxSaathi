"""
db/models.py - TaxSaathi SQLAlchemy ORM Models

Tables required by specification:
- users (id, name, email unique, password_hash, firm_id, role, created_at)
- firms (id, name, created_at)
- clients (id, firm_id, legal_name, gstin, pan, created_at)
- cases (id, firm_id, client_id, title, assessment_year, status, created_at)
- documents (id, case_id, filename, file_hash, file_size, status, extracted_json, created_at)
- reconciliations (id, case_id, result_json, created_at)

Additional models for complete functionality:
- review_items (review & approve workflow)
- chat_messages (persisted RAG advisory history per case)
- activities (activity feed logs)
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

    users = relationship("User", back_populates="firm", cascade="all, delete-orphan")
    cases = relationship("Case", back_populates="firm", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="firm", cascade="all, delete-orphan")
    review_items = relationship("ReviewItem", back_populates="firm", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=True, index=True)
    role = Column(String, default="member")
    created_at = Column(DateTime, default=datetime.utcnow)

    firm = relationship("Firm", back_populates="users")


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True, default=generate_uuid)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    legal_name = Column(String, nullable=False)
    gstin = Column(String, nullable=True)
    pan = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    firm = relationship("Firm", back_populates="clients")
    cases = relationship("Case", back_populates="client_rel", cascade="all, delete-orphan")


class Case(Base):
    __tablename__ = "cases"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True, default=generate_uuid)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=True, index=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=True, index=True)
    title = Column(String, nullable=True)
    assessment_year = Column(String, nullable=True, default="2024-25")
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Legacy/compatibility attributes
    client = Column(String, nullable=True)  # Mirror of legal_name or client string
    scope = Column(String, nullable=True)   # Mirror of title/scope
    gstin = Column(String, nullable=True)
    owner = Column(String, nullable=True, index=True)

    firm = relationship("Firm", back_populates="cases")
    client_rel = relationship("Client", back_populates="cases")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    reconciliations = relationship("Reconciliation", back_populates="case", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="case", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="case", cascade="all, delete-orphan")
    review_items = relationship("ReviewItem", back_populates="case", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_hash = Column(String, nullable=True, index=True)
    file_size = Column(Integer, nullable=True)
    status = Column(String, default="processing")  # processing, extracted, failed
    extracted_json = Column(JSON, nullable=True)
    error_detail = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    case = relationship("Case", back_populates="documents")


class Reconciliation(Base):
    __tablename__ = "reconciliations"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    result_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="reconciliations")


class ReviewItem(Base):
    __tablename__ = "review_items"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True, default=generate_uuid)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False, index=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    item_type = Column(String, nullable=False)  # 'failed_extraction', 'unmatched_reconciliation', 'draft_email'
    title = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    status = Column(String, default="pending")  # 'pending', 'approved', 'rejected'
    reviewer = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    firm = relationship("Firm", back_populates="review_items")
    case = relationship("Case", back_populates="review_items")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    owner = Column(String, nullable=True)
    role = Column(String, nullable=False)  # 'user', 'assistant'
    content = Column(Text, nullable=False)
    citations_json = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="chat_messages")


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    owner = Column(String, nullable=True, index=True)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    type = Column(String, nullable=False)
    client = Column(String, nullable=True)
    description = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="activities")
