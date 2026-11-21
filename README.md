# Roots & Rhythm 🌿⏱️
> **Domain 2: Smart, Inclusive & Personalized Education**  
> *A production-grade, mobile-first full-stack EduTech web application tackling learning-speed disparities, prerequisite bottlenecks, language barriers, and study schedule cramming.*

---

## 🌟 Vision & Key Highlights

Students don't fail because they are not capable; they struggle because unseen prerequisite gaps from earlier grades compound silently over time, and rigid schedules force them into cognitive overload. 

**Roots & Rhythm** solves this with a two-pillar pedagogical engine:
1. **Roots (Prerequisite Gap Finder & Root-Cause Tracer):** An interactive educational X-Ray dependency graph that traces stumbling topics backward through the curriculum directed acyclic graph (DAG) to pinpoint foundational bottlenecks (e.g., struggling with *Quadratic Equations* traces back to *Factoring Polynomials* → *Negative Sign Rules*).
2. **Rhythm (Free-Hour Study Planner & Rebalancer):** A calm, tactile scheduler where students declare their actual daily/weekly free hours. Bite-sized micro-study sessions target their root-cause gaps *strictly* inside declared free hours, with one-tap completion, dynamic rescheduling, and automatic rebalancing when a session is skipped.

---

## 🚀 Key Innovations & Functional Modules

### 1. Prerequisite Gap Finder (Root-Cause Tracer)
- **Topological Dependency Graph:** Powered by graph traversal algorithms that inspect curriculum prerequisites across 3 tiers (Foundations, Intermediate, Target).
- **Interactive SVG Root-Cause Node Map:**
  - **Rose Nodes (🚨 Root Causes):** Foundational nodes with low diagnostic mastery (<50%), featuring a pulsing radar aura.
  - **Amber Nodes (⚠️ Shaky):** Partial understanding (50%–75%).
  - **Emerald Nodes (✅ Mastered):** Secured foundations (≥75%).
  - **Indigo Nodes (🎯 Target):** The current topic of struggle.
  - **Animated Connection Flowlines:** Dashed directional vectors demonstrating prerequisite hierarchy.
- **Instant Drill-Down Drawer:** Clicking any node reveals bite-sized concepts, key formulas, adaptive speed pacing (Beginner 15m, Intermediate 25m, Advanced 45m), and instant practice drills.

### 2. Free-Hour Study Planner & Automatic Rebalancer
- **Student-Declared Time Windows:** Students input real daily slots (e.g., `06:30–07:15 Morning Clarity`, `17:30–18:30 After-School Focus`).
- **Zero-Burnout Packing:** Micro-sessions target diagnosed root causes strictly inside declared free hours.
- **One-Tap Completion & Streak Tracking:** Marks sessions complete, boosts topic mastery score (+15 points), updates streak counts.
- **Auto-Rebalancing Engine:** Detects overdue or skipped sessions and automatically redistributes them across upcoming free slots without double-booking or cognitive overload.

### 3. Safe & Responsible AI Guardrails
- **Confidence & Verification Badges:** Every practice question and explanation displays strict curriculum verification ratings (e.g., `98% Confidence (Curriculum-Verified)`).
- **Deterministic Offline Fallbacks:** Designed with a zero-failure architecture. If Gemini API credentials are not provided or if network calls drop, high-fidelity pedagogical fallbacks engage deterministically.
- **Review / Flag Answer Workflow:** Both students and teachers can review, suggest edits, and flag AI answers, feeding into a faculty audit queue for continuous quality improvement.

### 4. Inclusive 5-Language Instant Localization (i18n)
- Seamless top-bar toggle supporting:
  - 🇬🇧 **English**
  - 🇮🇳 **Hindi (हिंदी)**
  - 🇮🇳 **Kannada (ಕನ್ನಡ)**
  - 🇮🇳 **Tamil (தமிழ்)**
  - 🇮🇳 **Telugu (తెలుగు)**
- Translates UI controls, role dashboards, navigation labels, and pedagogical guidance.

### 5. Strict Multi-Role RBAC & Data Privacy
- **Student Dashboard:** Access to personal root-cause trees, declared free slots, micro-study sessions, adaptive practice, and rhythm streaks.
- **Teacher Dashboard (Bonus):** Class-wide weak-topic heatmap, student gap alerts, one-click intervention dispatch, and AI answer moderation.
- **Parent Overview:** Jargon-free progress summaries, upcoming free-hour study blocks, encouraging milestone badges, and weekly coaching advice.
- **School/College Admin:** Institutional curriculum health, cohort demographics, teacher activity, and audit logs.
- **Strict Server-Side Enforcement:** RBAC decorator validates role permissions; students cannot inspect peer data.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Python 3.13, Flask 3.1, SQLite 3.45, SQLAlchemy-compatible relational persistence.
- **Frontend:** Vanilla modern JavaScript (ES6+), HTML5, SVG Dependency Canvas, Tailwind CSS, Chart.js.
- **Validation:** Server-side schema validator (`services/validator.py`) with strict string sanitization, 24-hour time validation, and bound checks.
- **Testing:** Python `unittest` suite covering all 12 core user flows, RBAC enforcement, gap tracing, and auto-rebalancing.

---

## 📁 Repository Structure

```
e:\EDUTECH\
├── app.py                     # Main Flask application, routes & RBAC middleware
├── config.py                  # App configuration & environment settings
├── database.py                # SQLite schema, tables & educational curriculum seed data
├── services/
│   ├── __init__.py
│   ├── gap_finder.py          # Prerequisite tracing graph engine (BFS/DAG)
│   ├── planner.py             # Free-hour scheduler & rebalancing engine
│   ├── ai_service.py          # Gemini API + safe deterministic pedagogical fallback
│   └── validator.py           # Schema validation & sanitization
├── static/
│   ├── css/
│   │   └── app.css            # Tactile styles, animations & node-map aura
│   ├── js/
│   │   ├── app.js             # Core app coordinator, state & modal controllers
│   │   ├── i18n.js            # 5-Language localization dictionaries & switcher
│   │   ├── node_map.js        # Interactive SVG Root-Cause Node Map & drill-down drawer
│   │   ├── timeline.js        # Visual Free-Hour Timeline & study scheduler
│   │   └── analytics.js       # Chart.js analytics, teacher heatmap & parent summary
├── templates/
│   └── index.html             # Mobile-first unified reactive interface
├── tests/
│   └── test_app.py            # Comprehensive 12-point automated test suite
├── .env.example               # Environment variables template
├── .gitignore                 # Production gitignore
└── README.md                  # Comprehensive project documentation
```

---

## ⚡ Quickstart Guide (Run on Any Laptop)

### 1. Clone & Setup
```bash
# Clone the repository
git clone https://github.com/Tulasi2407/EDUTECH.git
cd EDUTECH

# Install dependencies (only lightweight Flask, Werkzeug, Jinja2)
pip install -r requirements.txt
```

### 2. Launch the Application
```bash
python run.py
```
*(Or alternatively: `python app.py`)*

Open your browser and navigate to:
```
http://127.0.0.1:5000
```

### 3. (Optional) Run the Automated Test Suite
To verify all 15 test suites:
```bash
python -m unittest tests/test_app.py
```

### 4. (Optional) Configure Gemini API Key
To enable live generative calls via Google Gemini API:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and set your key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
*(Note: If no API key is set, the application automatically uses its built-in curriculum-verified deterministic engine with zero runtime errors.)*

---

## 🧪 Demo Personas Available in Role Switcher

You can test all 4 role experiences via the top-bar **Demo Role** dropdown:
- **Aarav Sharma (Student - Grade 10-A):** Stumbling with Quadratic Equations; diagnosed root causes in Factoring and Negative Sign Rules.
- **Diya Rao (Student - Grade 10-A):** High algebra mastery (Kannada language preference).
- **Kiran Kumar (Student - Grade 10-B):** Foundational gaps across multiple tiers (Telugu language preference).
- **Prof. Meera Patel (Teacher):** View class-wide heatmap, gap alerts, and review flagged AI questions.
- **Rajesh Sharma (Parent):** Jargon-free summary of Aarav's upcoming free-hour sessions and milestones.
- **Dr. Arvind Swaminathan (School Admin / Dean):** Institutional curriculum health and system analytics.

---

## 🔒 Security & Data Privacy Highlights

1. **Role-Based Access Control (RBAC):** Verified at the controller layer via `@require_roles`. Unauthorized endpoints return HTTP 403 Forbidden.
2. **Input Validation:** Time slots require valid 24-hour `HH:MM` format where `end_time > start_time` with a minimum duration of 15 minutes.
3. **Audit Trail:** AI review flags track reporter identity, timestamp, reason, and faculty resolution state.
