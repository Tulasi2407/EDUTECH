/**
 * Roots & Rhythm - Zen Study Chamber & Focus Pomodoro.
 * Distraction-free study space featuring:
 * - Live countdown timer adapted to learning mode (15m, 25m, 45m)
 * - 4-7-8 Breathing anxiety-relief pacer
 * - Native Web Audio soundscapes (Rain, Alpha waves)
 * - 3D Flashcard flipper with Native Speech Synthesis (TTS)
 * - Celebratory completion with XP gain & confetti burst!
 */

class ZenStudyChamber {
  constructor() {
    this.modal = null;
    this.timerInterval = null;
    this.totalSeconds = 25 * 60;
    this.remainingSeconds = 25 * 60;
    this.isRunning = false;
    this.currentTopic = "Quadratic Equations";
    this.currentConcept = "Roots & Discriminant Analysis";
    this.init();
  }

  init() {
    const attach = () => {
      if (document.body && !document.getElementById("zen-chamber-modal")) {
        this.buildDOM();
      }
    };
    if (document.body) attach();
    else document.addEventListener("DOMContentLoaded", attach);
  }

  buildDOM() {
    const el = document.createElement("div");
    el.id = "zen-chamber-modal";
    el.className = "fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[99999] hidden flex flex-col justify-between p-4 sm:p-8 text-white select-none overflow-y-auto";
    el.innerHTML = `
      <!-- Top Navigation & Controls -->
      <div class="max-w-5xl w-full mx-auto flex items-center justify-between border-b border-white/10 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <span class="text-lg">🧘</span>
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-black tracking-tight">Zen Rhythm Study Chamber</h2>
            <p class="text-[11px] text-slate-400">Deep Work • Distraction-Free Audio Pacing • 0% Stress</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Ambient Sound Selector -->
          <div class="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button class="zen-ambient-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white" data-type="none">🔇 Off</button>
            <button class="zen-ambient-btn px-2.5 py-1 rounded-lg text-slate-300 hover:text-white" data-type="rain">🌧️ Rain</button>
            <button class="zen-ambient-btn px-2.5 py-1 rounded-lg text-slate-300 hover:text-white" data-type="alpha">🧠 Alpha</button>
          </div>

          <button id="zen-close-btn" class="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      <!-- Main Focus Center Stage -->
      <div class="max-w-4xl w-full mx-auto my-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6">
        
        <!-- Timer & Breathing Bubble -->
        <div class="flex flex-col items-center text-center space-y-6">
          <div class="relative w-56 h-56 flex items-center justify-center">
            <!-- Progress SVG Ring -->
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" stroke="rgba(255, 255, 255, 0.08)" stroke-width="6" fill="none"></circle>
              <circle id="zen-timer-ring" cx="50" cy="50" r="44" stroke="#6366f1" stroke-width="6" stroke-dasharray="276.46" stroke-dashoffset="0" stroke-linecap="round" fill="none" class="transition-all duration-1000"></circle>
            </svg>

            <!-- Inner Timer Display -->
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span id="zen-timer-display" class="text-4xl sm:text-5xl font-black tracking-tight font-mono text-white">25:00</span>
              <span id="zen-timer-mode" class="text-[11px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Balanced Focus</span>
            </div>
          </div>

          <!-- Timer Action Controls -->
          <div class="flex items-center gap-3">
            <button id="zen-toggle-timer" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
              <span>Start Rhythm</span>
            </button>
            <button id="zen-reset-timer" class="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 font-semibold text-xs rounded-2xl transition">
              Reset
            </button>
          </div>

          <!-- 4-7-8 Breathing Anxiety Reliever Pacer -->
          <div class="bg-white/5 border border-white/10 p-3 rounded-2xl max-w-xs w-full flex items-center justify-between">
            <div class="flex items-center gap-2.5 text-left">
              <div id="zen-breathe-bubble" class="w-7 h-7 rounded-full bg-emerald-500/80 ring-4 ring-emerald-500/20 animate-pulse"></div>
              <div>
                <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mindful Pacer</span>
                <span id="zen-breathe-text" class="text-xs font-semibold text-emerald-300">Breathe In Gently (4s)</span>
              </div>
            </div>
            <span class="text-[10px] text-slate-400 font-mono">4-7-8</span>
          </div>
        </div>

        <!-- 3D Interactive Flashcard Flipper -->
        <div class="space-y-4">
          <div class="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Concept Flashcard (Tap to Flip)</span>
            <button id="zen-tts-btn" class="flex items-center gap-1.5 text-indigo-300 hover:text-white font-semibold">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
              <span>Listen</span>
            </button>
          </div>

          <!-- Flip Card Container -->
          <div id="zen-flashcard" class="relative h-64 w-full cursor-pointer rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 p-6 shadow-2xl flex flex-col justify-between hover:border-indigo-400/50 transition duration-300">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/30">
                Core Topic
              </span>
              <h3 id="zen-card-title" class="text-xl font-black text-white mt-2">Quadratic Equations & Roots</h3>
              <p id="zen-card-body" class="text-xs text-slate-300 mt-2 leading-relaxed font-normal">
                Standard form: ax² + bx + c = 0. The discriminant D = b² - 4ac determines whether roots are real, repeated, or complex.
              </p>
            </div>

            <div class="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <code id="zen-card-formula" class="font-mono text-emerald-400 text-xs">x = (-b ± √D) / (2a)</code>
              <span class="text-[11px] text-indigo-300 font-semibold">🔄 Tap to reveal steps</span>
            </div>
          </div>

          <!-- Finish Session Button -->
          <button id="zen-complete-session-btn" class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>Finish Session & Claim 50 XP</span>
          </button>
        </div>

      </div>

      <!-- Bottom Hint Bar -->
      <div class="max-w-5xl w-full mx-auto text-center border-t border-white/10 pt-3 text-[11px] text-slate-500">
        <span>Roots & Rhythm Zen Engine • Mindful Breathing + Ambient Focus Waves = Deep Concept Retention</span>
      </div>
    `;
    document.body.appendChild(el);
    this.modal = el;

    this.attachEvents();
  }

  attachEvents() {
    const closeBtn = document.getElementById("zen-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.close());

    // Ambient sound triggers
    this.modal.querySelectorAll(".zen-ambient-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.type;
        this.modal.querySelectorAll(".zen-ambient-btn").forEach(b => {
          b.className = "zen-ambient-btn px-2.5 py-1 rounded-lg text-slate-300 hover:text-white";
        });
        btn.className = "zen-ambient-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white";

        if (type === "none") {
          window.soundSynth?.stopAmbient();
        } else {
          window.soundSynth?.startAmbient(type);
        }
      });
    });

    // Timer Toggle
    const toggleBtn = document.getElementById("zen-toggle-timer");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => this.toggleTimer());
    }

    // Reset Timer
    const resetBtn = document.getElementById("zen-reset-timer");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetTimer());
    }

    // Flip Card Toggle
    const card = document.getElementById("zen-flashcard");
    if (card) {
      card.addEventListener("click", () => this.flipCard());
    }

    // TTS button
    const ttsBtn = document.getElementById("zen-tts-btn");
    if (ttsBtn) {
      ttsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.speakExplanation();
      });
    }

    // Complete session
    const compBtn = document.getElementById("zen-complete-session-btn");
    if (compBtn) {
      compBtn.addEventListener("click", () => this.completeSession());
    }

    // Start Breathing Pacer Loop
    this.startBreathingPacer();
  }

  open(topicName = "Quadratic Equations", minutes = null) {
    this.currentTopic = topicName;
    const mode = window.appInstance?.currentLearningMode || "balanced";
    
    // Set duration based on mode if not specified
    let mins = 25;
    if (mode === "step-by-step") mins = 15;
    else if (mode === "fast-track") mins = 45;
    if (minutes) mins = minutes;

    this.totalSeconds = mins * 60;
    this.remainingSeconds = this.totalSeconds;
    this.isRunning = false;

    const modeLabel = document.getElementById("zen-timer-mode");
    if (modeLabel) modeLabel.textContent = `${mode.toUpperCase()} FOCUS`;

    this.updateTimerDisplay();
    this.modal.classList.remove("hidden");
  }

  close() {
    this.pauseTimer();
    window.soundSynth?.stopAmbient();
    this.modal.classList.add("hidden");
  }

  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.isRunning = true;
    const toggleBtn = document.getElementById("zen-toggle-timer");
    if (toggleBtn) {
      toggleBtn.innerHTML = `
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
        <span>Pause</span>
      `;
      toggleBtn.classList.replace("bg-indigo-600", "bg-amber-600");
    }

    this.timerInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateTimerDisplay();
      } else {
        this.completeSession();
      }
    }, 1000);
  }

  pauseTimer() {
    this.isRunning = false;
    clearInterval(this.timerInterval);
    const toggleBtn = document.getElementById("zen-toggle-timer");
    if (toggleBtn) {
      toggleBtn.innerHTML = `
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
        <span>Resume</span>
      `;
      toggleBtn.classList.replace("bg-amber-600", "bg-indigo-600");
    }
  }

  resetTimer() {
    this.pauseTimer();
    this.remainingSeconds = this.totalSeconds;
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const disp = document.getElementById("zen-timer-display");
    const ring = document.getElementById("zen-timer-ring");
    if (!disp) return;

    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    disp.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    if (ring) {
      const circumference = 276.46; // 2 * PI * 44
      const fraction = this.remainingSeconds / this.totalSeconds;
      const offset = circumference * (1 - fraction);
      ring.style.strokeDashoffset = offset;
    }
  }

  startBreathingPacer() {
    const states = [
      { text: "Breathe In Slowly (4s)...", duration: 4000, bubbleColor: "bg-emerald-500", scale: "scale-125" },
      { text: "Hold Breath Gently (7s)...", duration: 7000, bubbleColor: "bg-indigo-500", scale: "scale-125" },
      { text: "Exhale Completely (8s)...", duration: 8000, bubbleColor: "bg-purple-500", scale: "scale-90" }
    ];
    let idx = 0;

    const step = () => {
      const bubble = document.getElementById("zen-breathe-bubble");
      const text = document.getElementById("zen-breathe-text");
      if (bubble && text) {
        const cur = states[idx];
        text.textContent = cur.text;
        bubble.className = `w-7 h-7 rounded-full ${cur.bubbleColor} ring-4 ring-white/20 transition-all duration-1000 ${cur.scale}`;
      }
      const delay = states[idx].duration;
      idx = (idx + 1) % states.length;
      setTimeout(step, delay);
    };
    step();
  }

  flipCard() {
    const title = document.getElementById("zen-card-title");
    const body = document.getElementById("zen-card-body");
    const formula = document.getElementById("zen-card-formula");

    if (title.textContent.includes("Step-by-Step")) {
      title.textContent = "Quadratic Equations & Roots";
      body.textContent = "Standard form: ax² + bx + c = 0. The discriminant D = b² - 4ac determines whether roots are real, repeated, or complex.";
      formula.textContent = "x = (-b ± √D) / (2a)";
    } else {
      title.textContent = "Step-by-Step Solution Path";
      body.textContent = "1. Isolate ax² + bx + c = 0\n2. Calculate D = b² - 4ac\n3. If D >= 0, compute roots via formula\n4. Verify signs!";
      formula.textContent = "Common error: (-b)² is always positive!";
    }
  }

  speakExplanation() {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-Speech not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const text = document.getElementById("zen-card-body")?.textContent || "Focus on the foundational roots.";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  completeSession() {
    this.close();
    window.confetti?.burst();
    window.soundSynth?.playLevelUpFanfare();
    if (window.showToast) {
      window.showToast("🎉 Incredible! Study block completed! +50 XP added to your rhythm.");
    }
    if (window.appInstance && window.appInstance.dashboard) {
      window.appInstance.dashboard.load();
    }
  }
}

window.zenChamber = new ZenStudyChamber();
