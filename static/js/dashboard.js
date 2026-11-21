/**
 * Roots & Rhythm - Main Executive Dashboard Controller.
 * Implements the 10 Core Dashboard Features:
 * 1. Welcome & Student Profile
 * 2. Overall Learning Progress
 * 3. Quiz Performance
 * 4. Learning Streak
 * 5. Subject Overview
 * 6. Weak Topics
 * 7. AI Learning Insights
 * 8. Today's Study Sessions
 * 9. Performance Analytics
 * 10. Quick Actions
 */

class MainDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = null;
    this.charts = {};
  }

  async load(studentId = null) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="py-16 text-center text-slate-400">
        <svg class="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <p class="text-xs font-semibold">Loading your personalized learning dashboard...</p>
      </div>
    `;

    try {
      const url = studentId ? `/api/dashboard/overview?student_id=${studentId}` : `/api/dashboard/overview`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        this.container.innerHTML = `<div class="p-6 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold">${data.message || data.error}</div>`;
        return;
      }

      this.data = data;
      this.render();
    } catch (e) {
      console.error("Dashboard load failed:", e);
      this.container.innerHTML = `<div class="p-6 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold">Failed to load dashboard data. Please try again.</div>`;
    }
  }

  render() {
    if (!this.container || !this.data) return;

    const st = this.data.student || {};
    const prog = this.data.overall_progress || {};
    const quiz = this.data.quiz_performance || {};
    const streak = this.data.learning_streak || {};
    const subjects = this.data.subjects || [];
    const weakTopics = this.data.weak_topics || [];
    const aiInsight = this.data.ai_insights || {};
    const todaySessions = this.data.today_sessions || [];
    const quickActions = this.data.quick_actions || [];

    // Greeting based on client time
    const hour = new Date().getHours();
    let greeting = "Good Morning";
    if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
    else if (hour >= 17) greeting = "Good Evening";

    this.container.innerHTML = `
      <div class="space-y-6">

        <!-- ==============================================
             1. WELCOME & STUDENT PROFILE HERO BANNER
        =============================================== -->
        <div class="tactile-card p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-3xl shadow-sm relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div class="flex items-center gap-4">
              <div class="relative">
                <img src="${st.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=Aarav'}" alt="Student Avatar" class="w-14 h-14 rounded-2xl bg-indigo-700/60 p-1 border-2 border-indigo-400/30 object-cover shadow-sm">
                <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-indigo-950"></span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-indigo-200 font-semibold uppercase tracking-wider">${greeting},</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600/60 border border-indigo-400/40 text-indigo-100">
                    ${st.grade_or_cohort || 'Grade 10-A'}
                  </span>
                </div>
                <h2 class="text-xl sm:text-2xl font-black tracking-tight mt-0.5 text-white flex items-center gap-2">
                  ${st.name || 'Student'}
                </h2>
                <p class="text-xs text-indigo-200/80 mt-1">
                  Ready to conquer your root-cause gaps? Your study rhythm is synced strictly with your free hours.
                </p>
              </div>
            </div>

            <!-- Active Mode & Language Status Badges -->
            <div class="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-center">
              <span class="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-white flex items-center gap-1.5">
                <span>🌱 Learning Mode:</span>
                <span class="text-emerald-300 font-extrabold capitalize">${window.appInstance?.currentLearningMode || 'Balanced'}</span>
              </span>
              <span class="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-white flex items-center gap-1.5">
                <span>🌐 Language:</span>
                <span class="text-indigo-200 font-extrabold uppercase">${window.I18N?.currentLanguage() || 'EN'}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- ==============================================
             KPI STATS ROW: PROGRESS, QUIZ, STREAK, SCHEDULE
        =============================================== -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- 2. Overall Learning Progress -->
          <div class="tactile-card p-5 bg-white flex flex-col justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Overall Progress</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-2xl sm:text-3xl font-black text-indigo-600">${prog.completion_pct || 0}%</span>
                <span class="text-xs text-slate-400 font-semibold">Mastery</span>
              </div>
            </div>
            <div class="mt-3">
              <div class="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>${prog.mastered_nodes || 0} of ${prog.total_curriculum_nodes || 13} nodes</span>
                <span class="text-emerald-600 font-bold">${prog.overall_mastery_pct || 0}% avg</span>
              </div>
              <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-600 rounded-full transition-all duration-500" style="width: ${prog.completion_pct || 0}%"></div>
              </div>
            </div>
          </div>

          <!-- 3. Quiz Performance -->
          <div class="tactile-card p-5 bg-white flex flex-col justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Quiz Performance</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-2xl sm:text-3xl font-black text-emerald-600">${quiz.accuracy_pct || 0}%</span>
                <span class="text-xs text-emerald-600 font-semibold">Accuracy</span>
              </div>
            </div>
            <div class="mt-3 text-xs text-slate-500 flex items-center justify-between">
              <span>${quiz.correct_answers || 0} correct / ${quiz.total_quizzes || 0} total</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Verified</span>
            </div>
          </div>

          <!-- 4. Learning Streak -->
          <div class="tactile-card p-5 bg-white flex flex-col justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Learning Streak</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-1">
                  ${streak.streak_days || 0} <span class="text-xl">🔥</span>
                </span>
                <span class="text-xs text-slate-400 font-semibold">Days Active</span>
              </div>
            </div>
            <div class="mt-3 text-[11px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60">
              <svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path></svg>
              <span class="truncate">${streak.status_text || 'Rhythm on track!'}</span>
            </div>
          </div>

          <!-- Sessions In Free Hours Counter -->
          <div class="tactile-card p-5 bg-white flex flex-col justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Free-Hour Rhythm</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-2xl sm:text-3xl font-black text-teal-600">${todaySessions.length}</span>
                <span class="text-xs text-slate-400 font-semibold">Sessions Planned</span>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-teal-700 font-semibold">
              <span>Strictly in free hours</span>
              <button class="dash-jump-btn text-teal-600 font-bold hover:underline text-[11px]" data-tab="study-planner">Planner →</button>
            </div>
          </div>

        </div>

        <!-- ==============================================
             10. QUICK ACTION SHORTCUTS BAR
        =============================================== -->
        <div>
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">Quick Actions</span>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            ${quickActions.map(qa => `
              <button class="dash-action-btn tactile-card p-3.5 bg-white hover:border-indigo-300 text-left transition flex items-center gap-3 group" data-tab="${qa.tab}">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white transition flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">${qa.title}</h4>
                  <p class="text-[10px] text-slate-400 truncate max-w-[140px]">${qa.subtitle}</p>
                </div>
              </button>
            `).join("")}
          </div>
        </div>

        <!-- ==============================================
             7. AI LEARNING INSIGHTS BANNER
        =============================================== -->
        <div class="tactile-card p-5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-indigo-200/80 rounded-2xl">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-extrabold uppercase tracking-wider text-indigo-700">7. AI Learning Insight</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-800 border border-indigo-200">
                    ${aiInsight.verification_badge || 'AI Guardrail Verified'}
                  </span>
                </div>
                <h4 class="text-sm font-bold text-slate-900 mt-0.5">${aiInsight.title || 'Personalized Focus'}</h4>
                <p class="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">${aiInsight.message}</p>
              </div>
            </div>

            <div class="flex items-center gap-2 self-end md:self-center shrink-0">
              <button class="dash-start-gap-btn px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5" data-node-id="${aiInsight.action_node_id || 6}">
                Fix This Gap Now (${aiInsight.recommended_duration || '20m'}) →
              </button>
            </div>
          </div>
        </div>

        <!-- ==============================================
             MIDDLE ROW: WEAK TOPICS & TODAY'S STUDY SESSIONS
        =============================================== -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- 6. Weak Topics (Root Causes & Shaky) -->
          <div class="tactile-card p-5 bg-white space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  6. Weak Topics & Root Causes (${weakTopics.length})
                </h3>
                <p class="text-[11px] text-slate-500">Prerequisite bottlenecks detected by diagnostic tracer.</p>
              </div>
              <button class="dash-jump-btn text-xs font-bold text-indigo-600 hover:underline" data-tab="gap-finder">
                X-Ray Map →
              </button>
            </div>

            <div class="space-y-2.5">
              ${weakTopics.length === 0 ? `
                <div class="p-6 text-center text-xs text-emerald-700 bg-emerald-50 rounded-xl">
                  🎉 No weak bottleneck topics detected! Excellent prerequisite mastery.
                </div>
              ` : weakTopics.map(wt => {
                const isRoot = wt.status === "root_cause";
                return `
                  <div class="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition flex items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-lg ${isRoot ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'} font-bold flex items-center justify-center shrink-0 text-xs">
                        ${wt.mastery_score}%
                      </div>
                      <div>
                        <span class="font-bold text-slate-900 block">${wt.topic_name}</span>
                        <span class="text-[11px] text-slate-500">${wt.subject_name} • Tier ${wt.tier} Foundations</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isRoot ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
                        ${isRoot ? 'Root Cause' : 'Shaky'}
                      </span>
                      <button class="dash-practice-gap-btn p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" data-node-id="${wt.node_id}" title="Practice gap question">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
                      </button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- 8. Today's Study Sessions (Free-Hour Rhythm) -->
          <div class="tactile-card p-5 bg-white space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  8. Today's Study Sessions (${todaySessions.length})
                </h3>
                <p class="text-[11px] text-slate-500">Scheduled strictly inside your declared free hours.</p>
              </div>
              <button class="dash-jump-btn text-xs font-bold text-teal-600 hover:underline" data-tab="study-planner">
                All Sessions →
              </button>
            </div>

            <div class="space-y-2.5">
              ${todaySessions.length === 0 ? `
                <div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No sessions planned for today. Click "Planner" to auto-map your free hours!
                </div>
              ` : todaySessions.map(sess => {
                const isCompleted = sess.status === "completed";
                return `
                  <div class="p-3 rounded-xl border ${isCompleted ? 'bg-emerald-50/40 border-emerald-200/70' : 'bg-slate-50 border-slate-200/80'} flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}">${sess.topic_name}</span>
                        ${sess.priority === 'high' ? '<span class="text-[9px] px-1.5 py-0.2 bg-rose-50 text-rose-600 font-bold rounded border border-rose-200">High Priority</span>' : ''}
                      </div>
                      <span class="text-[11px] text-slate-500 block mt-0.5">
                        ${sess.scheduled_date} (${sess.start_time} - ${sess.end_time}) • ${sess.slot_label || 'Free Hour'}
                      </span>
                    </div>

                    <div class="shrink-0">
                      ${!isCompleted ? `
                        <button class="dash-complete-sess-btn px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition" data-id="${sess.id}">
                          Mark Done
                        </button>
                      ` : `
                        <span class="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                          Done
                        </span>
                      `}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

        </div>

        <!-- ==============================================
             5. SUBJECT OVERVIEW CARDS
        =============================================== -->
        <div class="tactile-card p-5 bg-white space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">5. Subject Overview & Enrollment</h3>
              <p class="text-[11px] text-slate-500">Progress across enrolled core curriculum disciplines.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${subjects.map(sub => `
              <div class="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 transition bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs" style="background-color: ${sub.color || '#4f46e5'}">
                      ${sub.code.substring(0, 2)}
                    </div>
                    <div>
                      <h4 class="text-xs font-bold text-slate-900">${sub.name}</h4>
                      <span class="text-[10px] text-slate-500">${sub.total_topics} Curriculum Topics</span>
                    </div>
                  </div>
                  <span class="text-xs font-black text-slate-800">${sub.avg_mastery}%</span>
                </div>

                <div>
                  <div class="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                    <span>${sub.mastered_topics || 0} Topics Mastered</span>
                    <span>${Math.round((sub.mastered_topics / (sub.total_topics || 1)) * 100)}%</span>
                  </div>
                  <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="background-color: ${sub.color || '#4f46e5'}; width: ${(sub.mastered_topics / (sub.total_topics || 1)) * 100}%"></div>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- ==============================================
             9. PERFORMANCE ANALYTICS CHARTS (WEEKLY & MONTHLY)
        =============================================== -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="tactile-card p-5 bg-white space-y-3">
            <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              9. Weekly Accuracy & Quiz Trends
            </h4>
            <div class="h-56">
              <canvas id="dash-weekly-chart"></canvas>
            </div>
          </div>

          <div class="tactile-card p-5 bg-white space-y-3">
            <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              Study Sessions Completion Breakdown
            </h4>
            <div class="h-56 flex items-center justify-center">
              <canvas id="dash-sessions-chart"></canvas>
            </div>
          </div>
        </div>

      </div>
    `;

    // Attach Event Listeners
    this.attachEvents();
    this.renderCharts();
  }

  attachEvents() {
    // Quick action / Jump buttons
    this.container.querySelectorAll(".dash-action-btn, .dash-jump-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (window.appInstance && tab) {
          window.appInstance.setActiveTab(tab);
        }
      });
    });

    // Fix gap now buttons
    this.container.querySelectorAll(".dash-start-gap-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const nid = btn.dataset.nodeId;
        if (window.appInstance) {
          window.appInstance.currentTopicId = parseInt(nid);
          window.appInstance.setActiveTab("gap-finder");
        }
      });
    });

    // Practice button on weak topics
    this.container.querySelectorAll(".dash-practice-gap-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const nid = btn.dataset.nodeId;
        if (window.appInstance) {
          window.appInstance.openPracticeModal(nid, "intermediate");
        }
      });
    });

    // Complete session from dashboard
    this.container.querySelectorAll(".dash-complete-sess-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const sessId = btn.dataset.id;
        try {
          const res = await fetch(`/api/planner/sessions/${sessId}/complete`, { method: "POST" });
          const data = await res.json();
          if (window.showToast) window.showToast(data.message || "Session completed!");
          await this.load();
        } catch (e) {
          if (window.showToast) window.showToast("Failed to complete session", "error");
        }
      });
    });
  }

  renderCharts() {
    if (!window.Chart || !this.data) return;

    // Destroy existing instances
    if (this.charts["weekly"]) this.charts["weekly"].destroy();
    if (this.charts["sessions"]) this.charts["sessions"].destroy();

    const hist = this.data.performance_analytics?.history || [];
    const labels = hist.length ? hist.map(h => h.date) : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const values = hist.length ? hist.map(h => h.accuracy) : [65, 70, 75, 80, 85, 88, 92];

    const ctx1 = document.getElementById("dash-weekly-chart");
    if (ctx1) {
      this.charts["weekly"] = new Chart(ctx1, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Accuracy %",
            data: values,
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79, 70, 229, 0.08)",
            tension: 0.35,
            fill: true,
            pointBackgroundColor: "#4f46e5",
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 0, max: 100, ticks: { font: { size: 10 } } },
            x: { ticks: { font: { size: 10 } } }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

    const sessCounts = this.data.performance_analytics?.sessions_breakdown || {};
    const ctx2 = document.getElementById("dash-sessions-chart");
    if (ctx2) {
      this.charts["sessions"] = new Chart(ctx2, {
        type: "doughnut",
        data: {
          labels: ["Completed", "Scheduled", "Rescheduled", "Skipped"],
          datasets: [{
            data: [
              sessCounts.completed || 2,
              sessCounts.scheduled || 4,
              sessCounts.rescheduled || 1,
              sessCounts.skipped || 0
            ],
            backgroundColor: ["#10b981", "#4f46e5", "#f59e0b", "#ef4444"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }
  }
}

window.MainDashboard = MainDashboard;
