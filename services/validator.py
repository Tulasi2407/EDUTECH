"""Schema validation and input sanitization service for Roots & Rhythm.
Provides robust server-side validation with helpful error messages.
"""

import re
from datetime import datetime

class ValidationError(Exception):
    """Custom exception raised when payload validation fails."""
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field

    def to_dict(self):
        return {"error": "Validation Error", "field": self.field, "message": self.message}

def sanitize_string(val, max_length=500):
    """Sanitize text input: strip leading/trailing whitespace, remove dangerous characters."""
    if val is None:
        return ""
    text = str(val).strip()
    # Remove null bytes and script tag markers
    text = text.replace("\0", "").replace("<script>", "").replace("</script>", "")
    return text[:max_length]

def validate_time_format(time_str, field_name="time"):
    """Validate 24-hour HH:MM time string."""
    if not isinstance(time_str, str):
        raise ValidationError(f"{field_name} must be a string in HH:MM format", field_name)
    pattern = r"^(?:[01]\d|2[0-3]):[0-5]\d$"
    if not re.match(pattern, time_str.strip()):
        raise ValidationError(f"{field_name} must be a valid 24-hour time string in HH:MM format (e.g., 07:30 or 18:00)", field_name)
    return time_str.strip()

def validate_free_hour_slot_payload(data):
    """Validate payload for creating or updating a free-hour study slot."""
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object")

    # 1. day_of_week
    if "day_of_week" not in data:
        raise ValidationError("Missing required field: day_of_week", "day_of_week")
    try:
        raw_day = data["day_of_week"]
        if isinstance(raw_day, str):
            day_map = {
                "monday": 0, "mon": 0,
                "tuesday": 1, "tue": 1,
                "wednesday": 2, "wed": 2,
                "thursday": 3, "thu": 3,
                "friday": 4, "fri": 4,
                "saturday": 5, "sat": 5,
                "sunday": 6, "sun": 6,
                "today": datetime.now().weekday()
            }
            if raw_day.strip().lower() in day_map:
                day_of_week = day_map[raw_day.strip().lower()]
            else:
                day_of_week = int(raw_day)
        else:
            day_of_week = int(raw_day)
    except (ValueError, TypeError):
        raise ValidationError("day_of_week must be an integer between 0 (Monday) and 6 (Sunday)", "day_of_week")
    if day_of_week < 0 or day_of_week > 6:
        raise ValidationError("day_of_week must be between 0 (Monday) and 6 (Sunday)", "day_of_week")

    # 2. start_time & end_time
    if "start_time" not in data:
        raise ValidationError("Missing required field: start_time", "start_time")
    if "end_time" not in data:
        raise ValidationError("Missing required field: end_time", "end_time")

    start_time = validate_time_format(data["start_time"], "start_time")
    end_time = validate_time_format(data["end_time"], "end_time")

    s_h, s_m = map(int, start_time.split(":"))
    e_h, e_m = map(int, end_time.split(":"))
    start_mins = s_h * 60 + s_m
    end_mins = e_h * 60 + e_m

    if end_mins <= start_mins:
        raise ValidationError("end_time must be strictly after start_time", "end_time")
    if (end_mins - start_mins) < 15:
        raise ValidationError("A study slot must be at least 15 minutes in length", "end_time")

    # 3. label
    raw_label = data.get("label") or data.get("slot_label") or "Free Study Window"
    label = sanitize_string(raw_label, max_length=100)
    if not label:
        label = "Free Study Window"

    is_active = 1 if data.get("is_active", True) else 0

    return {
        "day_of_week": day_of_week,
        "start_time": start_time,
        "end_time": end_time,
        "label": label,
        "is_active": is_active
    }

def validate_quiz_submission_payload(data):
    """Validate payload for submitting an answer to a practice question."""
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object")

    if "question_id" not in data:
        raise ValidationError("Missing required field: question_id", "question_id")
    try:
        question_id = int(data["question_id"])
    except (ValueError, TypeError):
        raise ValidationError("question_id must be an integer", "question_id")

    if "selected_option" not in data:
        raise ValidationError("Missing required field: selected_option", "selected_option")
    try:
        selected_option = int(data["selected_option"])
    except (ValueError, TypeError):
        raise ValidationError("selected_option must be an integer option index", "selected_option")
    if selected_option < 0 or selected_option > 5:
        raise ValidationError("selected_option index is out of bounds", "selected_option")

    time_spent = int(data.get("time_spent_seconds", 30))
    if time_spent < 0:
        time_spent = 1

    return {
        "question_id": question_id,
        "selected_option": selected_option,
        "time_spent_seconds": time_spent
    }

def validate_ai_flag_payload(data):
    """Validate payload for reviewing or flagging an AI explanation or practice question."""
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object")

    if "question_id" not in data:
        raise ValidationError("Missing required field: question_id", "question_id")
    try:
        question_id = int(data["question_id"])
    except (ValueError, TypeError):
        raise ValidationError("question_id must be an integer", "question_id")

    reason = sanitize_string(data.get("reason", ""), max_length=300)
    if len(reason) < 5:
        raise ValidationError("Please provide a reason of at least 5 characters for the review flag", "reason")

    suggested_edit = sanitize_string(data.get("suggested_edit", ""), max_length=1000)

    return {
        "question_id": question_id,
        "reason": reason,
        "suggested_edit": suggested_edit
    }

def validate_session_status_update_payload(data):
    """Validate payload when updating a study session status."""
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object")

    valid_statuses = {"scheduled", "completed", "skipped", "rescheduled"}
    status = str(data.get("status", "")).strip().lower()
    if status not in valid_statuses:
        raise ValidationError(f"Invalid status: '{status}'. Must be one of: {', '.join(valid_statuses)}", "status")

    notes = sanitize_string(data.get("notes", ""), max_length=500)

    return {
        "status": status,
        "notes": notes
    }

def validate_registration_payload(data):
    """Validate user registration payload."""
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object")

    name = sanitize_string(data.get("name", ""), max_length=100)
    if len(name) < 2:
        raise ValidationError("Full Name must be at least 2 characters", "name")

    username = str(data.get("username", "")).strip().lower()
    if not re.match(r"^[a-zA-Z0-9_]{3,30}$", username):
        raise ValidationError("Username must be between 3 and 30 characters (letters, numbers, underscore)", "username")

    email = str(data.get("email", "")).strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise ValidationError("Please provide a valid email address", "email")

    password = str(data.get("password", ""))
    if len(password) < 6:
        raise ValidationError("Password must be at least 6 characters", "password")

    role = str(data.get("role", "student")).strip().lower()
    if role not in {"student", "parent"}:
        role = "student"

    grade_or_cohort = sanitize_string(data.get("grade_or_cohort", ""), max_length=100)
    if not grade_or_cohort:
        grade_or_cohort = "Grade 10-A" if role == "student" else "Guardian"

    language_preference = str(data.get("language_preference", "en")).strip().lower()
    if language_preference not in {"en", "hi", "kn", "ta", "te"}:
        language_preference = "en"

    return {
        "name": name,
        "username": username,
        "email": email,
        "password": password,
        "role": role,
        "grade_or_cohort": grade_or_cohort,
        "language_preference": language_preference
    }

def validate_login_payload(data):
    """Validate user login payload."""
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object")

    username = str(data.get("username", "")).strip()
    if not username:
        raise ValidationError("Please enter your username or email", "username")

    password = str(data.get("password", ""))
    if not password:
        raise ValidationError("Please enter your password", "password")

    return {
        "username": username,
        "password": password
    }
