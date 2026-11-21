"""Free-Hour Study Planner & Automatic Rebalancer Engine.
Schedules personalized micro-study sessions strictly inside the student's declared free-hour windows,
supports one-tap completion, dynamic rescheduling, and smart rebalancing of skipped sessions.
"""

from datetime import datetime, date, timedelta
from database import get_db_connection

class StudyPlanner:
    @staticmethod
    def get_student_free_slots(student_id):
        """Retrieve all active free-hour time windows declared by the student."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, student_id, day_of_week, start_time, end_time, label, is_active
            FROM free_hour_slots
            WHERE student_id = ? AND is_active = 1
            ORDER BY day_of_week ASC, start_time ASC
        """, (student_id,))
        slots = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return slots

    @staticmethod
    def add_free_slot(student_id, slot_data):
        """Add a new declared free-hour slot for the student."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO free_hour_slots (student_id, day_of_week, start_time, end_time, label, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            student_id,
            slot_data["day_of_week"],
            slot_data["start_time"],
            slot_data["end_time"],
            slot_data["label"],
            slot_data.get("is_active", 1)
        ))
        slot_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return slot_id

    @staticmethod
    def delete_free_slot(student_id, slot_id):
        """Remove a declared free slot."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM free_hour_slots WHERE id = ? AND student_id = ?", (slot_id, student_id))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0

    @staticmethod
    def get_scheduled_sessions(student_id, start_date=None, end_date=None):
        """Retrieve study sessions for a student with associated knowledge node and slot details."""
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT ss.*, 
                   kn.topic_name, kn.category, kn.tier, kn.estimated_minutes,
                   s.name AS subject_name, s.color AS subject_color,
                   fhs.label AS slot_label
            FROM study_sessions ss
            JOIN knowledge_nodes kn ON kn.id = ss.node_id
            JOIN subjects s ON s.id = kn.subject_id
            LEFT JOIN free_hour_slots fhs ON fhs.id = ss.slot_id
            WHERE ss.student_id = ?
        """
        params = [student_id]

        if start_date:
            query += " AND ss.scheduled_date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND ss.scheduled_date <= ?"
            params.append(end_date)

        query += " ORDER BY ss.scheduled_date ASC, ss.start_time ASC"

        cursor.execute(query, params)
        sessions = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return sessions

    @staticmethod
    def auto_schedule_sessions(student_id, prescribed_node_ids=None):
        """
        Automatically schedule micro-study sessions targeting root-cause gaps strictly
        inside declared free-hour windows across the upcoming 7-14 days.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Fetch free slots
        cursor.execute("""
            SELECT id, day_of_week, start_time, end_time, label
            FROM free_hour_slots
            WHERE student_id = ? AND is_active = 1
            ORDER BY day_of_week ASC, start_time ASC
        """, (student_id,))
        free_slots = [dict(r) for r in cursor.fetchall()]

        if not free_slots:
            conn.close()
            return {"error": "No free-hour slots declared. Please add at least one free time slot first."}

        # 2. Determine target nodes (root-causes and shaky nodes)
        if prescribed_node_ids:
            placeholders = ",".join("?" * len(prescribed_node_ids))
            cursor.execute(f"""
                SELECT kn.id, kn.topic_name, kn.estimated_minutes, kn.tier,
                       COALESCE(sm.status, 'root_cause') as status,
                       COALESCE(sm.mastery_score, 0) as score
                FROM knowledge_nodes kn
                LEFT JOIN student_mastery sm ON sm.node_id = kn.id AND sm.student_id = ?
                WHERE kn.id IN ({placeholders})
                ORDER BY (CASE WHEN COALESCE(sm.status, '') = 'root_cause' THEN 1 WHEN COALESCE(sm.status, '') = 'shaky' THEN 2 ELSE 3 END),
                         kn.tier ASC
            """, [student_id] + prescribed_node_ids)
        else:
            # Pick all root causes and shaky topics
            cursor.execute("""
                SELECT kn.id, kn.topic_name, kn.estimated_minutes, kn.tier, sm.status, sm.mastery_score as score
                FROM student_mastery sm
                JOIN knowledge_nodes kn ON kn.id = sm.node_id
                WHERE sm.student_id = ? AND sm.status IN ('root_cause', 'shaky')
                ORDER BY (CASE WHEN sm.status = 'root_cause' THEN 1 ELSE 2 END), kn.tier ASC
            """, (student_id,))

        target_nodes = [dict(r) for r in cursor.fetchall()]
        if not target_nodes:
            # Fallback to any node with lowest mastery
            cursor.execute("""
                SELECT kn.id, kn.topic_name, kn.estimated_minutes, kn.tier, 'root_cause' as status, 40 as score
                FROM knowledge_nodes kn
                LIMIT 3
            """)
            target_nodes = [dict(r) for r in cursor.fetchall()]

        # 3. Build upcoming available candidate time windows (next 14 days)
        today = date.today()
        candidate_windows = []
        for day_offset in range(14):
            candidate_date = today + timedelta(days=day_offset)
            dow = candidate_date.weekday() # 0 = Monday, 6 = Sunday
            matching_slots = [s for s in free_slots if s["day_of_week"] == dow]
            for slot in matching_slots:
                candidate_windows.append({
                    "date": candidate_date.isoformat(),
                    "slot_id": slot["id"],
                    "start_time": slot["start_time"],
                    "end_time": slot["end_time"],
                    "label": slot["label"]
                })

        # 4. Check existing scheduled sessions to avoid double booking
        cursor.execute("""
            SELECT scheduled_date, start_time, end_time
            FROM study_sessions
            WHERE student_id = ? AND status = 'scheduled' AND scheduled_date >= ?
        """, (student_id, today.isoformat()))
        booked_times = {(r["scheduled_date"], r["start_time"]) for r in cursor.fetchall()}

        # 5. Pack micro-sessions into free windows
        created_count = 0
        node_idx = 0
        for window in candidate_windows:
            if node_idx >= len(target_nodes):
                break

            key = (window["date"], window["start_time"])
            if key in booked_times:
                continue

            node = target_nodes[node_idx]
            duration = min(30, max(15, node["estimated_minutes"]))
            priority = "high" if node["status"] == "root_cause" else "medium"
            notes = f"Targeted micro-session for foundational gap: {node['topic_name']}"

            cursor.execute("""
                INSERT INTO study_sessions (student_id, node_id, slot_id, scheduled_date, start_time, end_time, duration_minutes, status, priority, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
            """, (
                student_id,
                node["id"],
                window["slot_id"],
                window["date"],
                window["start_time"],
                window["end_time"],
                duration,
                priority,
                notes
            ))
            booked_times.add(key)
            created_count += 1
            node_idx += 1

        conn.commit()
        conn.close()

        return {
            "status": "success",
            "scheduled_sessions_count": created_count,
            "message": f"Successfully mapped {created_count} micro-study sessions into your declared free hours!"
        }

    @staticmethod
    def complete_session(student_id, session_id):
        """
        One-tap session completion.
        Marks session completed, increases student mastery score, updates streak.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM study_sessions
            WHERE id = ? AND student_id = ?
        """, (session_id, student_id))
        session = cursor.fetchone()
        if not session:
            conn.close()
            return {"error": "Session not found"}

        node_id = session["node_id"]

        # 1. Update session status
        cursor.execute("""
            UPDATE study_sessions
            SET status = 'completed'
            WHERE id = ?
        """, (session_id,))

        # 2. Update student mastery for this node
        cursor.execute("""
            SELECT * FROM student_mastery
            WHERE student_id = ? AND node_id = ?
        """, (student_id, node_id))
        mastery = cursor.fetchone()

        now_str = datetime.now().isoformat()
        if mastery:
            old_score = mastery["mastery_score"]
            new_score = min(100, old_score + 15) # Boost mastery on session completion
            new_streak = mastery["streak_count"] + 1
            new_status = "mastered" if new_score >= 75 else ("shaky" if new_score >= 50 else "root_cause")

            cursor.execute("""
                UPDATE student_mastery
                SET mastery_score = ?, status = ?, streak_count = ?, last_tested_at = ?
                WHERE id = ?
            """, (new_score, new_status, new_streak, now_str, mastery["id"]))
        else:
            new_score = 65
            new_status = "shaky"
            cursor.execute("""
                INSERT INTO student_mastery (student_id, node_id, status, mastery_score, streak_count, last_tested_at)
                VALUES (?, ?, ?, ?, 1, ?)
            """, (student_id, node_id, new_status, new_score, now_str))

        conn.commit()
        conn.close()

        return {
            "status": "success",
            "session_id": session_id,
            "new_mastery_score": new_score,
            "new_mastery_status": new_status,
            "message": f"Session marked complete! Mastery improved to {new_score}%."
        }

    @staticmethod
    def reschedule_session(student_id, session_id, new_date=None, new_start_time=None):
        """One-tap reschedule to another date or the next available free slot."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM study_sessions WHERE id = ? AND student_id = ?", (session_id, student_id))
        session = cursor.fetchone()
        if not session:
            conn.close()
            return {"error": "Session not found"}

        if new_date and new_start_time:
            cursor.execute("""
                UPDATE study_sessions
                SET scheduled_date = ?, start_time = ?, status = 'scheduled'
                WHERE id = ?
            """, (new_date, new_start_time, session_id))
        else:
            # Shift forward by 1 or 2 days to next slot
            curr_date = datetime.strptime(session["scheduled_date"], "%Y-%m-%d").date()
            bumped_date = (curr_date + timedelta(days=1)).isoformat()
            cursor.execute("""
                UPDATE study_sessions
                SET scheduled_date = ?, status = 'scheduled'
                WHERE id = ?
            """, (bumped_date, session_id))

        conn.commit()
        conn.close()
        return {"status": "success", "message": "Session rescheduled smoothly."}

    @staticmethod
    def auto_rebalance_schedule(student_id):
        """
        Automatic Rebalancing Engine:
        Detects skipped or overdue uncompleted sessions and reallocates them into
        upcoming declared free-hour windows without double booking.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        today_str = date.today().isoformat()

        # 1. Find all sessions that are either marked 'skipped' OR are 'scheduled' in the past (overdue)
        cursor.execute("""
            SELECT id, node_id, priority, duration_minutes
            FROM study_sessions
            WHERE student_id = ? AND (status = 'skipped' OR (status = 'scheduled' AND scheduled_date < ?))
            ORDER BY (CASE WHEN priority = 'high' THEN 1 ELSE 2 END), id ASC
        """, (student_id, today_str))
        unresolved_sessions = [dict(r) for r in cursor.fetchall()]

        if not unresolved_sessions:
            conn.close()
            return {"status": "balanced", "rebalanced_count": 0, "message": "Your rhythm is on track! No overdue or skipped sessions to rebalance."}

        # 2. Fetch active free slots
        cursor.execute("""
            SELECT id, day_of_week, start_time, end_time, label
            FROM free_hour_slots
            WHERE student_id = ? AND is_active = 1
            ORDER BY day_of_week ASC, start_time ASC
        """, (student_id,))
        free_slots = [dict(r) for r in cursor.fetchall()]

        if not free_slots:
            conn.close()
            return {"error": "No active free slots found to rebalance into."}

        # 3. Find already booked future slots
        cursor.execute("""
            SELECT scheduled_date, start_time
            FROM study_sessions
            WHERE student_id = ? AND status = 'scheduled' AND scheduled_date >= ?
        """, (student_id, today_str))
        booked_times = {(r["scheduled_date"], r["start_time"]) for r in cursor.fetchall()}

        # 4. Generate candidate future slots over the next 10 days
        today = date.today()
        candidate_slots = []
        for d in range(1, 14):
            day_candidate = today + timedelta(days=d)
            dow = day_candidate.weekday()
            for s in free_slots:
                if s["day_of_week"] == dow:
                    candidate_slots.append({
                        "date": day_candidate.isoformat(),
                        "slot_id": s["id"],
                        "start_time": s["start_time"],
                        "end_time": s["end_time"]
                    })

        # 5. Move unresolved sessions into first available free future windows
        rebalanced_count = 0
        candidate_idx = 0
        for sess in unresolved_sessions:
            assigned = False
            while candidate_idx < len(candidate_slots):
                slot_candidate = candidate_slots[candidate_idx]
                candidate_idx += 1
                key = (slot_candidate["date"], slot_candidate["start_time"])
                if key not in booked_times:
                    # Assign here
                    cursor.execute("""
                        UPDATE study_sessions
                        SET scheduled_date = ?, start_time = ?, end_time = ?, slot_id = ?, status = 'rescheduled',
                            notes = 'Auto-rebalanced to catch up smoothly without stress.'
                        WHERE id = ?
                    """, (
                        slot_candidate["date"],
                        slot_candidate["start_time"],
                        slot_candidate["end_time"],
                        slot_candidate["slot_id"],
                        sess["id"]
                    ))
                    booked_times.add(key)
                    rebalanced_count += 1
                    assigned = True
                    break

        conn.commit()
        conn.close()

        return {
            "status": "success",
            "rebalanced_count": rebalanced_count,
            "message": f"Successfully rebalanced {rebalanced_count} study sessions into your next available free hours!"
        }
