"""Prerequisite Gap Finder (Root-Cause Tracer) Engine.
Traces student struggles backward through the curriculum dependency graph to pinpoint
the foundational root causes, generates visual node-map graphs, and prescribes ordered remediation paths.
"""

from collections import deque
from database import get_db_connection

class GapFinder:
    @staticmethod
    def get_all_subjects():
        """Retrieve all curriculum subjects."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM subjects ORDER BY id ASC")
        subjects = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return subjects

    @staticmethod
    def get_subject_topics(subject_id):
        """Retrieve all knowledge nodes for a given subject."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, subject_id, topic_name, slug, category, tier, short_desc, estimated_minutes
            FROM knowledge_nodes
            WHERE subject_id = ?
            ORDER BY tier ASC, id ASC
        """, (subject_id,))
        nodes = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return nodes

    @staticmethod
    def trace_root_causes(student_id, target_node_id):
        """
        Trace weak topics backward to their underlying prerequisite root causes.
        Uses reverse BFS traversal on the prerequisites table.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Fetch target node
        cursor.execute("SELECT * FROM knowledge_nodes WHERE id = ?", (target_node_id,))
        target_row = cursor.fetchone()
        if not target_row:
            conn.close()
            return None
        target_node = dict(target_row)

        # 2. Traverse backward using Breadth-First Search
        visited_nodes = {target_node_id}
        queue = deque([target_node_id])
        all_edges = []
        node_ids_in_graph = {target_node_id}

        while queue:
            curr_id = queue.popleft()
            # Find prerequisites of curr_id (prerequisite_node_id -> curr_id)
            cursor.execute("""
                SELECT p.prerequisite_node_id, p.dependency_weight, p.description,
                       kn.topic_name, kn.tier, kn.category
                FROM prerequisites p
                JOIN knowledge_nodes kn ON kn.id = p.prerequisite_node_id
                WHERE p.node_id = ?
            """, (curr_id,))
            
            for row in cursor.fetchall():
                prereq_id = row["prerequisite_node_id"]
                all_edges.append({
                    "from": prereq_id,
                    "to": curr_id,
                    "weight": row["dependency_weight"],
                    "description": row["description"]
                })
                node_ids_in_graph.add(prereq_id)
                if prereq_id not in visited_nodes:
                    visited_nodes.add(prereq_id)
                    queue.append(prereq_id)

        # 3. Fetch details for all nodes in the discovered subgraph
        placeholders = ",".join("?" * len(node_ids_in_graph))
        cursor.execute(f"""
            SELECT kn.*, 
                   COALESCE(sm.status, 'not_started') AS student_status,
                   COALESCE(sm.mastery_score, 0) AS student_score,
                   COALESCE(sm.streak_count, 0) AS streak_count
            FROM knowledge_nodes kn
            LEFT JOIN student_mastery sm ON sm.node_id = kn.id AND sm.student_id = ?
            WHERE kn.id IN ({placeholders})
        """, [student_id] + list(node_ids_in_graph))

        nodes_by_id = {}
        for r in cursor.fetchall():
            d = dict(r)
            nodes_by_id[d["id"]] = d

        conn.close()

        # 4. Diagnose root causes vs shaky vs mastered
        root_causes = []
        shaky_nodes = []
        mastered_nodes = []
        nodes_result = []

        for nid in node_ids_in_graph:
            node = nodes_by_id[nid]
            score = node["student_score"]
            is_target = (nid == target_node_id)
            
            # Determine diagnostic node classification
            if is_target:
                status_class = "target"
            elif score < 50 or node["student_status"] == "root_cause":
                status_class = "root_cause"
                root_causes.append(node)
            elif score < 75 or node["student_status"] == "shaky":
                status_class = "shaky"
                shaky_nodes.append(node)
            else:
                status_class = "mastered"
                mastered_nodes.append(node)

            nodes_result.append({
                "id": node["id"],
                "subject_id": node["subject_id"],
                "topic_name": node["topic_name"],
                "slug": node["slug"],
                "category": node["category"],
                "tier": node["tier"],
                "short_desc": node["short_desc"],
                "explanation_markdown": node["explanation_markdown"],
                "key_formulae": node.get("key_formulae", ""),
                "estimated_minutes": node["estimated_minutes"],
                "mastery_score": score,
                "status": status_class,
                "is_root_cause": (status_class == "root_cause"),
                "is_target": is_target
            })

        # 5. Build Ordered Remediation Path (Topological bottom-up sorting)
        # Foundational tier 1 first, then tier 2, then tier 3
        remediation_path = sorted(
            [n for n in nodes_result if n["status"] in ("root_cause", "shaky", "target")],
            key=lambda x: (x["tier"], 0 if x["status"] == "root_cause" else 1, x["mastery_score"])
        )

        return {
            "target_topic": target_node,
            "nodes": nodes_result,
            "edges": all_edges,
            "root_causes": root_causes,
            "shaky_nodes": shaky_nodes,
            "mastered_nodes": mastered_nodes,
            "prescribed_path": remediation_path,
            "remediation_count": len(remediation_path),
            "estimated_recovery_minutes": sum(n["estimated_minutes"] for n in remediation_path)
        }

    @staticmethod
    def get_diagnostic_quiz(subject_id, limit=5):
        """Retrieve a balanced diagnostic quiz across tiers to automatically detect gap areas."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT pq.id, pq.node_id, pq.difficulty, pq.question_text, pq.options_json,
                   pq.correct_option_index, pq.step_by_step_explanation, pq.confidence_score,
                   kn.topic_name, kn.tier, kn.category
            FROM practice_questions pq
            JOIN knowledge_nodes kn ON kn.id = pq.node_id
            WHERE kn.subject_id = ?
            ORDER BY kn.tier ASC, pq.id ASC
            LIMIT ?
        """, (subject_id, limit))

        questions = []
        for row in cursor.fetchall():
            import json
            q = dict(row)
            try:
                q["options"] = json.loads(q["options_json"])
            except Exception:
                q["options"] = []
            questions.append(q)

        conn.close()
        return questions
