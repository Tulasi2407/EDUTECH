/**
 * Roots & Rhythm - Command Palette (Ctrl+K / Cmd+K).
 * Instant spotlight navigation, topic search, language toggle, and mode switcher.
 */

class CommandPalette {
  constructor() {
    this.modal = null;
    this.input = null;
    this.list = null;
    this.selectedIndex = 0;
    this.items = [];
    this.init();
  }

  init() {
    const attach = () => {
      if (document.body && !document.getElementById("command-palette-modal")) {
        this.buildDOM();
        this.bindShortcuts();
        this.loadCommands();
      }
    };
    if (document.body) attach();
    else document.addEventListener("DOMContentLoaded", attach);
  }

  buildDOM() {
    const el = document.createElement("div");
    el.id = "command-palette-modal";
    el.className = "fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] hidden flex items-start justify-center pt-20 px-4";
    el.innerHTML = `
      <div class="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        <div class="p-3 border-b border-slate-100 flex items-center gap-3">
          <svg class="w-5 h-5 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input id="palette-search-input" type="text" placeholder="Type a command, topic, or feature (e.g. 'Quadratic', 'Zen', 'Hindi', 'Mode')..." class="w-full text-sm font-semibold outline-none text-slate-800 placeholder:text-slate-400 bg-transparent">
          <kbd class="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-500 rounded border border-slate-200">ESC</kbd>
        </div>
        <div id="palette-results-list" class="max-h-80 overflow-y-auto p-2 space-y-1">
          <!-- Dynamically populated -->
        </div>
        <div class="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Navigate with <kbd class="font-mono">↑</kbd> <kbd class="font-mono">↓</kbd> • Select with <kbd class="font-mono">ENTER</kbd></span>
          <span class="font-bold text-indigo-600">Roots & Rhythm Command Bar</span>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this.modal = el;
    this.input = document.getElementById("palette-search-input");
    this.list = document.getElementById("palette-results-list");

    this.input.addEventListener("input", () => this.filterCommands());
    this.input.addEventListener("keydown", (e) => this.handleKeyDown(e));

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close();
    });
  }

  loadCommands() {
    this.items = [
      // Quick Navigation
      { title: "Go to Main Dashboard", category: "Navigation", icon: "📊", action: () => window.appInstance?.setActiveTab("main-dashboard") },
      { title: "Open Root-Cause X-Ray", category: "Navigation", icon: "🚀", action: () => window.appInstance?.setActiveTab("gap-finder") },
      { title: "Open Free-Hour Study Planner", category: "Navigation", icon: "📅", action: () => window.appInstance?.setActiveTab("study-planner") },
      { title: "Open AI Assistant (Tutor)", category: "Navigation", icon: "💬", action: () => window.appInstance?.setActiveTab("ai-assistant") },
      { title: "Open My Progress Analytics", category: "Navigation", icon: "📈", action: () => window.appInstance?.setActiveTab("analytics") },
      
      // Innovative Zen Focus Chamber
      { title: "Enter Zen Rhythm Study Chamber (Pomodoro + Ambient)", category: "Focus Mode", icon: "🧘", action: () => window.zenChamber?.open() },
      
      // Learning Pace Modes (Objective 5)
      { title: "Switch to Step-by-Step Mode (15m Micro-Doses)", category: "Pace Mode", icon: "🌱", action: () => window.appInstance?.setLearningMode("step-by-step") },
      { title: "Switch to Balanced Mode (25m Pomodoro)", category: "Pace Mode", icon: "⚖️", action: () => window.appInstance?.setLearningMode("balanced") },
      { title: "Switch to Fast-Track Mode (High-Yield Shortcuts)", category: "Pace Mode", icon: "⚡", action: () => window.appInstance?.setLearningMode("fast-track") },

      // Multilingual (Objective 4)
      { title: "Switch Language to English", category: "Language", icon: "🇬🇧", action: () => window.I18N?.setLanguage("en") },
      { title: "Switch Language to Hindi (हिंदी)", category: "Language", icon: "🇮🇳", action: () => window.I18N?.setLanguage("hi") },
      { title: "Switch Language to Kannada (ಕನ್ನಡ)", category: "Language", icon: "🇮🇳", action: () => window.I18N?.setLanguage("kn") },
      { title: "Switch Language to Tamil (தமிழ்)", category: "Language", icon: "🇮🇳", action: () => window.I18N?.setLanguage("ta") },
      { title: "Switch Language to Telugu (తెలుగు)", category: "Language", icon: "🇮🇳", action: () => window.I18N?.setLanguage("te") },

      // Common Topic Deep Dives
      { title: "Trace Gaps in Quadratic Equations", category: "Topic", icon: "📐", action: () => { window.appInstance.currentTopicId = 6; window.appInstance.setActiveTab("gap-finder"); } },
      { title: "Fix Factoring Polynomials Root Cause", category: "Topic", icon: "🔍", action: () => { window.appInstance.currentTopicId = 5; window.appInstance.setActiveTab("gap-finder"); } },
      { title: "Master Negative Numbers Sign Rules", category: "Topic", icon: "➕", action: () => { window.appInstance.currentTopicId = 2; window.appInstance.setActiveTab("gap-finder"); } },
      { title: "10 Core Objectives Alignment Matrix", category: "About", icon: "🎯", action: () => document.getElementById("objectives-modal")?.classList.remove("hidden") }
    ];
  }

  bindShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.toggle();
      } else if (e.key === "Escape" && !this.modal.classList.contains("hidden")) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.modal.classList.contains("hidden")) this.open();
    else this.close();
  }

  open() {
    this.modal.classList.remove("hidden");
    this.input.value = "";
    this.selectedIndex = 0;
    this.filterCommands();
    setTimeout(() => this.input.focus(), 50);
  }

  close() {
    this.modal.classList.add("hidden");
  }

  filterCommands() {
    const q = this.input.value.toLowerCase().trim();
    const filtered = q
      ? this.items.filter(it => it.title.toLowerCase().includes(q) || it.category.toLowerCase().includes(q))
      : this.items;

    this.renderList(filtered);
  }

  renderList(filtered) {
    this.list.innerHTML = "";
    if (filtered.length === 0) {
      this.list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No matching commands found.</div>`;
      return;
    }

    filtered.forEach((item, idx) => {
      const isSelected = idx === this.selectedIndex;
      const row = document.createElement("div");
      row.className = `p-2.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition ${isSelected ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`;
      row.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="text-base">${item.icon}</span>
          <span>${item.title}</span>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'}">
          ${item.category}
        </span>
      `;

      row.addEventListener("click", () => {
        this.close();
        item.action();
      });

      this.list.appendChild(row);
    });
  }

  handleKeyDown(e) {
    const rows = this.list.querySelectorAll("div.cursor-pointer");
    if (rows.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % rows.length;
      this.updateSelection(rows);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + rows.length) % rows.length;
      this.updateSelection(rows);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const q = this.input.value.toLowerCase().trim();
      const filtered = q
        ? this.items.filter(it => it.title.toLowerCase().includes(q) || it.category.toLowerCase().includes(q))
        : this.items;
      if (filtered[this.selectedIndex]) {
        this.close();
        filtered[this.selectedIndex].action();
      }
    }
  }

  updateSelection(rows) {
    rows.forEach((r, idx) => {
      if (idx === this.selectedIndex) {
        r.classList.add("bg-indigo-600", "text-white", "font-bold");
        r.classList.remove("text-slate-700", "hover:bg-slate-100");
        r.scrollIntoView({ block: "nearest" });
      } else {
        r.classList.remove("bg-indigo-600", "text-white", "font-bold");
        r.classList.add("text-slate-700", "hover:bg-slate-100");
      }
    });
  }
}

window.commandPalette = new CommandPalette();
