import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

def build_pdf():
    docs_dir = os.path.join(os.path.dirname(__file__), "docs")
    os.makedirs(docs_dir, exist_ok=True)
    pdf_path = os.path.join(docs_dir, "CHECKPOINT_2_REVIEW_DOCUMENT.pdf")
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#065f46'),
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#047857'),
        spaceAfter=10
    )
    
    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#064e3b'),
        spaceBefore=10,
        spaceAfter=4
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=4
    )
    
    quote_style = ParagraphStyle(
        'QuoteText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#065f46')
    )
    
    elements = []
    
    # Header Banner
    elements.append(Paragraph("Roots & Rhythm 🌿⏱️ — Smart, Inclusive & Personalized Education", title_style))
    elements.append(Paragraph("<b>Hackathon Checkpoint 2 Review</b> | Complete Workflow, Features, Tech Stack & Roadmap<br/><b>Developer:</b> Tulasi2407 | <b>Repository:</b> https://github.com/Tulasi2407/EDUTECH | <b>Live Server:</b> http://127.0.0.1:5000", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceAfter=8))
    
    # 1. Executive Summary
    elements.append(Paragraph("1. Executive Summary & Problem Understanding", h1_style))
    p1 = (
        "<b>The Problem:</b> Students struggle with advanced concepts because unseen prerequisite gaps compound over time. "
        "Traditional platforms treat surface symptoms rather than diagnosing foundational root causes, enforce rigid study timetables "
        "causing cognitive burnout, and restrict STEM learning to English, alienating vernacular-medium learners.<br/>"
        "<b>The Solution:</b> <b>Roots & Rhythm</b> is built on two core pillars: <b>1. Roots</b> (Prerequisite Gap Finder & "
        "interactive SVG Root-Cause DAG tracer) and <b>2. Rhythm</b> (Free-Hour Study Planner & auto-rebalancer operating strictly inside declared availability)."
    )
    elements.append(Paragraph(p1, body_style))
    
    # 2. Workflow
    elements.append(Paragraph("2. Complete End-to-End System Workflow", h1_style))
    wf_text = (
        "<b>1. Onboarding:</b> Student selects language (EN, HI, KN, TA, TE) and speed pace (15m, 25m, 45m).<br/>"
        "<b>2. Diagnostic Assessment:</b> Gap Finder evaluates accuracy across topics (<70% triggers active gap).<br/>"
        "<b>3. Root-Cause X-Ray:</b> Topological DAG traversal pinpoints the deepest broken prerequisite on an interactive SVG map with radar auras.<br/>"
        "<b>4. Free-Hour Declaration:</b> Student inputs actual weekly availability windows (e.g., 17:30–18:30 After-School Focus).<br/>"
        "<b>5. Rhythm Scheduler:</b> Micro-study blocks target foundational gaps strictly inside free hours, with auto-rebalancing for skipped sessions.<br/>"
        "<b>6. AI Tutoring & Practice:</b> Patient doubt solving in mother tongue with analogies, paired with calibrated drills and hint ladders.<br/>"
        "<b>7. Real-Time Mastery:</b> Scoring updates (+15 pts); gaps marked Resolved at 80% mastery. Teacher heatmap and parent summaries update automatically."
    )
    elements.append(Paragraph(wf_text, body_style))
    
    # 3. Features Table
    elements.append(Paragraph("3. Feature Breakdown (10 Specific Objectives)", h1_style))
    table_data = [
        [Paragraph("<b>#</b>", body_style), Paragraph("<b>Objective / Feature</b>", body_style), Paragraph("<b>Implementation & Pedagogical Impact</b>", body_style)],
        ["1", Paragraph("<b>Gap Finder</b>", body_style), Paragraph("Diagnostic assessment identifying weak topics (<70% score) with severity classification.", body_style)],
        ["2", Paragraph("<b>Root-Cause X-Ray</b>", body_style), Paragraph("Prerequisite knowledge graph traversal (DAG) finding foundational concept blockers.", body_style)],
        ["3", Paragraph("<b>AI Learning Assistant</b>", body_style), Paragraph("24/7 patient doubt clearing using real-world analogies and checkpoint questions.", body_style)],
        ["4", Paragraph("<b>5-Language Switcher</b>", body_style), Paragraph("English, Hindi (हिंदी), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Telugu (తెలుగు) instant localization.", body_style)],
        ["5", Paragraph("<b>3 Learning Paces</b>", body_style), Paragraph("Step-by-Step (15m micro-steps), Balanced (25m standard), Fast-Track (45m high-yield).", body_style)],
        ["6", Paragraph("<b>Personalized Practice</b>", body_style), Paragraph("Adaptive question generator (difficulty 1-3) with progressive 2-stage hint ladders.", body_style)],
        ["7", Paragraph("<b>Free-Hour Study Planner</b>", body_style), Paragraph("Constraint-based scheduler strictly bounded within student-declared free time windows with auto-rebalance.", body_style)],
        ["8", Paragraph("<b>Progress Tracking</b>", body_style), Paragraph("Real-time dashboard displaying mastery badges, problem accuracy, and streak tracking.", body_style)],
        ["9", Paragraph("<b>Responsive UI & UX</b>", body_style), Paragraph("Mobile-first UI, Zen Rhythm Chamber (Pomodoro + 4-7-8 breathing), Spotlight Ctrl+K, Dark Mode.", body_style)],
        ["10", Paragraph("<b>Privacy & Responsible AI</b>", body_style), Paragraph("Multi-role RBAC, bcrypt security, input sanitization, curriculum verification badges, and flag answer queue.", body_style)]
    ]
    t = Table(table_data, colWidths=[18, 130, 392])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#d1fae5')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#064e3b')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f0fdf4')]),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 6))
    
    # 4. Technology Stack
    elements.append(Paragraph("4. Complete Technology Stack Architecture", h1_style))
    ts_text = (
        "• <b>Backend Framework:</b> Python 3.10+ / 3.14 with Flask 3.1 / ASGI, structured layered MVC architecture.<br/>"
        "• <b>Relational Database:</b> SQLite 3 with Foreign Keys, recursive queries, and topological curriculum DAG tables.<br/>"
        "• <b>AI & Pedagogical Engine:</b> Dual-Engine (Primary: Google Gemini API; Fallback: Deterministic offline knowledge base).<br/>"
        "• <b>Security & Multi-Role RBAC:</b> Server-side RBAC decorators (Student, Teacher, Parent, Admin), Bcrypt hashing.<br/>"
        "• <b>Frontend & Tactile UX:</b> Vanilla JS (ES6+), SVG dynamic node canvas, Tailwind CSS, Chart.js, Web Audio synthesizer.<br/>"
        "• <b>Testing & Quality Assurance:</b> Python automated test suite covering all 12 user flows, RBAC, and rebalancing."
    )
    elements.append(Paragraph(ts_text, body_style))
    
    # 5. Work Done So Far
    elements.append(Paragraph("5. What We Have Accomplished So Far (Working MVP)", h1_style))
    done_text = (
        "✓ Full-stack application operational on <b>http://127.0.0.1:5000</b>.<br/>"
        "✓ Interactive SVG Root-Cause Node Map with color-coded radar auras (Rose, Amber, Emerald, Indigo).<br/>"
        "✓ Free-Hour Study Planner with automatic rebalancing and streak tracking active.<br/>"
        "✓ 5-Language instant localization switcher functioning (EN, HI, KN, TA, TE).<br/>"
        "✓ Zen Rhythm Study Chamber (Pomodoro timer + 4-7-8 breathing + Web Audio binaural soundscape).<br/>"
        "✓ Spotlight Command Palette (Ctrl+K) for instant keyboard navigation.<br/>"
        "✓ Multi-Role views active for Students, Teachers (class heatmap), and Parents (jargon-free summaries).<br/>"
        "✓ Responsible AI verification ratings and answer flag queue implemented.<br/>"
        "✓ Codebase version-controlled and pushed to GitHub: <b>https://github.com/Tulasi2407/EDUTECH</b>."
    )
    elements.append(Paragraph(done_text, body_style))
    
    # 6. Roadmap
    elements.append(Paragraph("6. Phased Project Roadmap", h1_style))
    rm_text = (
        "• <b>Phase 1 (Checkpoint 1) [COMPLETED]:</b> Problem definition, target persona, curriculum dependency mapping.<br/>"
        "• <b>Phase 2 (Checkpoint 2 — CURRENT):</b> System requirements, tech stack architecture, and execution plan.<br/>"
        "• <b>Phase 3 (Checkpoint 3) [COMPLETED / IN ADVANCE]:</b> Core engines integrated: Gap Finder, X-Ray DAG, Scheduler, and AI tutor.<br/>"
        "• <b>Phase 4 (Checkpoint 4) [READY / WORKING MVP]:</b> Live working prototype on port 5000 + automated test verification.<br/>"
        "• <b>Phase 5 (Checkpoint 5) [UPCOMING]:</b> Final hackathon live demo, academic impact metrics, and cloud deployment packaging.<br/>"
        "• <b>Future Scope:</b> Regional Voice-to-Voice AI tutoring, School District Dashboard, and Native Mobile Apps."
    )
    elements.append(Paragraph(rm_text, body_style))
    elements.append(Spacer(1, 4))
    
    # 7. Pitch Script Box
    elements.append(Paragraph("7. 2-Minute Reviewer Pitch Script (Oral Speech)", h1_style))
    pitch_text = (
        "<i>\"Respected judges and mentors, today we present 'Roots & Rhythm' for Checkpoint 2. Traditional platforms treat concept "
        "failure as a surface issue, giving struggling students more of the same hard problems. Our platform diagnoses the hidden root cause: "
        "when a student fails Quadratic Equations, our Root-Cause X-Ray traces the gap back to Factoring Polynomials on an interactive SVG node map. "
        "We provide step-by-step tutoring in 5 languages (English, Hindi, Kannada, Tamil, Telugu) across 3 paces, and our "
        "Free-Hour Planner schedules study blocks strictly inside the student's declared availability with auto-rebalancing. "
        "We have already built a working full-stack prototype running live on port 5000 with multi-role dashboards for students, teachers, and parents. Thank you!\"</i>"
    )
    pitch_table = Table([[Paragraph(pitch_text, quote_style)]], colWidths=[540])
    pitch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ecfdf5')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#10b981')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(pitch_table)
    
    doc.build(elements)
    print(f"[PDF Generated] File saved to {pdf_path}")

if __name__ == "__main__":
    build_pdf()
