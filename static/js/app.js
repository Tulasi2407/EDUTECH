/**
 * Roots & Rhythm - Core Application Controller.
 * Coordinates views, state management, role-switching demo, practice quiz runner,
 * safe AI flag modal, and free-hour declaration modals.
 */

class RootsAndRhythmApp {
  constructor() {
    this.currentUser = null;
    this.allUsers = [];
    this.currentSubjectId = 1;
    this.currentTopicId = 6; // Default to Quadratic Equations
    this.activeTab = "main-dashboard"; // 10-Feature Main Dashboard as default landing view
    this.currentLearningMode = "balanced"; // Step-by-Step, Balanced, Fast-Track (Objective 5)
    this.dashboard = null;
    this.currentLearningMode = "balanced"; // Step-by-Step, Balanced, Fast-Track (Objective 5)
    this.dashboard = null;
    this.nodeMap = null;
    this.timeline = null;
    this.analytics = null;
    this.currentPracticeQuestion = null;
    this.selectedOptionIndex = null;
    this.lastAIResponse = null;
  }

  async init() {
    this.initThemeAndAudio();
    this.dashboard = new MainDashboard("main-dashboard-container");
    this.analytics = new AnalyticsManager();
    this.timeline = new VisualStudyTimeline("timeline-container");
    this.nodeMap = new RootCauseNodeMap("node-map-root");

    await this.fetchCurrentUser();
    await this.fetchAllUsers();
    await this.fetchSubjects();
    this.setupEventListeners();
    this.updateRoleView();
    await this.dashboard.load(this.currentUser.id);
    if (window.I18N) window.I18N.applyTranslations();
  }

  initThemeAndAudio() {
    const isDark = localStorage.getItem("roots_dark_mode") === "true";
    if (isDark) {
      document.body.classList.add("dark-mode");
      const icon = document.getElementById("dark-mode-toggle-icon");
      if (icon) icon.textContent = "☀️";
    }

    const isMuted = localStorage.getItem("roots_sound_muted") === "true";
    const audioIcon = document.getElementById("audio-toggle-icon");
    if (audioIcon) {
      audioIcon.textContent = isMuted ? "🔕" : "🔔";
    }
  }

  toggleDarkMode() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("roots_dark_mode", isDark);
    const icon = document.getElementById("dark-mode-toggle-icon");
    if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    this.showToast(isDark ? "🌙 Midnight Study Mode enabled" : "☀️ Daytime Mode enabled");
  }

  toggleAudio() {
    if (!window.soundSynth) return;
    const isMuted = window.soundSynth.toggleMute();
    const icon = document.getElementById("audio-toggle-icon");
    if (icon) icon.textContent = isMuted ? "🔕" : "🔔";
    this.showToast(isMuted ? "🔕 Audio soundscapes muted" : "🔔 Ambient soundscapes active");
  }

  async fetchCurrentUser() {
    try {
      const res = await fetch("/api/auth/current-user");
      const data = await res.json();
      this.currentUser = data.user || { id: 1, name: "Aarav Sharma", role: "student" };
      this.updateUserBadge();
    } catch (e) {
      console.error(e);
    }
  }

  async fetchAllUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      this.allUsers = data.users || [];
      this.populateRoleSwitcher();
    } catch (e) {
      console.error(e);
    }
  }

  updateUserBadge() {
    const nameEl = document.getElementById("current-user-name");
    const roleEl = document.getElementById("current-user-role");
    const avatarEl = document.getElementById("current-user-avatar");

    if (nameEl) nameEl.textContent = this.currentUser.name;
    if (roleEl) {
      roleEl.textContent = (this.currentUser.grade_or_cohort || "STUDENT").toUpperCase();
      roleEl.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200";
    }
    if (avatarEl && this.currentUser.avatar_url) avatarEl.src = this.currentUser.avatar_url;
  }

  populateRoleSwitcher() {
    const select = document.getElementById("role-switcher-select");
    if (!select) return;

    select.innerHTML = this.allUsers.map(u => `
      <option value="${u.id}" ${u.id === this.currentUser.id ? 'selected' : ''}>
        ${u.name} (${u.role.toUpperCase()}) - ${u.grade_or_cohort || ''}
      </option>
    `).join("");

    select.addEventListener("change", async (e) => {
      const newUserId = e.target.value;
      await this.switchUser(newUserId);
    });
  }

  async switchUser(userId) {
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await res.json();
      if (data.status === "success") {
        this.currentUser = data.user;
        this.updateUserBadge();
        this.updateRoleView();
        this.showToast(`Switched student to ${data.user.name}`);
      }
    } catch (e) {
      this.showToast("Failed to switch student", "error");
    }
  }

  updateRoleView() {
    this.setActiveTab("main-dashboard");
  }

  setActiveTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      const isMatch = btn.dataset.tab === tabName;
      if (isMatch) {
        btn.classList.add("bg-indigo-600", "text-white", "shadow-sm");
        btn.classList.remove("text-slate-600", "hover:bg-slate-100");
        const dot = btn.querySelector(".indicator-dot");
        if (dot) dot.classList.replace("opacity-0", "opacity-100");
      } else {
        btn.classList.remove("bg-indigo-600", "text-white", "shadow-sm");
        btn.classList.add("text-slate-600", "hover:bg-slate-100");
        const dot = btn.querySelector(".indicator-dot");
        if (dot) dot.classList.replace("opacity-100", "opacity-0");
      }
    });

    // Update Topbar Breadcrumb Title
    const breadcrumb = document.getElementById("topbar-breadcrumb-title");
    const titles = {
      "main-dashboard": "1. Dashboard (Overview & Habits)",
      "my-subjects": "2. My Subjects (10th State Board Curriculum)",
      "study-planner": "3. Study Planner (Free-Hour Rhythm)",
      "practice-quiz": "4. Practice & Quiz Engine",
      "ai-assistant": "5. AI Assistant (24/7 Doubt Solver & Tutor)",
      "my-progress": "6. My Progress & Root-Cause X-Ray",
      "my-profile": "7. My Profile & Account Settings",
      "gap-finder": "Root-Cause X-Ray & Prerequisite Tracer",
      "analytics": "My Progress & Performance"
    };
    if (breadcrumb && titles[tabName]) {
      breadcrumb.textContent = titles[tabName];
    }

    // Toggle Panels
    document.querySelectorAll(".tab-content-panel").forEach(panel => {
      const matches = panel.id === `tab-${tabName}` || (tabName === "my-progress" && panel.id === "tab-my-progress");
      panel.classList.toggle("hidden", !matches);
    });

    // Close mobile sidebar on tab click
    const sidebar = document.getElementById("left-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar && backdrop && window.innerWidth < 1024) {
      sidebar.classList.add("-translate-x-full");
      backdrop.classList.add("hidden");
    }

    // Lazy load tab data
    if (tabName === "main-dashboard") {
      if (this.dashboard) this.dashboard.load(this.currentUser.id);
    } else if (tabName === "my-subjects") {
      this.renderMySubjectsView();
    } else if (tabName === "study-planner") {
      this.timeline.loadData();
    } else if (tabName === "practice-quiz") {
      this.loadPracticeQuizPane();
    } else if (tabName === "ai-assistant") {
      const subSel = document.getElementById("ai-subject-selector");
      if (subSel && !subSel.value) subSel.value = "General";
    } else if (tabName === "my-progress" || tabName === "analytics" || tabName === "gap-finder") {
      if (this.analytics) this.analytics.renderStudentAnalytics("student-analytics-container", this.currentUser.id);
      this.traceCurrentTopicGaps();
    } else if (tabName === "my-profile") {
      this.loadUserProfileView();
    } else if (tabName === "teacher-dashboard") {
      this.analytics.renderTeacherDashboard("teacher-dashboard-container");
    } else if (tabName === "parent-view") {
      this.analytics.renderParentView("parent-view-container", 1);
    } else if (tabName === "admin-panel") {
      this.analytics.renderAdminView("admin-panel-container");
    } else if (tabName === "languages") {
      if (window.I18N) window.I18N.setLanguage(window.I18N.currentLanguage());
    }
  }

  async renderMySubjectsView() {
    const container = document.getElementById("my-subjects-cards-container");
    if (!container) return;

    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <svg class="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <p class="text-xs font-semibold">Loading 10th State Board curriculum...</p>
      </div>
    `;

    try {
      const res = await fetch("/api/subjects");
      const data = await res.json();
      const subjects = data.subjects || [];

      let cardsHtml = "";
      for (const s of subjects) {
        const topRes = await fetch(`/api/subjects/${s.id}/topics`);
        const topData = await topRes.json();
        const topics = topData.topics || [];

        let topicsHtml = topics.map(t => {
          let badge = "bg-slate-100 text-slate-600 border-slate-200";
          let statusText = "Tier " + t.tier;
          return `
            <div class="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-none gap-2">
              <div class="min-w-0 flex-1">
                <p class="font-bold text-slate-800 truncate">${t.topic_name}</p>
                <p class="text-[10px] text-slate-400">${t.category} • ${t.estimated_minutes}m</p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button class="subj-practice-btn px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-extrabold transition" data-node="${t.id}">
                  🎯 Quiz
                </button>
                <button class="subj-trace-btn px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition" data-node="${t.id}" data-subject="${s.id}">
                  🔍 X-Ray
                </button>
              </div>
            </div>
          `;
        }).join("");

        cardsHtml += `
          <div class="tactile-card p-5 bg-white space-y-4 flex flex-col justify-between border-t-4" style="border-top-color: ${s.color};">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-xs" style="background-color: ${s.color};">
                    ${s.code}
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-slate-900">${s.name}</h3>
                    <p class="text-[10px] text-slate-400 font-semibold">${topics.length} Curriculum Units</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">10th Board</span>
              </div>

              <p class="text-xs text-slate-500 leading-relaxed">${s.description}</p>

              <!-- Topic List Container -->
              <div class="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 space-y-0.5 max-h-[220px] overflow-y-auto">
                ${topicsHtml}
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-[11px] font-bold text-slate-400">Stateboard Ready</span>
              <button class="subj-all-quiz-btn text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1" data-subject="${s.id}">
                Practice All Units →
              </button>
            </div>
          </div>
        `;
      }

      container.innerHTML = cardsHtml;

      // Event handlers for Subject Practice & Trace buttons
      container.querySelectorAll(".subj-practice-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const nodeId = parseInt(btn.dataset.node);
          this.currentTopicId = nodeId;
          this.setActiveTab("practice-quiz");
          this.loadPracticeQuizPane(nodeId, "intermediate");
        });
      });

      container.querySelectorAll(".subj-trace-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const nodeId = parseInt(btn.dataset.node);
          const subjId = parseInt(btn.dataset.subject);
          this.currentSubjectId = subjId;
          this.currentTopicId = nodeId;
          this.setActiveTab("my-progress");
          this.traceCurrentTopicGaps();
        });
      });

      container.querySelectorAll(".subj-all-quiz-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const subjId = parseInt(btn.dataset.subject);
          this.currentSubjectId = subjId;
          this.setActiveTab("practice-quiz");
          this.loadPracticeQuizPane(null, "beginner", subjId);
        });
      });

    } catch (e) {
      console.error(e);
      container.innerHTML = `<div class="col-span-full p-4 bg-rose-50 text-rose-700 text-xs rounded-xl font-bold">Failed to load subjects.</div>`;
    }
  }

  async loadPracticeQuizPane(nodeId = null, difficulty = "intermediate", subjectId = null) {
    const container = document.getElementById("practice-quiz-pane-content");
    if (!container) return;

    // Use passed nodeId, or currentTopicId, or default to 6 (Quadratic Equations)
    const targetNodeId = nodeId || this.currentTopicId || 6;

    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <svg class="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <p class="text-xs font-semibold">Generating verified 10th State Board practice question...</p>
      </div>
    `;

    try {
      const res = await fetch(`/api/practice/question?node_id=${targetNodeId}&difficulty=${difficulty}`);
      const data = await res.json();
      if (data.error) {
        container.innerHTML = `<div class="p-6 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold">${data.error}</div>`;
        return;
      }

      this.currentPracticeQuestion = data.question;
      this.selectedOptionIndex = null;
      this.renderPracticeQuizPaneContent(container);
    } catch (e) {
      console.error(e);
      container.innerHTML = `<div class="p-6 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold">Unable to load quiz question. Please try again.</div>`;
    }
  }

  renderPracticeQuizPaneContent(container) {
    const q = this.currentPracticeQuestion;
    if (!q || !container) return;

    container.innerHTML = `
      <div class="tactile-card p-6 sm:p-8 bg-white space-y-6 max-w-2xl mx-auto shadow-sm">
        
        <!-- Header: Topic, Subject, Difficulty, Verified Badge -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                10th State Board
              </span>
              <span class="text-xs font-bold text-slate-500 capitalize">• ${q.difficulty} Level</span>
            </div>
            <h3 class="text-base font-black text-slate-900 mt-1">${q.topic_name || 'Practice Question'}</h3>
          </div>

          <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
            ✓ ${Math.round((q.confidence_score || 0.95) * 100)}% Verified Safe AI
          </span>
        </div>

        <!-- Question Text Card -->
        <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 text-sm font-semibold text-slate-900 leading-relaxed shadow-xs">
          ${q.question_text}
        </div>

        <!-- Multiple Choice Options -->
        <div class="space-y-3" id="pane-quiz-options-list">
          ${(q.options || []).map((opt, idx) => `
            <div class="pane-option-row p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50/80 cursor-pointer transition flex items-center gap-3.5 text-xs font-semibold text-slate-800" data-idx="${idx}">
              <span class="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center font-black text-xs text-slate-500 shrink-0">
                ${String.fromCharCode(65 + idx)}
              </span>
              <span class="flex-1">${opt}</span>
            </div>
          `).join("")}
        </div>

        <!-- Submit & Actions Row -->
        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
          <button id="pane-flag-btn" class="text-xs font-bold text-slate-400 hover:text-amber-600 flex items-center gap-1 transition">
            🚩 Flag / Report Question
          </button>
          
          <button id="pane-submit-answer-btn" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition" disabled>
            Submit Answer →
          </button>
        </div>

        <!-- Feedback & Step-by-Step Solution Area -->
        <div id="pane-quiz-feedback" class="hidden mt-4 space-y-4"></div>

      </div>
    `;

    // Option selection
    const optionRows = container.querySelectorAll(".pane-option-row");
    const submitBtn = container.querySelector("#pane-submit-answer-btn");

    optionRows.forEach(row => {
      row.addEventListener("click", () => {
        optionRows.forEach(r => {
          r.className = "pane-option-row p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50/80 cursor-pointer transition flex items-center gap-3.5 text-xs font-semibold text-slate-800";
          r.querySelector("span").className = "w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center font-black text-xs text-slate-500 shrink-0";
        });

        row.className = "pane-option-row p-3.5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/60 cursor-pointer transition flex items-center gap-3.5 text-xs font-black text-indigo-950";
        row.querySelector("span").className = "w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0";

        this.selectedOptionIndex = parseInt(row.dataset.idx);
        if (submitBtn) submitBtn.disabled = false;
      });
    });

    // Submit handler
    if (submitBtn) {
      submitBtn.addEventListener("click", async () => {
        if (this.selectedOptionIndex === null) return;
        submitBtn.disabled = true;
        submitBtn.textContent = "Verifying...";

        try {
          const res = await fetch("/api/practice/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: this.currentUser.id,
              node_id: q.node_id,
              question_id: q.id,
              selected_option: this.selectedOptionIndex,
              time_spent_seconds: 35
            })
          });

          const data = await res.json();
          this.renderPaneQuizFeedback(container, data);
        } catch (e) {
          console.error(e);
          alert("Submission error. Please try again.");
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Answer →";
        }
      });
    }

    const flagBtn = container.querySelector("#pane-flag-btn");
    if (flagBtn) {
      flagBtn.addEventListener("click", () => {
        this.openAIFlagModal(q.id);
      });
    }
  }

  renderPaneQuizFeedback(container, res) {
    const feedbackBox = container.querySelector("#pane-quiz-feedback");
    const q = this.currentPracticeQuestion;
    if (!feedbackBox || !q) return;

    feedbackBox.classList.remove("hidden");
    const isCorrect = res.is_correct;

    if (isCorrect && window.confetti) {
      window.confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 80);
    }
    if (window.soundSynth) {
      isCorrect ? window.soundSynth.playChime() : window.soundSynth.playSoftChime();
    }

    feedbackBox.innerHTML = `
      <div class="p-5 rounded-2xl border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'} space-y-3">
        <div class="flex items-center gap-2 font-black text-sm">
          <span>${isCorrect ? '🎉 Correct Answer!' : '💡 Needs Conceptual Attention'}</span>
        </div>
        <p class="text-xs font-semibold leading-relaxed">
          ${isCorrect ? 'Outstanding! You correctly applied the curriculum principles.' : 'Don\'t worry! Review the step-by-step verified explanation below to master this concept.'}
        </p>
      </div>

      <!-- Verified Step-by-Step Explanation -->
      <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
        <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>📖 Step-by-Step Verified Solution</span>
        </h4>
        <div class="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-normal">
          ${q.step_by_step_explanation || 'Step 1: Apply standard 10th stateboard identity.'}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-2">
        <button id="pane-next-q-btn" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5">
          <span>Next Practice Question</span>
          <span>→</span>
        </button>
      </div>
    `;

    const nextBtn = feedbackBox.querySelector("#pane-next-q-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        this.loadPracticeQuizPane(q.node_id, q.difficulty);
      });
>>>>>>> 415c33b (feat(ui): left-aligned sidebar with 5 dedicated dashboards and 10th state board subjects)
    }
  }

  async fetchSubjects() {
    try {
      const res = await fetch("/api/subjects");
      const data = await res.json();
      const subjects = data.subjects || [];

      const select = document.getElementById("subject-select");
      if (select) {
        select.innerHTML = subjects.map(s => `
          <option value="${s.id}" ${s.id === this.currentSubjectId ? 'selected' : ''}>
            ${s.name} (${s.code})
          </option>
        `).join("");

        select.addEventListener("change", async (e) => {
          this.currentSubjectId = parseInt(e.target.value);
          await this.fetchTopicsForSubject(this.currentSubjectId);
        });
      }

      await this.fetchTopicsForSubject(this.currentSubjectId);
    } catch (e) {
      console.error(e);
    }
  }

  async fetchTopicsForSubject(subjectId) {
    try {
      const res = await fetch(`/api/subjects/${subjectId}/topics`);
      const data = await res.json();
      const topics = data.topics || [];

      const select = document.getElementById("topic-select");
      if (select) {
        select.innerHTML = topics.map(t => `
          <option value="${t.id}" ${t.id === this.currentTopicId ? 'selected' : ''}>
            ${t.topic_name} (Tier ${t.tier} • ${t.category})
          </option>
        `).join("");

        if (topics.length > 0 && !topics.some(t => t.id === this.currentTopicId)) {
          this.currentTopicId = topics[0].id;
        }

        select.addEventListener("change", (e) => {
          this.currentTopicId = parseInt(e.target.value);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async traceCurrentTopicGaps() {
    const traceBtn = document.getElementById("trace-gaps-btn");
    if (traceBtn) {
      traceBtn.disabled = true;
      traceBtn.innerHTML = "Analyzing...";
    }

    try {
      const res = await fetch(`/api/gap-finder/trace?student_id=${this.currentUser.id}&topic_id=${this.currentTopicId}`);
      const data = await res.json();

      if (data.error) {
        this.showToast(data.error, "error");
        return;
      }

      // Render Node Map
      this.nodeMap.render(data);

      // Render Prescribed Remediation Pathway list
      this.renderRemediationPathway(data);
    } catch (e) {
      console.error("Gap trace error:", e);
      this.showToast("Failed to trace topic gaps", "error");
    } finally {
      if (traceBtn) {
        traceBtn.disabled = false;
        traceBtn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          <span data-i18n="btn_trace_gaps">X-Ray Root Causes</span>
        `;
        if (window.I18N) window.I18N.applyTranslations();
      }
    }
  }

  renderRemediationPathway(data) {
    const container = document.getElementById("remediation-path-container");
    const countEl = document.getElementById("remediation-count-badge");
    const timeEl = document.getElementById("recovery-time-badge");
    if (!container) return;

    if (countEl) countEl.textContent = `${data.remediation_count || 0} gaps diagnosed`;
    if (timeEl) timeEl.textContent = `${data.estimated_recovery_minutes || 0} mins`;

    const path = data.prescribed_path || [];
    if (path.length === 0) {
      container.innerHTML = `
        <div class="p-4 text-center text-xs text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
          🎉 Incredible! All foundational prerequisite concepts for this topic are thoroughly mastered!
        </div>
      `;
      return;
    }

    container.innerHTML = path.map((item, idx) => {
      let badgeClass = "bg-rose-100 text-rose-800 border-rose-200";
      let badgeText = "Root Cause";
      if (item.status === "shaky") {
        badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
        badgeText = "Shaky Foundation";
      } else if (item.is_target) {
        badgeClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
        badgeText = "Struggling Target";
      }

      return `
        <div class="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition flex items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] shrink-0">
              ${idx + 1}
            </span>
            <div>
              <span class="font-bold text-slate-900 block">${item.topic_name}</span>
              <span class="text-[11px] text-slate-500">Tier ${item.tier} • ${item.estimated_minutes}m micro-dose • Mastery: ${item.mastery_score}%</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
              ${badgeText}
            </span>
            <button class="path-practice-btn p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" data-node-id="${item.id}" title="Practice now">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".path-practice-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const nid = btn.dataset.nodeId;
        this.openPracticeModal(nid, "intermediate");
      });
    });
  }

  async openPracticeModal(nodeId = 2, difficulty = "intermediate") {
    const modal = document.getElementById("practice-modal");
    const container = document.getElementById("practice-modal-content");
    if (!modal || !container) return;

    modal.classList.remove("hidden");
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <svg class="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <p class="text-xs">Generating pedagogical question with AI safety guardrails...</p>
      </div>
    `;

    try {
      const res = await fetch(`/api/practice/question?node_id=${nodeId}&difficulty=${difficulty}`);
      const data = await res.json();
      if (data.error) {
        container.innerHTML = `<div class="p-4 text-rose-600 bg-rose-50 rounded-xl">${data.error}</div>`;
        return;
      }

      this.currentPracticeQuestion = data.question;
      this.selectedOptionIndex = null;
      this.renderPracticeQuestionView();
    } catch (e) {
      container.innerHTML = `<div class="p-4 text-rose-600 bg-rose-50 rounded-xl">Failed to generate practice question.</div>`;
    }
  }

  renderPracticeQuestionView() {
    const container = document.getElementById("practice-modal-content");
    const q = this.currentPracticeQuestion;
    if (!container || !q) return;

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Question Meta & Confidence Badge -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            ${q.topic_name || 'Foundational Practice'} • <span class="capitalize text-indigo-600">${q.difficulty}</span>
          </span>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
            ${Math.round((q.confidence_score || 0.95) * 100)}% Confidence (${q.status})
          </span>
        </div>

        <!-- Question Prompt -->
        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-800 leading-relaxed">
          ${q.question_text}
        </div>

        <!-- Options List -->
        <div class="space-y-2.5" id="practice-options-list">
          ${(q.options || []).map((opt, idx) => `
            <div class="practice-option-row p-3 rounded-xl border border-slate-200 hover:border-indigo-300 cursor-pointer transition text-xs font-medium text-slate-700 flex items-center gap-3" data-idx="${idx}">
              <span class="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0 text-slate-500">
                ${String.fromCharCode(65 + idx)}
              </span>
              <span>${opt}</span>
            </div>
          `).join("")}
        </div>

        <!-- Bottom Controls -->
        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <button id="flag-question-btn" class="tactile-btn text-xs text-slate-500 hover:text-amber-600 flex items-center gap-1 font-semibold">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
            Review / Flag Answer
          </button>
          <button id="submit-quiz-answer-btn" class="tactile-btn px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm disabled:opacity-50" disabled>
            Submit Answer
          </button>
        </div>

        <!-- Solution Feedback Area (Hidden initially) -->
        <div id="quiz-feedback-area" class="hidden mt-4 space-y-3"></div>
      </div>
    `;

    // Option row click handlers
    const optionRows = container.querySelectorAll(".practice-option-row");
    const submitBtn = document.getElementById("submit-quiz-answer-btn");

    optionRows.forEach(row => {
      row.addEventListener("click", () => {
        optionRows.forEach(r => {
          r.classList.remove("border-indigo-600", "bg-indigo-50/50", "text-indigo-900");
          r.querySelector("span").classList.remove("border-indigo-600", "bg-indigo-600", "text-white");
        });
        row.classList.add("border-indigo-600", "bg-indigo-50/50", "text-indigo-900");
        row.querySelector("span").classList.add("border-indigo-600", "bg-indigo-600", "text-white");
        this.selectedOptionIndex = parseInt(row.dataset.idx);
        if (submitBtn) submitBtn.disabled = false;
      });
    });

    // Submit handler
    if (submitBtn) {
      submitBtn.addEventListener("click", async () => {
        if (this.selectedOptionIndex === null) return;
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Evaluating...";

        try {
          const res = await fetch("/api/practice/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question_id: q.id,
              selected_option: this.selectedOptionIndex,
              time_spent_seconds: 30
            })
          });
          const result = await res.json();
          this.displayQuizFeedback(result);
        } catch (e) {
          this.showToast("Failed to submit answer", "error");
        }
      });
    }

    // Flag question handler
    const flagBtn = document.getElementById("flag-question-btn");
    if (flagBtn) {
      flagBtn.addEventListener("click", () => {
        this.openFlagModal(q.id);
      });
    }
  }

  displayQuizFeedback(result) {
    const feedbackArea = document.getElementById("quiz-feedback-area");
    if (!feedbackArea) return;

    const isCorrect = result.is_correct;
    if (isCorrect) {
      if (window.confetti) window.confetti.burst();
      if (window.soundSynth) window.soundSynth.playSuccessChime();
    }
    const alertBg = isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900";
    const title = isCorrect ? "✅ Excellent! Correct Answer!" : "❌ Not Quite. Let's Learn From The Root Cause:";

    feedbackArea.innerHTML = `
      <div class="p-4 rounded-2xl border ${alertBg} space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-bold text-sm">${title}</span>
          <span class="text-xs font-bold">New Mastery: ${result.new_score}% (${result.new_status})</span>
        </div>
        <div class="text-xs leading-relaxed text-slate-700 bg-white/80 p-3 rounded-xl border border-slate-200/60 font-normal">
          <strong class="block text-slate-900 mb-1">Step-by-Step Educational Solution:</strong>
          ${result.step_by_step_explanation.replace(/\n/g, '<br/>')}
        </div>
      </div>
      <div class="flex justify-end pt-2">
        <button id="next-question-btn" class="tactile-btn px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl">
          Next Question
        </button>
      </div>
    `;

    feedbackArea.classList.remove("hidden");

    const nextBtn = document.getElementById("next-question-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        this.openPracticeModal(this.currentPracticeQuestion.node_id, this.currentPracticeQuestion.difficulty);
      });
    }

    if (this.timeline) this.timeline.loadData();
    if (this.dashboard) this.dashboard.load(this.currentUser.id);
  }

  openFlagModal(questionId) {
    const modal = document.getElementById("flag-modal");
    const qidInput = document.getElementById("flag-question-id");
    if (modal) {
      if (qidInput) qidInput.value = questionId;
      modal.classList.remove("hidden");
    }
  }

  setLearningMode(mode) {
    this.currentLearningMode = mode;
    document.querySelectorAll(".learning-mode-btn").forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add("bg-indigo-600", "text-white", "font-extrabold", "shadow-xs");
        btn.classList.remove("text-slate-600", "hover:bg-slate-200");
      } else {
        btn.classList.remove("bg-indigo-600", "text-white", "font-extrabold", "shadow-xs");
        btn.classList.add("text-slate-600", "hover:bg-slate-200");
      }
    });

    const activeModeLabel = document.getElementById("ai-active-mode-label");
    if (activeModeLabel) {
      const modeNames = {
        "step-by-step": "🌱 Step-by-Step Mode",
        "balanced": "⚖️ Balanced Mode",
        "fast-track": "⚡ Fast-Track Mode"
      };
      activeModeLabel.textContent = modeNames[mode] || "⚖️ Balanced Mode";
    }

    const toastMsgs = {
      "step-by-step": "Pacing: Step-by-Step Mode (15m micro-doses, extra foundational scaffolding)",
      "balanced": "Pacing: Balanced Mode (Standard 25m Pomodoro, guided concepts)",
      "fast-track": "Pacing: Fast-Track Mode (High-yield review, shortcuts & rapid drills)"
    };
    this.showToast(toastMsgs[mode] || "Pacing updated");
  }

  async askAIAssistant(customQuestion = null) {
    const inputEl = document.getElementById("ai-question-input");
    const submitBtn = document.getElementById("ai-submit-btn");
    const responseCard = document.getElementById("ai-response-card");
    const responseBody = document.getElementById("ai-response-body");
    const badgeEl = document.getElementById("ai-confidence-score-badge");

    const question = customQuestion || (inputEl ? inputEl.value : "");
    if (!question || !question.trim()) {
      this.showToast("Please enter a question or select a prompt chip", "error");
      return;
    }

    if (inputEl) inputEl.value = question;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <span>Synthesizing Step-by-Step...</span>
      `;
    }

    try {
      const currentTopicName = document.getElementById("ai-subject-selector")?.value || document.getElementById("topic-select")?.selectedOptions?.[0]?.text || "General";
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          topic: currentTopicName,
          learning_mode: this.currentLearningMode,
          language: window.I18N ? window.I18N.currentLanguage() : "en"
        })
      });

      const data = await res.json();
      if (data.error) {
        this.showToast(data.error, "error");
        return;
      }

      this.lastAIResponse = data;

      // Render markdown response safely
      if (responseBody) {
        let formatted = data.response_text || "";
        // Convert headers
        formatted = formatted.replace(/### (.*?)\n/g, '<h4 class="text-sm font-bold text-indigo-950 mt-2 mb-1">$1</h4>');
        // Convert bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Convert italic
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Convert inline code
        formatted = formatted.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-indigo-700">$1</code>');
        // Convert newlines
        formatted = formatted.replace(/\n/g, '<br/>');

        responseBody.innerHTML = formatted;
      }

      if (badgeEl) {
        const pct = Math.round((data.confidence_score || 0.98) * 100);
        badgeEl.textContent = `${pct}% Confidence (${data.verification_badge || 'Curriculum-Verified'})`;
      }

      if (responseCard) {
        responseCard.classList.remove("hidden");
        responseCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

    } catch (e) {
      console.error(e);
      this.showToast("Failed to fetch response from AI Assistant", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          <span data-i18n="btn_ask_ai">Get Step-by-Step Explanation</span>
        `;
        if (window.I18N) window.I18N.applyTranslations();
      }
    }
  }

  async loadUserProfileView() {
    try {
      const res = await fetch("/api/auth/current-user");
      const data = await res.json();
      if (!data || !data.user) return;
      const user = data.user;

      // Update hero card
      const heroAvatar = document.getElementById("profile-hero-avatar");
      if (heroAvatar) heroAvatar.src = user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`;

      const heroName = document.getElementById("profile-hero-name");
      if (heroName) heroName.textContent = user.name;

      const heroRoleBadge = document.getElementById("profile-hero-role-badge");
      if (heroRoleBadge) heroRoleBadge.textContent = (user.role || "student").toUpperCase();

      const heroUsername = document.getElementById("profile-hero-username");
      if (heroUsername) heroUsername.textContent = `@${user.username || 'aarav'}`;

      const heroEmail = document.getElementById("profile-hero-email");
      if (heroEmail) heroEmail.textContent = user.email || 'aarav@rootsrhythm.edu';

      const heroGrade = document.getElementById("profile-hero-grade");
      if (heroGrade) heroGrade.textContent = user.grade_or_cohort || 'Grade 10-A';

      // Update stats cards
      const stats = user.stats || {};
      const statStreak = document.getElementById("profile-stat-streak");
      if (statStreak) statStreak.textContent = `${stats.current_streak || 1} Days`;

      const statMastered = document.getElementById("profile-stat-mastered");
      if (statMastered) statMastered.textContent = `${stats.mastered_nodes || 14} / ${stats.total_nodes || 22}`;

      const statMasteryPct = document.getElementById("profile-stat-mastery-pct");
      if (statMasteryPct) {
        const pct = Math.round(((stats.mastered_nodes || 14) / (stats.total_nodes || 22)) * 100);
        statMasteryPct.textContent = `${pct}% curriculum mastery`;
      }

      const statSessions = document.getElementById("profile-stat-sessions");
      if (statSessions) statSessions.textContent = `${stats.completed_sessions || 0} Completed`;

      const statHours = document.getElementById("profile-stat-hours");
      if (statHours) {
        const hours = ((stats.total_study_minutes || 0) / 60).toFixed(1);
        statHours.textContent = `${hours} hrs logged`;
      }

      const statAccuracy = document.getElementById("profile-stat-accuracy");
      if (statAccuracy) statAccuracy.textContent = `${Math.round(stats.avg_quiz_score || 85)}%`;

      // Update Guardian
      const guardian = user.guardian;
      const guardianInitial = document.getElementById("profile-guardian-initial");
      const guardianName = document.getElementById("profile-guardian-name");
      const guardianEmail = document.getElementById("profile-guardian-email");
      if (guardian) {
        const gName = guardian.name || (guardian.linked_student ? guardian.linked_student.name : "Rajesh Sharma");
        const gEmail = guardian.email || (guardian.linked_student ? guardian.linked_student.email : "rajesh.parent@rootsrhythm.edu");
        if (guardianName) guardianName.textContent = gName;
        if (guardianEmail) guardianEmail.textContent = gEmail;
        if (guardianInitial) guardianInitial.textContent = gName.charAt(0).toUpperCase();
      }

      // Populate form fields
      const inputName = document.getElementById("profile-input-name");
      if (inputName) inputName.value = user.name || "";

      const inputGrade = document.getElementById("profile-input-grade");
      if (inputGrade) inputGrade.value = user.grade_or_cohort || "Grade 10-A";

      const inputUsername = document.getElementById("profile-input-username");
      if (inputUsername) inputUsername.value = user.username || "";

      const inputEmail = document.getElementById("profile-input-email");
      if (inputEmail) inputEmail.value = user.email || "";

      const inputLang = document.getElementById("profile-input-lang");
      if (inputLang) inputLang.value = user.language_preference || "en";

      const inputAvatarSeed = document.getElementById("profile-input-avatar-seed");
      if (inputAvatarSeed && !inputAvatarSeed.value) inputAvatarSeed.value = user.username || user.name || "";

    } catch (e) {
      console.error("Failed to load user profile:", e);
    }
  }

  setupEventListeners() {
    // Learning mode switcher (Objective 5)
    document.querySelectorAll(".learning-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.setLearningMode(btn.dataset.mode);
      });
    });

    // 10 Core Objectives Matrix Modal trigger
    const viewObjBtn = document.getElementById("view-objectives-btn");
    if (viewObjBtn) {
      viewObjBtn.addEventListener("click", () => {
        const modal = document.getElementById("objectives-modal");
        if (modal) modal.classList.remove("hidden");
      });
    }

    // Jump buttons inside Objectives Modal
    document.querySelectorAll(".obj-jump-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTab = btn.dataset.target;
        const modal = document.getElementById("objectives-modal");
        if (modal) modal.classList.add("hidden");
        if (targetTab) this.setActiveTab(targetTab);
      });
    });

    // AI Assistant Form submission (Objective 3)
    const aiForm = document.getElementById("ai-assistant-form");
    if (aiForm) {
      aiForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.askAIAssistant();
      });
    }

    // AI Prompt Chips
    document.querySelectorAll(".ai-prompt-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const promptText = chip.dataset.prompt;
        this.askAIAssistant(promptText);
      });
    });

    // Flag AI response button in Assistant tab
    const flagAIBtn = document.getElementById("flag-ai-response-btn");
    if (flagAIBtn) {
      flagAIBtn.addEventListener("click", () => {
        this.openFlagModal(this.currentPracticeQuestion ? this.currentPracticeQuestion.id : 1);
      });
    }

    // Profile Edit Form Submission
    const profileForm = document.getElementById("profile-edit-form");
    if (profileForm) {
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById("save-profile-btn");
        const statusSpan = document.getElementById("profile-save-status");
        const name = document.getElementById("profile-input-name")?.value;
        const grade = document.getElementById("profile-input-grade")?.value;
        const lang = document.getElementById("profile-input-lang")?.value;
        const avatarSeed = document.getElementById("profile-input-avatar-seed")?.value;
        const curPw = document.getElementById("profile-input-current-pw")?.value;
        const newPw = document.getElementById("profile-input-new-pw")?.value;
        const confPw = document.getElementById("profile-input-confirm-pw")?.value;

        if (newPw && newPw !== confPw) {
          this.showToast("New passwords do not match", "error");
          return;
        }

        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = `<span>Saving...</span>`;
        }

        try {
          const res = await fetch("/api/auth/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              grade_or_cohort: grade,
              language_preference: lang,
              avatar_seed: avatarSeed,
              current_password: curPw || undefined,
              new_password: newPw || undefined
            })
          });

          const data = await res.json();
          if (data.error) {
            this.showToast(data.message || data.error, "error");
            return;
          }

          this.showToast("Profile updated successfully! 🎉", "success");

          // Clear password fields
          if (document.getElementById("profile-input-current-pw")) document.getElementById("profile-input-current-pw").value = "";
          if (document.getElementById("profile-input-new-pw")) document.getElementById("profile-input-new-pw").value = "";
          if (document.getElementById("profile-input-confirm-pw")) document.getElementById("profile-input-confirm-pw").value = "";

          // Update current user cache and live DOM
          if (data.user) {
            this.currentUser.name = data.user.name;
            if (data.user.avatar_url) this.currentUser.avatar_url = data.user.avatar_url;

            // Live DOM updates
            document.querySelectorAll("#sidebar-user-name, #topbar-user-name, #profile-hero-name").forEach(el => {
              el.textContent = data.user.name;
            });
            document.querySelectorAll("#sidebar-user-avatar, #topbar-user-avatar, #profile-hero-avatar").forEach(el => {
              el.src = data.user.avatar_url;
            });
            const heroGrade = document.getElementById("profile-hero-grade");
            if (heroGrade) heroGrade.textContent = data.user.grade_or_cohort || 'Grade 10-A';
          }

          if (lang && window.I18N && window.I18N.currentLanguage() !== lang) {
            window.I18N.setLanguage(lang);
          }

          if (statusSpan) {
            statusSpan.classList.remove("hidden");
            setTimeout(() => statusSpan.classList.add("hidden"), 3000);
          }
        } catch (err) {
          console.error(err);
          this.showToast("Failed to update profile", "error");
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<span>💾 Save Profile Changes</span>`;
          }
        }
      });
    }

    // Avatar Randomize Button
    const randAvatarBtn = document.getElementById("profile-randomize-avatar-btn");
    if (randAvatarBtn) {
      randAvatarBtn.addEventListener("click", () => {
        const seeds = ["Aarav", "Diya", "Kiran", "Meera", "Sparky", "Cosmo", "Felix", "Zenith", "Brio", "Nova"];
        const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 100);
        const input = document.getElementById("profile-input-avatar-seed");
        if (input) input.value = randomSeed;
        const heroAvatar = document.getElementById("profile-hero-avatar");
        if (heroAvatar) heroAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
        this.showToast(`Avatar preview set to: ${randomSeed}`);
      });
    }

    // Tab switching
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.setActiveTab(btn.dataset.tab);
      });
    });

    // Language switcher buttons
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const lang = btn.dataset.lang;
        if (window.I18N) window.I18N.setLanguage(lang);
      });
    });

    // Trace gaps button
    const traceBtn = document.getElementById("trace-gaps-btn");
    if (traceBtn) {
      traceBtn.addEventListener("click", () => this.traceCurrentTopicGaps());
    }

    // Diagnostic button
    const diagBtn = document.getElementById("quick-diagnostic-btn");
    if (diagBtn) {
      diagBtn.addEventListener("click", () => {
        this.openPracticeModal(this.currentTopicId, "beginner");
      });
    }

    // Command Palette Trigger (Ctrl+K)
    const cmdPaletteBtn = document.getElementById("cmd-palette-btn");
    if (cmdPaletteBtn) {
      cmdPaletteBtn.addEventListener("click", () => {
        if (window.commandPalette) window.commandPalette.toggle();
      });
    }

    // Topbar Zen Focus Study Chamber Trigger
    const topbarZenBtn = document.getElementById("topbar-zen-btn");
    if (topbarZenBtn) {
      topbarZenBtn.addEventListener("click", () => {
        if (window.zenChamber) window.zenChamber.open();
      });
    }

    // Dark Mode Toggle
    const darkToggleBtn = document.getElementById("dark-mode-toggle-btn");
    if (darkToggleBtn) {
      darkToggleBtn.addEventListener("click", () => this.toggleDarkMode());
    }

    // Audio Synthesizer Soundscapes Toggle
    const audioToggleBtn = document.getElementById("audio-toggle-btn");
    if (audioToggleBtn) {
      audioToggleBtn.addEventListener("click", () => this.toggleAudio());
    }

    // Sidebar Mobile Toggle and Actions
    const openSidebarBtn = document.getElementById("open-sidebar-btn");
    const closeSidebarBtn = document.getElementById("close-sidebar-btn");
    const sidebar = document.getElementById("left-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");

    if (openSidebarBtn && sidebar && backdrop) {
      openSidebarBtn.addEventListener("click", () => {
        sidebar.classList.remove("-translate-x-full");
        backdrop.classList.remove("hidden");
      });
    }

    if (closeSidebarBtn && sidebar && backdrop) {
      closeSidebarBtn.addEventListener("click", () => {
        sidebar.classList.add("-translate-x-full");
        backdrop.classList.add("hidden");
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener("click", () => {
        sidebar.classList.add("-translate-x-full");
        backdrop.classList.add("hidden");
      });
    }

    const sidebarZenBtn = document.getElementById("sidebar-zen-btn");
    if (sidebarZenBtn) {
      sidebarZenBtn.addEventListener("click", () => {
        if (window.zenChamber) window.zenChamber.open();
      });
    }

    const sidebarDarkBtn = document.getElementById("sidebar-dark-mode-btn");
    if (sidebarDarkBtn) {
      sidebarDarkBtn.addEventListener("click", () => this.toggleDarkMode());
    }

    const sidebarAudioBtn = document.getElementById("sidebar-audio-btn");
    if (sidebarAudioBtn) {
      sidebarAudioBtn.addEventListener("click", () => this.toggleAudio());
    }

    // Add slot form submission
    const slotForm = document.getElementById("add-slot-form");
    if (slotForm) {
      slotForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          day_of_week: parseInt(document.getElementById("slot-day").value),
          start_time: document.getElementById("slot-start").value,
          end_time: document.getElementById("slot-end").value,
          label: document.getElementById("slot-label").value || "Study Free Hour"
        };

        try {
          const res = await fetch("/api/planner/slots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.error) {
            this.showToast(data.message || data.error, "error");
            return;
          }
          this.showToast("Free hour window successfully added!");
          document.getElementById("add-slot-modal").classList.add("hidden");
          slotForm.reset();
          if (this.timeline) this.timeline.loadData();
        } catch (err) {
          this.showToast("Failed to add free slot", "error");
        }
      });
    }

    // Flag form submission
    const flagForm = document.getElementById("flag-form");
    if (flagForm) {
      flagForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          question_id: parseInt(document.getElementById("flag-question-id").value),
          reason: document.getElementById("flag-reason").value,
          suggested_edit: document.getElementById("flag-edit").value
        };

        try {
          const res = await fetch("/api/ai/flag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          this.showToast(data.message || "Feedback submitted to faculty!");
          document.getElementById("flag-modal").classList.add("hidden");
          flagForm.reset();
        } catch (err) {
          this.showToast("Failed to submit review flag", "error");
        }
      });
    }

    // Modal close buttons
    document.querySelectorAll(".close-modal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".modal-container").forEach(m => m.classList.add("hidden"));
      });
    });

    // Close on backdrop click
    document.querySelectorAll(".modal-container").forEach(modal => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
      });
    });
  }

  showToast(message, type = "success") {
    const toast = document.getElementById("app-toast");
    const msgEl = document.getElementById("toast-message");
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.className = `fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl shadow-lg text-xs font-semibold flex items-center gap-2 transition-all duration-300 transform ${type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`;
    toast.classList.remove("translate-y-20", "opacity-0");

    setTimeout(() => {
      toast.classList.add("translate-y-20", "opacity-0");
    }, 3500);
  }
}

// Global hook helpers for node map interactions
window.startPracticeSession = function (nodeId, difficulty = "intermediate") {
  if (window.appInstance) {
    window.appInstance.openPracticeModal(nodeId, difficulty);
  }
};

window.scheduleNodeIntoFreeSlot = async function (nodeId) {
  try {
    const res = await fetch("/api/planner/auto-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node_ids: [nodeId] })
    });
    const data = await res.json();
    if (window.showToast) window.showToast(data.message || "Mapped into upcoming free hour!");
    if (window.appInstance && window.appInstance.timeline) {
      window.appInstance.timeline.loadData();
    }
  } catch (e) {
    console.error(e);
  }
};

window.showToast = function (msg, type = "success") {
  if (window.appInstance) {
    window.appInstance.showToast(msg, type);
  }
};

// Initialize application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.appInstance = new RootsAndRhythmApp();
  window.appInstance.init();
});
