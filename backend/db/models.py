from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Case(Base):
    __tablename__ = 'cases'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    client = Column(String, nullable=False)
    scope = Column(String, nullable=False)
    gstin = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    activities = relationship("Activity", back_populates="case", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="case", cascade="all, delete-orphan")
    ledger_entries = relationship("LedgerEntry", back_populates="case", cascade="all, delete-orphan")
    bank_entries = relationship("BankStatementEntry", back_populates="case", cascade="all, delete-orphan")

class Activity(Base):
    __tablename__ = 'activities'
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)
    type = Column(String, nullable=False)
    client = Column(String, nullable=True)
    description = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("Case", back_populates="activities")

class Invoice(Base):
    __tablename__ = 'invoices'
    
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
    __tablename__ = 'line_items'
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String, ForeignKey("invoices.id"))
    description = Column(String, nullable=True)
    quantity = Column(Float, nullable=True)
    unit_price = Column(Float, nullable=True)
    amount = Column(Float, nullable=True)
    
    invoice = relationship("Invoice", back_populates="line_items")

class Query(Base):
    __tablename__ = 'queries'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=True)
    is_low_confidence = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    citations = relationship("Citation", back_populates="query", cascade="all, delete-orphan")

class Citation(Base):
    __tablename__ = 'citations'
    
    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(String, ForeignKey("queries.id"))
    source_section = Column(String, nullable=True)
    source_text = Column(String, nullable=True)
    
    query = relationship("Query", back_populates="citations")

class LedgerEntry(Base):
    __tablename__ = 'ledger_entries'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"))
    date = Column(String, nullable=True)
    description = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    entry_type = Column(String, nullable=True) # DEBIT or CREDIT
    match_status = Column(String, default="UNMATCHED") # MATCHED, UNMATCHED, PARTIAL
    
    case = relationship("Case", back_populates="ledger_entries")

class BankStatementEntry(Base):
    __tablename__ = 'bank_entries'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"))
    date = Column(String, nullable=True)
    description = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    entry_type = Column(String, nullable=True) # DEBIT or CREDIT
    match_status = Column(String, default="UNMATCHED") # MATCHED, UNMATCHED, PARTIAL
    
    case = relationship("Case", back_populates="bank_entries")

class ReconciledMatch(Base):
    __tablename__ = 'reconciled_matches'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"))
    ledger_entry_id = Column(String, ForeignKey("ledger_entries.id"), nullable=True)
    bank_entry_id = Column(String, ForeignKey("bank_entries.id"), nullable=True)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=True)
    match_status = Column(String, nullable=False) # MATCHED, PARTIAL
    variance = Column(Float, default=0.0)
