# 🚀 Checkpoint 2: Requirements, Architecture, Tech Stack & Roadmap
**Project Title**: EduTech — Smart, Inclusive & Personalized Educational Platform  
**Team / Lead**: Tulasi2407  
**Repository**: https://github.com/Tulasi2407/EDUTECH  

---

## 📌 Executive Summary

Modern students face a critical roadblock: **surface-level learning gaps are treated as lack of intelligence rather than unmastered prerequisite concepts**. Furthermore, rigid school schedules ignore students' actual availability, and language barriers in STEM education leave vernacular-medium students behind.

Our solution is a **Smart, Inclusive and Personalized Educational Platform** that:
1. Diagnoses learning difficulties through an automated **Gap Finder**.
2. Uncovers hidden foundational weaknesses using a graph-based **Root-Cause X-Ray**.
3. Delivers 24/7 personalized **AI assistance in 5 Indian languages** across **3 distinct learning paces**.
4. Schedules learning **strictly within students' declared free hours**.
5. Upholds student privacy and accountable, hallucination-monitored **Responsible AI**.

---

## 🔄 1. Complete End-to-End System Workflow

The user journey is engineered as a continuous, closed-loop pedagogical cycle:

```
[Student Onboarding]
       │
       ▼
[1. Auth & Profile Setup] (Preferred Language: EN/HI/KN/TA/TE, Pace Mode)
       │
       ▼
[2. Gap Finder: Diagnostic Assessment] ──► Score < 70%?
       │                                       │
       ▼ (No)                                  ▼ (Yes)
[Topic Mastered]                       [3. Root-Cause X-Ray]
                                               │
                                               ▼
                                  [Isolate Deepest Prerequisite]
                                               │
                                               ▼
                                  [4. Declare Weekly Free Hours]
                                               │
                                               ▼
                              [5. Free-Hour Constraint Scheduling Engine]
                                               │
                                               ▼
                              [6. Active Study Sessions]
                                 ├──► AI Assistant (5 Languages, 3 Paces)
                                 └──► Adaptive Practice (Difficulty 1-3, Hints)
                                               │
                                               ▼
                              [8. Real-Time Mastery & Analytics Engine]
                                               │
                                  Mastery >= 80% ──► [Learning Gap Resolved! 🎉]
```

---

## 🌟 2. Detailed Feature Breakdown (10 Core Objectives)

| # | Feature Name | Core Functionality | Impact / Innovation |
|---|---|---|---|
| **1** | **Gap Finder** | Multi-topic diagnostic assessment engine calculating granular accuracy per topic and auto-classifying learning gaps. | Moves away from generic test scores to pinpointed topic diagnostics. |
| **2** | **Root-Cause X-Ray** | Directed Acyclic Graph (DAG) traversal across prerequisite dependencies using SQLite recursive CTEs. | Solves the root failure rather than treating surface symptoms. |
| **3** | **AI Assistant** | Step-by-step doubt resolution with real-world analogies, conceptual breakdown, and check questions. | Provides patient, personalized 1-on-1 tutoring 24/7. |
| **4** | **Language Switcher** | Full learning support across 5 languages: **English, Hindi (हिंदी), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Telugu (తెలుగు)**. | Eliminates English-language elitism in STEM education; highly inclusive. |
| **5** | **Three Learning Modes** | Pacing options: **Step-by-Step** (micro-steps & analogies), **Balanced** (standard curriculum), **Fast-Track** (high-yield exam formulas). | Adapts to neurodiversity, exam urgency, and individual learning speeds. |
| **6** | **Personalized Practice** | Adaptive question generator with dynamic difficulty calibration (Levels 1–3) and progressive 2-stage hint ladders. | Prevents discouragement by matching problem difficulty to student readiness. |
| **7** | **Free-Hour Study Planner** | Mathematical constraint scheduling engine enforcing learning sessions strictly inside student-declared availability. | Prevents student burnout and respects extracurricular and family commitments. |
| **8** | **Progress Dashboard & Analytics** | Visual tracking of overall mastery, problem-solving accuracy, learning streak days, active/resolved gaps, and activity logs. | Gamifies consistency and transparently shows tangible academic growth. |
| **9** | **Responsive Platform UI** | Clean, mobile-friendly Single Page Application (SPA) + full interactive Swagger OpenAPI interface. | Zero barrier to entry; works across low-end mobile phones, tablets, and laptops. |
| **10** | **Data Privacy & Responsible AI** | Strict student multi-tenant data isolation, JWT authentication, bcrypt hashing, input sanitization, and user hallucination reporting queue. | Guarantees compliance, security, and accountable AI output. |

---

## 💻 3. Technology Stack Architecture

- **Backend Application Layer**: FastAPI (Python 3.10+), Uvicorn ASGI Server, Pydantic v2 Request/Response validation.
- **Persistence Layer**: SQLite 3 with Foreign Keys, Recursive Common Table Expressions (CTEs) for DAG traversal, and ACID transactions.
- **AI & Pedagogical Engine**: Dual-engine architecture:
  - Primary: Google Gemini Generative AI (`gemini-2.0-flash` / `gemini-1.5-flash`).
  - Fallback: Built-in Curated Pedagogical Synthesis Engine (zero external downtime risk).
- **Security & Multi-Tenancy**: PyJWT (HMAC-SHA256 bearer tokens), Bcrypt password hashing, OWASP prompt-injection input sanitization.
- **Client Presentation Layer**: Responsive Single Page Application (HTML5, Modern CSS Variables, Vanilla JS, Async Fetch API).
- **Quality Assurance**: Pytest automated test suite (100% test pass rate across 7 test suites).

---

## 🗺️ 4. Phased Project Roadmap

- **Phase 1: Problem Understanding & Discovery (Checkpoint 1) ✅**: Target audience defined, concept dependencies mapped across high school subjects.
- **Phase 2: Requirements, Architecture & Planning (Checkpoint 2 — Current) 📍**: Detailed feature specs, system architecture, API schemas, and technical roadmap.
- **Phase 3: Teamwork & Core Engines Implementation (Checkpoint 3) 🚀**: Built Gap Finder, Root-Cause X-Ray DAG engine, Free-Hour Study Planner, 5-language AI Assistant, and Safety reporting queue.
- **Phase 4: Prototype & MVP Validation (Checkpoint 4) 🎯**: Full working interactive MVP on port 8000, 100% automated test coverage with Pytest.
- **Phase 5: Final Evaluation & Demo (Checkpoint 5) 🏆**: End-to-end live hackathon demonstration with real-world student impact presentation.
