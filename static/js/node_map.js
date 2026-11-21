/**
 * Roots & Rhythm - Interactive Root-Cause Node Map (SVG Graph)
 * Renders dependency hierarchy, color-coded mastery nodes, animated connection flows,
 * and provides instant click-to-open drill-down drawers.
 */

class RootCauseNodeMap {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.currentData = null;
    this.selectedNode = null;
    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="relative w-full h-[450px] md:h-[520px] flex items-center justify-center node-map-container select-none">
        <svg id="node-map-svg" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow-mastered" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker id="arrow-shaky" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-root" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-default" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
            </marker>
            <!-- Drop shadows -->
            <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
            </filter>
          </defs>
          <g id="edges-layer"></g>
          <g id="nodes-layer"></g>
        </svg>

        <!-- Floating Legend & Overlay Controls -->
        <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 text-xs shadow-sm flex flex-wrap gap-3 items-center z-10">
          <span class="flex items-center gap-1 font-semibold text-slate-700">
            <span class="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-200"></span> Root Cause
          </span>
          <span class="flex items-center gap-1 font-semibold text-slate-700">
            <span class="w-3 h-3 rounded-full bg-amber-500"></span> Shaky
          </span>
          <span class="flex items-center gap-1 font-semibold text-slate-700">
            <span class="w-3 h-3 rounded-full bg-emerald-500"></span> Mastered
          </span>
          <span class="flex items-center gap-1 font-semibold text-slate-700">
            <span class="w-3 h-3 rounded-full bg-indigo-600 ring-2 ring-indigo-200"></span> Target Topic
          </span>
        </div>

        <div class="absolute bottom-3 right-3 text-[11px] text-slate-400 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
          <span>Tap any node for bite-sized guidance</span>
        </div>
      </div>
    `;
  }

  render(data) {
    this.currentData = data;
    const svg = document.getElementById("node-map-svg");
    const edgesLayer = document.getElementById("edges-layer");
    const nodesLayer = document.getElementById("nodes-layer");
    if (!svg || !edgesLayer || !nodesLayer) return;

    edgesLayer.innerHTML = "";
    nodesLayer.innerHTML = "";

    const nodes = data.nodes || [];
    const edges = data.edges || [];

    if (nodes.length === 0) {
      nodesLayer.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#94a3b8" font-size="14">No dependency nodes found</text>`;
      return;
    }

    // Dynamic Hierarchical Layout (Tier 1 = Bottom, Tier 2 = Middle, Tier 3 = Top)
    const width = this.container.clientWidth || 600;
    const height = (this.container.clientHeight || 480) - 40;

    // Group nodes by tier
    const tiers = { 1: [], 2: [], 3: [] };
    nodes.forEach(n => {
      const t = n.tier || 2;
      if (!tiers[t]) tiers[t] = [];
      tiers[t].push(n);
    });

    const positions = {};

    // Calculate Y positions (Tier 3 on top: y=90, Tier 2: y=230, Tier 1 at bottom: y=370)
    const tierY = {
      3: height * 0.18 + 20,
      2: height * 0.52 + 10,
      1: height * 0.84 + 5
    };

    [1, 2, 3].forEach(tier => {
      const tierNodes = tiers[tier] || [];
      const count = tierNodes.length;
      tierNodes.forEach((node, idx) => {
        const xStep = width / (count + 1);
        const x = xStep * (idx + 1);
        const y = tierY[tier];
        positions[node.id] = { x, y, node };
      });
    });

    // 1. Render Edges (Prerequisite dependency curves)
    edges.forEach(edge => {
      const fromPos = positions[edge.from];
      const toPos = positions[edge.to];
      if (!fromPos || !toPos) return;

      // Color based on source status
      let strokeColor = "#94a3b8";
      let markerId = "arrow-default";
      if (fromPos.node.status === "root_cause") {
        strokeColor = "#ef4444";
        markerId = "arrow-root";
      } else if (fromPos.node.status === "shaky") {
        strokeColor = "#f59e0b";
        markerId = "arrow-shaky";
      } else if (fromPos.node.status === "mastered") {
        strokeColor = "#10b981";
        markerId = "arrow-mastered";
      }

      // Smooth cubic bezier curve
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const controlY1 = fromPos.y + dy * 0.4;
      const controlY2 = toPos.y - dy * 0.4;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${fromPos.x} ${fromPos.y} C ${fromPos.x} ${controlY1}, ${toPos.x} ${controlY2}, ${toPos.x} ${toPos.y}`);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("marker-end", `url(#${markerId})`);
      path.classList.add("dependency-edge");

      edgesLayer.appendChild(path);
    });

    // 2. Render Nodes
    nodes.forEach(node => {
      const pos = positions[node.id];
      if (!pos) return;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
      g.classList.add("node-circle");
      g.style.cursor = "pointer";

      // Color selection
      let fillColor = "#ffffff";
      let strokeColor = "#94a3b8";
      let badgeBg = "#64748b";

      if (node.is_target) {
        strokeColor = "#6366f1";
        badgeBg = "#4f46e5";
      } else if (node.status === "root_cause") {
        strokeColor = "#ef4444";
        badgeBg = "#dc2626";
      } else if (node.status === "shaky") {
        strokeColor = "#f59e0b";
        badgeBg = "#d97706";
      } else if (node.status === "mastered") {
        strokeColor = "#10b981";
        badgeBg = "#059669";
      }

      // If root cause, render pulsating radar aura
      if (node.status === "root_cause") {
        const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        pulse.setAttribute("r", "34");
        pulse.setAttribute("fill", "none");
        pulse.setAttribute("stroke", "#ef4444");
        pulse.classList.add("root-cause-pulse");
        g.appendChild(pulse);
      }

      // Outer ring / target indicator
      if (node.is_target) {
        const targetRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        targetRing.setAttribute("r", "36");
        targetRing.setAttribute("fill", "none");
        targetRing.setAttribute("stroke", "#818cf8");
        targetRing.setAttribute("stroke-width", "2");
        targetRing.setAttribute("stroke-dasharray", "4, 4");
        g.appendChild(targetRing);
      }

      // Main Circle
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", "28");
      circle.setAttribute("fill", fillColor);
      circle.setAttribute("stroke", strokeColor);
      circle.setAttribute("stroke-width", "4");
      circle.setAttribute("filter", "url(#node-glow)");
      g.appendChild(circle);

      // Score / Status icon inside node
      const scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      scoreText.setAttribute("text-anchor", "middle");
      scoreText.setAttribute("dy", "5");
      scoreText.setAttribute("font-size", "12");
      scoreText.setAttribute("font-weight", "bold");
      scoreText.setAttribute("fill", strokeColor);
      scoreText.textContent = node.is_target ? "GOAL" : `${node.mastery_score}%`;
      g.appendChild(scoreText);

      // Label below node
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("y", "44");
      label.setAttribute("font-size", "11");
      label.setAttribute("font-weight", "600");
      label.setAttribute("fill", "#1e293b");

      // Shorten label if too long for clean mobile display
      const displayName = node.topic_name.length > 22 ? node.topic_name.substring(0, 20) + "..." : node.topic_name;
      label.textContent = displayName;
      g.appendChild(label);

      // Sub-label (Tier / Status)
      const subLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subLabel.setAttribute("text-anchor", "middle");
      subLabel.setAttribute("y", "58");
      subLabel.setAttribute("font-size", "9");
      subLabel.setAttribute("font-weight", "500");
      subLabel.setAttribute("fill", badgeBg);
      subLabel.textContent = node.is_target ? "Target Stumbled Topic" : (node.status === "root_cause" ? "⚠️ Root-Cause Gap" : `Tier ${node.tier}`);
      g.appendChild(subLabel);

      // Click event: Opens the Instant Drill-Down Drawer
      g.addEventListener("click", () => {
        this.openDrillDownDrawer(node);
      });

      nodesLayer.appendChild(g);
    });
  }

  openDrillDownDrawer(node) {
    this.selectedNode = node;
    const drawer = document.getElementById("node-drawer");
    const backdrop = document.getElementById("node-drawer-backdrop");
    const content = document.getElementById("node-drawer-content");
    if (!drawer || !backdrop || !content) return;

    let badgeClass = "bg-slate-100 text-slate-700";
    let badgeText = "Not Started";
    if (node.is_target) {
      badgeClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
      badgeText = "Struggling Target Topic";
    } else if (node.status === "root_cause") {
      badgeClass = "bg-rose-100 text-rose-800 border-rose-200 animate-pulse";
      badgeText = "🚨 Diagnosed Root Cause";
    } else if (node.status === "shaky") {
      badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
      badgeText = "⚠️ Shaky Foundation";
    } else if (node.status === "mastered") {
      badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
      badgeText = "✅ Mastered";
    }

    content.innerHTML = `
      <div class="flex items-start justify-between border-b border-slate-100 pb-4">
        <div>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass} mb-2">
            ${badgeText}
          </span>
          <h3 class="text-xl font-bold text-slate-900">${node.topic_name}</h3>
          <p class="text-xs text-slate-500 font-medium">Category: ${node.category} • Tier ${node.tier} Foundations • Est. ${node.estimated_minutes} mins</p>
        </div>
        <button id="close-drawer-btn" class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Mastery Bar -->
      <div class="my-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div class="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
          <span>Current Diagnostic Mastery</span>
          <span class="font-bold text-sm ${node.mastery_score < 50 ? 'text-rose-600' : (node.mastery_score < 75 ? 'text-amber-600' : 'text-emerald-600')}">${node.mastery_score}%</span>
        </div>
        <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500 ${node.mastery_score < 50 ? 'bg-rose-500' : (node.mastery_score < 75 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${node.mastery_score}%"></div>
        </div>
      </div>

      <!-- Bite-Sized Conceptual Explanation -->
      <div class="my-4 space-y-3">
        <h4 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Bite-Sized Conceptual Breakdown
        </h4>
        <div class="text-sm text-slate-600 leading-relaxed bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100/60 font-normal prose prose-sm max-w-none">
          ${node.explanation_markdown.replace(/\n/g, '<br/>')}
        </div>

        ${node.key_formulae ? `
          <div class="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs border border-slate-800 shadow-inner flex items-center justify-between">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Key Identity / Rule</span>
              <code>${node.key_formulae}</code>
            </div>
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] rounded border border-emerald-800 font-sans font-semibold">Standard</span>
          </div>
        ` : ''}
      </div>

      <!-- Adaptive Learning Speeds -->
      <div class="my-4">
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Select Your Speed Flow</label>
        <div class="grid grid-cols-3 gap-2">
          <button class="speed-select-btn active p-2 rounded-xl text-center border text-xs font-semibold border-indigo-600 bg-indigo-50 text-indigo-700" data-speed="beginner">
            <span class="block font-bold">Beginner</span>
            <span class="text-[10px] text-slate-500">15m micro-dose</span>
          </button>
          <button class="speed-select-btn p-2 rounded-xl text-center border text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50" data-speed="intermediate">
            <span class="block font-bold">Balanced</span>
            <span class="text-[10px] text-slate-500">25m Pomodoro</span>
          </button>
          <button class="speed-select-btn p-2 rounded-xl text-center border text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50" data-speed="advanced">
            <span class="block font-bold">Deep Dive</span>
            <span class="text-[10px] text-slate-500">45m mastery</span>
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-4 border-t border-slate-100 space-y-2">
        <button id="drawer-practice-btn" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Practice This Gap Now
        </button>
        <button id="drawer-schedule-btn" class="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          Map Into My Next Free Hour
        </button>
      </div>
    `;

    // Speed button click handlers
    content.querySelectorAll(".speed-select-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        content.querySelectorAll(".speed-select-btn").forEach(b => {
          b.classList.remove("border-indigo-600", "bg-indigo-50", "text-indigo-700");
          b.classList.add("border-slate-200", "bg-white", "text-slate-700");
        });
        btn.classList.add("border-indigo-600", "bg-indigo-50", "text-indigo-700");
        btn.classList.remove("border-slate-200", "bg-white", "text-slate-700");
      });
    });

    // Close handler
    const closeBtn = document.getElementById("close-drawer-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeDrawer());

    // Practice click
    const practiceBtn = document.getElementById("drawer-practice-btn");
    if (practiceBtn) {
      practiceBtn.addEventListener("click", () => {
        this.closeDrawer();
        if (window.startPracticeSession) {
          window.startPracticeSession(node.id, "intermediate");
        }
      });
    }

    // Schedule click
    const scheduleBtn = document.getElementById("drawer-schedule-btn");
    if (scheduleBtn) {
      scheduleBtn.addEventListener("click", () => {
        this.closeDrawer();
        if (window.scheduleNodeIntoFreeSlot) {
          window.scheduleNodeIntoFreeSlot(node.id);
        }
      });
    }

    // Show drawer
    drawer.classList.remove("translate-x-full");
    backdrop.classList.remove("hidden");
  }

  closeDrawer() {
    const drawer = document.getElementById("node-drawer");
    const backdrop = document.getElementById("node-drawer-backdrop");
    if (drawer) drawer.classList.add("translate-x-full");
    if (backdrop) backdrop.classList.add("hidden");
  }
}

window.RootCauseNodeMap = RootCauseNodeMap;
