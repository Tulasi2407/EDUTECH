"""Roots & Rhythm - Application Entry Point.
Run with: python run.py
"""

from app import app
from config import Config
from database import init_db

# Ensure database and realistic curriculum seed data are initialized
init_db(force_reseed=False)

if __name__ == "__main__":
    port = Config.PORT
    print("=" * 60)
    print("🌿 ROOTS & RHYTHM - EduTech Web Application")
    print("Domain 2: Smart, Inclusive & Personalized Education")
    print(f"Server running at: http://127.0.0.1:{port}")
    print("=" * 60)
    app.run(host="127.0.0.1", port=port, debug=Config.DEBUG)
