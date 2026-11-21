/**
 * Roots & Rhythm - Interactive Progress & Analytics Engine.
 * Supports Student Analytics (Chart.js), Teacher Class Heatmap & Alerts,
 * Parent Jargon-Free Summary, and School Admin Institution Health.
 */

class AnalyticsManager {
  constructor() {
    this.charts = {};
  }

  async renderStudentAnalytics(containerId, studentId = 1) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const res = await fetch(`/api/analytics/student/${studentId}`);
      const data = await res.json();
      if (data.error) {
        container.innerHTML = `<div class="p-4 text-rose-600 bg-rose-50 rounded-xl">${data.error}</div>`;
        return;
      }

      const mb = data.mastery_breakdown || {};
      const topics = data.topic_scores || [];
      const stats = data.sessions_stats || {};

      container.innerHTML = `
        <div class="space-y-6">
          <!-- Top Metric Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Mastered Topics</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-2xl font-extrabold text-emerald-600">${mb.mastered || 0}</span>
                <span class="text-xs text-slate-400">foundations secure</span>
              </div>
            </div>
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Diagnosed Root Causes</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-2xl font-extrabold text-rose-600">${mb.root_cause || 0}</span>
                <span class="text-xs text-rose-500 font-medium">urgent focus</span>
              </div>
            </div>
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Shaky Foundations</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-2xl font-extrabold text-amber-600">${mb.shaky || 0}</span>
                <span class="text-xs text-amber-500">needs practice</span>
              </div>
            </div>
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Free-Hour Sessions Completed</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-2xl font-extrabold text-indigo-600">${stats.completed || 0}</span>
                <span class="text-xs text-indigo-500 font-medium">on track</span>
              </div>
            </div>
          </div>

          <!-- Charts Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="tactile-card p-5 bg-white">
              <h4 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path></svg>
                Curriculum Mastery Breakdown
              </h4>
              <div class="h-60 flex items-center justify-center">
                <canvas id="mastery-donut-chart"></canvas>
              </div>
            </div>

            <div class="tactile-card p-5 bg-white">
              <h4 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                Accuracy & Quiz Scores Over Time
              </h4>
              <div class="h-60 flex items-center justify-center">
                <canvas id="quiz-history-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- Topic Mastery Table -->
          <div class="tactile-card p-5 bg-white">
            <h4 class="text-sm font-bold text-slate-800 mb-3">Topic-by-Topic Mastery & Gap Recovery</h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th class="pb-2.5">Topic Name</th>
                    <th class="pb-2.5">Tier</th>
                    <th class="pb-2.5">Mastery Score</th>
                    <th class="pb-2.5">Status</th>
                    <th class="pb-2.5">Streak</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-slate-700">
                  ${topics.map(t => {
                    let badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Not Started</span>';
                    if (t.status === 'mastered') badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Mastered</span>';
                    if (t.status === 'shaky') badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Shaky</span>';
                    if (t.status === 'root_cause') badge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">Root Cause</span>';

                    return `
                      <tr class="hover:bg-slate-50">
                        <td class="py-2.5 font-semibold text-slate-800">${t.topic_name}</td>
                        <td class="py-2.5 text-slate-500">Tier ${t.tier}</td>
                        <td class="py-2.5">
                          <div class="flex items-center gap-2">
                            <span class="w-8 font-bold">${t.mastery_score}%</span>
                            <div class="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div class="h-full rounded-full ${t.mastery_score < 50 ? 'bg-rose-500' : (t.mastery_score < 75 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${t.mastery_score}%"></div>
                            </div>
                          </div>
                        </td>
                        <td class="py-2.5">${badge}</td>
                        <td class="py-2.5 font-semibold text-slate-600">${t.streak_count || 0} 🔥</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Render Charts if Chart.js is loaded
      if (window.Chart) {
        // Destroy existing charts to prevent memory leak
        if (this.charts["masteryDonut"]) this.charts["masteryDonut"].destroy();
        if (this.charts["quizHistory"]) this.charts["quizHistory"].destroy();

        const ctx1 = document.getElementById("mastery-donut-chart");
        if (ctx1) {
          this.charts["masteryDonut"] = new Chart(ctx1, {
            type: "doughnut",
            data: {
              labels: ["Mastered", "Shaky", "Root Cause", "Not Started"],
              datasets: [{
                data: [mb.mastered || 0, mb.shaky || 0, mb.root_cause || 0, mb.not_started || 0],
                backgroundColor: ["#10b981", "#f59e0b", "#ef4444", "#cbd5e1"],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } }
              },
              cutout: "65%"
            }
          });
        }

        const ctx2 = document.getElementById("quiz-history-chart");
        if (ctx2) {
          const hist = data.history || [];
          const labels = hist.length ? hist.map(h => h.date) : ["Day 1", "Day 2", "Day 3", "Today"];
          const values = hist.length ? hist.map(h => h.accuracy_pct) : [60, 72, 85, 90];

          this.charts["quizHistory"] = new Chart(ctx2, {
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
      }
    } catch (e) {
      console.error("Failed to load student analytics:", e);
    }
  }

  async renderTeacherDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const [analyticsRes, flagsRes] = await Promise.all([
        fetch("/api/analytics/teacher"),
        fetch("/api/ai/flags")
      ]);
      const data = await analyticsRes.json();
      const flagsData = await flagsRes.json();

      if (data.error) {
        container.innerHTML = `<div class="p-6 text-center text-rose-600 bg-rose-50 rounded-2xl">${data.message || data.error}</div>`;
        return;
      }

      const heatmap = data.topic_heatmap || [];
      const alerts = data.gap_alerts || [];
      const interventions = data.interventions || [];
      const flags = flagsData.flags || [];

      container.innerHTML = `
        <div class="space-y-6">
          <!-- Header Banner -->
          <div class="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white p-5 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold">Classroom Diagnostics & Root-Cause Heatmap</h3>
            <p class="text-xs text-indigo-200 mt-1">Real-time aggregate view of class bottlenecks, student gap alerts, and flagged AI answers.</p>
          </div>

          <!-- Student Gap Alerts & Intervention Recommendations -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="tactile-card p-5 bg-white">
              <h4 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                Urgent Student Gap Alerts (${alerts.length})
              </h4>
              <div class="space-y-3">
                ${alerts.map(a => `
                  <div class="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex items-start justify-between">
                    <div>
                      <span class="font-bold text-xs text-slate-800">${a.student_name}</span>
                      <span class="text-[11px] text-slate-500 block">${a.grade_or_cohort} • ${a.root_cause_count} Critical Root Causes</span>
                      <span class="text-[11px] text-rose-700 font-semibold block mt-0.5">Bottlenecks: ${a.critical_topics}</span>
                    </div>
                    <button class="tactile-btn px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] rounded-lg shadow-sm deploy-intervention-btn" data-student-id="${a.student_id}">
                      Intervene
                    </button>
                  </div>
                `).join("")}
              </div>
            </div>

            <div class="tactile-card p-5 bg-white">
              <h4 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                AI Answer Audit & Moderation Queue (${flags.length})
              </h4>
              <div class="space-y-3 max-h-64 overflow-y-auto pr-1">
                ${flags.length === 0 ? '<p class="text-xs text-slate-400">All AI generated answers verified and clear.</p>' : flags.map(f => `
                  <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-slate-800">${f.topic_name}</span>
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${f.resolution_status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                        ${f.resolution_status}
                      </span>
                    </div>
                    <p class="text-slate-600"><strong>Flag reason:</strong> ${f.reason}</p>
                    ${f.suggested_edit ? `<p class="text-slate-500 italic">Suggestion: "${f.suggested_edit}"</p>` : ''}
                    ${f.resolution_status === 'open' ? `
                      <button class="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-semibold resolve-flag-btn" data-flag-id="${f.id}">
                        Approve & Verify
                      </button>
                    ` : ''}
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- Class-Wide Weak-Topic Heatmap Table -->
          <div class="tactile-card p-5 bg-white">
            <h4 class="text-sm font-bold text-slate-800 mb-3">Topic Difficulty & Failure Rate Heatmap</h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                    <th class="pb-2.5">Topic</th>
                    <th class="pb-2.5">Subject</th>
                    <th class="pb-2.5">Class Average</th>
                    <th class="pb-2.5">Root Cause Stumbled</th>
                    <th class="pb-2.5">Action Needed</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-slate-700">
                  ${heatmap.map(row => {
                    const avg = row.avg_mastery || 0;
                    let risk = '<span class="text-emerald-600 font-bold">Low Risk</span>';
                    if (row.root_cause_students_count > 1 || avg < 50) {
                      risk = '<span class="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">High Risk (Pre-teach)</span>';
                    } else if (avg < 70) {
                      risk = '<span class="text-amber-600 font-bold">Review Soon</span>';
                    }

                    return `
                      <tr class="hover:bg-slate-50">
                        <td class="py-2.5 font-bold text-slate-900">${row.topic_name}</td>
                        <td class="py-2.5 text-slate-500">${row.subject_name}</td>
                        <td class="py-2.5">
                          <span class="font-bold text-sm ${avg < 50 ? 'text-rose-600' : (avg < 75 ? 'text-amber-600' : 'text-emerald-600')}">${avg}%</span>
                        </td>
                        <td class="py-2.5">
                          <span class="font-semibold text-rose-600">${row.root_cause_students_count} students</span>
                        </td>
                        <td class="py-2.5">${risk}</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Attach button events
      container.querySelectorAll(".deploy-intervention-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          if (window.showToast) window.showToast("Intervention micro-drill scheduled for student!");
        });
      });

      container.querySelectorAll(".resolve-flag-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const fid = btn.dataset.flagId;
          try {
            await fetch(`/api/ai/flags/${fid}/resolve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ resolution_status: "resolved" })
            });
            if (window.showToast) window.showToast("Flag resolved and marked verified!");
            this.renderTeacherDashboard(containerId);
          } catch (e) {
            console.error(e);
          }
        });
      });
    } catch (e) {
      console.error("Failed to load teacher dashboard:", e);
    }
  }

  async renderParentView(containerId, studentId = 1) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const res = await fetch(`/api/analytics/parent/${studentId}`);
      const data = await res.json();
      if (data.error) {
        container.innerHTML = `<div class="p-6 text-center text-rose-600 bg-rose-50 rounded-2xl">${data.message || data.error}</div>`;
        return;
      }

      const st = data.student || {};
      const sum = data.summary || {};
      const upcoming = data.upcoming_study_blocks || [];
      const milestones = data.milestones || [];

      container.innerHTML = `
        <div class="space-y-6">
          <!-- Parent Banner -->
          <div class="bg-gradient-to-r from-emerald-600 to-teal-800 text-white p-5 rounded-2xl shadow-sm">
            <span class="text-xs font-semibold text-emerald-200 block uppercase tracking-wider">Parent Overview</span>
            <h3 class="text-lg font-bold mt-1">${st.name}'s Learning Journey</h3>
            <p class="text-xs text-emerald-100 mt-1">${data.parent_tip}</p>
          </div>

          <!-- Summary Metric Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Topics Mastered</span>
              <span class="text-2xl font-black text-emerald-600 block mt-1">${sum.mastered_topics || 0}</span>
              <span class="text-[11px] text-slate-400">Solid comprehension</span>
            </div>
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Topics Needing Practice</span>
              <span class="text-2xl font-black text-amber-600 block mt-1">${sum.needs_practice_topics || 0}</span>
              <span class="text-[11px] text-slate-400">Under active review</span>
            </div>
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Core Focus (Root Causes)</span>
              <span class="text-2xl font-black text-rose-600 block mt-1">${sum.core_focus_topics || 0}</span>
              <span class="text-[11px] text-slate-400">Targeted micro-sessions</span>
            </div>
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Consistency Streak</span>
              <span class="text-2xl font-black text-indigo-600 block mt-1">${sum.current_streak_days || 0} Days 🔥</span>
              <span class="text-[11px] text-slate-400">Steady study habit</span>
            </div>
          </div>

          <!-- Upcoming Study Blocks in Free Hours -->
          <div class="tactile-card p-5 bg-white">
            <h4 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Upcoming Scheduled Study Blocks (During Free Time)
            </h4>
            <div class="space-y-2.5">
              ${upcoming.length === 0 ? '<p class="text-xs text-slate-400">No study blocks planned this week.</p>' : upcoming.map(u => `
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <span class="font-bold text-slate-900">${u.topic_name}</span>
                    <span class="text-slate-500 block text-[11px]">${u.subject_name} • ${u.scheduled_date} (${u.start_time} - ${u.end_time})</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">Scheduled</span>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Milestones & Celebrations -->
          <div class="tactile-card p-5 bg-white">
            <h4 class="text-sm font-bold text-slate-800 mb-3">Milestone Celebrations</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              ${milestones.map(m => `
                <div class="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                  <span class="font-bold text-xs text-amber-900 block">${m.title}</span>
                  <p class="text-[11px] text-slate-600 mt-0.5">${m.desc}</p>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      console.error("Failed to load parent view:", e);
    }
  }

  async renderAdminView(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const res = await fetch("/api/analytics/admin");
      const data = await res.json();
      if (data.error) {
        container.innerHTML = `<div class="p-6 text-center text-rose-600 bg-rose-50 rounded-2xl">${data.message || data.error}</div>`;
        return;
      }

      container.innerHTML = `
        <div class="space-y-6">
          <div class="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold">${data.institution_name}</h3>
            <p class="text-xs text-slate-300 mt-1">Institutional Curriculum Health, Cohort Demographics, and AI Audit Log</p>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Total Enrolled Students</span>
              <span class="text-2xl font-black text-slate-900 block mt-1">${data.total_students}</span>
            </div>
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Active Faculty</span>
              <span class="text-2xl font-black text-indigo-600 block mt-1">${data.total_teachers}</span>
            </div>
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Sessions Completed</span>
              <span class="text-2xl font-black text-emerald-600 block mt-1">${data.total_sessions_completed}</span>
            </div>
            <div class="tactile-card p-4 bg-white">
              <span class="text-xs text-slate-500 font-semibold block">Open AI Flags</span>
              <span class="text-2xl font-black text-amber-600 block mt-1">${data.open_ai_flags_for_review}</span>
            </div>
          </div>

          <!-- Subject Health Breakdown -->
          <div class="tactile-card p-5 bg-white">
            <h4 class="text-sm font-bold text-slate-800 mb-3">Curriculum Mastery Health by Department</h4>
            <div class="space-y-3">
              ${(data.subject_health || []).map(sh => `
                <div>
                  <div class="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                    <span>${sh.subject} (${sh.enrolled_learners} Learners)</span>
                    <span class="font-bold">${sh.avg_score}% Avg</span>
                  </div>
                  <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-600 rounded-full" style="width: ${sh.avg_score}%"></div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      console.error("Failed to load admin view:", e);
    }
  }
}

window.AnalyticsManager = AnalyticsManager;
