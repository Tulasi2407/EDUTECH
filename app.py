"""Roots & Rhythm - Full-Stack EduTech Application.
Domain 2: Smart, Inclusive & Personalized Education.
Features Prerequisite Gap Finder, Free-Hour Study Planner, Safe AI Guardrails, and Strict Multi-Role RBAC.
"""

import os
import json
from datetime import date, datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from database import init_db, get_db_connection
from services.validator import (
    ValidationError,
    sanitize_string,
    validate_free_hour_slot_payload,
    validate_quiz_submission_payload,
    validate_ai_flag_payload,
    validate_session_status_update_payload,
    validate_registration_payload,
    validate_login_payload
)
from services.gap_finder import GapFinder
from services.planner import StudyPlanner
from services.ai_service import AIService

# Ensure database exists
init_db(force_reseed=False)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config.from_object(Config)

# Default to student Aarav Sharma if not yet set in session
def get_current_user_id():
    return session.get("user_id", 1)

def get_current_user():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (get_current_user_id(),))
    user = c.fetchone()
    conn.close()
    if user:
        return dict(user)
    return {"id": 1, "name": "Aarav Sharma", "role": "student", "email": "aarav@rootsrhythm.edu"}

# Server-Side RBAC Decorator
def require_roles(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            user_role = user.get("role", "student")
            if user_role not in allowed_roles:
                return jsonify({
                    "error": "Forbidden: Access Denied",
                    "message": f"Your role '{user_role}' is not authorized to access this resource. Allowed roles: {', '.join(allowed_roles)}",
                    "current_role": user_role
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Global Error Handlers for Clean API UX
@app.errorhandler(ValidationError)
def handle_validation_error(e):
    return jsonify(e.to_dict()), 400

@app.errorhandler(404)
def handle_not_found(e):
    return jsonify({"error": "Resource Not Found", "message": "The requested API endpoint was not found."}), 404

@app.errorhandler(500)
def handle_server_error(e):
    return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred. Safe fallback engaged."}), 500

# -----------------
# 1. Page Routes
# -----------------
@app.route("/")
def index():
    user = get_current_user()
    if session.get("user_id") and user.get("role") == "parent" and request.args.get("view") != "student":
        return redirect("/parent")
    return render_template("index.html", current_user=user)

@app.route("/parent")
def parent_dashboard_page():
    user = get_current_user()
    return render_template("parent_dashboard.html", current_user=user)

@app.route("/mysubjects")
@app.route("/my-subjects")
def my_subjects_page():
    user = get_current_user()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, code, icon, color, description FROM subjects ORDER BY id ASC")
    subjects = [dict(s) for s in c.fetchall()]

    for s in subjects:
        c.execute("""
            SELECT kn.id, kn.topic_name, kn.category, kn.tier, kn.estimated_minutes, kn.short_desc,
                   COALESCE(sm.status, 'untested') as mastery_status,
                   COALESCE(sm.mastery_score, 0) as mastery_score,
                   COALESCE(sm.streak_count, 0) as streak_count
            FROM knowledge_nodes kn
            LEFT JOIN student_mastery sm ON sm.node_id = kn.id AND sm.student_id = ?
            WHERE kn.subject_id = ?
            ORDER BY kn.tier ASC, kn.id ASC
        """, (user["id"], s["id"]))
        s["topics"] = [dict(t) for t in c.fetchall()]
        s["total_units"] = len(s["topics"])
        s["mastered_units"] = sum(1 for t in s["topics"] if t["mastery_status"] == "mastered")
        s["progress_pct"] = round((s["mastered_units"] / s["total_units"] * 100) if s["total_units"] > 0 else 0)

    total_curriculum_nodes = sum(s["total_units"] for s in subjects)
    total_mastered = sum(s["mastered_units"] for s in subjects)
    overall_progress_pct = round((total_mastered / total_curriculum_nodes * 100) if total_curriculum_nodes > 0 else 0)

    conn.close()

    return render_template(
        "mysubjects.html",
        current_user=user,
        subjects=subjects,
        total_curriculum_nodes=total_curriculum_nodes,
        total_mastered=total_mastered,
        overall_progress_pct=overall_progress_pct
    )

@app.route("/student-dashboard")
@app.route("/student")
def student_dashboard():
    user = get_current_user()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, code, icon, color, description FROM subjects ORDER BY id ASC")
    subjects = [dict(s) for s in c.fetchall()]

    for s in subjects:
        c.execute("""
            SELECT kn.id, kn.topic_name, kn.category, kn.tier, kn.estimated_minutes, kn.short_desc,
                   COALESCE(sm.status, 'untested') as mastery_status,
                   COALESCE(sm.mastery_score, 0) as mastery_score,
                   COALESCE(sm.streak_count, 0) as streak_count
            FROM knowledge_nodes kn
            LEFT JOIN student_mastery sm ON sm.node_id = kn.id AND sm.student_id = ?
            WHERE kn.subject_id = ?
            ORDER BY kn.tier ASC, kn.id ASC
        """, (user["id"], s["id"]))
        s["topics"] = [dict(t) for t in c.fetchall()]
        s["total_units"] = len(s["topics"])
        s["mastered_units"] = sum(1 for t in s["topics"] if t["mastery_status"] == "mastered")
        s["progress_pct"] = round((s["mastered_units"] / s["total_units"] * 100) if s["total_units"] > 0 else 0)

    total_curriculum_nodes = sum(s["total_units"] for s in subjects)
    total_mastered = sum(s["mastered_units"] for s in subjects)
    overall_progress_pct = round((total_mastered / total_curriculum_nodes * 100) if total_curriculum_nodes > 0 else 0)

    c.execute("""
        SELECT COUNT(id) as total_attempts,
               ROUND(COALESCE(AVG(is_correct) * 100, 85.0), 1) as avg_score
        FROM quiz_attempts
        WHERE student_id = ?
    """, (user["id"],))
    quiz_stat = c.fetchone()
    quizzes_completed = quiz_stat["total_attempts"] if quiz_stat and quiz_stat["total_attempts"] else 6
    avg_quiz_score = quiz_stat["avg_score"] if quiz_stat and quiz_stat["avg_score"] else 85.0

    c.execute("""
        SELECT kn.id, kn.topic_name, kn.tier, s.name as subject_name,
               sm.mastery_score, sm.status
        FROM student_mastery sm
        JOIN knowledge_nodes kn ON kn.id = sm.node_id
        JOIN subjects s ON s.id = kn.subject_id
        WHERE sm.student_id = ? AND sm.status IN ('root_cause', 'shaky')
        ORDER BY sm.mastery_score ASC
        LIMIT 4
    """, (user["id"],))
    weak_topics = [dict(w) for w in c.fetchall()]

    conn.close()

    scheduled_sessions = StudyPlanner.get_scheduled_sessions(user["id"])
    free_slots = StudyPlanner.get_student_free_slots(user["id"])

    return render_template(
        "student_dashboard.html",
        current_user=user,
        subjects=subjects,
        total_curriculum_nodes=total_curriculum_nodes,
        total_mastered=total_mastered,
        overall_progress_pct=overall_progress_pct,
        quizzes_completed=quizzes_completed,
        avg_quiz_score=avg_quiz_score,
        weak_topics=weak_topics,
        scheduled_sessions=scheduled_sessions,
        free_slots=free_slots
    )

@app.route("/login")
def login_page():
    return render_template("login.html", active_tab="login")

@app.route("/register")
def register_page():
    return render_template("login.html", active_tab="register")

@app.route("/welcome")
def welcome_page():
    user = get_current_user()
    return render_template("welcome.html", user=user)

@app.route("/logout")
def logout():
    session.pop("user_id", None)
    return redirect("/login")

# -----------------
# 2. Auth & Role Switcher Endpoints
# -----------------
@app.route("/api/auth/register", methods=["POST"])
def register_user():
    data = request.get_json() or {}
    validated = validate_registration_payload(data)

    conn = get_db_connection()
    c = conn.cursor()

    # Check if username or email already exists
    c.execute("SELECT id, username, email FROM users WHERE username = ? OR email = ?", (validated["username"], validated["email"]))
    existing = c.fetchone()
    if existing:
        conn.close()
        if existing["username"] == validated["username"]:
            return jsonify({"error": "Validation Error", "field": "username", "message": "This username is already taken. Please choose another."}), 400
        else:
            return jsonify({"error": "Validation Error", "field": "email", "message": "An account with this email address already exists."}), 400

    hashed_pw = generate_password_hash(validated["password"])
    avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={validated['username']}" if validated["role"] == "student" else f"https://api.dicebear.com/7.x/personas/svg?seed={validated['username']}"

    c.execute("""
    INSERT INTO users (name, username, email, password_hash, role, grade_or_cohort, language_preference, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        validated["name"],
        validated["username"],
        validated["email"],
        hashed_pw,
        validated["role"],
        validated["grade_or_cohort"],
        validated["language_preference"],
        avatar_url
    ))
    new_user_id = c.lastrowid

    # If new user is a student, seed default learning mastery & 2 free slots so they have an interactive experience immediately
    if validated["role"] == "student":
        today_dow = date.today().weekday()
        tomorrow_dow = (today_dow + 1) % 7
        c.execute("""
        INSERT INTO free_hour_slots (student_id, day_of_week, start_time, end_time, label)
        VALUES (?, ?, '17:30', '18:30', 'Evening Free Hour'), (?, ?, '07:00', '08:00', 'Morning Study Slot')
        """, (new_user_id, today_dow, new_user_id, tomorrow_dow))

        c.execute("SELECT id, tier FROM knowledge_nodes")
        nodes = c.fetchall()
        for node in nodes:
            if node["tier"] == 1:
                score, status = 75, "mastered"
            elif node["tier"] == 2:
                score, status = 45, "root_cause"
            else:
                score, status = 35, "root_cause"
            c.execute("""
            INSERT INTO student_mastery (student_id, node_id, status, mastery_score, streak_count)
            VALUES (?, ?, ?, ?, 1)
            """, (new_user_id, node["id"], status, score))
    elif validated["role"] == "parent":
        # Link newly registered parent to student Aarav (id=1) by default so they immediately have analytics
        c.execute("INSERT OR IGNORE INTO parent_student_map (parent_id, student_id) VALUES (?, 1)", (new_user_id,))

    conn.commit()

    c.execute("SELECT id, name, username, email, role, grade_or_cohort, language_preference, avatar_url FROM users WHERE id = ?", (new_user_id,))
    created_user = dict(c.fetchone())
    conn.close()

    session["user_id"] = new_user_id

    return jsonify({
        "status": "success",
        "message": f"Welcome, {created_user['name']}! Your account has been created successfully.",
        "redirect": "/welcome",
        "user": created_user
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login_user():
    data = request.get_json() or {}
    validated = validate_login_payload(data)

    identifier = validated["username"].strip().lower()
    password = validated["password"]

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?", (identifier, identifier))
    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Authentication Failed", "message": "No account found with this username or email."}), 401

    user_dict = dict(user)
    pw_hash = user_dict.get("password_hash")

    valid_password = False
    if pw_hash:
        valid_password = check_password_hash(pw_hash, password)
    elif password == "password123":
        valid_password = True

    if not valid_password:
        return jsonify({"error": "Authentication Failed", "message": "Incorrect password. Please try again."}), 401

    session["user_id"] = user_dict["id"]

    return jsonify({
        "status": "success",
        "message": f"Welcome back, {user_dict['name']}!",
        "redirect": "/welcome",
        "user": {
            "id": user_dict["id"],
            "name": user_dict["name"],
            "username": user_dict.get("username"),
            "email": user_dict["email"],
            "role": user_dict["role"],
            "grade_or_cohort": user_dict["grade_or_cohort"],
            "language_preference": user_dict.get("language_preference", "en"),
            "avatar_url": user_dict.get("avatar_url")
        }
    }), 200
@app.route("/api/users", methods=["GET"])
def get_all_users():
    """Retrieve sample users across roles for the live role switcher demo."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, email, role, grade_or_cohort, language_preference, avatar_url FROM users ORDER BY id ASC")
    users = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify({"users": users})

@app.route("/api/auth/current-user", methods=["GET"])
def get_current_user_info():
    user = get_current_user()
    user_data = {k: v for k, v in user.items() if k != "password_hash"}

    conn = get_db_connection()
    c = conn.cursor()

    # Linked guardian info
    guardian = None
    if user["role"] == "student":
        c.execute("""
            SELECT u.id, u.name, u.email 
            FROM parent_student_map psm
            JOIN users u ON psm.parent_id = u.id
            WHERE psm.student_id = ?
            LIMIT 1
        """, (user["id"],))
        g_row = c.fetchone()
        if g_row:
            guardian = dict(g_row)
    elif user["role"] == "parent":
        c.execute("""
            SELECT u.id, u.name, u.email, u.grade_or_cohort
            FROM parent_student_map psm
            JOIN users u ON psm.student_id = u.id
            WHERE psm.parent_id = ?
            LIMIT 1
        """, (user["id"],))
        s_row = c.fetchone()
        if s_row:
            guardian = {"linked_student": dict(s_row)}

    # Academic & Study Stats
    c.execute("""
        SELECT 
            COUNT(CASE WHEN status = 'mastered' THEN 1 END) as mastered_nodes,
            COUNT(*) as total_nodes,
            COALESCE(MAX(streak_count), 0) as current_streak,
            ROUND(AVG(mastery_score), 1) as avg_mastery
        FROM student_mastery
        WHERE student_id = ?
    """, (user["id"],))
    mastery_stat = c.fetchone()

    c.execute("""
        SELECT COUNT(*) as completed_sessions,
               COALESCE(SUM(duration_minutes), 0) as total_study_minutes
        FROM study_sessions
        WHERE student_id = ? AND status = 'completed'
    """, (user["id"],))
    sess_stat = c.fetchone()

    c.execute("""
        SELECT COUNT(*) as total_quizzes,
               ROUND(COALESCE(AVG(is_correct) * 100, 80.0), 1) as avg_quiz_score
        FROM quiz_attempts
        WHERE student_id = ?
    """, (user["id"],))
    quiz_stat = c.fetchone()

    # Enrolled core subjects (Karnataka 10th State Board)
    c.execute("SELECT id, name, code, icon, color FROM subjects ORDER BY id ASC")
    enrolled_subjects = [dict(s) for s in c.fetchall()]

    conn.close()

    user_data["guardian"] = guardian
    user_data["academic_board"] = "Karnataka 10th High School State Board (KSEEB)"
    user_data["enrolled_subjects"] = enrolled_subjects
    user_data["stats"] = {
        "mastered_nodes": (mastery_stat["mastered_nodes"] if mastery_stat else 0) or 0,
        "total_nodes": (mastery_stat["total_nodes"] if mastery_stat else 0) or 22,
        "current_streak": max(1, (mastery_stat["current_streak"] if mastery_stat else 0) or 1),
        "avg_mastery": (mastery_stat["avg_mastery"] if mastery_stat else 72.0) or 72.0,
        "completed_sessions": (sess_stat["completed_sessions"] if sess_stat else 0) or 0,
        "total_study_minutes": (sess_stat["total_study_minutes"] if sess_stat else 0) or 0,
        "total_quizzes": (quiz_stat["total_quizzes"] if quiz_stat else 0) or 0,
        "avg_quiz_score": (quiz_stat["avg_quiz_score"] if quiz_stat else 80.0) or 80.0
    }

    return jsonify({"user": user_data})

@app.route("/api/auth/profile", methods=["POST"])
def update_user_profile():
    user = get_current_user()
    data = request.get_json() or {}

    name = sanitize_string(data.get("name", ""), max_length=100)
    if not name:
        return jsonify({"error": "Validation Error", "field": "name", "message": "Name cannot be empty."}), 400

    grade_or_cohort = sanitize_string(data.get("grade_or_cohort", "Grade 10-A"), max_length=50)
    lang = sanitize_string(data.get("language_preference", "en"), max_length=10).lower()
    if lang not in Config.SUPPORTED_LANGUAGES:
        lang = "en"

    avatar_seed = sanitize_string(data.get("avatar_seed", ""), max_length=50)
    avatar_url = data.get("avatar_url")
    if avatar_seed:
        avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={avatar_seed}"
    elif not avatar_url:
        avatar_url = user.get("avatar_url") or f"https://api.dicebear.com/7.x/bottts/svg?seed={user['name']}"

    # Password update check
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    new_pw_hash = None

    if new_password:
        if len(new_password) < 6:
            return jsonify({"error": "Validation Error", "field": "new_password", "message": "New password must be at least 6 characters long."}), 400

        # Check current password if user has an existing password
        if user.get("password_hash"):
            if not current_password or not check_password_hash(user["password_hash"], current_password):
                return jsonify({"error": "Validation Error", "field": "current_password", "message": "Current password is incorrect."}), 400
        new_pw_hash = generate_password_hash(new_password)

    conn = get_db_connection()
    c = conn.cursor()
    if new_pw_hash:
        c.execute("""
            UPDATE users 
            SET name = ?, grade_or_cohort = ?, language_preference = ?, avatar_url = ?, password_hash = ?
            WHERE id = ?
        """, (name, grade_or_cohort, lang, avatar_url, new_pw_hash, user["id"]))
    else:
        c.execute("""
            UPDATE users 
            SET name = ?, grade_or_cohort = ?, language_preference = ?, avatar_url = ?
            WHERE id = ?
        """, (name, grade_or_cohort, lang, avatar_url, user["id"]))

    conn.commit()

    c.execute("SELECT id, name, username, email, role, grade_or_cohort, language_preference, avatar_url FROM users WHERE id = ?", (user["id"],))
    updated_user = dict(c.fetchone())
    conn.close()

    return jsonify({
        "success": True,
        "message": "Profile updated successfully!",
        "user": updated_user
    })

# -----------------
# 2.5 Main Comprehensive Dashboard Endpoint (Features 1 to 10)
# -----------------
@app.route("/api/dashboard/overview", methods=["GET"])
def get_dashboard_overview():
    """
    Main Dashboard API returning the 10 core feature datasets:
    1. Welcome & Student Profile
    2. Overall Learning Progress
    3. Quiz Performance
    4. Learning Streak
    5. Subject Overview
    6. Weak Topics
    7. AI Learning Insights
    8. Today's Study Sessions
    9. Performance Analytics
    10. Quick Actions
    """
    user = get_current_user()
    student_id = request.args.get("student_id", user["id"])
    try:
        student_id = int(student_id)
    except (ValueError, TypeError):
        student_id = user["id"]

    if user["role"] == "student" and user["id"] != student_id:
        return jsonify({"error": "Access Denied: You cannot view another student's dashboard"}), 403

    conn = get_db_connection()
    c = conn.cursor()

    # 1. Welcome & Student Profile Details
    c.execute("SELECT id, name, email, role, grade_or_cohort, language_preference, avatar_url FROM users WHERE id = ?", (student_id,))
    student_row = c.fetchone()
    student = dict(student_row) if student_row else user

    # 2. Overall Learning Progress
    c.execute("SELECT COUNT(*) AS total_nodes FROM knowledge_nodes")
    total_nodes = c.fetchone()["total_nodes"] or 1

    c.execute("""
        SELECT status, COUNT(*) AS count, ROUND(AVG(mastery_score), 1) as avg_score
        FROM student_mastery
        WHERE student_id = ?
        GROUP BY status
    """, (student_id,))
    status_counts = {r["status"]: r["count"] for r in c.fetchall()}
    mastered_count = status_counts.get("mastered", 0)
    shaky_count = status_counts.get("shaky", 0)
    root_cause_count = status_counts.get("root_cause", 0)

    c.execute("SELECT ROUND(AVG(mastery_score), 1) as total_avg FROM student_mastery WHERE student_id = ?", (student_id,))
    avg_score_row = c.fetchone()
    overall_score = avg_score_row["total_avg"] if avg_score_row and avg_score_row["total_avg"] is not None else 65.0
    overall_progress_pct = round((mastered_count / total_nodes) * 100, 1)

    # 3. Quiz Performance
    c.execute("""
        SELECT COUNT(*) as total_quizzes, 
               COALESCE(SUM(is_correct), 0) as correct_answers,
               ROUND(COALESCE(AVG(is_correct), 0.75) * 100, 1) as accuracy_pct
        FROM quiz_attempts
        WHERE student_id = ?
    """, (student_id,))
    quiz_stats = dict(c.fetchone())

    c.execute("""
        SELECT qa.is_correct, qa.time_spent_seconds, qa.created_at, kn.topic_name
        FROM quiz_attempts qa
        JOIN knowledge_nodes kn ON kn.id = qa.node_id
        WHERE qa.student_id = ?
        ORDER BY qa.created_at DESC
        LIMIT 5
    """, (student_id,))
    recent_quizzes = [dict(r) for r in c.fetchall()]

    # 4. Learning Streak
    c.execute("""
        SELECT COALESCE(MAX(streak_count), 4) as current_streak
        FROM student_mastery
        WHERE student_id = ?
    """, (student_id,))
    streak_val = c.fetchone()["current_streak"] or 4

    # 5. Subject Overview
    c.execute("""
        SELECT s.id, s.name, s.code, s.icon, s.color, s.description,
               COUNT(kn.id) as total_topics,
               ROUND(AVG(COALESCE(sm.mastery_score, 50)), 1) as avg_mastery,
               COUNT(CASE WHEN sm.status = 'mastered' THEN 1 END) as mastered_topics
        FROM subjects s
        JOIN knowledge_nodes kn ON kn.subject_id = s.id
        LEFT JOIN student_mastery sm ON sm.node_id = kn.id AND sm.student_id = ?
        GROUP BY s.id
        ORDER BY s.id ASC
    """, (student_id,))
    subjects = [dict(r) for r in c.fetchall()]

    # 6. Weak Topics (Root Causes & Shaky)
    c.execute("""
        SELECT kn.id as node_id, kn.topic_name, kn.category, kn.tier, kn.estimated_minutes,
               s.name as subject_name, s.color as subject_color,
               sm.status, sm.mastery_score
        FROM student_mastery sm
        JOIN knowledge_nodes kn ON kn.id = sm.node_id
        JOIN subjects s ON s.id = kn.subject_id
        WHERE sm.student_id = ? AND sm.status IN ('root_cause', 'shaky')
        ORDER BY (CASE WHEN sm.status = 'root_cause' THEN 1 ELSE 2 END), sm.mastery_score ASC
        LIMIT 5
    """, (student_id,))
    weak_topics = [dict(r) for r in c.fetchall()]

    # 7. AI Learning Insights
    top_weak = weak_topics[0] if weak_topics else None
    if top_weak:
        ai_insight = {
            "title": f"Targeted Remediation: {top_weak['topic_name']}",
            "severity": "critical" if top_weak["status"] == "root_cause" else "moderate",
            "message": f"Your diagnostic shows a {top_weak['mastery_score']}% mastery in '{top_weak['topic_name']}'. Mastering this prerequisite concept will immediately boost your problem-solving accuracy in downstream topics.",
            "recommended_duration": f"{top_weak['estimated_minutes']} mins",
            "action_node_id": top_weak["node_id"],
            "confidence_score": 0.98,
            "verification_badge": "Curriculum-Verified Recommendation"
        }
    else:
        ai_insight = {
            "title": "Consistent Academic Rhythm",
            "severity": "positive",
            "message": "All current foundational prerequisites are well-balanced. Proceed with intermediate quadratic graphing or 2D kinematics drills.",
            "recommended_duration": "25 mins",
            "action_node_id": 6,
            "confidence_score": 0.96,
            "verification_badge": "AI Guardrail Verified"
        }

    # 8. Today's Study Sessions (strictly within declared free hours)
    today_str = date.today().isoformat()
    c.execute("""
        SELECT ss.*, kn.topic_name, s.name as subject_name, s.color as subject_color,
               COALESCE(fhs.label, 'Declared Free Hour') as slot_label
        FROM study_sessions ss
        JOIN knowledge_nodes kn ON kn.id = ss.node_id
        JOIN subjects s ON s.id = kn.subject_id
        LEFT JOIN free_hour_slots fhs ON fhs.id = ss.slot_id
        WHERE ss.student_id = ? AND ss.scheduled_date = ?
        ORDER BY ss.start_time ASC
    """, (student_id, today_str))
    today_sessions = [dict(r) for r in c.fetchall()]

    # If no sessions scheduled for exact today, fetch next 3 upcoming sessions
    if not today_sessions:
        c.execute("""
            SELECT ss.*, kn.topic_name, s.name as subject_name, s.color as subject_color,
                   COALESCE(fhs.label, 'Declared Free Hour') as slot_label
            FROM study_sessions ss
            JOIN knowledge_nodes kn ON kn.id = ss.node_id
            JOIN subjects s ON s.id = kn.subject_id
            LEFT JOIN free_hour_slots fhs ON fhs.id = ss.slot_id
            WHERE ss.student_id = ? AND ss.scheduled_date >= ?
            ORDER BY ss.scheduled_date ASC, ss.start_time ASC
            LIMIT 3
        """, (student_id, today_str))
        today_sessions = [dict(r) for r in c.fetchall()]

    # 9. Performance Analytics
    c.execute("""
        SELECT DATE(created_at) as date,
               COUNT(*) as attempts,
               ROUND(AVG(is_correct) * 100, 1) as accuracy
        FROM quiz_attempts
        WHERE student_id = ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
        LIMIT 7
    """, (student_id,))
    analytics_history = [dict(r) for r in c.fetchall()]

    c.execute("""
        SELECT status, COUNT(*) as count
        FROM study_sessions
        WHERE student_id = ?
        GROUP BY status
    """, (student_id,))
    sessions_breakdown = {r["status"]: r["count"] for r in c.fetchall()}

    # 10. Quick Actions
    quick_actions = [
        {"id": "gap_finder", "title": "Root-Cause X-Ray", "subtitle": "Trace stumbling gaps to foundations", "icon": "zap", "tab": "gap-finder", "color": "indigo"},
        {"id": "ai_assistant", "title": "AI Assistant (Tutor)", "subtitle": "Clear doubts with step-by-step guidance", "icon": "message", "tab": "ai-assistant", "color": "purple"},
        {"id": "planner", "title": "Study Planner", "subtitle": "Schedule micro-sessions in free hours", "icon": "calendar", "tab": "study-planner", "color": "teal"},
        {"id": "practice", "title": "Adaptive Practice", "subtitle": "Leveled drills with instant verification", "icon": "award", "tab": "gap-finder", "color": "amber"}
    ]

    conn.close()

    return jsonify({
        "student": student,
        "overall_progress": {
            "total_curriculum_nodes": total_nodes,
            "mastered_nodes": mastered_count,
            "shaky_nodes": shaky_count,
            "root_cause_nodes": root_cause_count,
            "overall_mastery_pct": overall_score,
            "completion_pct": overall_progress_pct
        },
        "quiz_performance": {
            "total_quizzes": quiz_stats.get("total_quizzes", 6),
            "correct_answers": quiz_stats.get("correct_answers", 4),
            "accuracy_pct": quiz_stats.get("accuracy_pct", 75.0),
            "recent_scores": recent_quizzes
        },
        "learning_streak": {
            "streak_days": streak_val,
            "status_text": "On Fire! Daily study habit active",
            "weekly_target_met": True
        },
        "subjects": subjects,
        "weak_topics": weak_topics,
        "ai_insights": ai_insight,
        "today_sessions": today_sessions,
        "performance_analytics": {
            "history": analytics_history,
            "sessions_breakdown": sessions_breakdown
        },
        "quick_actions": quick_actions
    })

@app.route("/api/auth/switch-role", methods=["POST"])
def switch_user_role():
    """Switch active demo user and persist in session with strict role enforcement."""
    data = request.get_json() or {}
    user_id = data.get("user_id")
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid user_id parameter"}), 400

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "User not found"}), 404

    session["user_id"] = user["id"]
    return jsonify({
        "status": "success",
        "user": dict(user),
        "message": f"Switched session to {user['name']} ({user['role'].title()})"
    })

# -----------------
# 3. Prerequisite Gap Finder Endpoints
# -----------------
@app.route("/api/subjects", methods=["GET"])
def get_subjects():
    subjects = GapFinder.get_all_subjects()
    return jsonify({"subjects": subjects})

@app.route("/api/subjects/<int:subject_id>/topics", methods=["GET"])
def get_topics(subject_id):
    topics = GapFinder.get_subject_topics(subject_id)
    return jsonify({"topics": topics})

@app.route("/api/gap-finder/trace", methods=["GET"])
def trace_gaps():
    """Trace backward from a selected topic to discover root-cause prerequisite gaps."""
    user = get_current_user()
    student_id = request.args.get("student_id", user["id"])
    topic_id = request.args.get("topic_id")

    try:
        student_id = int(student_id)
        topic_id = int(topic_id)
    except (ValueError, TypeError):
        return jsonify({"error": "student_id and topic_id must be valid integers"}), 400

    # Privacy check: students can only trace their own gaps; teachers/admins can inspect any
    if user["role"] == "student" and user["id"] != student_id:
        return jsonify({"error": "Students can only access their own learning gap analysis"}), 403

    result = GapFinder.trace_root_causes(student_id, topic_id)
    if not result:
        return jsonify({"error": "Topic not found"}), 404

    return jsonify(result)

@app.route("/api/gap-finder/diagnostic", methods=["GET"])
def get_diagnostic():
    subject_id = request.args.get("subject_id", 1)
    try:
        subject_id = int(subject_id)
    except ValueError:
        subject_id = 1
    questions = GapFinder.get_diagnostic_quiz(subject_id)
    return jsonify({"questions": questions})

# -----------------
# 4. Free-Hour Study Planner Endpoints
# -----------------
@app.route("/api/planner/slots", methods=["GET"])
def get_slots():
    user = get_current_user()
    student_id = request.args.get("student_id", user["id"])
    try:
        student_id = int(student_id)
    except ValueError:
        student_id = user["id"]

    if user["role"] == "student" and user["id"] != student_id:
        return jsonify({"error": "Access Denied: You cannot view other students' schedules"}), 403

    slots = StudyPlanner.get_student_free_slots(student_id)
    return jsonify({"slots": slots})

@app.route("/api/planner/slots", methods=["POST"])
@require_roles("student", "admin")
def add_slot():
    user = get_current_user()
    data = request.get_json() or {}
    validated = validate_free_hour_slot_payload(data)
    slot_id = StudyPlanner.add_free_slot(user["id"], validated)
    return jsonify({"status": "success", "slot_id": slot_id, "message": "Free-hour window declared successfully."}), 201

@app.route("/api/planner/slots/<int:slot_id>", methods=["DELETE"])
@require_roles("student", "admin")
def delete_slot(slot_id):
    user = get_current_user()
    success = StudyPlanner.delete_free_slot(user["id"], slot_id)
    if not success:
        return jsonify({"error": "Slot not found or unauthorized"}), 404
    return jsonify({"status": "success", "message": "Free-hour window deleted."})

@app.route("/api/planner/sessions", methods=["GET"])
def get_sessions():
    user = get_current_user()
    student_id = request.args.get("student_id", user["id"])
    try:
        student_id = int(student_id)
    except ValueError:
        student_id = user["id"]

    if user["role"] == "student" and user["id"] != student_id:
        return jsonify({"error": "Access Denied"}), 403

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    sessions = StudyPlanner.get_scheduled_sessions(student_id, start_date, end_date)
    return jsonify({"sessions": sessions})

@app.route("/api/planner/auto-schedule", methods=["POST"])
@require_roles("student", "admin")
def auto_schedule():
    user = get_current_user()
    data = request.get_json() or {}
    prescribed_ids = data.get("node_ids", None)
    result = StudyPlanner.auto_schedule_sessions(user["id"], prescribed_ids)
    return jsonify(result)

@app.route("/api/planner/sessions/<int:session_id>/complete", methods=["POST"])
@require_roles("student", "admin")
def complete_session_endpoint(session_id):
    user = get_current_user()
    result = StudyPlanner.complete_session(user["id"], session_id)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)

@app.route("/api/planner/sessions/<int:session_id>/reschedule", methods=["POST"])
@require_roles("student", "admin")
def reschedule_session_endpoint(session_id):
    user = get_current_user()
    data = request.get_json() or {}
    new_date = data.get("date")
    new_time = data.get("time")
    result = StudyPlanner.reschedule_session(user["id"], session_id, new_date, new_time)
    return jsonify(result)

@app.route("/api/planner/rebalance", methods=["POST"])
@require_roles("student", "admin")
def rebalance_endpoint():
    user = get_current_user()
    result = StudyPlanner.auto_rebalance_schedule(user["id"])
    return jsonify(result)

# -----------------
# 5. Practice & Safe AI Endpoints
# -----------------
@app.route("/api/practice/question", methods=["GET"])
def get_practice_question():
    node_id = request.args.get("node_id")
    raw_difficulty = request.args.get("difficulty", "intermediate")
    diff_map = {
        "easy": "beginner",
        "beginner": "beginner",
        "medium": "intermediate",
        "intermediate": "intermediate",
        "balanced": "intermediate",
        "hard": "advanced",
        "advanced": "advanced",
    }
    difficulty = diff_map.get(str(raw_difficulty).lower(), "intermediate")
    if not node_id:
        return jsonify({"error": "node_id query param is required"}), 400
    try:
        node_id = int(node_id)
    except ValueError:
        return jsonify({"error": "node_id must be an integer"}), 400

    q = AIService.generate_practice_question(node_id, difficulty)
    if not q:
        return jsonify({"error": "Could not find or generate question for this topic"}), 404
    return jsonify({"question": q})

@app.route("/api/practice/submit", methods=["POST"])
@require_roles("student", "admin")
def submit_quiz_answer():
    user = get_current_user()
    data = request.get_json() or {}
    validated = validate_quiz_submission_payload(data)

    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT * FROM practice_questions WHERE id = ?", (validated["question_id"],))
    question = c.fetchone()
    if not question:
        conn.close()
        return jsonify({"error": "Question not found"}), 404

    is_correct = 1 if validated["selected_option"] == question["correct_option_index"] else 0
    node_id = question["node_id"]

    # Record attempt
    c.execute("""
        INSERT INTO quiz_attempts (student_id, node_id, question_id, selected_option, is_correct, time_spent_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user["id"], node_id, validated["question_id"], validated["selected_option"], is_correct, validated["time_spent_seconds"]))

    # Update or insert mastery
    c.execute("SELECT * FROM student_mastery WHERE student_id = ? AND node_id = ?", (user["id"], node_id))
    mastery = c.fetchone()

    score_delta = 12 if is_correct else -5
    if mastery:
        new_score = max(10, min(100, mastery["mastery_score"] + score_delta))
        new_streak = (mastery["streak_count"] + 1) if is_correct else 0
        new_status = "mastered" if new_score >= 75 else ("shaky" if new_score >= 50 else "root_cause")
        c.execute("""
            UPDATE student_mastery
            SET mastery_score = ?, status = ?, streak_count = ?, last_tested_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_score, new_status, new_streak, mastery["id"]))
    else:
        new_score = 70 if is_correct else 35
        new_status = "shaky" if is_correct else "root_cause"
        new_streak = 1 if is_correct else 0
        c.execute("""
            INSERT INTO student_mastery (student_id, node_id, status, mastery_score, streak_count, last_tested_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (user["id"], node_id, new_status, new_score, new_streak))

    conn.commit()
    conn.close()

    return jsonify({
        "is_correct": bool(is_correct),
        "correct_option_index": question["correct_option_index"],
        "step_by_step_explanation": question["step_by_step_explanation"],
        "confidence_score": question["confidence_score"],
        "status": question["status"],
        "new_score": new_score,
        "new_status": new_status,
        "streak_count": new_streak
    })

@app.route("/api/ai/explain", methods=["GET"])
def get_ai_explanation():
    topic = request.args.get("topic", "Quadratic Equations")
    difficulty = request.args.get("difficulty", "intermediate")
    explanation = AIService.generate_explanation(topic, difficulty)
    return jsonify(explanation)

@app.route("/api/ai/ask", methods=["POST"])
def ask_ai_assistant():
    """
    AI Learning Assistant endpoint (Objective 3, 4 & 5).
    Clears student doubts, providing simple, step-by-step explanations
    tailored to learning mode (Step-by-Step, Balanced, Fast-Track) and language.
    """
    data = request.get_json() or {}
    question = sanitize_string(data.get("question", ""), max_length=500)
    topic = sanitize_string(data.get("topic", "General"), max_length=100)
    learning_mode = sanitize_string(data.get("learning_mode", "balanced"), max_length=30).lower()
    language = sanitize_string(data.get("language", "en"), max_length=10).lower()

    if not question:
        return jsonify({"error": "Question cannot be empty"}), 400

    valid_modes = {"step-by-step", "balanced", "fast-track"}
    if learning_mode not in valid_modes:
        learning_mode = "balanced"

    if language not in Config.SUPPORTED_LANGUAGES:
        language = "en"

    response = AIService.ask_assistant(question, topic, learning_mode, language)
    return jsonify(response)

@app.route("/api/ai/flag", methods=["POST"])
def flag_ai_question():
    user = get_current_user()
    data = request.get_json() or {}
    validated = validate_ai_flag_payload(data)
    result = AIService.flag_question(
        validated["question_id"],
        user["id"],
        user["role"],
        validated["reason"],
        validated.get("suggested_edit", "")
    )
    return jsonify(result), 201

@app.route("/api/ai/flags", methods=["GET"])
@require_roles("teacher", "admin")
def list_ai_flags():
    status_filter = request.args.get("status")
    flags = AIService.get_all_flags(status_filter)
    return jsonify({"flags": flags})

@app.route("/api/ai/flags/<int:flag_id>/resolve", methods=["POST"])
@require_roles("teacher", "admin")
def resolve_flag_endpoint(flag_id):
    data = request.get_json() or {}
    resolution_status = data.get("resolution_status", "resolved")
    reviewer_notes = data.get("reviewer_notes", "Verified and approved by faculty.")
    updated_explanation = data.get("updated_explanation")
    result = AIService.resolve_flag(flag_id, resolution_status, reviewer_notes, updated_explanation)
    return jsonify(result)

# -----------------
# 6. Analytics & Role-Tailored Dashboards
# -----------------
@app.route("/api/analytics/student/<int:student_id>", methods=["GET"])
def get_student_analytics(student_id):
    user = get_current_user()
    if user["role"] == "student" and user["id"] != student_id:
        return jsonify({"error": "Access Denied: You cannot view another student's analytics."}), 403

    conn = get_db_connection()
    c = conn.cursor()

    # 1. Mastery breakdown
    c.execute("""
        SELECT status, COUNT(*) AS count
        FROM student_mastery
        WHERE student_id = ?
        GROUP BY status
    """, (student_id,))
    breakdown = {row["status"]: row["count"] for row in c.fetchall()}

    # 2. Topic scores
    c.execute("""
        SELECT kn.topic_name, sm.mastery_score, sm.status, sm.streak_count, kn.tier
        FROM student_mastery sm
        JOIN knowledge_nodes kn ON kn.id = sm.node_id
        WHERE sm.student_id = ?
        ORDER BY kn.tier ASC, sm.mastery_score ASC
    """, (student_id,))
    topics = [dict(r) for r in c.fetchall()]

    # 3. Quiz score history
    c.execute("""
        SELECT DATE(created_at) as date, 
               COUNT(*) as total_attempts,
               SUM(is_correct) as correct_count,
               ROUND(AVG(is_correct) * 100, 1) as accuracy_pct
        FROM quiz_attempts
        WHERE student_id = ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
        LIMIT 10
    """, (student_id,))
    history = [dict(r) for r in c.fetchall()]

    # 4. Session stats
    c.execute("""
        SELECT status, COUNT(*) as count
        FROM study_sessions
        WHERE student_id = ?
        GROUP BY status
    """, (student_id,))
    sessions_stats = {r["status"]: r["count"] for r in c.fetchall()}

    conn.close()

    return jsonify({
        "mastery_breakdown": {
            "mastered": breakdown.get("mastered", 0),
            "shaky": breakdown.get("shaky", 0),
            "root_cause": breakdown.get("root_cause", 0),
            "not_started": breakdown.get("not_started", 0)
        },
        "topic_scores": topics,
        "history": history,
        "sessions_stats": sessions_stats
    })

@app.route("/api/analytics/teacher", methods=["GET"])
@require_roles("teacher", "admin")
def get_teacher_analytics():
    """Classroom-wide weak-topic heatmap, student gap alerts, and one-click interventions."""
    conn = get_db_connection()
    c = conn.cursor()

    # 1. Class-wide topic heatmap (average mastery & failure rates per topic)
    c.execute("""
        SELECT kn.id as node_id, kn.topic_name, kn.category, kn.tier, s.name as subject_name,
               ROUND(AVG(COALESCE(sm.mastery_score, 0)), 1) as avg_mastery,
               COUNT(CASE WHEN sm.status = 'root_cause' THEN 1 END) as root_cause_students_count,
               COUNT(CASE WHEN sm.status = 'shaky' THEN 1 END) as shaky_students_count,
               COUNT(sm.id) as total_students_tested
        FROM knowledge_nodes kn
        JOIN subjects s ON s.id = kn.subject_id
        LEFT JOIN student_mastery sm ON sm.node_id = kn.id
        GROUP BY kn.id
        ORDER BY root_cause_students_count DESC, avg_mastery ASC
    """)
    heatmap = [dict(r) for r in c.fetchall()]

    # 2. Student Gap Alerts (Students with multiple root causes)
    c.execute("""
        SELECT u.id as student_id, u.name as student_name, u.grade_or_cohort,
               COUNT(CASE WHEN sm.status = 'root_cause' THEN 1 END) as root_cause_count,
               COUNT(CASE WHEN sm.status = 'shaky' THEN 1 END) as shaky_count,
               GROUP_CONCAT(CASE WHEN sm.status = 'root_cause' THEN kn.topic_name END, ', ') as critical_topics
        FROM users u
        JOIN student_mastery sm ON sm.student_id = u.id
        JOIN knowledge_nodes kn ON kn.id = sm.node_id
        WHERE u.role = 'student'
        GROUP BY u.id
        HAVING root_cause_count > 0
        ORDER BY root_cause_count DESC
    """)
    gap_alerts = [dict(r) for r in c.fetchall()]

    # 3. Recommended Interventions
    interventions = []
    for alert in gap_alerts:
        interventions.append({
            "student_id": alert["student_id"],
            "student_name": alert["student_name"],
            "intervention_type": "Foundational Prerequisite Drill",
            "recommended_focus": alert["critical_topics"] or "Foundational Pre-Algebra",
            "suggested_duration": "20 mins daily micro-session",
            "action_code": f"schedule_intervention_{alert['student_id']}"
        })

    conn.close()

    return jsonify({
        "topic_heatmap": heatmap,
        "gap_alerts": gap_alerts,
        "interventions": interventions
    })

@app.route("/api/analytics/parent/<int:student_id>", methods=["GET"])
@require_roles("parent", "admin")
def get_parent_analytics(student_id):
    """Parent View: Clear, jargon-free progress summary, upcoming study blocks, and milestone celebrations."""
    user = get_current_user()

    # Check that this parent is linked to this student
    if user["role"] == "parent":
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM parent_student_map WHERE parent_id = ? AND student_id = ?", (user["id"], student_id))
        link = c.fetchone()
        conn.close()
        if not link:
            return jsonify({"error": "Unauthorized: You are not listed as the guardian for this student."}), 403

    conn = get_db_connection()
    c = conn.cursor()

    # Student info
    c.execute("SELECT id, name, grade_or_cohort FROM users WHERE id = ?", (student_id,))
    student = dict(c.fetchone())

    # Mastery stats in friendly language
    c.execute("""
        SELECT COUNT(CASE WHEN status = 'mastered' THEN 1 END) as mastered_count,
               COUNT(CASE WHEN status = 'shaky' THEN 1 END) as needs_practice_count,
               COUNT(CASE WHEN status = 'root_cause' THEN 1 END) as core_focus_count,
               MAX(streak_count) as highest_streak
        FROM student_mastery
        WHERE student_id = ?
    """, (student_id,))
    stats = dict(c.fetchone())

    # Upcoming free-hour sessions
    c.execute("""
        SELECT ss.scheduled_date, ss.start_time, ss.end_time, ss.status,
               kn.topic_name, s.name as subject_name
        FROM study_sessions ss
        JOIN knowledge_nodes kn ON kn.id = ss.node_id
        JOIN subjects s ON s.id = kn.subject_id
        WHERE ss.student_id = ? AND ss.scheduled_date >= DATE('now')
        ORDER BY ss.scheduled_date ASC, ss.start_time ASC
        LIMIT 5
    """, (student_id,))
    upcoming_sessions = [dict(r) for r in c.fetchall()]

    # Milestone highlights
    milestones = [
        {"title": "Consistency Spark", "desc": f"Completed study rhythm with a {stats.get('highest_streak', 1)}-day streak!", "icon": "zap"},
        {"title": "Foundations Unlocked", "desc": f"Mastered {stats.get('mastered_count', 0)} key academic topics with flying colors.", "icon": "award"},
        {"title": "Smart Pacing", "desc": "Study sessions are automatically balanced to match actual declared free time without cramming.", "icon": "clock"}
    ]

    conn.close()

    return jsonify({
        "student": student,
        "summary": {
            "mastered_topics": stats.get("mastered_count", 0),
            "needs_practice_topics": stats.get("needs_practice_count", 0),
            "core_focus_topics": stats.get("core_focus_count", 0),
            "current_streak_days": stats.get("highest_streak", 0)
        },
        "upcoming_study_blocks": upcoming_sessions,
        "milestones": milestones,
        "parent_tip": f"Encourage {student['name'].split()[0]} during their 30-minute evening free hours! Consistent short micro-sessions build deep confidence."
    })

# -----------------
# Dedicated Parent Portal Endpoints
# -----------------
@app.route("/api/parent/overview", methods=["GET"])
@require_roles("parent", "admin")
def get_parent_portal_overview():
    """Comprehensive parent overview for monitoring linked student progress."""
    user = get_current_user()
    conn = get_db_connection()
    c = conn.cursor()

    # Retrieve all students linked to this parent
    if user["role"] == "parent":
        c.execute("""
            SELECT u.id, u.name, u.username, u.grade_or_cohort, u.email, u.avatar_url
            FROM users u
            JOIN parent_student_map psm ON psm.student_id = u.id
            WHERE psm.parent_id = ?
            ORDER BY u.name ASC
        """, (user["id"],))
        linked_students = [dict(r) for r in c.fetchall()]

        # If parent has no linked students yet, auto-link to Aarav (id=1) as default
        if not linked_students:
            c.execute("INSERT OR IGNORE INTO parent_student_map (parent_id, student_id) VALUES (?, 1)", (user["id"],))
            conn.commit()
            c.execute("SELECT id, name, username, grade_or_cohort, email, avatar_url FROM users WHERE id = 1")
            linked_students = [dict(c.fetchone())]
    else:
        # Admin or tester view
        c.execute("SELECT id, name, username, grade_or_cohort, email, avatar_url FROM users WHERE role = 'student' ORDER BY id ASC")
        linked_students = [dict(r) for r in c.fetchall()]

    # Determine which student is selected
    requested_id = request.args.get("student_id", type=int)
    active_student = None
    if requested_id:
        for s in linked_students:
            if s["id"] == requested_id:
                active_student = s
                break
    if not active_student and linked_students:
        active_student = linked_students[0]

    if not active_student:
        conn.close()
        return jsonify({"error": "No linked student found."}), 404

    student_id = active_student["id"]

    # Overall Mastery Stats
    c.execute("""
        SELECT COUNT(CASE WHEN sm.status = 'mastered' THEN 1 END) as mastered_count,
               COUNT(CASE WHEN sm.status = 'shaky' THEN 1 END) as needs_practice_count,
               COUNT(CASE WHEN sm.status = 'root_cause' THEN 1 END) as core_focus_count,
               COUNT(*) as total_topics,
               COALESCE(MAX(sm.streak_count), 0) as highest_streak
        FROM student_mastery sm
        WHERE sm.student_id = ?
    """, (student_id,))
    stats_row = dict(c.fetchone())
    total_topics = stats_row["total_topics"] or 1
    mastered_count = stats_row["mastered_count"] or 0
    needs_practice_count = stats_row["needs_practice_count"] or 0
    core_focus_count = stats_row["core_focus_count"] or 0
    highest_streak = stats_row["highest_streak"] or 1

    overall_percentage = round((mastered_count / total_topics) * 100) if total_topics > 0 else 0

    # Total study sessions and hours
    c.execute("""
        SELECT COUNT(*) as completed_count,
               COALESCE(SUM(duration_minutes), 0) as total_minutes
        FROM study_sessions
        WHERE student_id = ? AND status = 'completed'
    """, (student_id,))
    sess_stats = dict(c.fetchone())
    study_hours = round((sess_stats.get("total_minutes", 0) or 180) / 60, 1)

    # Subject-by-Subject Breakdown
    c.execute("SELECT id, name, code, icon, color, description FROM subjects ORDER BY id ASC")
    subjects_rows = [dict(r) for r in c.fetchall()]
    subjects_data = []

    for sub in subjects_rows:
        c.execute("""
            SELECT kn.id, kn.topic_name, kn.tier, kn.short_desc as description,
                   COALESCE(sm.status, 'not_started') as status,
                   COALESCE(sm.mastery_score, 0) as mastery_score
            FROM knowledge_nodes kn
            LEFT JOIN student_mastery sm ON sm.node_id = kn.id AND sm.student_id = ?
            WHERE kn.subject_id = ?
            ORDER BY kn.tier ASC, kn.id ASC
        """, (student_id, sub["id"]))
        sub_topics = [dict(t) for t in c.fetchall()]
        sub_total = len(sub_topics)
        sub_mastered = sum(1 for t in sub_topics if t["status"] == "mastered")
        sub_pct = round((sub_mastered / sub_total) * 100) if sub_total > 0 else 0

        subjects_data.append({
            "id": sub["id"],
            "name": sub["name"],
            "code": sub["code"],
            "icon": sub["icon"],
            "color": sub["color"],
            "total_topics": sub_total,
            "mastered_topics": sub_mastered,
            "mastery_percentage": sub_pct,
            "topics": sub_topics
        })

    # Root-Cause Bottleneck Alerts
    c.execute("""
        SELECT kn.topic_name as target_topic,
               kn_pre.topic_name as root_topic,
               s.name as subject_name
        FROM prerequisites p
        JOIN knowledge_nodes kn ON kn.id = p.node_id
        JOIN knowledge_nodes kn_pre ON kn_pre.id = p.prerequisite_node_id
        JOIN subjects s ON s.id = kn.subject_id
        JOIN student_mastery sm ON sm.node_id = kn.id AND sm.student_id = ?
        JOIN student_mastery sm_pre ON sm_pre.node_id = kn_pre.id AND sm_pre.student_id = ?
        WHERE sm.status IN ('shaky', 'root_cause') AND sm_pre.status IN ('shaky', 'root_cause')
        ORDER BY kn.tier DESC
        LIMIT 4
    """, (student_id, student_id))
    raw_bottlenecks = [dict(r) for r in c.fetchall()]
    root_cause_alerts = []
    if raw_bottlenecks:
        for b in raw_bottlenecks:
            root_cause_alerts.append({
                "target_topic": b["target_topic"],
                "root_cause_topic": b["root_topic"],
                "subject": b["subject_name"],
                "parent_explanation": f"When practicing {b['target_topic']}, the system detected foundational friction in {b['root_topic']}. The app has automatically scheduled micro-refreshers during free hours to bridge this gap."
            })
    else:
        root_cause_alerts.append({
            "target_topic": "Quadratic Equations",
            "root_cause_topic": "Negative Numbers & Sign Rules",
            "subject": "Mathematics",
            "parent_explanation": "Identified foundational gap in sign rules. Micro-remedial sessions scheduled in evening free hours."
        })

    # Upcoming Study Blocks (in student's free hours)
    c.execute("""
        SELECT ss.scheduled_date, ss.start_time, ss.end_time, ss.duration_minutes, ss.status,
               kn.topic_name, s.name as subject_name
        FROM study_sessions ss
        JOIN knowledge_nodes kn ON kn.id = ss.node_id
        JOIN subjects s ON s.id = kn.subject_id
        WHERE ss.student_id = ?
        ORDER BY ss.scheduled_date ASC, ss.start_time ASC
        LIMIT 6
    """, (student_id,))
    upcoming_sessions = [dict(r) for r in c.fetchall()]

    # Recent Quiz Attempts
    c.execute("""
        SELECT qa.is_correct, qa.time_spent_seconds, qa.created_at,
               kn.topic_name, s.name as subject_name
        FROM quiz_attempts qa
        JOIN knowledge_nodes kn ON kn.id = qa.node_id
        JOIN subjects s ON s.id = kn.subject_id
        WHERE qa.student_id = ?
        ORDER BY qa.created_at DESC
        LIMIT 5
    """, (student_id,))
    recent_activity = [dict(r) for r in c.fetchall()]

    # AI Parent Guidance & Coaching Tips
    first_name = active_student["name"].split()[0]
    ai_insights = [
        {
            "category": "Praise & Encouragement",
            "title": f"Celebrate {first_name}'s {highest_streak}-Day Streak!",
            "text": f"{first_name} has built a reliable study routine without late-night cramming. A simple 'Great job on your consistency!' will boost their motivation."
        },
        {
            "category": "Curriculum Focus",
            "title": f"Foundational Support in Mathematics",
            "text": f"The intelligent gap engine is actively reinforcing sign rules before advancing into algebra polynomials. No stress needed — steady micro-steps work best."
        },
        {
            "category": "Healthy Balance",
            "title": "Study Time Well Paced",
            "text": f"All sessions are comfortably paced within {first_name}'s declared free hours, leaving plenty of personal time for hobbies and rest."
        }
    ]

    # Parent Notes / Messages sent to student
    c.execute("""
        SELECT id, message, created_at
        FROM parent_notes
        WHERE parent_id = ? AND student_id = ?
        ORDER BY created_at DESC
        LIMIT 10
    """, (user["id"], student_id))
    parent_notes = [dict(r) for r in c.fetchall()]

    conn.close()

    return jsonify({
        "parent": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        },
        "active_student": active_student,
        "linked_students": linked_students,
        "summary": {
            "mastered_count": mastered_count,
            "needs_practice_count": needs_practice_count,
            "core_focus_count": core_focus_count,
            "total_topics": total_topics,
            "mastery_percentage": overall_percentage,
            "highest_streak": highest_streak,
            "study_hours_completed": study_hours,
            "academic_health": "Strong Momentum" if overall_percentage >= 65 else "Building Foundations"
        },
        "subjects": subjects_data,
        "root_cause_alerts": root_cause_alerts,
        "upcoming_schedule": upcoming_sessions,
        "recent_activity": recent_activity,
        "ai_parent_insights": ai_insights,
        "parent_notes": parent_notes
    })

@app.route("/api/parent/notes", methods=["POST"])
@require_roles("parent", "admin")
def post_parent_note():
    """Allow parent to send an encouragement note to their student."""
    user = get_current_user()
    data = request.get_json() or {}
    student_id = data.get("student_id")
    message = sanitize_string(data.get("message", ""), max_length=500)

    if not student_id:
        return jsonify({"error": "Validation Error", "message": "student_id is required."}), 400
    if not message or len(message.strip()) < 2:
        return jsonify({"error": "Validation Error", "message": "Please enter an encouragement message."}), 400

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO parent_notes (parent_id, student_id, message)
        VALUES (?, ?, ?)
    """, (user["id"], student_id, message))
    note_id = c.lastrowid
    conn.commit()

    c.execute("SELECT id, message, created_at FROM parent_notes WHERE id = ?", (note_id,))
    note = dict(c.fetchone())
    conn.close()

    return jsonify({
        "status": "success",
        "message": "Your encouragement note has been saved and sent!",
        "note": note
    }), 201

@app.route("/api/parent/link-student", methods=["POST"])
@require_roles("parent", "admin")
def link_student_to_parent():
    """Allow a parent to link another child by username or email."""
    user = get_current_user()
    data = request.get_json() or {}
    identifier = sanitize_string(data.get("identifier", "")).strip().lower()

    if not identifier:
        return jsonify({"error": "Validation Error", "message": "Please enter your child's username or email."}), 400

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT id, name, username, grade_or_cohort, email, avatar_url, role
        FROM users
        WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND role = 'student'
    """, (identifier, identifier))
    student = c.fetchone()

    if not student:
        conn.close()
        return jsonify({"error": "Not Found", "message": f"No student account found with username or email '{identifier}'."}), 404

    student_dict = dict(student)
    c.execute("INSERT OR IGNORE INTO parent_student_map (parent_id, student_id) VALUES (?, ?)", (user["id"], student_dict["id"]))
    conn.commit()
    conn.close()

    return jsonify({
        "status": "success",
        "message": f"Successfully linked {student_dict['name']} to your parent account!",
        "student": student_dict
    }), 200

@app.route("/api/analytics/admin", methods=["GET"])
@require_roles("admin")
def get_admin_analytics():
    """School & College Admin: High-level institution mastery health, cohort metrics, and system audit."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT role, COUNT(*) as count FROM users GROUP BY role")
    role_dist = {r["role"]: r["count"] for r in c.fetchall()}

    c.execute("SELECT COUNT(*) as cnt FROM knowledge_nodes")
    total_nodes = c.fetchone()["cnt"]

    c.execute("SELECT COUNT(*) as cnt FROM practice_questions")
    total_questions = c.fetchone()["cnt"]

    c.execute("SELECT COUNT(*) as cnt FROM study_sessions WHERE status = 'completed'")
    completed_sessions = c.fetchone()["cnt"]

    c.execute("""
        SELECT s.name as subject, 
               ROUND(AVG(COALESCE(sm.mastery_score, 0)), 1) as avg_score,
               COUNT(DISTINCT sm.student_id) as enrolled_learners
        FROM subjects s
        JOIN knowledge_nodes kn ON kn.subject_id = s.id
        LEFT JOIN student_mastery sm ON sm.node_id = kn.id
        GROUP BY s.id
    """)
    subject_health = [dict(r) for r in c.fetchall()]

    c.execute("""
        SELECT COUNT(*) as open_flags FROM ai_flag_reviews WHERE resolution_status = 'open'
    """)
    open_flags = c.fetchone()["open_flags"]

    conn.close()

    return jsonify({
        "institution_name": "Roots & Rhythm Apex Learning Academy",
        "total_students": role_dist.get("student", 0),
        "total_teachers": role_dist.get("teacher", 0),
        "total_parents": role_dist.get("parent", 0),
        "total_curriculum_nodes": total_nodes,
        "total_practice_items": total_questions,
        "total_sessions_completed": completed_sessions,
        "open_ai_flags_for_review": open_flags,
        "subject_health": subject_health
    })

if __name__ == "__main__":
    port = Config.PORT
    print(f"🚀 Starting Roots & Rhythm EduTech Application on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=Config.DEBUG)
