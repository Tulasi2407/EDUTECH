"""Configuration module for Roots & Rhythm EduTech Application."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "roots-rhythm-super-secret-key-edutech-2026")
    DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "roots_and_rhythm.sqlite3"))
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    PORT = int(os.getenv("FLASK_PORT", 5000))
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"
    
    SUPPORTED_LANGUAGES = ["en", "hi", "kn", "ta", "te"]
    DEFAULT_LANGUAGE = "en"
    
    SUPPORTED_ROLES = ["student", "teacher", "parent", "admin"]
