"""Comprehensive test suite for Roots & Rhythm EduTech Application.
Tests Prerequisite Gap Finder, Free-Hour Study Planner & Rebalancing,
Safe AI Guardrails & Review Flags, Input Validation, and Strict Multi-Role RBAC.
"""

import unittest
import json
import os
import sys

# Ensure root directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from database import init_db

class RootsAndRhythmTestCase(unittest.TestCase):
    def setUp(self):
        """Set up test client and ensure clean database state."""
        app.config["TESTING"] = True
        app.config["SECRET_KEY"] = "test-secret-key-12345"
        self.client = app.test_client()
        init_db(force_reseed=True)

    def test_01_public_index(self):
        """Verify the main mobile-first web interface serves correctly."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Roots & Rhythm", res.data)

    def test_02_rbac_student_forbidden_from_teacher_admin(self):
        """Verify strict server-side RBAC: Student cannot access teacher/admin dashboards."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1 # Aarav Sharma (Student)

        # Attempt to access teacher analytics
        res = self.client.get("/api/analytics/teacher")
        self.assertEqual(res.status_code, 403)
        data = json.loads(res.data)
        self.assertIn("Forbidden", data.get("error", ""))

        # Attempt to access admin analytics
        res = self.client.get("/api/analytics/admin")
        self.assertEqual(res.status_code, 403)

    def test_03_rbac_teacher_access(self):
        """Verify teacher can access class heatmap and gap alerts."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 4 # Meera Patel (Teacher)

        res = self.client.get("/api/analytics/teacher")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("topic_heatmap", data)
        self.assertIn("gap_alerts", data)
        self.assertIn("interventions", data)

    def test_04_rbac_parent_access(self):
        """Verify parent can access their child's summary in jargon-free format."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 5 # Rajesh Sharma (Parent of Aarav, id=1)

        res = self.client.get("/api/analytics/parent/1")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["student"]["name"], "Aarav Sharma")
        self.assertIn("milestones", data)
        self.assertIn("parent_tip", data)

        # Attempt to access unauthorized student (id=2)
        res_unauth = self.client.get("/api/analytics/parent/2")
        self.assertEqual(res_unauth.status_code, 403)

    def test_05_prerequisite_gap_finder_tracing(self):
        """Verify root-cause backward tracing from Quadratic Equations to Factoring & Sign Rules."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1 # Student

        # Topic 6 is Quadratic Equations
        res = self.client.get("/api/gap-finder/trace?student_id=1&topic_id=6")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        self.assertEqual(data["target_topic"]["id"], 6)
        node_names = [n["topic_name"] for n in data["nodes"]]
        # Must include prerequisites: Factoring Polynomials and Negative Numbers / Arithmetic
        self.assertTrue(any("Factoring" in name for name in node_names))
        self.assertTrue(any("Negative Numbers" in name for name in node_names))

        # Check root causes identified
        root_causes = [rc["topic_name"] for rc in data["root_causes"]]
        self.assertTrue(len(root_causes) > 0)

        # Check prescribed path is ordered
        prescribed = data["prescribed_path"]
        self.assertTrue(len(prescribed) >= 2)
        # Tier 1 foundational root cause must precede Tier 2 or 3
        tiers = [p["tier"] for p in prescribed]
        self.assertEqual(tiers, sorted(tiers))

    def test_06_free_hour_slot_validation_and_creation(self):
        """Verify strict schema validation for free-hour slot creation."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1 # Student

        # 1. Invalid time format
        res = self.client.post("/api/planner/slots", json={
            "day_of_week": 1,
            "start_time": "25:00",
            "end_time": "18:00"
        })
        self.assertEqual(res.status_code, 400)

        # 2. End time before start time
        res = self.client.post("/api/planner/slots", json={
            "day_of_week": 1,
            "start_time": "18:00",
            "end_time": "17:00"
        })
        self.assertEqual(res.status_code, 400)

        # 3. Valid slot
        res = self.client.post("/api/planner/slots", json={
            "day_of_week": 3,
            "start_time": "06:00",
            "end_time": "07:00",
            "label": "Thursday Dawn Focus"
        })
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertIn("slot_id", data)

    def test_07_planner_auto_schedule_and_complete(self):
        """Verify scheduling micro-sessions inside declared free hours, and one-tap completion."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1 # Student

        # Auto schedule targeting gap nodes 2 and 5
        res = self.client.post("/api/planner/auto-schedule", json={"node_ids": [2, 5]})
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")

        # Fetch sessions
        res_sess = self.client.get("/api/planner/sessions?student_id=1")
        self.assertEqual(res_sess.status_code, 200)
        sessions = json.loads(res_sess.data)["sessions"]
        self.assertTrue(len(sessions) > 0)

        first_sess_id = sessions[0]["id"]

        # One-tap completion
        res_comp = self.client.post(f"/api/planner/sessions/{first_sess_id}/complete")
        self.assertEqual(res_comp.status_code, 200)
        comp_data = json.loads(res_comp.data)
        self.assertEqual(comp_data["status"], "success")
        self.assertGreaterEqual(comp_data["new_mastery_score"], 20)

    def test_08_planner_auto_rebalance(self):
        """Verify automatic rebalancing shifts missed or overdue sessions into future free slots."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1 # Student

        res = self.client.post("/api/planner/rebalance")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn(data["status"], ("success", "balanced"))

    def test_09_practice_submit_and_ai_flag_workflow(self):
        """Verify practice question evaluation, confidence score, and review/flag workflow."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1 # Student

        # 1. Fetch practice question
        res_q = self.client.get("/api/practice/question?node_id=2&difficulty=beginner")
        self.assertEqual(res_q.status_code, 200)
        q = json.loads(res_q.data)["question"]
        qid = q["id"]
        correct_opt = q["correct_option_index"]

        # 2. Submit correct answer
        res_sub = self.client.post("/api/practice/submit", json={
            "question_id": qid,
            "selected_option": correct_opt,
            "time_spent_seconds": 25
        })
        self.assertEqual(res_sub.status_code, 200)
        sub_data = json.loads(res_sub.data)
        self.assertTrue(sub_data["is_correct"])
        self.assertIn("step_by_step_explanation", sub_data)

        # 3. Flag an answer for review
        res_flag = self.client.post("/api/ai/flag", json={
            "question_id": qid,
            "reason": "Step 2 explanation could include a visual number line example.",
            "suggested_edit": "Mention that moving right on the number line adds positive value."
        })
        self.assertEqual(res_flag.status_code, 201)
        flag_id = json.loads(res_flag.data)["flag_id"]

        # 4. Teacher reviews and resolves the flag
        with self.client.session_transaction() as sess:
            sess["user_id"] = 4 # Teacher

        res_list = self.client.get("/api/ai/flags")
        self.assertEqual(res_list.status_code, 200)
        flags = json.loads(res_list.data)["flags"]
        self.assertTrue(any(f["id"] == flag_id for f in flags))

        res_resolve = self.client.post(f"/api/ai/flags/{flag_id}/resolve", json={
            "resolution_status": "resolved",
            "reviewer_notes": "Reviewed and incorporated by Prof. Meera Patel."
        })
        self.assertEqual(res_resolve.status_code, 200)

    def test_10_admin_institutional_analytics(self):
        """Verify Admin can access institutional metrics, subject health, and student counts."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 6 # Admin (Dr. Arvind Swaminathan)

        res = self.client.get("/api/analytics/admin")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("institution_name", data)
        self.assertGreaterEqual(data["total_students"], 1)
        self.assertGreaterEqual(data["total_curriculum_nodes"], 10)
        self.assertIn("subject_health", data)

    def test_11_diagnostic_quiz_endpoint(self):
        """Verify quick diagnostic test endpoint returns balanced questions."""
        res = self.client.get("/api/gap-finder/diagnostic?subject_id=1")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("questions", data)
        self.assertTrue(len(data["questions"]) > 0)
        q = data["questions"][0]
        self.assertIn("question_text", q)
        self.assertIn("options", q)

    def test_12_validation_bounds_and_sanitization(self):
        """Verify strict error boundary handling on malicious or malformed payloads."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1 # Student

        # 1. Negative time spent or out-of-bounds option index
        res = self.client.post("/api/practice/submit", json={
            "question_id": 1,
            "selected_option": 99, # Out of bounds
            "time_spent_seconds": -10
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("out of bounds", json.loads(res.data)["message"])

        # 2. Flag reason too short
        res_flag = self.client.post("/api/ai/flag", json={
            "question_id": 1,
            "reason": "bad" # < 5 chars
        })
        self.assertEqual(res_flag.status_code, 400)
        self.assertIn("at least 5 characters", json.loads(res_flag.data)["message"])

    def test_13_ai_learning_assistant_modes_and_languages(self):
        """Verify AI Learning Assistant answers doubts in Step-by-Step, Balanced, and Fast-Track modes across languages."""
        # 1. English Step-by-Step
        res = self.client.post("/api/ai/ask", json={
            "question": "Why do two negatives make a positive?",
            "topic": "Negative Numbers",
            "learning_mode": "step-by-step",
            "language": "en"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("Step-by-Step", data["response_text"])
        self.assertIn("confidence_score", data)

        # 2. Hindi Balanced mode
        res_hi = self.client.post("/api/ai/ask", json={
            "question": "द्विघात समीकरण कैसे हल करें?",
            "topic": "Quadratic Equations",
            "learning_mode": "balanced",
            "language": "hi"
        })
        self.assertEqual(res_hi.status_code, 200)
        data_hi = json.loads(res_hi.data)
        self.assertIn("द्विघात", data_hi["response_text"])

        # 3. Kannada Fast-Track mode
        res_kn = self.client.post("/api/ai/ask", json={
            "question": "ವರ್ಗ ಸಮೀಕರಣ ಸೂತ್ರ ಯಾವುದು?",
            "topic": "Quadratic Equations",
            "learning_mode": "fast-track",
            "language": "kn"
        })
        self.assertEqual(res_kn.status_code, 200)
        data_kn = json.loads(res_kn.data)
        self.assertIn("Fast-Track", data_kn["response_text"])

    def test_14_main_dashboard_overview_10_features(self):
        """Verify the main dashboard returns all 10 core feature datasets."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1 # Student Aarav

        res = self.client.get("/api/dashboard/overview")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        # 1. Welcome & Student Profile
        self.assertIn("student", data)
        self.assertEqual(data["student"]["name"], "Aarav Sharma")

        # 2. Overall Learning Progress
        self.assertIn("overall_progress", data)
        self.assertIn("completion_pct", data["overall_progress"])

        # 3. Quiz Performance
        self.assertIn("quiz_performance", data)
        self.assertIn("accuracy_pct", data["quiz_performance"])

        # 4. Learning Streak
        self.assertIn("learning_streak", data)
        self.assertGreaterEqual(data["learning_streak"]["streak_days"], 1)

        # 5. Subject Overview
        self.assertIn("subjects", data)
        self.assertTrue(len(data["subjects"]) >= 2)

        # 6. Weak Topics
        self.assertIn("weak_topics", data)
        self.assertTrue(len(data["weak_topics"]) >= 1)

        # 7. AI Learning Insights
        self.assertIn("ai_insights", data)
        self.assertIn("recommended_duration", data["ai_insights"])

        # 8. Today's Study Sessions
        self.assertIn("today_sessions", data)

        # 9. Performance Analytics
        self.assertIn("performance_analytics", data)

        # 10. Quick Actions
        self.assertIn("quick_actions", data)
        self.assertEqual(len(data["quick_actions"]), 4)

    def test_15_dashboard_privacy_check(self):
        """Verify privacy: student cannot access another student's dashboard."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1 # Student Aarav

        # Attempt to access student 2's dashboard
        res = self.client.get("/api/dashboard/overview?student_id=2")
        self.assertEqual(res.status_code, 403)
        data = json.loads(res.data)
        self.assertIn("Access Denied", data.get("error", ""))

    def test_16_login_and_welcome_pages_served(self):
        """Verify login/register and welcome pages render correctly."""
        res_login = self.client.get("/login")
        self.assertEqual(res_login.status_code, 200)
        self.assertIn(b"Sign In", res_login.data)
        self.assertIn(b"Create Account", res_login.data)

        res_welcome = self.client.get("/welcome")
        self.assertEqual(res_welcome.status_code, 200)
        self.assertIn(b"Welcome to Roots & Rhythm", res_welcome.data)

    def test_17_user_registration(self):
        """Verify new user registration with password hashing and database persistence."""
        payload = {
            "name": "Priya Nair",
            "username": "priya_nair",
            "email": "priya@rootsrhythm.edu",
            "password": "securepassword123",
            "role": "student",
            "grade_or_cohort": "Grade 10-A",
            "language_preference": "kn"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["user"]["username"], "priya_nair")
        self.assertEqual(data["user"]["role"], "student")

        # Duplicate username attempt should fail
        dup_res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(dup_res.status_code, 400)
        dup_data = json.loads(dup_res.data)
        self.assertIn("already taken", dup_data.get("message", ""))

    def test_18_user_login_valid_and_invalid(self):
        """Verify login authentication with username and password."""
        # 1. Invalid login attempt
        bad_res = self.client.post("/api/auth/login", json={
            "username": "aarav",
            "password": "wrongpassword"
        })
        self.assertEqual(bad_res.status_code, 401)

        # 2. Valid login attempt
        good_res = self.client.post("/api/auth/login", json={
            "username": "aarav",
            "password": "password123"
        })
        self.assertEqual(good_res.status_code, 200)
        data = json.loads(good_res.data)
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["redirect"], "/welcome")
        self.assertEqual(data["user"]["name"], "Aarav Sharma")

    def test_19_logout_clears_session(self):
        """Verify logout endpoint clears user session and redirects to /login."""
        with self.client.session_transaction() as sess:
            sess["user_id"] = 1

        res = self.client.get("/logout")
        self.assertEqual(res.status_code, 302)
        self.assertIn("/login", res.headers.get("Location", ""))

if __name__ == "__main__":
    unittest.main()
