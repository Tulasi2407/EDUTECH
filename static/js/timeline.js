/**
 * Roots & Rhythm - Visual Free-Hour Timeline & Smart Study Planner.
 * Visualizes declared free-hour slots, scheduled micro-study blocks snapping into free hours,
 * one-tap completion, dynamic rescheduling, and automatic rhythm rebalancing.
 */

class VisualStudyTimeline {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.slots = [];
    this.sessions = [];
    this.init();
  }

  init() {
    if (!this.container) return;
  }

  async loadData() {
    try {
      const [slotsRes, sessRes] = await Promise.all([
        fetch("/api/planner/slots"),
        fetch("/api/planner/sessions")
      ]);
      const slotsData = await slotsRes.json();
      const sessData = await sessRes.json();
      this.slots = slotsData.slots || [];
      this.sessions = sessData.sessions || [];
      this.render();
    } catch (e) {
      console.error("Failed to load planner data:", e);
    }
  }

  render() {
    if (!this.container) return;

    const daysMap = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const fullDaysMap = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    this.container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Declared Free-Hour Windows (${this.slots.length})
            </h3>
            <p class="text-xs text-slate-500">Study blocks only schedule inside these declared time windows.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="add-slot-btn" class="tactile-btn px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              + Declare Free Hour
            </button>
            <button id="rebalance-btn" class="tactile-btn px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-xl border border-amber-200 flex items-center gap-1.5" title="Auto-rebalance skipped or overdue sessions">
              <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Auto-Rebalance
            </button>
            <button id="auto-schedule-btn" class="tactile-btn px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Auto-Map Gaps
            </button>
          </div>
        </div>

        <!-- Declared Free-Hour Pills List -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          ${this.slots.map(s => `
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-indigo-300 transition">
              <div>
                <span class="font-bold text-slate-800">${daysMap[s.day_of_week]}: ${s.start_time} - ${s.end_time}</span>
                <span class="block text-[11px] text-slate-500 truncate max-w-[120px]">${s.label}</span>
              </div>
              <button class="delete-slot-btn text-slate-400 hover:text-rose-500 p-1" data-slot-id="${s.id}" title="Remove slot">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          `).join("")}
        </div>

        <!-- Scheduled Micro-Study Blocks (Snapping into declared slots) -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              Scheduled Micro-Study Sessions (${this.sessions.length})
            </h4>
            <span class="text-xs text-slate-500">Targeting Root-Cause Gaps</span>
          </div>

          ${this.sessions.length === 0 ? `
            <div class="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <svg class="w-12 h-12 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              <p class="text-sm font-medium text-slate-600">No study sessions mapped into free hours yet.</p>
              <p class="text-xs text-slate-400 mt-1">Click "Auto-Map Gaps" above to automatically schedule root-cause sessions strictly into your declared free hours!</p>
            </div>
          ` : `
            <div class="space-y-3">
              ${this.sessions.map(sess => {
                const isCompleted = sess.status === "completed";
                const isSkipped = sess.status === "skipped";
                const isRescheduled = sess.status === "rescheduled";

                let statusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                    Scheduled
                  </span>
                `;
                if (isCompleted) {
                  statusBadge = `
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      ✅ Completed
                    </span>
                  `;
                } else if (isSkipped) {
                  statusBadge = `
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      Skipped
                    </span>
                  `;
                } else if (isRescheduled) {
                  statusBadge = `
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                      Rescheduled
                    </span>
                  `;
                }

                return `
                  <div class="tactile-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${isCompleted ? 'bg-emerald-50/30 border-emerald-200/60' : 'bg-white'}">
                    <div class="flex items-start gap-3">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-600'}">
                        ${sess.duration_minutes}m
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h5 class="text-sm font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-500' : ''}">
                            ${sess.topic_name}
                          </h5>
                          ${statusBadge}
                          ${sess.priority === 'high' ? '<span class="text-[10px] px-1.5 py-0.2 bg-rose-50 text-rose-600 font-bold rounded border border-rose-200">Gap Focus</span>' : ''}
                        </div>
                        <div class="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span class="flex items-center gap-1">
                            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            ${sess.scheduled_date} (${sess.start_time} - ${sess.end_time})
                          </span>
                          <span>•</span>
                          <span>${sess.slot_label || 'Declared Window'}</span>
                        </div>
                        ${sess.notes ? `<p class="text-[11px] text-slate-400 mt-1 italic">${sess.notes}</p>` : ''}
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2 self-end md:self-center shrink-0">
                      ${!isCompleted ? `
                        <button class="complete-sess-btn px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1" data-id="${sess.id}">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                          Mark Done
                        </button>
                        <button class="reschedule-sess-btn px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition" data-id="${sess.id}">
                          Reschedule
                        </button>
                      ` : `
                        <span class="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          Mastery Level Up!
                        </span>
                      `}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          `}
        </div>
      </div>
    `;

    // Attach Event Listeners
    // Add slot button
    const addSlotBtn = document.getElementById("add-slot-btn");
    if (addSlotBtn) {
      addSlotBtn.addEventListener("click", () => this.openAddSlotModal());
    }

    // Auto schedule button
    const autoScheduleBtn = document.getElementById("auto-schedule-btn");
    if (autoScheduleBtn) {
      autoScheduleBtn.addEventListener("click", async () => {
        autoScheduleBtn.disabled = true;
        autoScheduleBtn.innerHTML = "Scheduling...";
        try {
          const res = await fetch("/api/planner/auto-schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
          });
          const data = await res.json();
          if (window.showToast) window.showToast(data.message || "Sessions scheduled!");
          await this.loadData();
        } catch (e) {
          if (window.showToast) window.showToast("Failed to schedule sessions", "error");
        }
      });
    }

    // Rebalance button
    const rebalanceBtn = document.getElementById("rebalance-btn");
    if (rebalanceBtn) {
      rebalanceBtn.addEventListener("click", async () => {
        rebalanceBtn.disabled = true;
        rebalanceBtn.innerHTML = "Rebalancing...";
        try {
          const res = await fetch("/api/planner/rebalance", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          const data = await res.json();
          if (window.showToast) window.showToast(data.message || "Schedule rebalanced smoothly!");
          await this.loadData();
        } catch (e) {
          if (window.showToast) window.showToast("Failed to rebalance", "error");
        }
      });
    }

    // Delete slot buttons
    this.container.querySelectorAll(".delete-slot-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const slotId = btn.dataset.slotId;
        if (!confirm("Are you sure you want to remove this free time window?")) return;
        try {
          await fetch(`/api/planner/slots/${slotId}`, { method: "DELETE" });
          if (window.showToast) window.showToast("Slot removed");
          await this.loadData();
        } catch (e) {
          if (window.showToast) window.showToast("Failed to remove slot", "error");
        }
      });
    });

    // Complete session buttons
    this.container.querySelectorAll(".complete-sess-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const sessId = btn.dataset.id;
        try {
          const res = await fetch(`/api/planner/sessions/${sessId}/complete`, { method: "POST" });
          const data = await res.json();
          if (window.showToast) window.showToast(data.message || "Session completed!");
          await this.loadData();
          if (window.refreshProgress) window.refreshProgress();
        } catch (e) {
          if (window.showToast) window.showToast("Failed to complete session", "error");
        }
      });
    });

    // Reschedule session buttons
    this.container.querySelectorAll(".reschedule-sess-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const sessId = btn.dataset.id;
        try {
          const res = await fetch(`/api/planner/sessions/${sessId}/reschedule`, { method: "POST" });
          const data = await res.json();
          if (window.showToast) window.showToast(data.message || "Session rescheduled!");
          await this.loadData();
        } catch (e) {
          if (window.showToast) window.showToast("Failed to reschedule", "error");
        }
      });
    });
  }

  openAddSlotModal() {
    const modal = document.getElementById("add-slot-modal");
    if (modal) modal.classList.remove("hidden");
  }
}

window.VisualStudyTimeline = VisualStudyTimeline;
