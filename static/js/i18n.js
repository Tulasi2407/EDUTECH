/**
 * Roots & Rhythm - Multi-Language Localization Engine (i18n)
 * Supports English (en), Hindi (hi), Kannada (kn), Tamil (ta), and Telugu (te).
 */

const I18N_DICTIONARY = {
  en: {
    // Brand & Header
    brand_name: "Roots & Rhythm",
    brand_tagline: "Smart, Inclusive & Personalized Education",
    role_student: "Student",
    role_teacher: "Teacher",
    role_parent: "Parent",
    role_admin: "School Admin",
    switch_role_tooltip: "Switch Demo Persona",

    // Navigation Tabs
    nav_gap_finder: "Root-Cause X-Ray",
    nav_study_planner: "Free-Hour Planner",
    nav_practice: "Smart Practice",
    nav_analytics: "My Progress",
    nav_teacher_dashboard: "Class Heatmap",
    nav_parent_view: "Parent Overview",
    nav_admin_panel: "Institution Health",

    // Prerequisite Gap Finder
    gap_finder_title: "Prerequisite Gap Finder (Root-Cause Tracer)",
    gap_finder_subtitle: "Trace where you get stuck backward to foundational concepts before moving forward.",
    select_subject: "Select Subject",
    select_struggling_topic: "Select Topic You Find Hard",
    btn_trace_gaps: "X-Ray Root Causes",
    btn_quick_diagnostic: "Quick 3-Min Diagnostic",
    legend_root_cause: "Root Cause (Urgent)",
    legend_shaky: "Shaky Foundation",
    legend_mastered: "Mastered",
    legend_target: "Struggling Target Topic",
    remediation_path_title: "Recommended Remediation Pathway",
    recovery_time_label: "Est. Total Recovery Time",
    click_node_hint: "Click any circle node below to inspect bite-sized concept guides, formulas & instant practice.",

    // Free-Hour Planner
    planner_title: "Free-Hour Study Planner & Rhythm Rebalancer",
    planner_subtitle: "Study only inside your real free hours. No burnout, no crammed schedules.",
    btn_declare_free_hours: "+ Declare Free Hour",
    btn_auto_schedule: "Auto-Map Gaps Into Free Hours",
    btn_auto_rebalance: "Auto-Rebalance Skipped Sessions",
    rhythm_streak_label: "Study Rhythm Streak",
    no_sessions_scheduled: "No sessions scheduled yet. Click 'Auto-Map Gaps' to build your rhythm!",
    btn_mark_complete: "Complete & Level Up",
    btn_reschedule: "Reschedule",
    status_scheduled: "Scheduled",
    status_completed: "Completed",
    status_rescheduled: "Rescheduled",
    status_skipped: "Skipped",

    // Safe AI & Practice
    practice_title: "Adaptive Practice with Safe AI Guardrails",
    difficulty_beginner: "Beginner",
    difficulty_intermediate: "Intermediate",
    difficulty_advanced: "Advanced",
    btn_submit_answer: "Submit Answer",
    btn_flag_answer: "Review / Flag Answer",
    flag_modal_title: "Audit & Flag AI Answer",
    flag_modal_desc: "Help faculty maintain educational safety and accuracy.",
    flag_reason_label: "Reason for flag / suggestion:",
    flag_edit_label: "Suggested correction (optional):",
    btn_send_flag: "Submit to Faculty Review",
    step_by_step_solution: "Step-by-Step Educational Derivation",
    ai_confidence_badge: "Curriculum-Verified AI Guardrail",

    // Teacher & Parent Dashboards
    teacher_heatmap_title: "Classroom Weak-Topic Heatmap",
    teacher_gap_alerts: "Student Gap Alerts",
    btn_send_intervention: "Deploy Intervention Drill",
    parent_overview_title: "Clear & Jargon-Free Progress Summary",
    parent_encouragement: "Parent Coaching Tip",
    milestone_awards: "Milestones Unlocked",

    // Speed Pacing
    speed_beginner: "Foundational (15m micro-doses)",
    speed_intermediate: "Balanced (25m Pomodoro)",
    speed_advanced: "Deep Dive (45m mastery)",
    
    // Notifications & Messages
    session_completed_toast: "Brilliant! Topic mastery score improved.",
    slot_added_toast: "Free time slot successfully declared.",
    rebalance_success_toast: "Schedule smoothly rebalanced into upcoming free hours."
  },

  hi: {
    // Brand & Header
    brand_name: "रूट्स और रिदम (Roots & Rhythm)",
    brand_tagline: "स्मार्ट, समावेशी और व्यक्तिगत शिक्षा",
    role_student: "छात्र (Student)",
    role_teacher: "शिक्षक (Teacher)",
    role_parent: "अभिभावक (Parent)",
    role_admin: "स्कूल प्रशासक (Admin)",
    switch_role_tooltip: "डेमो भूमिका बदलें",

    // Navigation Tabs
    nav_gap_finder: "मूल-कारण एक्स-रे (Gap Finder)",
    nav_study_planner: "खाली समय योजनाकार",
    nav_practice: "स्मार्ट अभ्यास",
    nav_analytics: "मेरी प्रगति",
    nav_teacher_dashboard: "कक्षा हीटमैप",
    nav_parent_view: "अभिभावक अवलोकन",
    nav_admin_panel: "संस्थान स्वास्थ्य",

    // Prerequisite Gap Finder
    gap_finder_title: "पूर्वापेक्षित अंतर खोजक (Root-Cause Tracer)",
    gap_finder_subtitle: "आगे बढ़ने से पहले अपनी कमजोरी के मूल कारणों को पीछे जाकर पहचानें।",
    select_subject: "विषय चुनें",
    select_struggling_topic: "वह विषय चुनें जिसमें कठिनाई है",
    btn_trace_gaps: "मूल कारणों का पता लगाएं",
    btn_quick_diagnostic: "त्वरित 3-मिनट नैदानिक परीक्षण",
    legend_root_cause: "मूल कारण (अति आवश्यक)",
    legend_shaky: "कमजोर आधार",
    legend_mastered: "निपुण (Mastered)",
    legend_target: "कठिन लक्षित विषय",
    remediation_path_title: "सुझाई गई सुधार कार्ययोजना",
    recovery_time_label: "अनुमानित कुल सुधार समय",
    click_node_hint: "अवधारणाओं, सूत्रों और सीधे अभ्यास के लिए नीचे किसी भी नोड पर क्लिक करें।",

    // Free-Hour Planner
    planner_title: "मुक्त-घंटे अध्ययन योजनाकार और संतुलन",
    planner_subtitle: "केवल अपने वास्तविक खाली समय में पढ़ें। बिना किसी तनाव के।",
    btn_declare_free_hours: "+ खाली समय जोड़ें",
    btn_auto_schedule: "खाली समय में अध्ययन सत्र जोड़ें",
    btn_auto_rebalance: "छूटे हुए सत्रों को स्वतः संतुलित करें",
    rhythm_streak_label: "अध्ययन निरंतरता स्ट्रीक",
    no_sessions_scheduled: "कोई सत्र निर्धारित नहीं है। 'अध्ययन सत्र जोड़ें' पर क्लिक करें!",
    btn_mark_complete: "पूर्ण करें और आगे बढ़ें",
    btn_reschedule: "समय बदलें",
    status_scheduled: "निर्धारित",
    status_completed: "पूर्ण",
    status_rescheduled: "पुनर्निर्धारित",
    status_skipped: "छूट गया",

    // Safe AI & Practice
    practice_title: "सुरक्षित एआई मार्गदर्शकों के साथ अनुकूली अभ्यास",
    difficulty_beginner: "प्रारंभिक",
    difficulty_intermediate: "मध्यम",
    difficulty_advanced: "उन्नत",
    btn_submit_answer: "उत्तर सबमिट करें",
    btn_flag_answer: "समीक्षा / रिपोर्ट करें",
    flag_modal_title: "एआई उत्तर की समीक्षा और फ्लैग करें",
    flag_modal_desc: "शिक्षकों को सामग्री शुद्धता बनाए रखने में मदद करें।",
    flag_reason_label: "फ्लैग का कारण / सुझाव:",
    flag_edit_label: "सुझाया गया सुधार (वैकल्पिक):",
    btn_send_flag: "शिक्षक समीक्षा हेतु भेजें",
    step_by_step_solution: "चरण-दर-चरण समाधान",
    ai_confidence_badge: "पाठ्यक्रम-सत्यापित एआई सुरक्षा",

    // Teacher & Parent Dashboards
    teacher_heatmap_title: "कक्षा-स्तरीय विषय हीटमैप",
    teacher_gap_alerts: "छात्र अंतर अलर्ट",
    btn_send_intervention: "सुधार अभ्यास सत्र भेजें",
    parent_overview_title: "सरल और स्पष्ट प्रगति रिपोर्ट",
    parent_encouragement: "अभिभावक मार्गदर्शन टिप",
    milestone_awards: "उपलब्धियां और मील के पत्थर",

    // Speed Pacing
    speed_beginner: "मूलभूत (15 मिनट के छोटे पाठ)",
    speed_intermediate: "संतुलित (25 मिनट)",
    speed_advanced: "गहन अभ्यास (45 मिनट)",
    
    // Notifications & Messages
    session_completed_toast: "शानदार! विषय निपुणता में सुधार हुआ।",
    slot_added_toast: "खाली समय सफलतापूर्वक जोड़ा गया।",
    rebalance_success_toast: "आने वाले खाली समय में समय-सारणी स्वतः संतुलित कर दी गई।"
  },

  kn: {
    // Brand & Header
    brand_name: "ರೂಟ್ಸ್ & ರಿದಮ್ (Roots & Rhythm)",
    brand_tagline: "ಸ್ಮಾರ್ಟ್, ಅಂತರ್ಗತ ಮತ್ತು ವೈಯಕ್ತಿಕಗೊಳಿಸಿದ ಶಿಕ್ಷಣ",
    role_student: "ವಿದ್ಯಾರ್ಥಿ (Student)",
    role_teacher: "ಶಿಕ್ಷಕರು (Teacher)",
    role_parent: "ಪೋಷಕರು (Parent)",
    role_admin: "ಶಾಲಾ ಆಡಳಿತ (Admin)",
    switch_role_tooltip: "ಡೆಮೊ ಪಾತ್ರ ಬದಲಾಯಿಸಿ",

    // Navigation Tabs
    nav_gap_finder: "ಮೂಲ-ಕಾರಣ ಎಕ್ಸ್-ರೇ (Gap Finder)",
    nav_study_planner: "ಖಾಲಿ-ವೇಳೆ ಯೋಜಕ",
    nav_practice: "ಸ್ಮಾರ್ಟ್ ಅಭ್ಯಾಸ",
    nav_analytics: "ನನ್ನ ಪ್ರಗತಿ",
    nav_teacher_dashboard: "ತರಗತಿ ಹೀಟ್‌ಮ್ಯಾಪ್",
    nav_parent_view: "ಪೋಷಕರ ಅವಲೋಕನ",
    nav_admin_panel: "ಸಂಸ್ಥೆಯ ಮಾಹಿತಿ",

    // Prerequisite Gap Finder
    gap_finder_title: "ಪೂರ್ವಾಪೇಕ್ಷಿತ ಕೊರತೆ ಶೋಧಕ (Root-Cause Tracer)",
    gap_finder_subtitle: "ಮುಂದಕ್ಕೆ ಹೋಗುವ ಮೊದಲು ನೀವು ಕಷ್ಟಪಡುವ ವಿಷಯಗಳ ಹಿಂದಿನ ಮೂಲ ಕಾರಣಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಿ.",
    select_subject: "ವಿಷಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    select_struggling_topic: "ಕಷ್ಟವೆನಿಸುವ ಅಧ್ಯಾಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    btn_trace_gaps: "ಮೂಲ ಕಾರಣಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಿ",
    btn_quick_diagnostic: "ತ್ವರಿತ 3-ನಿಮಿಷದ ಪರೀಕ್ಷೆ",
    legend_root_cause: "ಮೂಲ ಕಾರಣ (ತಕ್ಷಣ ಗಮನಹರಿಸಿ)",
    legend_shaky: "ಅಸ್ಥಿರ ಅಡಿಪಾಯ",
    legend_mastered: "ಕರಗತವಾಗಿದೆ (Mastered)",
    legend_target: "ಕಷ್ಟದ ಗುರಿ ವಿಷಯ",
    remediation_path_title: "ಶಿಫಾರಸು ಮಾಡಿದ ಸುಧಾರಣಾ ಹಂತಗಳು",
    recovery_time_label: "ಅಂದಾಜು ಒಟ್ಟು ಸುಧಾರಣಾ ಸಮಯ",
    click_node_hint: "ಸಣ್ಣ ವಿವರಣೆಗಳು ಮತ್ತು ನೇರ ಅಭ್ಯಾಸಕ್ಕಾಗಿ ಕೆಳಗಿನ ಯಾವುದೇ ವೃತ್ತದ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ.",

    // Free-Hour Planner
    planner_title: "ಖಾಲಿ-ವೇಳೆ ಅಧ್ಯಯನ ಯೋಜಕ ಮತ್ತು ಮರುಸಮತೋಲನ",
    planner_subtitle: "ನಿಮ್ಮ ನಿಜವಾದ ಬಿಡುವಿನ ವೇಳೆಯಲ್ಲಿ ಮಾತ್ರ ಓದಿ. ಯಾವುದೇ ಒತ್ತಡವಿಲ್ಲ.",
    btn_declare_free_hours: "+ ಬಿಡುವಿನ ವೇಳೆ ಸೇರಿಸಿ",
    btn_auto_schedule: "ಬಿಡುವಿನ ವೇಳೆಗೆ ಅಧ್ಯಯನ ಹೊಂದಿಸಿ",
    btn_auto_rebalance: "ತಪ್ಪಿದ ವೇಳಾಪಟ್ಟಿಯನ್ನು ಮರುಸಮತೋಲನಗೊಳಿಸಿ",
    rhythm_streak_label: "ಅಧ್ಯಯನ ನಿರಂತರತೆ (Streak)",
    no_sessions_scheduled: "ಯಾವುದೇ ಅವಧಿ ನಿಗದಿಯಾಗಿಲ್ಲ. 'ಅಧ್ಯಯನ ಹೊಂದಿಸಿ' ಕ್ಲಿಕ್ ಮಾಡಿ!",
    btn_mark_complete: "ಪೂರ್ಣಗೊಳಿಸಿ ಮತ್ತು ಮುಂದುವರಿಯಿರಿ",
    btn_reschedule: "ವೇಳೆ ಬದಲಾಯಿಸಿ",
    status_scheduled: "ನಿಗದಿಯಾಗಿದೆ",
    status_completed: "ಪೂರ್ಣಗೊಂಡಿದೆ",
    status_rescheduled: "ಮರುನಿಗದಿ",
    status_skipped: "ತಪ್ಪಿಹೋಗಿದೆ",

    // Safe AI & Practice
    practice_title: "ಸುರಕ್ಷಿತ ಎಐ ಮಾರ್ಗದರ್ಶನದೊಂದಿಗೆ ಹೊಂದಾಣಿಕೆಯ ಅಭ್ಯಾಸ",
    difficulty_beginner: "ಆರಂಭಿಕ",
    difficulty_intermediate: "ಮಧ್ಯಮ",
    difficulty_advanced: "ಮುಂದುವರಿದ",
    btn_submit_answer: "ಉತ್ತರ ಸಲ್ಲಿಸಿ",
    btn_flag_answer: "ಪರಿಶೀಲನೆ / ವರದಿ ಮಾಡಿ",
    flag_modal_title: "ಎಐ ಉತ್ತರವನ್ನು ಪರಿಶೀಲಿಸಿ & ವರದಿ ಮಾಡಿ",
    flag_modal_desc: "ಶಿಕ್ಷಕರಿಗೆ ವಿಷಯದ ನಿಖರತೆ ಕಾಪಾಡಲು ಸಹಾಯ ಮಾಡಿ.",
    flag_reason_label: "ವರದಿಯ ಕಾರಣ / ಸಲಹೆ:",
    flag_edit_label: "ಸಲಹೆ ಮಾಡಿದ ತಿದ್ದುಪಡಿ (ಐಚ್ಛಿಕ):",
    btn_send_flag: "ಶಿಕ್ಷಕರ ಪರಿಶೀಲನೆಗೆ ಕಳುಹಿಸಿ",
    step_by_step_solution: "ಹಂತ-ಹಂತದ ವಿವರಣೆ",
    ai_confidence_badge: "ಪಠ್ಯಕ್ರಮ-ದೃಢೀಕೃತ ಎಐ ಭದ್ರತೆ",

    // Teacher & Parent Dashboards
    teacher_heatmap_title: "ತರಗತಿ ವಿಷಯ ಹೀಟ್‌ಮ್ಯಾಪ್",
    teacher_gap_alerts: "ವಿದ್ಯಾರ್ಥಿ ಕಲಿಕಾ ಕೊರತೆ ಎಚ್ಚರಿಕೆಗಳು",
    btn_send_intervention: "ವಿಶೇಷ ಅಭ್ಯಾಸ ನಿಯೋಜಿಸಿ",
    parent_overview_title: "ಸರಳ ಮತ್ತು ಸ್ಪಷ್ಟ ಪ್ರಗತಿ ಸಾರಾಂಶ",
    parent_encouragement: "ಪೋಷಕರ ಮಾರ್ಗದರ್ಶನ ಟಿಪ್",
    milestone_awards: "ಗಳಿಸಿದ ಮೈಲಿಗಲ್ಲುಗಳು",

    // Speed Pacing
    speed_beginner: "ಮೂಲ ಹಂತ (15 ನಿಮಿಷ)",
    speed_intermediate: "ಸಮತೋಲಿತ (25 ನಿಮಿಷ)",
    speed_advanced: "ಆಳವಾದ ಅಧ್ಯಯನ (45 ನಿಮಿಷ)",
    
    // Notifications & Messages
    session_completed_toast: "ಅದ್ಭುತ! ವಿಷಯ ಜ್ಞಾನದ ಅಂಕಗಳು ಹೆಚ್ಚಿವೆ.",
    slot_added_toast: "ಬಿಡುವಿನ ಸಮಯವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸೇರಿಸಲಾಗಿದೆ.",
    rebalance_success_toast: "ಮುಂದಿನ ಬಿಡುವಿನ ವೇಳೆಗೆ ಅಧ್ಯಯನ ಮರುಹೊಂದಿಸಲಾಗಿದೆ."
  },

  ta: {
    // Brand & Header
    brand_name: "ரூட்ஸ் & ரிதம் (Roots & Rhythm)",
    brand_tagline: "ஸ்மார்ட், உள்ளடக்கிய & தனிப்பயனாக்கப்பட்ட கல்வி",
    role_student: "மாணவர் (Student)",
    role_teacher: "ஆசிரியர் (Teacher)",
    role_parent: "பெற்றோர் (Parent)",
    role_admin: "பள்ளி நிர்வாகம் (Admin)",
    switch_role_tooltip: "டெமோ பாத்திரத்தை மாற்றவும்",

    // Navigation Tabs
    nav_gap_finder: "மூலக்-காரண எக்ஸ்-ரே (Gap Finder)",
    nav_study_planner: "ஓய்வு நேரத் திட்டமிடுபவர்",
    nav_practice: "ஸ்மார்ட் பயிற்சி",
    nav_analytics: "என் முன்னேற்றம்",
    nav_teacher_dashboard: "வகுப்பறை வெப்ப வரைபடம்",
    nav_parent_view: "பெற்றோர் பார்வை",
    nav_admin_panel: "நிறுவன நலன்",

    // Prerequisite Gap Finder
    gap_finder_title: "முன்தேவை இடைவெளி கண்டுபிடிப்பான் (Root-Cause Tracer)",
    gap_finder_subtitle: "முன்னேறுவதற்கு முன் நீங்கள் தடுமாறும் பாடத்தின் ஆழமான அடிப்படைக் காரணங்களைக் கண்டறியவும்.",
    select_subject: "பாடத்தைத் தேர்வு செய்யவும்",
    select_struggling_topic: "கடினமாக இருக்கும் தலைப்பைத் தேர்ந்தெடுக்கவும்",
    btn_trace_gaps: "மூலக் காரணங்களைக் கண்டறிக",
    btn_quick_diagnostic: "விரைவு 3-நிமிட கண்டறிதல் தேர்வு",
    legend_root_cause: "மூலக் காரணம் (அவசரக் கவனம்)",
    legend_shaky: "பலவீனமான அடித்தளம்",
    legend_mastered: "தேர்ச்சி பெற்றது (Mastered)",
    legend_target: "கடினமான இலக்குத் தலைப்பு",
    remediation_path_title: "பரிந்துரைக்கப்பட்ட முன்னேற்றப் பாதை",
    recovery_time_label: "மதிப்பிடப்பட்ட மொத்த மீட்பு நேரம்",
    click_node_hint: "சுருக்கமான விளக்கங்கள் மற்றும் நேரடிப் பயிற்சிக்கு கீழே உள்ள வட்டத்தைக் கிளிக் செய்க.",

    // Free-Hour Planner
    planner_title: "ஓய்வு நேரப் படிப்புத் திட்டமிடுபவர் & மறுசீரமைப்பாளர்",
    planner_subtitle: "உங்கள் உண்மையான ஓய்வு நேரத்தில் மட்டுமே படிக்கவும். மனஅழுத்தம் இல்லை.",
    btn_declare_free_hours: "+ ஓய்வு நேரத்தைச் சேர்க்கவும்",
    btn_auto_schedule: "ஓய்வு நேரத்தில் படிப்பை இணைக்கவும்",
    btn_auto_rebalance: "தவறிய அமர்வுகளை தானாக மறுசீரமைக்கவும்",
    rhythm_streak_label: "படிப்பு தொடர்ச்சி (Streak)",
    no_sessions_scheduled: "படிப்பு நேரம் எதுவும் திட்டமிடப்படவில்லை. 'படிப்பை இணைக்கவும்' கிளிக் செய்க!",
    btn_mark_complete: "முடித்து முன்னேறவும்",
    btn_reschedule: "நேரம் மாற்றவும்",
    status_scheduled: "திட்டமிடப்பட்டது",
    status_completed: "நிறைவடைந்தது",
    status_rescheduled: "மறுதிட்டமிடப்பட்டது",
    status_skipped: "தவறியது",

    // Safe AI & Practice
    practice_title: "பாதுகாப்பான ஏஐ வழிகாட்டலுடன் தனிப்பயன் பயிற்சி",
    difficulty_beginner: "தொடக்க நிலை",
    difficulty_intermediate: "நடுத்தர நிலை",
    difficulty_advanced: "மேம்பட்ட நிலை",
    btn_submit_answer: "விடையைச் சமர்ப்பிக்கவும்",
    btn_flag_answer: "சரிபார் / கொடியிடு",
    flag_modal_title: "ஏஐ பதிலைச் சரிபார்த்து கொடியிடவும்",
    flag_modal_desc: "பாடத் துல்லியத்தைப் பராமரிக்க ஆசிரியர்களுக்கு உதவவும்.",
    flag_reason_label: "கொடியிடுவதற்கான காரணம் / பரிந்துரை:",
    flag_edit_label: "பரிந்துரைக்கப்பட்ட திருத்தம் (விருப்பமானது):",
    btn_send_flag: "ஆசிரியர் ஆய்வுக்கு அனுப்பவும்",
    step_by_step_solution: "படி-படியான தீர்வு முறை",
    ai_confidence_badge: "பாடத்திட்டத்தால் சரிபார்க்கப்பட்ட ஏஐ பாதுகாப்பு",

    // Teacher & Parent Dashboards
    teacher_heatmap_title: "வகுப்பறை பாடம் வெப்ப வரைபடம்",
    teacher_gap_alerts: "மாணவர் இடைவெளி எச்சரிக்கைகள்",
    btn_send_intervention: "தீர்வுப் பயிற்சி வழங்கவும்",
    parent_overview_title: "தெளிவான, எளிமையான முன்னேற்ற அறிக்கை",
    parent_encouragement: "பெற்றோர் வழிகாட்டல் குறிப்பு",
    milestone_awards: "அடைந்த மைல்கற்கள்",

    // Speed Pacing
    speed_beginner: "அடிப்படை (15 நிமிடம்)",
    speed_intermediate: "சமநிலை (25 நிமிடம்)",
    speed_advanced: "ஆழ்ந்த பயிற்சி (45 நிமிடம்)",
    
    // Notifications & Messages
    session_completed_toast: "அருமை! பாடத் தேர்ச்சி மதிப்பெண் உயர்ந்துள்ளது.",
    slot_added_toast: "ஓய்வு நேரம் வெற்றிகரமாகச் சேர்க்கப்பட்டது.",
    rebalance_success_toast: "அடுத்த ஓய்வு நேரத்திற்குப் பாட அட்டவணை மாற்றப்பட்டது."
  },

  te: {
    // Brand & Header
    brand_name: "రూట్స్ & రిథమ్ (Roots & Rhythm)",
    brand_tagline: "స్మార్ట్, సమ్మిళిత & వ్యక్తిగతీకరించిన విద్య",
    role_student: "విద్యార్థి (Student)",
    role_teacher: "ఉపాధ్యాయుడు (Teacher)",
    role_parent: "తల్లిదండ్రులు (Parent)",
    role_admin: "పాఠశాల అడ్మిన్ (Admin)",
    switch_role_tooltip: "డెమో పాత్రను మార్చండి",

    // Navigation Tabs
    nav_gap_finder: "మూల-కారణ ఎక్స్-రే (Gap Finder)",
    nav_study_planner: "ఖాళీ సమయ ప్లానర్",
    nav_practice: "స్మార్ట్ ప్రాక్టీస్",
    nav_analytics: "నా పురోగతి",
    nav_teacher_dashboard: "తరగతి హీట్‌మ్యాప్",
    nav_parent_view: "తల్లిదండ్రుల నివేదిక",
    nav_admin_panel: "సంస్థ స్థితి",

    // Prerequisite Gap Finder
    gap_finder_title: "ముందస్తు అంతరాల గుర్తింపు (Root-Cause Tracer)",
    gap_finder_subtitle: "ముందుకు వెళ్లేముందు మీరు వెనుకబడిన మూల కారణాలను వెనక్కి వెళ్లి కనుగొనండి.",
    select_subject: "సబ్జెక్ట్‌ను ఎంచుకోండి",
    select_struggling_topic: "కష్టంగా ఉన్న అంశాన్ని ఎంచుకోండి",
    btn_trace_gaps: "మూల కారణాలను వెలికితీయండి",
    btn_quick_diagnostic: "త్వరిత 3-నిమిషాల పరీక్ష",
    legend_root_cause: "మూల కారణం (అత్యవసరం)",
    legend_shaky: "అస్థిర పునాది",
    legend_mastered: "నైపుణ్యం సాధించారు (Mastered)",
    legend_target: "కష్టమైన లక్ష్య అంశం",
    remediation_path_title: "సిఫార్సు చేయబడిన పరిష్కార మార్గం",
    recovery_time_label: "అంచనా వేసిన పునరుద్ధరణ సమయం",
    click_node_hint: "చిన్న వివరణలు మరియు ప్రత్యక్ష అభ్యాసం కోసం క్రింది ఏదైనా సర్కిల్‌పై క్లిక్ చేయండి.",

    // Free-Hour Planner
    planner_title: "ఖాళీ సమయ అధ్యయన ప్లానర్ & రీబ్యాలెన్సర్",
    planner_subtitle: "మీ నిజమైన ఖాళీ సమయంలో మాత్రమే చదవండి. ఒత్తిడి లేని అధ్యయనం.",
    btn_declare_free_hours: "+ ఖాళీ సమయాన్ని జోడించండి",
    btn_auto_schedule: "ఖాళీ సమయంలో అధ్యయనాన్ని షెడ్యూల్ చేయండి",
    btn_auto_rebalance: "మిస్సయిన సెషన్లను రీబ్యాలెన్స్ చేయండి",
    rhythm_streak_label: "అధ్యయన నిరంతరత (Streak)",
    no_sessions_scheduled: "ఇంకా సెషన్లు లేవు. 'అధ్యయనాన్ని షెడ్యూల్ చేయండి' క్లిక్ చేయండి!",
    btn_mark_complete: "పూర్తి చేసి ముందుకు సాగండి",
    btn_reschedule: "సమయాన్ని మార్చండి",
    status_scheduled: "షెడ్యూల్ చేయబడింది",
    status_completed: "పూర్తయింది",
    status_rescheduled: "రీషెడ్యూల్ చేయబడింది",
    status_skipped: "వదిలివేయబడింది",

    // Safe AI & Practice
    practice_title: "సురక్షితమైన ఏఐతో స్మార్ట్ ప్రాక్టీస్",
    difficulty_beginner: "ప్రారంభ స్థాయి",
    difficulty_intermediate: "మధ్యస్థ స్థాయి",
    difficulty_advanced: "ఉన్నత స్థాయి",
    btn_submit_answer: "సమాధానాన్ని సమర్పించండి",
    btn_flag_answer: "సమీక్షించండి / ఫ్లాగ్ చేయండి",
    flag_modal_title: "ఏఐ సమాధానాన్ని సమీక్షించండి & ఫ్లాగ్ చేయండి",
    flag_modal_desc: "ఉపాధ్యాయులకు విద్యా నాణ్యతను కాపాడటంలో సహాయపడండి.",
    flag_reason_label: "కారణం / సలహా:",
    flag_edit_label: "సూచించిన మార్పు (ఐచ్ఛికం):",
    btn_send_flag: "ఉపాధ్యాయుల సమీక్షకు పంపండి",
    step_by_step_solution: "దశలవారీ విద్యా పరిష్కారం",
    ai_confidence_badge: "పాఠ్యాంశం-ధృవీకరించబడిన ఏఐ రక్షణ",

    // Teacher & Parent Dashboards
    teacher_heatmap_title: "తరగతి సబ్జెక్ట్ హీట్‌మ్యాప్",
    teacher_gap_alerts: "విద్యార్థి అంతరాల హెచ్చరికలు",
    btn_send_intervention: "నివారణ అభ్యాసాన్ని కేటాయించండి",
    parent_overview_title: "స్పష్టమైన, సరళమైన పురోగతి నివేదిక",
    parent_encouragement: "తల్లిదండ్రుల మార్గదర్శక చిట్కా",
    milestone_awards: "సాధించిన మైలురాళ్ళు",

    // Speed Pacing
    speed_beginner: "పునాది స్థాయి (15 నిమిషాలు)",
    speed_intermediate: "సమతుల్య స్థాయి (25 నిమిషాలు)",
    speed_advanced: "లోతైన అధ్యయనం (45 నిమిషాలు)",
    
    // Notifications & Messages
    session_completed_toast: "అద్భుతం! సబ్జెక్ట్ స్కోర్ మెరుగుపడింది.",
    slot_added_toast: "ఖాళీ సమయం విజయవంతంగా జోడించబడింది.",
    rebalance_success_toast: "తదుపరి ఖాళీ సమయానికి షెడ్యూల్ సులభంగా సర్దుబాటు చేయబడింది."
  }
};

let currentLanguage = localStorage.getItem("roots_rhythm_lang") || "en";

function setLanguage(lang) {
  if (!I18N_DICTIONARY[lang]) {
    lang = "en";
  }
  currentLanguage = lang;
  localStorage.setItem("roots_rhythm_lang", lang);
  applyTranslations();
  
  // Highlight active language button
  document.querySelectorAll(".lang-btn").forEach(btn => {
    if (btn.dataset.lang === lang) {
      btn.classList.add("bg-indigo-600", "text-white", "font-bold");
      btn.classList.remove("text-slate-600", "hover:bg-slate-100");
    } else {
      btn.classList.remove("bg-indigo-600", "text-white", "font-bold");
      btn.classList.add("text-slate-600", "hover:bg-slate-100");
    }
  });

  // Re-render components that have dynamic labels
  if (window.renderTimeline) window.renderTimeline();
  if (window.renderActiveView) window.renderActiveView();
}

function t(key, fallback = "") {
  const dict = I18N_DICTIONARY[currentLanguage] || I18N_DICTIONARY["en"];
  return dict[key] || I18N_DICTIONARY["en"][key] || fallback || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const translation = t(key);
    if (translation) {
      el.textContent = translation;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const translation = t(key);
    if (translation) {
      el.placeholder = translation;
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.dataset.i18nTitle;
    const translation = t(key);
    if (translation) {
      el.title = translation;
    }
  });
}

window.I18N = {
  currentLanguage: () => currentLanguage,
  setLanguage,
  t,
  applyTranslations
};
