"""Roots & Rhythm - Full-Stack EduTech Application.
Domain 2: Smart, Inclusive & Personalized Education.
Features Prerequisite Gap Finder, Free-Hour Study Planner, Safe AI Guardrails, and Strict Multi-Role RBAC.
"""

import os
import json
from functools import wraps
from flask import Flask, request, jsonify, render_template, session
from config import Config
from database import init_db, get_db_connection
from services.validator import (
    ValidationError,
    validate_free_hour_slot_payload,
    validate_quiz_submission_payload,
    validate_ai_flag_payload,
    validate_session_status_update_payload
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
    return render_template("index.html", current_user=user)

# -----------------
# 2. Auth & Role Switcher Endpoints
# -----------------
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
    return jsonify({"user": get_current_user()})

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
    difficulty = request.args.get("difficulty", "intermediate")
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
