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
    this.activeTab = "gap-finder";
    this.nodeMap = null;
    this.timeline = null;
    this.analytics = null;
    this.currentPracticeQuestion = null;
    this.selectedOptionIndex = null;
  }

  async init() {
    this.analytics = new AnalyticsManager();
    this.timeline = new VisualStudyTimeline("timeline-container");
    this.nodeMap = new RootCauseNodeMap("node-map-root");

    await this.fetchCurrentUser();
    await this.fetchAllUsers();
    await this.fetchSubjects();
    this.setupEventListeners();
    this.updateRoleView();
    await this.traceCurrentTopicGaps();
    if (window.I18N) window.I18N.applyTranslations();
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
    const badge = document.getElementById("current-user-badge");
    const nameEl = document.getElementById("current-user-name");
    const roleEl = document.getElementById("current-user-role");
    const avatarEl = document.getElementById("current-user-avatar");

    if (nameEl) nameEl.textContent = this.currentUser.name;
    if (roleEl) roleEl.textContent = this.currentUser.role.toUpperCase();
    if (avatarEl && this.currentUser.avatar_url) avatarEl.src = this.currentUser.avatar_url;

    // Set role color
    const roleColors = {
      student: "bg-indigo-100 text-indigo-800 border-indigo-200",
      teacher: "bg-emerald-100 text-emerald-800 border-emerald-200",
      parent: "bg-teal-100 text-teal-800 border-teal-200",
      admin: "bg-purple-100 text-purple-800 border-purple-200"
    };
    if (roleEl) {
      roleEl.className = `px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleColors[this.currentUser.role] || 'bg-slate-100'}`;
    }
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
        this.showToast(`Switched persona to ${data.user.name} (${data.user.role.toUpperCase()})`);
      }
    } catch (e) {
      this.showToast("Failed to switch role", "error");
    }
  }

  updateRoleView() {
    const role = this.currentUser.role;
    // Show/hide navigation tabs depending on role permissions
    const studentTabs = document.querySelectorAll(".role-student-tab");
    const teacherTabs = document.querySelectorAll(".role-teacher-tab");
    const parentTabs = document.querySelectorAll(".role-parent-tab");
    const adminTabs = document.querySelectorAll(".role-admin-tab");

    studentTabs.forEach(el => el.classList.toggle("hidden", role !== "student" && role !== "admin"));
    teacherTabs.forEach(el => el.classList.toggle("hidden", role !== "teacher" && role !== "admin"));
    parentTabs.forEach(el => el.classList.toggle("hidden", role !== "parent" && role !== "admin"));
    adminTabs.forEach(el => el.classList.toggle("hidden", role !== "admin"));

    // Select suitable default tab
    if (role === "teacher") {
      this.setActiveTab("teacher-dashboard");
    } else if (role === "parent") {
      this.setActiveTab("parent-view");
    } else if (role === "admin") {
      this.setActiveTab("admin-panel");
    } else {
      this.setActiveTab("gap-finder");
    }
  }

  setActiveTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add("bg-indigo-600", "text-white", "shadow-sm");
        btn.classList.remove("text-slate-600", "hover:bg-slate-100");
      } else {
        btn.classList.remove("bg-indigo-600", "text-white", "shadow-sm");
        btn.classList.add("text-slate-600", "hover:bg-slate-100");
      }
    });

    document.querySelectorAll(".tab-content-panel").forEach(panel => {
      panel.classList.toggle("hidden", panel.id !== `tab-${tabName}`);
    });

    // Lazy load tab data
    if (tabName === "gap-finder") {
      this.traceCurrentTopicGaps();
    } else if (tabName === "study-planner") {
      this.timeline.loadData();
    } else if (tabName === "analytics") {
      this.analytics.renderStudentAnalytics("student-analytics-container", this.currentUser.id);
    } else if (tabName === "teacher-dashboard") {
      this.analytics.renderTeacherDashboard("teacher-dashboard-container");
    } else if (tabName === "parent-view") {
      this.analytics.renderParentView("parent-view-container", 1);
    } else if (tabName === "admin-panel") {
      this.analytics.renderAdminView("admin-panel-container");
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
  }

  openFlagModal(questionId) {
    const modal = document.getElementById("flag-modal");
    const qidInput = document.getElementById("flag-question-id");
    if (modal) {
      if (qidInput) qidInput.value = questionId;
      modal.classList.remove("hidden");
    }
  }

  setupEventListeners() {
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
window.startPracticeSession = function(nodeId, difficulty = "intermediate") {
  if (window.appInstance) {
    window.appInstance.openPracticeModal(nodeId, difficulty);
  }
};

window.scheduleNodeIntoFreeSlot = async function(nodeId) {
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

window.showToast = function(msg, type = "success") {
  if (window.appInstance) {
    window.appInstance.showToast(msg, type);
  }
};

// Initialize application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.appInstance = new RootsAndRhythmApp();
  window.appInstance.init();
});
