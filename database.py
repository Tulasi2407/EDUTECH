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

    # 3. Seed Subjects
    subjects_data = [
        (1, "Mathematics", "MATH", "calculator", "#3b82f6", "Core algebra, calculus foundations, and mathematical reasoning."),
        (2, "Physics", "PHYS", "atom", "#8b5cf6", "Mechanics, kinematics, and energy conservation principles."),
        (3, "Computer Science", "CS", "code", "#10b981", "Programming primitives, algorithmic thinking, and data structures.")
    ]
    cursor.executemany("""
    INSERT INTO subjects (id, name, code, icon, color, description)
    VALUES (?, ?, ?, ?, ?, ?)
    """, subjects_data)

    # 4. Seed Knowledge Nodes (Curriculum Graph)
    nodes_data = [
        # MATHEMATICS (Subject 1)
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

        (7, 1, "Graphing Parabolas & Vertex Form", "math-parabolas", "Functions", 3,
         "Visualizing quadratic functions, finding vertex coordinates, and line of symmetry.",
         "### Parabola Analysis\nVertex form: `y = a(x - h)^2 + k` where `(h, k)` is the vertex.\nAxis of symmetry: `x = -b / (2a)`. Vertex y-value: `f(-b / 2a)`.",
         "Vertex: h = -b/(2a), k = f(h)", 25),

        # PHYSICS (Subject 2)
        (8, 2, "Vectors & Components", "phys-vectors", "Mechanics", 1,
         "Vector addition, resolution into orthogonal x and y components.",
         "### Vectors\nA vector has magnitude and direction. Resolved components:\n`V_x = V * cos(θ)`\n`V_y = V * sin(θ)`\nMagnitude: `|V| = sqrt(V_x^2 + V_y^2)`.",
         "Vx = V cos θ, Vy = V sin θ", 20),

        (9, 2, "Newton's Laws of Motion", "phys-newtons-laws", "Mechanics", 2,
         "Inertia, F = ma, and action-reaction pairs.",
         "### Newton's Three Laws\n1. First Law: Law of Inertia\n2. Second Law: `ΣF = m * a`\n3. Third Law: Every action has an equal and opposite reaction (`F_AB = -F_BA`).",
         "ΣF = m * a", 20),

        (10, 2, "Projectile Motion & Trajectory", "phys-projectile-motion", "Kinematics", 3,
         "Analyzing independent horizontal and vertical motions under gravitational acceleration.",
         "### Projectile Motion\nHorizontal velocity remains constant: `x(t) = v_0 * cos(θ) * t`.\nVertical position: `y(t) = v_0 * sin(θ) * t - 0.5 * g * t^2`.\nMaximum height `H = (v_0 * sin θ)^2 / (2g)`.",
         "R = (v₀² sin 2θ) / g | H = (v₀ sin θ)² / (2g)", 30),

        # COMPUTER SCIENCE (Subject 3)
        (11, 3, "Variables & Memory Frames", "cs-variables-memory", "Core Programming", 1,
         "Understanding how primitive values and references reside in memory.",
         "### Memory Frames\nVariables hold values or references. Scope determines accessibility. Stack memory allocates local execution frames, cleaned up automatically upon function return.",
         "Scope: Local vs Global Frames", 15),

        (12, 3, "Function Call Stack & Recursion", "cs-recursion", "Algorithms", 2,
         "Base cases, recursive branching, and stack overflow prevention.",
         "### Recursion & Call Stack\nA recursive function calls itself until reaching a termination condition (**Base Case**).\nEach recursive call pushes a new frame onto the execution call stack. Missing base cases cause Stack Overflow.",
         "T(n) = aT(n/b) + f(n)", 25),

        (13, 3, "Binary Tree Traversal (DFS/BFS)", "cs-tree-traversal", "Data Structures", 3,
         "Depth-First Search (In-order, Pre-order, Post-order) and Breadth-First Search.",
         "### Tree Traversals\n- **In-order (LNR)**: Traverse left, visit root, traverse right (yields sorted output in BST).\n- **Pre-order (NLR)**: Visit root, then left, then right.\n- **Post-order (LRN)**: Left, right, root.\n- **BFS**: Level-order traversal using a FIFO queue.",
         "Inorder: Left -> Node -> Right", 30)
    ]
    cursor.executemany("""
    INSERT INTO knowledge_nodes (id, subject_id, topic_name, slug, category, tier, short_desc, explanation_markdown, key_formulae, estimated_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, nodes_data)

    # 5. Seed Prerequisites (Edges of the Root-Cause Graph)
    prereqs = [
        # Math Prerequisites
        (4, 1, 1.0, "Balancing equations requires proper order of operations."),
        (4, 2, 1.0, "Transposing terms requires correct sign handling."),
        (5, 1, 0.8, "Distributive property expands expressions."),
        (5, 2, 1.0, "Factoring binomials relies heavily on sign multiplication rules."),
        (6, 4, 0.9, "Rearranging quadratic expressions requires linear equation manipulation."),
        (6, 5, 1.0, "Factoring is a primary method for finding quadratic roots; completing square builds on algebraic identities."),
        (7, 6, 1.0, "Finding x-intercepts of a parabola is identical to finding roots of quadratic equations."),
        
        # Physics Prerequisites
        (9, 8, 1.0, "Net force requires resolving vectors into perpendicular components."),
        (10, 8, 1.0, "Initial velocity must be resolved into horizontal and vertical components."),
        (10, 9, 0.9, "Gravitational downward force governs vertical acceleration."),

        # CS Prerequisites
        (12, 11, 1.0, "Recursive execution requires clear understanding of stack memory frames."),
        (13, 12, 1.0, "Depth-First Search traversals are implemented recursively using call stacks.")
    ]
    cursor.executemany("""
    INSERT INTO prerequisites (node_id, prerequisite_node_id, dependency_weight, description)
    VALUES (?, ?, ?, ?)
    """, prereqs)

    # 6. Seed Student Mastery Profiles
    # Aarav Sharma (id=1): Struggles with Quadratic Equations!
    # Root Cause: Weak in Factoring Polynomials (42%) and Sign Rules (48%), while Arithmetic is Mastered (92%).
    now_iso = datetime.now().isoformat()
    d1 = (datetime.now() - timedelta(days=1)).isoformat()
    d2 = (datetime.now() - timedelta(days=2)).isoformat()
    d3 = (datetime.now() - timedelta(days=3)).isoformat()
    d4 = (datetime.now() - timedelta(days=4)).isoformat()
    d5 = (datetime.now() - timedelta(days=5)).isoformat()
    d6 = (datetime.now() - timedelta(days=6)).isoformat()
    d7 = (datetime.now() - timedelta(days=7)).isoformat()

    aarav_mastery = [
        (1, 1, "mastered", 92, d5, 4),
        (1, 2, "root_cause", 48, d2, 0),
        (1, 3, "mastered", 85, d6, 2),
        (1, 4, "shaky", 64, d3, 1),
        (1, 5, "root_cause", 42, d1, 0),
        (1, 6, "shaky", 51, d1, 0),
        (1, 7, "not_started", 20, None, 0),
        (1, 8, "mastered", 88, d4, 3),
        (1, 9, "shaky", 60, d2, 1),
        (1, 10, "not_started", 25, None, 0),
        (1, 11, "mastered", 95, d7, 5),
        (1, 12, "shaky", 58, d3, 1),
        (1, 13, "not_started", 30, None, 0)
    ]
    cursor.executemany("""
    INSERT INTO student_mastery (student_id, node_id, status, mastery_score, last_tested_at, streak_count)
    VALUES (?, ?, ?, ?, ?, ?)
    """, aarav_mastery)

    # Diya Rao (id=2) and Kiran Kumar (id=3) mastery for teacher class analytics
    other_masteries = [
        # Diya
        (2, 1, "mastered", 95, d3, 6),
        (2, 2, "mastered", 88, d3, 5),
        (2, 4, "mastered", 86, d2, 4),
        (2, 5, "shaky", 68, d1, 1),
        (2, 6, "shaky", 62, d1, 1),
        # Kiran
        (3, 1, "shaky", 65, d4, 1),
        (3, 2, "root_cause", 40, d2, 0),
        (3, 4, "root_cause", 45, d2, 0),
        (3, 5, "root_cause", 38, d1, 0),
        (3, 6, "not_started", 15, None, 0)
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

        # Node 8: Vectors & Components
        (8, "beginner", "A force vector has magnitude 10 N directed at 60° to the horizontal. What is its horizontal component?",
         json.dumps(["5 N", "8.66 N", "10 N", "2.5 N"]), 0,
         "Step 1: Recall F_x = F * cos(θ).\nStep 2: cos(60°) = 0.5.\nStep 3: F_x = 10 * 0.5 = 5 N.",
         0, 0.97, "verified"),

        # Node 12: Recursion
        (12, "beginner", "What is the critical component of any recursive function to prevent infinite execution?",
         json.dumps(["A while loop", "A base case (termination condition)", "A global counter variable", "A try-except block"]), 1,
         "Step 1: Recursive functions call themselves.\nStep 2: Without a condition that halts recursion, calls accumulate until the stack overflows.\nStep 3: The terminating condition is called the Base Case.",
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
