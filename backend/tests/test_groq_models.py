"""Retired Groq vision ids must not be sent to the API."""

from config import resolve_groq_extract_model


def test_blank_extract_model_uses_current_vision_model():
    assert resolve_groq_extract_model("") == "qwen/qwen3.8-27b"


def test_decommissioned_vision_preview_is_replaced():
    assert resolve_groq_extract_model("llama-3.2-11b-vision-preview") == "qwen/qwen3.8-27b"


def test_explicit_current_model_is_kept():
    assert resolve_groq_extract_model("qwen/qwen3.8-27b") == "qwen/qwen3.8-27b"
