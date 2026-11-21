"""Database configuration, schema management, and realistic educational seed data for Roots & Rhythm."""

import sqlite3
import json
import os
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config

def get_db_connection():
    """Return a configured SQLite database connection with row dictionary access."""
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db(force_reseed=False):
    """Initialize database tables and pre-populate realistic seed data."""
    if force_reseed and os.path.exists(Config.DATABASE_PATH):
        try:
            os.remove(Config.DATABASE_PATH)
        except OSError:
            pass

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'parent', 'admin')),
        grade_or_cohort TEXT,
        language_preference TEXT DEFAULT 'en',
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Ensure username and password_hash columns exist (migration for existing DBs)
    cursor.execute("PRAGMA table_info(users)")
    existing_cols = [col["name"] for col in cursor.fetchall()]
    if "username" not in existing_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN username TEXT")
    if "password_hash" not in existing_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")

    # 2. Subjects table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        description TEXT
    )
    """)

    # 3. Knowledge nodes table (Educational Curriculum Graph)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS knowledge_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        topic_name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        tier INTEGER NOT NULL CHECK(tier IN (1, 2, 3)),
        short_desc TEXT NOT NULL,
        explanation_markdown TEXT NOT NULL,
        key_formulae TEXT,
        estimated_minutes INTEGER DEFAULT 20,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )
    """)

    # 4. Prerequisites table (Directed Edges in the Dependency Graph)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS prerequisites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id INTEGER NOT NULL,
        prerequisite_node_id INTEGER NOT NULL,
        dependency_weight REAL DEFAULT 1.0,
        description TEXT,
        FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (prerequisite_node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        UNIQUE(node_id, prerequisite_node_id)
    )
    """)

    # 5. Student Mastery Status
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS student_mastery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        node_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('mastered', 'shaky', 'root_cause', 'not_started')),
        mastery_score INTEGER DEFAULT 0 CHECK(mastery_score BETWEEN 0 AND 100),
        last_tested_at TIMESTAMP,
        streak_count INTEGER DEFAULT 0,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        UNIQUE(student_id, node_id)
    )
    """)

    # 6. Free Hour Slots
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS free_hour_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6), -- 0=Monday, 6=Sunday
        start_time TEXT NOT NULL, -- HH:MM (24-hour)
        end_time TEXT NOT NULL,   -- HH:MM (24-hour)
        label TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 7. Study Sessions (Assigned into declared Free-Hours)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        node_id INTEGER NOT NULL,
        slot_id INTEGER,
        scheduled_date TEXT NOT NULL, -- YYYY-MM-DD
        start_time TEXT NOT NULL,     -- HH:MM
        end_time TEXT NOT NULL,       -- HH:MM
        duration_minutes INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('scheduled', 'completed', 'skipped', 'rescheduled')),
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (slot_id) REFERENCES free_hour_slots(id) ON DELETE SET NULL
    )
    """)

    # 8. Practice Questions (with Safe AI flags & verification badges)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS practice_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id INTEGER NOT NULL,
        difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
        question_text TEXT NOT NULL,
        options_json TEXT NOT NULL, -- JSON array of strings
        correct_option_index INTEGER NOT NULL,
        step_by_step_explanation TEXT NOT NULL,
        ai_generated INTEGER DEFAULT 0,
        confidence_score REAL DEFAULT 0.95,
        status TEXT DEFAULT 'verified' CHECK(status IN ('verified', 'flagged', 'in_review')),
        FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
    )
    """)

    # 9. Quiz Attempts
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        node_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        selected_option INTEGER NOT NULL,
        is_correct INTEGER NOT NULL,
        time_spent_seconds INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE
    )
    """)

    # 10. AI Flag & Review Workflow
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_flag_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        reported_by_id INTEGER NOT NULL,
        reported_by_role TEXT NOT NULL,
        reason TEXT NOT NULL,
        suggested_edit TEXT,
        resolution_status TEXT DEFAULT 'open' CHECK(resolution_status IN ('open', 'resolved', 'dismissed')),
        reviewer_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE,
        FOREIGN KEY (reported_by_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 11. Relationships
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parent_student_map (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(parent_id, student_id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS teacher_classroom_map (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        classroom_name TEXT NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(teacher_id, student_id, classroom_name)
    )
    """)

    # 12. Parent Encouragement Notes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parent_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Commit tables
    conn.commit()

    # Backfill default credentials for existing users if missing
    cursor.execute("SELECT id, name, username FROM users")
    existing_users = cursor.fetchall()
    default_pass = generate_password_hash("password123")
    default_usernames = {
        1: "aarav",
        2: "diya",
        3: "kiran",
        4: "meera",
        5: "rajesh",
        6: "arvind"
    }
    for u in existing_users:
        if not u["username"] and u["id"] in default_usernames:
            cursor.execute("UPDATE users SET username = ?, password_hash = ? WHERE id = ?", (default_usernames[u["id"]], default_pass, u["id"]))
    conn.commit()

    # Check if we need to seed
    cursor.execute("SELECT COUNT(*) AS cnt FROM users")
    if cursor.fetchone()["cnt"] == 0:
        seed_database(conn)

    conn.close()

def seed_database(conn):
    """Seed comprehensive realistic data for the full multi-role experience."""
    cursor = conn.cursor()
    default_pass = generate_password_hash("password123")

    # 1. Seed Users
    users_data = [
        # id=1: Student
        (1, "Aarav Sharma", "aarav", "aarav@rootsrhythm.edu", default_pass, "student", "Grade 10-A", "en", "https://api.dicebear.com/7.x/bottts/svg?seed=Aarav"),
        # id=2: Student
        (2, "Diya Rao", "diya", "diya@rootsrhythm.edu", default_pass, "student", "Grade 10-A", "kn", "https://api.dicebear.com/7.x/bottts/svg?seed=Diya"),
        # id=3: Student
        (3, "Kiran Kumar", "kiran", "kiran@rootsrhythm.edu", default_pass, "student", "Grade 10-B", "te", "https://api.dicebear.com/7.x/bottts/svg?seed=Kiran"),
        # id=4: Teacher
        (4, "Meera Patel", "meera", "meera.patel@rootsrhythm.edu", default_pass, "teacher", "Faculty of Mathematics & Science", "en", "https://api.dicebear.com/7.x/personas/svg?seed=Meera"),
        # id=5: Parent
        (5, "Rajesh Sharma", "rajesh", "rajesh.sharma@rootsrhythm.edu", default_pass, "parent", "Guardian of Aarav Sharma", "en", "https://api.dicebear.com/7.x/personas/svg?seed=Rajesh"),
        # id=6: Admin
        (6, "Dr. Arvind Swaminathan", "arvind", "principal@rootsrhythm.edu", default_pass, "admin", "Dean & Principal", "en", "https://api.dicebear.com/7.x/personas/svg?seed=Arvind")
    ]
    cursor.executemany("""
    INSERT INTO users (id, name, username, email, password_hash, role, grade_or_cohort, language_preference, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, users_data)

    # 2. Seed Parent & Teacher Relationships
    cursor.execute("INSERT INTO parent_student_map (parent_id, student_id) VALUES (5, 1)")
    cursor.executemany("""
    INSERT INTO teacher_classroom_map (teacher_id, student_id, classroom_name)
    VALUES (4, 1, 'Grade 10-A (Math Core)'), (4, 2, 'Grade 10-A (Math Core)'), (4, 3, 'Grade 10-B (Math Core)')
    """, [])
    cursor.execute("INSERT INTO teacher_classroom_map (teacher_id, student_id, classroom_name) VALUES (4, 1, 'Grade 10-A Math')")
    cursor.execute("INSERT INTO teacher_classroom_map (teacher_id, student_id, classroom_name) VALUES (4, 2, 'Grade 10-A Math')")
    cursor.execute("INSERT INTO teacher_classroom_map (teacher_id, student_id, classroom_name) VALUES (4, 3, 'Grade 10-B Math')")

    # 3. Seed Subjects (Strictly 10th Stateboard High School Curriculum)
    subjects_data = [
        (1, "Mathematics", "MATH", "calculator", "#7c3aed", "10th State Board Core Mathematics: Algebra, Quadratic Equations, Trigonometry, and Arithmetic Progressions."),
        (2, "Science", "SCI", "flask", "#0891b2", "10th State Board Integrated Science: Physics (Light, Electricity), Chemistry (Reactions), and Biology (Life Processes)."),
        (3, "Social Science", "SOC", "globe", "#d97706", "10th State Board Social Science: History, Geography, Indian Constitution, and Rural Economics."),
        (4, "Kannada", "KAN", "book-open", "#059669", "10th State Board Kannada: Vyakaran (ಸಂಧಿ-ಸಮಾಸ), Gadya & Padya (ಭಾಗ್ಯಶಿಲ್ಪಿಗಳು, ಸಂಕಲ್ಪ ಗೀತೆ), and Prabandha."),
        (5, "English", "ENG", "feather", "#2563eb", "10th State Board English: Grammar (Tenses, Voice, Speech), Literature (A Hero, Quality of Mercy), and Writing."),
        (6, "Hindi", "HIN", "sparkles", "#ea580c", "10th State Board Hindi: Vyakaran (कारक, संधि, समास), Gadya (कश्मीरी सेब), Padya, and Nibandh.")
    ]
    cursor.executemany("""
    INSERT INTO subjects (id, name, code, icon, color, description)
    VALUES (?, ?, ?, ?, ?, ?)
    """, subjects_data)

    # 4. Seed Knowledge Nodes (Curriculum Graph for 10th State Board)
    nodes_data = [
        # 1. MATHEMATICS (Subject 1)
        (1, 1, "Order of Operations & Arithmetic", "math-arithmetic", "Foundations", 1,
         "Fundamental rules of operations (BODMAS / PEMDAS) and parenthesis evaluation.",
         "### Order of Operations (BODMAS)\nAlways evaluate expressions in this strict hierarchy:\n1. **Brackets / Parentheses** (inner to outer)\n2. **Orders / Exponents / Roots**\n3. **Division & Multiplication** (left to right)\n4. **Addition & Subtraction** (left to right)\n\n*Common Pitfall:* Computing `2 + 3 * 4` as `20` instead of `14`.",
         "BODMAS: B -> O -> D/M -> A/S", 15),

        (2, 1, "Negative Numbers & Sign Rules", "math-negative-numbers", "Foundations", 1,
         "Rules for adding, subtracting, multiplying, and dividing positive and negative numbers.",
         "### Sign Rules\n- Multiplying two identical signs produces a **positive** result: `(-a) * (-b) = +ab`\n- Multiplying different signs produces a **negative** result: `(-a) * (+b) = -ab`\n- Subtracting a negative is equivalent to adding: `a - (-b) = a + b`.",
         "(-a) * (-b) = +ab | a - (-b) = a + b", 15),

        (3, 1, "Fractions & Algebraic Ratios", "math-fractions", "Foundations", 1,
         "Finding common denominators, cross-multiplication, and simplifying rational terms.",
         "### Fractions & Ratios\nTo add or subtract fractions, ensure a Common Denominator: `a/b + c/d = (ad + bc) / bd`. For equations with fractions, cross-multiply: `a/b = c/d ==> a*d = b*c`.",
         "a/b + c/d = (ad + bc)/bd", 20),

        (4, 1, "Linear Equations & Balancing", "math-linear-equations", "Algebra I", 2,
         "Solving single-variable linear equations using balance operations.",
         "### Linear Equations\nAny linear equation can be written as `ax + b = c`. Solve by isolating `x` using inverse operations on both sides equally:\n1. Subtract `b`: `ax = c - b`\n2. Divide by `a`: `x = (c - b) / a`.",
         "ax + b = c ==> x = (c - b)/a", 20),

        (5, 1, "Factoring Polynomials & Identities", "math-factoring", "Algebra I", 2,
         "Factoring quadratics by grouping, finding common factors, and using difference of squares.",
         "### Factoring Polynomials\nMaster standard identities:\n1. Difference of Squares: `a^2 - b^2 = (a - b)(a + b)`\n2. Perfect Square Trinomial: `a^2 + 2ab + b^2 = (a + b)^2`\n3. Trinomial Factoring: `x^2 + (p+q)x + pq = (x + p)(x + q)`.",
         "x^2 - y^2 = (x - y)(x + y)", 25),

        (6, 1, "Quadratic Equations & Roots", "math-quadratic-equations", "Algebra II", 3,
         "Solving quadratic equations via quadratic formula, completing the square, and discriminant analysis.",
         "### Quadratic Equations\nStandard form: `ax^2 + bx + c = 0` (where `a != 0`).\n\nThe Quadratic Formula:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\nDiscriminant `D = b^2 - 4ac`:\n- `D > 0`: Two distinct real roots\n- `D = 0`: Exactly one repeated real root\n- `D < 0`: Two complex conjugate roots.",
         "x = (-b ± √(b² - 4ac)) / (2a) | D = b² - 4ac", 30),

        (7, 1, "Arithmetic Progressions (AP)", "math-arithmetic-progression", "Sequences", 2,
         "General term a_n = a + (n-1)d and sum of n terms S_n = n/2[2a + (n-1)d].",
         "### Arithmetic Progressions (10th State Board)\n- **n-th term**: `a_n = a + (n - 1)d`\n- **Sum of n terms**: `S_n = (n/2) * [2a + (n - 1)d]` or `S_n = (n/2) * [a + l]` where `l` is the last term.",
         "a_n = a + (n-1)d | S_n = n/2(a + l)", 25),

        # 2. SCIENCE (Subject 2: Physics, Chemistry, Biology)
        (8, 2, "Light: Reflection & Spherical Mirrors", "sci-light-reflection", "Physics", 1,
         "Laws of reflection, focal length f = R/2, and mirror formula 1/f = 1/v + 1/u.",
         "### Light & Reflection (10th State Board)\n- **Mirror Formula**: `1/f = 1/v + 1/u`\n- **Magnification**: `m = -v/u = h'/h`\n- **Sign Convention**: Distances in the direction of incident light are positive; opposite are negative.",
         "1/f = 1/v + 1/u | m = -v/u", 20),

        (9, 2, "Electricity: Ohm's Law & Circuits", "sci-electricity-circuits", "Physics", 2,
         "Potential difference V = IR, resistance in series (R_s = R1+R2) and parallel (1/R_p = 1/R1 + 1/R2).",
         "### Electricity (10th State Board)\n- **Ohm's Law**: `V = I * R` at constant temperature.\n- **Series Resistance**: `R_s = R_1 + R_2 + R_3`\n- **Parallel Resistance**: `1/R_p = 1/R_1 + 1/R_2 + 1/R_3`\n- **Joule's Heating**: `H = I^2 * R * t`.",
         "V = IR | R_s = ΣR_i | 1/R_p = Σ(1/R_i)", 25),

        (10, 2, "Chemical Reactions & Equations", "sci-chemical-reactions", "Chemistry", 2,
         "Balancing equations, combination, decomposition, displacement, and redox reactions.",
         "### Chemical Reactions\n- **Law of Conservation of Mass**: Mass is neither created nor destroyed.\n- **Types**: Combination (`A + B -> AB`), Decomposition (`AB -> A + B`), Displacement (`A + BC -> AC + B`), Double Displacement, and Redox (Oxidation & Reduction).",
         "Reactants -> Products | Oxidation: Gain of O / Loss of e-", 25),

        # 3. SOCIAL SCIENCE (Subject 3: History, Geography, Civics, Economics)
        (11, 3, "1857 First War of Indian Independence", "soc-1857-revolt", "History", 1,
         "Causes (political, economic, administrative, military), key leaders (Rani Laxmibai, Mangal Pandey), and outcomes.",
         "### 1857 Revolt (10th State Board History)\n- **Immediate Cause**: Introduction of Enfield rifles greased with animal fat.\n- **Political Causes**: Doctrine of Lapse introduced by Lord Dalhousie.\n- **Outcome**: Queen Victoria's Proclamation (1858) ending British East India Company rule.",
         "Doctrine of Lapse -> 1857 Revolt -> Crown Rule (1858)", 20),

        (12, 3, "India: Physiography & Climate", "soc-india-physiography", "Geography", 2,
         "Northern Mountains, Indo-Gangetic Plains, Peninsular Plateau, Coastal Plains, and South-West Monsoons.",
         "### Indian Physiography (Geography)\n- **Major Divisions**: Himalayas, Great Northern Plains, Peninsular Plateau, Coastal Plains & Islands.\n- **Climate**: Tropical Monsoon climate governed by South-West and North-East retreating monsoons.",
         "Himalayas | Northern Plains | Peninsular Plateau", 20),

        (13, 3, "Indian Constitution & Fundamental Rights", "soc-constitution-rights", "Political Science", 2,
         "Preamble, 6 Fundamental Rights (Articles 14-32), Fundamental Duties, and Directive Principles.",
         "### Indian Constitution\n- **Preamble**: Sovereign, Socialist, Secular, Democratic, Republic.\n- **6 Fundamental Rights**: Right to Equality (Art 14-18), Freedom (Art 19-22), Against Exploitation (Art 23-24), Freedom of Religion (Art 25-28), Cultural & Educational (Art 29-30), Constitutional Remedies (Art 32 - Heart and Soul).",
         "Articles 14-32: Fundamental Rights", 25),

        # 4. KANNADA (Subject 4: 10th State Board Sahitya & Vyakaran)
        (14, 4, "ಕನ್ನಡ ಸಂಧಿಗಳು ಮತ್ತು ಸಮಾಸಗಳು (Sandhi & Samasa)", "kan-sandhi-samasa", "ವ್ಯಾಕರಣ (Grammar)", 1,
         "ಕನ್ನಡ ಸಂಧಿಗಳು (ಲೋಪ, ಆಗಮ, ಆದೇಶ) ಮತ್ತು ಸಂಸ್ಕೃತ ಸಂಧಿಗಳು; ತತ್ಪುರುಷ, ಕರ್ಮಧಾರಯ, ದ್ವಿಗು ಸಮಾಸಗಳು.",
         "### ಕನ್ನಡ ವ್ಯಾಕರಣ (10th State Board)\n- **ಲೋಪ ಸಂಧಿ**: ಸ್ವರದ ಮುಂದೆ ಸ್ವರ ಬಂದು ಅರ್ಥ ಕೆಡದಿದ್ದರೆ ಪೂರ್ವಸ್ವರ ಲೋಪವಾಗುವುದು (ಮಾತಲ್ಲ = ಮಾತು + ಅಲ್ಲ).\n- **ಆಗಮ ಸಂಧಿ**: 'ಯ' ಕಾರ ಅಥವಾ 'ವ' ಕಾರ ಆಗಮವಾಗುವುದು (ಮನೆಯನ್ನು = ಮನೆ + ಅನ್ನು).\n- **ಆದೇಶ ಸಂಧಿ**: ಕ, ತ, ಪ ಗಳಿಗೆ ಗ, ದ, ಬ ಗಳು ಆದೇಶವಾಗುವುದು (ಕಣ್ದೆರೆ = ಕಣ್ + ತೆರೆ).\n- **ಸಮಾಸಗಳು**: ತತ್ಪುರುಷ (ಉತ್ತರಪದ ಪ್ರಧಾನ), ಕರ್ಮಧಾರಯ (ವಿಶೇಷಣ-ವಿಶೇಷ್ಯ), ದ್ವಿಗು (ಸಂಖ್ಯಾ ಪೂರ್ವಕ).",
         "ಕ,ತ,ಪ -> ಗ,ದ,ಬ (ಆದೇಶ) | ಸಂಖ್ಯಾಪೂರ್ವೋ ದ್ವಿಗುಃ", 20),

        (15, 4, "ಗದ್ಯ: ಭಾಗ್ಯಶಿಲ್ಪಿಗಳು (Sir M. Visvesvaraya)", "kan-bhagyashilpigalu", "ಗದ್ಯ ಭಾಗ (Prose)", 2,
         "ಸರ್ ಎಂ. ವಿಶ್ವೇಶ್ವರಯ್ಯನವರ ಸಾಧನೆಗಳು, ಕೃಷ್ಣರಾಜ ಸಾಗರ ಅಣೆಕಟ್ಟು, ಮತ್ತು ನಾಡಿನ ಕೈಗಾರಿಕೀಕರಣದ ಕೊಡುಗೆಗಳು.",
         "### ಭಾಗ್ಯಶಿಲ್ಪಿಗಳು (10th State Board)\n- **ಜನನ**: ಸೆಪ್ಟೆಂಬರ್ 15, 1861 ಮುದ್ದೇನಹಳ್ಳಿಯಲ್ಲಿ.\n- **ಸಾಧನೆಗಳು**: ಕೆ.ಆರ್.ಎಸ್ (KRS) ಡ್ಯಾಮ್, ಭದ್ರಾವತಿ ಕಬ್ಬಿಣ ಕಾರ್ಖಾನೆ, ಮೈಸೂರು ವಿಶ್ವವಿದ್ಯಾನಿಲಯ, ಸ್ಟೇಟ್ ಬ್ಯಾಂಕ್ ಆಫ್ ಮೈಸೂರು.\n- **ಧೈಯವಾಕ್ಯ**: 'ಕೈಗಾರಿಕೀಕರಣ ಇಲ್ಲವೇ ವಿನಾಶ' (Industrialize or Perish).",
         "ಸೆಪ್ಟೆಂಬರ್ 15: ಇಂಜಿನಿಯರ್ಸ್ ದಿನಾಚರಣೆ | KRS ಡ್ಯಾಮ್", 25),

        (16, 4, "ಪದ್ಯ: ಸಂಕಲ್ಪ ಗೀತೆ (GS Shivarudrappa)", "kan-sankalpa-geethe", "ಪದ್ಯ ಭಾಗ (Poetry)", 2,
         "ಜಿ.ಎಸ್. ಶಿವರುದ್ರಪ್ಪನವರ ಆಶಯ ಗೀತೆ: ಸಮಾಜದಲ್ಲಿ ಪ್ರೀತಿ, ಬೆಳಕು ಮತ್ತು ಭರವಸೆಯ ಬೀಜ ಬಿತ್ತುವ ಸಂಕಲ್ಪ.",
         "### ಸಂಕಲ್ಪ ಗೀತೆ\n- **ಕವಿ**: ರಾಷ್ಟ್ರಕವಿ ಡಾ. ಜಿ.ಎಸ್. ಶಿವರುದ್ರಪ್ಪ.\n- **ಮುಖ್ಯ ಸಂದೇಶ**: ಸುತ್ತಲು ಕವಿಯುವ ಕತ್ತಲೆಯೊಳು ಪ್ರೀತಿಯ ಹಣತೆಯ ಹಚ್ಚೋಣ; ಸವಾಲುಗಳನ್ನು ಧೈರ್ಯದಿಂದ ಎದುರಿಸುವ ಹೊಸ ಸಂಕಲ್ಪ ಮಾಡೋಣ.",
         "ಪ್ರೀತಿಯ ಹಣತೆಯ ಹಚ್ಚೋಣ | ಧನಾತ್ಮಕ ಸಂಕಲ್ಪ", 20),

        # 5. ENGLISH (Subject 5: 10th State Board Grammar & Literature)
        (17, 5, "Active & Passive Voice and Tenses", "eng-voice-tenses", "Grammar", 1,
         "Rules for converting transitive verbs between active and passive voice across present, past, and future tenses.",
         "### Active & Passive Voice (10th State Board)\n- **Rule**: Object becomes Subject; use appropriate form of `be + V3` (Past Participle).\n- **Example**: Active: `The student solved the problem.` ==> Passive: `The problem was solved by the student.`\n- **Continuous**: `is/are/am + being + V3`.",
         "Sub + be + V3 + by + Obj", 20),

        (18, 5, "Direct & Indirect (Reported) Speech", "eng-reported-speech", "Grammar", 2,
         "Backshifting tenses, reporting verbs (said, told, asked), pronoun shifts, and time/place adverbs.",
         "### Reported Speech Rules\n- Present Simple becomes Past Simple (`writes` -> `wrote`).\n- Present Continuous becomes Past Continuous (`is writing` -> `was writing`).\n- `now` -> `then`, `today` -> `that day`, `tomorrow` -> `the next day`.",
         "Said to -> Told | Tense backshift in indirect", 25),

        (19, 5, "Prose: A Hero by R.K. Narayan", "eng-prose-a-hero", "Literature", 2,
         "Swami's internal struggle, father's challenge to sleep alone in the office room, and accidental capture of the burglar.",
         "### A Hero (R.K. Narayan)\n- **Characters**: Swami, his father, mother, and grandmother.\n- **Plot**: Father challenges Swami to show courage instead of strength by sleeping alone in the dark office room.\n- **Climax**: Swami bites a burglar in fright, inadvertently becoming a hero praised by the police.",
         "Courage is everything, strength and age are not important.", 25),

        # 6. HINDI (Subject 6: 10th State Board Vyakaran & Sahitya)
        (20, 6, "हिंदी व्याकरण: कारक एवं संधि (Karak & Sandhi)", "hin-karak-sandhi", "व्याकरण (Grammar)", 1,
         "कारक के 8 भेद (कर्ता, कर्म, करण, संप्रदान, अपादान, संबंध, अधिकरण, संबोधन) और स्वर संधि के नियम।",
         "### हिंदी व्याकरण (10th State Board)\n- **कारक के 8 भेद**:\n  1. कर्ता ने, 2. कर्म को, 3. करण से/के द्वारा, 4. संप्रदान को/के लिए, 5. अपादान से (अलग होना), 6. संबंध का/के/की, 7. अधिकरण में/पर, 8. संबोधन हे/अरे।\n- **स्वर संधि**: दीर्घ, गुण, वृद्धि, यण और अयादि संधि।",
         "कर्ता ने, कर्म को, करण से | 8 कारक भेद", 20),

        (21, 6, "गद्य: कश्मीरी सेब (Kashmiri Seb - Premchand)", "hin-kashmiri-seb", "गद्य (Prose)", 2,
         "मुंशी प्रेमचंद की प्रसिद्ध कहानी: बाजार में खरीदारी करते समय सतर्कता और बेईमानी से बचने का सबक।",
         "### कश्मीरी सेब (प्रेमचंद)\n- **कहानीकार**: मुंशी प्रेमचंद।\n- **केंद्रीय भाव**: बाजार में दुकानदार द्वारा सड़े हुए सेब देना। ग्राहक को अपनी आँखों से देखकर ही सामान खरीदना चाहिए; आँख बंद करके भरोसा करना धोखा खाना है।",
         "सतर्कता ही ग्राहक का सबसे बड़ा सुरक्षा कवच है।", 25),

        (22, 6, "मुहावरे, लोकोक्तियाँ एवं वाक्य शुद्धि", "hin-muhavare-shuddhi", "व्याकरण (Grammar)", 2,
         "दैनिक जीवन में प्रयुक्त मुहावरे (जैसे: नौ दो ग्यारह होना, अँगूठा दिखाना) और अशुद्ध वाक्यों का शुद्धिकरण।",
         "### मुहावरे और वाक्य रचना\n- **नौ दो ग्यारह होना**: भाग जाना।\n- **दाँत खट्टे करना**: पराजित करना।\n- **आँखों का तारा**: बहुत प्यारा होना।\n- **वाक्य शुद्धि**: लिंग, वचन और कारक संबंधी अशुद्धियों को पहचान कर सही करना।",
         "मुहावरे भाषा को सजीव और प्रभावशाली बनाते हैं।", 20)
    ]
    cursor.executemany("""
    INSERT INTO knowledge_nodes (id, subject_id, topic_name, slug, category, tier, short_desc, explanation_markdown, key_formulae, estimated_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, nodes_data)
    # 5. Seed Prerequisites (Edges of the Root-Cause Graph across 10th State Board)
    prereqs = [
        # Math Prerequisites
        (4, 1, 1.0, "Balancing equations requires proper order of operations."),
        (4, 2, 1.0, "Transposing terms requires correct sign handling."),
        (5, 1, 0.8, "Distributive property expands expressions."),
        (5, 2, 1.0, "Factoring binomials relies heavily on sign multiplication rules."),
        (6, 4, 0.9, "Rearranging quadratic expressions requires linear equation manipulation."),
        (6, 5, 1.0, "Factoring is a primary method for finding quadratic roots; completing square builds on algebraic identities."),
        (7, 4, 0.9, "Arithmetic progression formulas require linear equation substitution."),
        
        # Science Prerequisites
        (9, 8, 1.0, "Circuits and electrical energy build on basic energy conservation and ray optics."),
        (10, 8, 0.9, "Chemical reactions require foundational atomic interactions."),

        # Social Science Prerequisites
        (13, 11, 0.9, "Indian constitutional rights emerged from the history of the freedom struggle."),

        # Kannada Prerequisites
        (15, 14, 1.0, "ಸಾಹಿತ್ಯ ಗದ್ಯ ವಿಶ್ಲೇಷಣೆಗೆ ಸಂಧಿ ಮತ್ತು ಸಮಾಸಗಳ ವ್ಯಾಕರಣ ಜ್ಞಾನ ಅಗತ್ಯ."),
        (16, 14, 0.9, "ಪದ್ಯ ರಚನೆ ಮತ್ತು ಛಂದಸ್ಸಿಗೆ ವ್ಯಾಕರಣ ಮೂಲ ಜ್ಞಾನ ಅವಶ್ಯಕ."),

        # English Prerequisites
        (18, 17, 1.0, "Reported speech relies heavily on tense backshifting and passive voice rules."),
        (19, 17, 0.9, "Reading comprehension requires clear mastery of sentence clauses."),

        # Hindi Prerequisites
        (21, 20, 1.0, "गद्य और वाक्य रचना में कारक के सही प्रयोग की आवश्यकता होती है।"),
        (22, 20, 0.9, "मुहावरे और वाक्य शुद्धि के लिए कारक एवं वर्तनी का ज्ञान आवश्यक है।")
    ]
    cursor.executemany("""
    INSERT INTO prerequisites (node_id, prerequisite_node_id, dependency_weight, description)
    VALUES (?, ?, ?, ?)
    """, prereqs)

    # 6. Seed Student Mastery Profiles (Aarav Sharma id=1 across 10th State Board)
    now_iso = datetime.now().isoformat()
    d1 = (datetime.now() - timedelta(days=1)).isoformat()
    d2 = (datetime.now() - timedelta(days=2)).isoformat()
    d3 = (datetime.now() - timedelta(days=3)).isoformat()
    d4 = (datetime.now() - timedelta(days=4)).isoformat()
    d5 = (datetime.now() - timedelta(days=5)).isoformat()
    d6 = (datetime.now() - timedelta(days=6)).isoformat()
    d7 = (datetime.now() - timedelta(days=7)).isoformat()

    aarav_mastery = [
        # Mathematics (Subject 1)
        (1, 1, "mastered", 92, d5, 4),
        (1, 2, "root_cause", 48, d2, 0),
        (1, 3, "mastered", 85, d6, 2),
        (1, 4, "shaky", 64, d3, 1),
        (1, 5, "root_cause", 42, d1, 0),
        (1, 6, "shaky", 51, d1, 0),
        (1, 7, "mastered", 80, d4, 2),
        # Science (Subject 2)
        (1, 8, "mastered", 88, d4, 3),
        (1, 9, "shaky", 60, d2, 1),
        (1, 10, "mastered", 76, d3, 2),
        # Social Science (Subject 3)
        (1, 11, "mastered", 95, d7, 5),
        (1, 12, "shaky", 68, d3, 1),
        (1, 13, "mastered", 84, d5, 3),
        # Kannada (Subject 4)
        (1, 14, "mastered", 90, d6, 4),
        (1, 15, "mastered", 85, d4, 3),
        (1, 16, "shaky", 65, d2, 1),
        # English (Subject 5)
        (1, 17, "mastered", 86, d5, 3),
        (1, 18, "shaky", 62, d1, 1),
        (1, 19, "mastered", 92, d7, 5),
        # Hindi (Subject 6)
        (1, 20, "mastered", 82, d4, 2),
        (1, 21, "mastered", 88, d6, 4),
        (1, 22, "shaky", 58, d2, 1)
    ]
    cursor.executemany("""
    INSERT INTO student_mastery (student_id, node_id, status, mastery_score, last_tested_at, streak_count)
    VALUES (?, ?, ?, ?, ?, ?)
    """, aarav_mastery)

    # Diya Rao (id=2) and Kiran Kumar (id=3) mastery for teacher class analytics
    other_masteries = [
        # Diya (10th State Board)
        (2, 1, "mastered", 95, d3, 6),
        (2, 2, "mastered", 88, d3, 5),
        (2, 4, "mastered", 86, d2, 4),
        (2, 5, "shaky", 68, d1, 1),
        (2, 6, "shaky", 62, d1, 1),
        (2, 14, "mastered", 96, d4, 5),
        (2, 17, "mastered", 91, d3, 4),
        # Kiran (10th State Board)
        (3, 1, "shaky", 65, d4, 1),
        (3, 2, "root_cause", 40, d2, 0),
        (3, 4, "root_cause", 45, d2, 0),
        (3, 5, "root_cause", 38, d1, 0),
        (3, 6, "not_started", 15, None, 0),
        (3, 14, "shaky", 60, d2, 1),
        (3, 17, "shaky", 55, d1, 0)
    ]
    cursor.executemany("""
    INSERT INTO student_mastery (student_id, node_id, status, mastery_score, last_tested_at, streak_count)
    VALUES (?, ?, ?, ?, ?, ?)
    """, other_masteries)

    # 7. Seed Free Hour Slots for Aarav Sharma
    # Daily declared free time slots:
    # 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
    free_slots = [
        (1, 0, "06:30", "07:15", "Morning Clarity Window", 1),
        (1, 0, "17:30", "18:30", "After-School Focus Hour", 1),
        (1, 1, "18:00", "19:00", "Evening Study Block", 1),
        (1, 2, "17:30", "18:30", "Midweek Catch-up Slot", 1),
        (1, 3, "18:00", "19:00", "Evening Study Block", 1),
        (1, 4, "16:30", "17:30", "Friday Review Slot", 1),
        (1, 5, "10:00", "11:30", "Weekend Deep Dive Block", 1),
        (1, 6, "11:00", "12:30", "Sunday Mastery Session", 1)
    ]
    cursor.executemany("""
    INSERT INTO free_hour_slots (student_id, day_of_week, start_time, end_time, label, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
    """, free_slots)

    # 8. Seed Study Sessions for Aarav Sharma (targeted at root causes!)
    today = date.today()
    study_sessions = [
        (1, 2, 1, (today - timedelta(days=1)).isoformat(), "17:30", "18:00", 30, "completed", "high", "Mastered multiplication sign rules."),
        (1, 5, 2, today.isoformat(), "18:00", "18:30", 30, "scheduled", "high", "Root-cause practice: Factoring trinomials with negative coefficients."),
        (1, 5, 3, (today + timedelta(days=1)).isoformat(), "17:30", "18:00", 30, "scheduled", "high", "Difference of two squares drills."),
        (1, 4, 4, (today + timedelta(days=2)).isoformat(), "18:00", "18:30", 30, "scheduled", "medium", "Linear balancing refresh."),
        (1, 6, 6, (today + timedelta(days=3)).isoformat(), "10:00", "10:45", 45, "scheduled", "high", "Target topic: Solving quadratics via quadratic formula.")
    ]
    cursor.executemany("""
    INSERT INTO study_sessions (student_id, node_id, slot_id, scheduled_date, start_time, end_time, duration_minutes, status, priority, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, study_sessions)

    # 9. Seed Practice Questions with step-by-step explanations, confidence badges & verified status
    practice_qs = [
        # Node 2: Negative Numbers & Sign Rules
        (2, "beginner", "Evaluate the expression: (-7) * (-8)",
         json.dumps(["-56", "56", "-15", "15"]), 1,
         "Step 1: Notice that both numbers are negative: (-7) and (-8).\nStep 2: When two negative numbers are multiplied, their product is strictly positive.\nStep 3: 7 * 8 = 56. Therefore, (-7) * (-8) = +56.",
         0, 0.99, "verified"),

        (2, "intermediate", "Simplify: 14 - (-9) + (-5)",
         json.dumps(["0", "18", "28", "-10"]), 1,
         "Step 1: Simplify the double negative: 14 - (-9) becomes 14 + 9 = 23.\nStep 2: Add the negative number: 23 + (-5) = 23 - 5 = 18.\nConclusion: The final simplified value is 18.",
         0, 0.98, "verified"),

        # Node 5: Factoring Polynomials
        (5, "beginner", "What are the factors of the difference of squares: x^2 - 49?",
         json.dumps(["(x - 7)(x - 7)", "(x + 7)(x - 7)", "(x + 49)(x - 1)", "(x + 7)(x + 7)"]), 1,
         "Step 1: Identify the standard identity a^2 - b^2 = (a - b)(a + b).\nStep 2: Here, a = x and b = 7 (since 7^2 = 49).\nStep 3: Substitute: x^2 - 49 = (x + 7)(x - 7).",
         0, 0.99, "verified"),

        (5, "intermediate", "Factor completely: x^2 - 5x + 6",
         json.dumps(["(x - 2)(x - 3)", "(x + 2)(x + 3)", "(x - 1)(x - 6)", "(x + 1)(x - 6)"]), 0,
         "Step 1: Find two numbers p and q that multiply to +6 and add to -5.\nStep 2: Testing factors of 6: (-2) * (-3) = +6 and (-2) + (-3) = -5.\nStep 3: Write as binomial factors: (x - 2)(x - 3).",
         1, 0.95, "verified"),

        (5, "advanced", "Factor the quadratic: 2x^2 + 7x + 3",
         json.dumps(["(2x + 1)(x + 3)", "(2x + 3)(x + 1)", "(2x - 1)(x - 3)", "(x + 7)(2x + 3)"]), 0,
         "Step 1: Product of a * c = 2 * 3 = 6. Sum = 7.\nStep 2: Split the middle term: 7x = 6x + x.\nStep 3: Group terms: 2x^2 + 6x + x + 3 = 2x(x + 3) + 1(x + 3) = (2x + 1)(x + 3).",
         1, 0.94, "verified"),

        # Node 6: Quadratic Equations
        (6, "beginner", "Find the roots of the equation: (x - 4)(x + 3) = 0",
         json.dumps(["x = 4 and x = -3", "x = -4 and x = 3", "x = 4 and x = 3", "x = 0 and x = 7"]), 0,
         "Step 1: Apply the Zero Product Property: if A * B = 0, then A = 0 or B = 0.\nStep 2: Set first factor to 0: x - 4 = 0 ==> x = 4.\nStep 3: Set second factor to 0: x + 3 = 0 ==> x = -3.",
         0, 0.99, "verified"),

        (6, "intermediate", "Calculate the discriminant (D = b^2 - 4ac) for: 2x^2 - 4x + 2 = 0",
         json.dumps(["D = 16", "D = -16", "D = 0", "D = 8"]), 2,
         "Step 1: Identify coefficients: a = 2, b = -4, c = 2.\nStep 2: Compute b^2 = (-4)^2 = 16.\nStep 3: Compute 4ac = 4 * 2 * 2 = 16.\nStep 4: Discriminant D = 16 - 16 = 0 (indicating exactly one real repeated root).",
         1, 0.96, "verified"),

        # Node 4: Linear Equations
        (4, "beginner", "Solve for x: 3x - 7 = 14",
         json.dumps(["x = 7", "x = 21", "x = 3", "x = 5"]), 0,
         "Step 1: Add 7 to both sides: 3x = 14 + 7 = 21.\nStep 2: Divide both sides by 3: x = 21 / 3 = 7.",
         0, 0.99, "verified"),

        # Node 8: Light & Reflection
        (8, "beginner", "What is the focal length of a spherical mirror with radius of curvature 20 cm?",
         json.dumps(["10 cm", "40 cm", "5 cm", "20 cm"]), 0,
         "Step 1: Formula connecting focal length f and radius of curvature R is f = R / 2.\nStep 2: Given R = 20 cm, f = 20 / 2 = 10 cm.\nConclusion: The focal length is 10 cm.",
         0, 0.99, "verified"),

        # Node 9: Electricity & Ohm's Law
        (9, "beginner", "According to Ohm's Law, what is the current when a potential difference of 12 V is applied across a 4 Ω resistor?",
         json.dumps(["3 A", "48 A", "0.33 A", "8 A"]), 0,
         "Step 1: State Ohm's law: V = I * R ==> I = V / R.\nStep 2: Substitute values: I = 12 V / 4 Ω = 3 A.\nConclusion: Current flowing is 3 Amperes.",
         0, 0.99, "verified"),

        # Node 11: 1857 Revolt
        (11, "beginner", "Which policy introduced by Lord Dalhousie was a major political cause of the 1857 First War of Independence?",
         json.dumps(["Subsidiary Alliance", "Doctrine of Lapse", "Permanent Settlement", "Rowlatt Act"]), 1,
         "Step 1: Lord Dalhousie introduced the Doctrine of Lapse.\nStep 2: Under this policy, adopted sons of Indian rulers were not recognized as heirs, annexing Jhansi, Satara, and Nagpur.\nConclusion: Doctrine of Lapse.",
         0, 0.98, "verified"),

        # Node 14: Kannada Sandhi & Samasa
        (14, "beginner", "'ಮಾತಲ್ಲ' ಪದವನ್ನು ಬಿಡಿಸಿ ಬರೆದಾಗ ಯಾವ ಸಂಧಿ ಉಂಟಾಗುತ್ತದೆ? (ಮಾತು + ಅಲ್ಲ)",
         json.dumps(["ಲೋಪ ಸಂಧಿ", "ಆಗಮ ಸಂಧಿ", "ಆದೇಶ ಸಂಧಿ", "ಗುಣ ಸಂಧಿ"]), 0,
         "ಹಂತ ೧: ಬಿಡಿಸಿ ಬರೆದಾಗ: ಮಾತು + ಅಲ್ಲ = ಮಾತಲ್ಲ.\nಹಂತ ೨: ಪೂರ್ವಪದದ ಅಂತ್ಯದಲ್ಲಿರುವ 'ಉ' ಸ್ವರವು ಪರಪದದ 'ಅ' ಸ್ವರದ ಮುಂದೆ ಲೋಪವಾಗಿದೆ.\nತೀರ್ಮಾನ: ಅರ್ಥ ಕೆಡದಂತೆ ಸ್ವರ ಲೋಪವಾಗಿರುವುದರಿಂದ ಇದು ಲೋಪ ಸಂಧಿ.",
         0, 0.99, "verified"),

        # Node 17: English Active & Passive Voice
        (17, "beginner", "Identify the correct passive voice: 'Swami wrote a letter to his father.'",
         json.dumps(["A letter was written by Swami to his father.", "A letter is written by Swami to his father.", "A letter had written by Swami.", "Swami was written by a letter."]), 0,
         "Step 1: The sentence is in Simple Past (wrote).\nStep 2: Passive rule: Object ('A letter') + was + V3 ('written') + by Subject ('Swami').\nConclusion: 'A letter was written by Swami to his father.'",
         0, 0.99, "verified"),

        # Node 20: Hindi Karak
        (20, "beginner", "'पेड़ से पत्ता गिरा' — इस वाक्य में 'से' किस कारक का चिह्न है?",
         json.dumps(["करण कारक", "अपादान कारक", "कर्म कारक", "संबंध कारक"]), 1,
         "चरण 1: 'पेड़ से' में पत्ता पेड़ से अलग हो रहा है।\nचरण 2: अलग होने के भाव में 'से' विभक्ति अपादान कारक की होती है।\nनिष्कर्ष: यह अपादान कारक है।",
         0, 0.99, "verified")
    ]
    cursor.executemany("""
    INSERT INTO practice_questions (node_id, difficulty, question_text, options_json, correct_option_index, step_by_step_explanation, ai_generated, confidence_score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, practice_qs)

    # 10. Seed Quiz Attempts for Aarav Sharma (showing progress & diagnostic record)
    attempts = [
        (1, 2, 1, 1, 1, 22),
        (1, 2, 2, 0, 0, 45),
        (1, 5, 3, 1, 1, 30),
        (1, 5, 4, 2, 0, 55),
        (1, 6, 6, 0, 1, 35),
        (1, 6, 7, 0, 0, 40)
    ]
    cursor.executemany("""
    INSERT INTO quiz_attempts (student_id, node_id, question_id, selected_option, is_correct, time_spent_seconds)
    VALUES (?, ?, ?, ?, ?, ?)
    """, attempts)

    # 11. Seed a sample AI Flagged review item for the Teacher review workflow
    cursor.execute("""
    INSERT INTO ai_flag_reviews (question_id, reported_by_id, reported_by_role, reason, suggested_edit, resolution_status, reviewer_notes)
    VALUES (4, 1, 'student', 'The wording in Step 2 could be simpler for middle-schoolers.', 'Add note reminding that (-2) * (-3) = +6', 'open', NULL)
    """)

    # 12. Seed a sample Parent Note
    cursor.execute("""
    INSERT INTO parent_notes (parent_id, student_id, message)
    VALUES (5, 1, 'Proud of your 5-day study streak, Aarav! Keep up the great work in Science and Math.')
    """)

    conn.commit()

if __name__ == "__main__":
    init_db(force_reseed=True)
    print("Roots & Rhythm database initialized and seeded successfully!")
