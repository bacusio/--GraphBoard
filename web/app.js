(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const PALETTE = ["#95CAF2", "#F9A3DF", "#B488D2", "#F69D62", "#E46E83"];
  const DEFAULT_EDGE = { label: "关系", direction: "forward", color: "#F9A3DF", style: "solid" };
  const STORAGE_KEY = "graphboard-mvp-autosave-v1";
  const MAX_HISTORY = 100;
  const EXAMPLE_DEFINITIONS = {
    company: { title: "公司组织与项目协作关系", groups: ["产品团队", "设计团队", "项目协作"], nodes: [["产品负责人",0,100,120],["设计师",1,430,120],["研发团队",0,100,330],["品牌项目",2,430,330],["发布活动",2,760,230]], edges: [[0,1,"需求协作"],[0,2,"管理"],[1,3,"视觉设计"],[2,3,"开发"],[3,4,"交付"]] },
    characters: { title: "游戏、小说和动画人物关系", groups: ["主角阵营", "对手阵营", "世界事件"], nodes: [["星野",0,140,170],["白羽",0,140,390],["夜王",1,520,170],["守护者",1,520,390],["终局之战",2,850,280]], edges: [[0,1,"伙伴"],[0,2,"竞争"],[1,3,"师徒"],[2,4,"触发"],[3,4,"守护"]] },
    academic: { title: "学术导师与研究谱系", groups: ["第一代导师", "第二代研究者", "研究方向"], nodes: [["林教授",0,120,180],["周博士",1,430,110],["陈博士",1,430,330],["复杂系统",2,820,180],["计算社会学",2,820,380]], edges: [[0,1,"指导"],[0,2,"指导"],[1,3,"研究"],[2,4,"研究"],[3,4,"交叉"]] },
    supply: { title: "品牌、公司与供应链", groups: ["原材料", "制造与物流", "品牌与渠道"], nodes: [["芯片供应商",0,120,170],["制造工厂",1,440,170],["物流公司",1,440,390],["智能设备品牌",2,820,170],["零售渠道",2,820,390]], edges: [[0,1,"供货"],[1,2,"发运"],[1,3,"代工"],[2,4,"配送"],[3,4,"销售"]] },
    knowledge: { title: "知识图谱与概念体系", groups: ["概念", "方法", "应用"], nodes: [["范畴",0,120,180],["对象",0,120,390],["态射",1,460,180],["复合",1,460,390],["关系图谱",2,830,280]], edges: [[0,2,"定义"],[1,2,"组成"],[2,3,"形成"],[3,4,"应用"],[0,4,"抽象"]] },
    software: { title: "软件模块与依赖关系", groups: ["界面层", "服务层", "数据层"], nodes: [["画布 UI",0,120,180],["快捷键",0,120,390],["本地服务",1,460,180],["项目存储",2,830,180],["导出模块",1,460,390]], edges: [[0,2,"调用"],[1,0,"增强"],[2,3,"读写"],[2,4,"调用"],[4,3,"读取"]] },
    workflow: { title: "工作流程与状态转换", groups: ["准备", "执行", "完成"], nodes: [["需求输入",0,120,180],["审核",0,120,390],["设计制作",1,460,180],["测试验收",1,460,390],["发布交付",2,830,280]], edges: [[0,1,"提交"],[1,2,"通过"],[2,3,"产出"],[3,4,"验收"],[1,4,"跳过"]] },
    mapping: { title: "不同分类体系、数据库或世界观之间的映射", groups: ["现实组织", "关系视图", "另一套分类"], nodes: [["现实组合",0,120,180],["现实成员",0,120,390],["直播互动",1,480,180],["舞台合作",1,480,390],["数据库实体",2,850,280]], edges: [[0,2,"函子映射"],[1,3,"函子映射"],[2,4,"对齐"],[3,4,"对齐"],[0,4,"索引"]] }
  };

  const dom = Object.fromEntries([
    "canvas", "world", "groupLayer", "edgeLayer", "previewLayer", "nodeLayer", "emptyState",
    "connectionToast", "projectTitle", "projectStatus", "undoButton", "redoButton", "saveButton",
    "openButton", "exportButton", "importButton", "emptyImportButton", "addGroupButton", "addTriangleButton", "layoutButton", "layoutMode", "timeSliceSelect", "diffMode",
    "fitButton", "zoomReadout", "snapState", "objectCount", "relationCount", "groupCount", "statusHelp",
    "imageInput", "replaceImageInput", "projectInput", "inspectorEmpty", "nodeInspector", "edgeInspector",
    "groupInspector", "nodeName", "nodeColor", "nodeGroup", "nodeNote", "replaceImageButton", "edgeLabel",
    "edgeDirection", "edgeColor", "edgeStyle", "reverseEdgeButton", "reconnectEdgeButton", "groupName",
    "groupColor"
  ].map(id => [id, document.getElementById(id)]));

  let model = createEmptyModel();
  let history = [];
  let future = [];
  let selected = null;
  let selectedNodes = new Set();
  let tool = "select";
  let interaction = null;
  let hoverNodeId = null;
  let altDown = false;
  let spaceDown = false;
  let dirty = false;
  let lastEdgeStyle = { ...DEFAULT_EDGE };

  function createEmptyModel() {
    return {
      schema: "graphboard-project",
      version: 1,
      title: "未命名关系图",
      nodes: [],
      edges: [],
      groups: [],
      timeSlices: [{ id: "all", label: "全部时期", order: 0 }],
      activeTimeSliceId: "all",
      viewport: { x: 180, y: 100, scale: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function loadExample(key) {
    const definition = EXAMPLE_DEFINITIONS[key];
    if (!definition) return;
    const before = snapshot();
    const colors = ["#95CAF2", "#F9A3DF", "#B488D2"];
    const next = createEmptyModel();
    next.title = definition.title;
    next.groups = definition.groups.map((name, index) => ({ id: `example-group-${index}`, name, color: colors[index], x: 40 + index * 390, y: 35, w: 330, h: 540 }));
    next.nodes = definition.nodes.map((item, index) => ({ id: `example-node-${index}`, kind: "circle", name: item[0], imageData: null, sourceName: null, x: item[2], y: item[3], r: 54, color: colors[item[1]], groupId: next.groups[item[1]].id, note: "", since: null, until: null, locked: false, anchorId: null }));
    next.edges = definition.edges.map((item, index) => ({ id: `example-edge-${index}`, source: `example-node-${item[0]}`, target: `example-node-${item[1]}`, label: item[2], direction: "forward", color: "#F9A3DF", style: "solid", since: null, until: null }));
    model = normalizeProject(next);
    selected = null; selectedNodes.clear(); history.push(before); if (history.length > MAX_HISTORY) history.shift(); future = [];
    dom.projectTitle.value = model.title; setDirty(true); render();
    showToast(`已载入示例：${definition.title}`);
  }

  function uid(prefix) {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function safeColor(value, fallback = "#95CAF2") { return /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback; }
  function filenameBase(name) { return name.replace(/\.[^.]+$/, "").slice(0, 80) || "未命名对象"; }

  function activeTimeSlice() { return model.timeSlices.find(slice => slice.id === model.activeTimeSliceId) || model.timeSlices[0]; }
  function timeOrder(id) { const slice = model.timeSlices.find(item => item.id === id); return slice ? slice.order : 0; }
  function isVisibleInTime(item) {
    if (!item.since && !item.until) return true;
    const current = activeTimeSlice();
    if (!current || current.id === "all") return true;
    return (!item.since || timeOrder(item.since) <= current.order) && (!item.until || timeOrder(item.until) >= current.order);
  }
  function isChangedInActiveTime(item) { return !!item.since && item.since === model.activeTimeSliceId; }
  function activeTimeBadge() {
    const slice = activeTimeSlice();
    if (!slice || slice.id === "all") return "";
    const year = String(slice.label || "").match(/\b\d{4}\b/);
    return year ? year[0] : slice.label.slice(0, 8);
  }
  function timeBadgeForNode(node) {
    if (!node?.since) return "";
    const slice = model.timeSlices.find(item => item.id === node.since);
    if (!slice) return "";
    const year = String(slice.label || "").match(/\b\d{4}\b/);
    return year ? year[0] : slice.label.slice(0, 8);
  }
  function syncAnchoredTriangles(anchorIds) {
    const anchors = new Set(anchorIds);
    for (const triangle of model.nodes.filter(node => node.kind === "triangle" && node.locked && node.anchorId && anchors.has(node.anchorId))) {
      const anchor = nodeById(triangle.anchorId);
      if (anchor) { triangle.x = anchor.x + (triangle.lockedOffset?.x ?? 110); triangle.y = anchor.y + (triangle.lockedOffset?.y ?? 0); }
    }
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function makeAvatarData(file) {
    const source = await readAsDataUrl(file);
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = source; });
    const size = 512;
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    return canvas.toDataURL("image/jpeg", 0.86);
  }

  function setDirty(value = true) {
    dirty = value;
    dom.projectStatus.textContent = value ? "有未保存更改" : "已保存";
  }

  function snapshot() { return clone(model); }
  function restore(next) {
    model = normalizeProject(clone(next));
    selected = null;
    selectedNodes.clear();
    interaction = null;
    dom.projectTitle.value = model.title;
    render();
  }

  function pushHistory(before) {
    history.push(before);
    if (history.length > MAX_HISTORY) history.shift();
    future.length = 0;
    setDirty(true);
    updateHistoryButtons();
    scheduleAutosave();
  }

  function mutate(mutator) {
    const before = snapshot();
    mutator();
    model.updatedAt = new Date().toISOString();
    pushHistory(before);
    render();
  }

  function undo() {
    if (!history.length) return;
    future.push(snapshot());
    const previous = history.pop();
    restore(previous);
    setDirty(true);
    updateHistoryButtons();
    scheduleAutosave();
  }

  function redo() {
    if (!future.length) return;
    history.push(snapshot());
    const next = future.pop();
    restore(next);
    setDirty(true);
    updateHistoryButtons();
    scheduleAutosave();
  }

  function updateHistoryButtons() {
    dom.undoButton.disabled = history.length === 0;
    dom.redoButton.disabled = future.length === 0;
  }

  let autosaveTimer = 0;
  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); }
      catch (error) { console.warn("Autosave failed", error); }
    }, 250);
  }

  function svgPoint(event) {
    const rect = dom.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function screenToWorld(event) {
    const point = svgPoint(event);
    return {
      x: (point.x - model.viewport.x) / model.viewport.scale,
      y: (point.y - model.viewport.y) / model.viewport.scale
    };
  }

  function worldCenter() {
    const rect = dom.canvas.getBoundingClientRect();
    return {
      x: (rect.width / 2 - model.viewport.x) / model.viewport.scale,
      y: (rect.height / 2 - model.viewport.y) / model.viewport.scale
    };
  }

  function nodeById(id) { return model.nodes.find(node => node.id === id); }
  function edgeById(id) { return model.edges.find(edge => edge.id === id); }
  function groupById(id) { return model.groups.find(group => group.id === id); }

  function dashFor(style) {
    if (style === "dashed") return "12 8";
    if (style === "dotted") return "2 9";
    return "";
  }

  function boundaryPoints(source, target) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const sourceRadius = source.r || 54;
    const targetRadius = target.r || 54;
    return {
      x1: source.x + ux * sourceRadius,
      y1: source.y + uy * sourceRadius,
      x2: target.x - ux * targetRadius,
      y2: target.y - uy * targetRadius
    };
  }

  // Keep cards separated while dragging, with a small breathing room for edges.
  function resolveNodeCollisions(movingIds) {
    const moving = new Set(movingIds);
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < model.nodes.length; i++) {
        for (let j = i + 1; j < model.nodes.length; j++) {
          const a = model.nodes[i], b = model.nodes[j];
          const aMoving = moving.has(a.id), bMoving = moving.has(b.id);
          if (!aMoving && !bMoving) continue;
          let dx = b.x - a.x, dy = b.y - a.y;
          let distance = Math.hypot(dx, dy);
          if (!distance) { dx = 1; dy = 0; distance = 1; }
          const minimum = (a.r || 54) + (b.r || 54) + 18;
          if (distance >= minimum) continue;
          const push = (minimum - distance) / (aMoving && bMoving ? 2 : 1);
          const ux = dx / distance, uy = dy / distance;
          if (aMoving) { a.x -= ux * push; a.y -= uy * push; }
          if (bMoving) { b.x += ux * push; b.y += uy * push; }
        }
      }
    }
  }

  function keepNodesOffEdges(movingIds) {
    const moving = new Set(movingIds);
    for (let pass = 0; pass < 2; pass++) {
      for (const node of model.nodes) {
        if (!moving.has(node.id)) continue;
        for (const edge of model.edges) {
          if (edge.source === node.id || edge.target === node.id) continue;
          const source = nodeById(edge.source), target = nodeById(edge.target);
          if (!source || !target) continue;
          const vx = target.x - source.x, vy = target.y - source.y;
          const length2 = vx * vx + vy * vy || 1;
          const t = clamp(((node.x - source.x) * vx + (node.y - source.y) * vy) / length2, 0.08, 0.92);
          const px = source.x + vx * t, py = source.y + vy * t;
          let dx = node.x - px, dy = node.y - py;
          let distance = Math.hypot(dx, dy);
          const minimum = (node.r || 54) + 12;
          if (distance >= minimum) continue;
          if (!distance) { dx = -vy; dy = vx; distance = Math.hypot(dx, dy) || 1; }
          node.x += dx / distance * (minimum - distance);
          node.y += dy / distance * (minimum - distance);
        }
      }
    }
  }

  function render() {
    model.title = dom.projectTitle.value || model.title;
    dom.world.setAttribute("transform", `translate(${model.viewport.x} ${model.viewport.y}) scale(${model.viewport.scale})`);
    dom.zoomReadout.textContent = `${Math.round(model.viewport.scale * 100)}%`;
    dom.emptyState.hidden = model.nodes.length > 0 || model.groups.length > 0;
    dom.objectCount.textContent = `${model.nodes.length} 个对象`;
    dom.relationCount.textContent = `${model.edges.length} 条关系`;
    dom.groupCount.textContent = `${model.groups.length} 个阵营`;
    renderTimeControls();
    renderGroups();
    renderEdges();
    renderNodes();
    renderPreview();
    renderInspector();
    updateHistoryButtons();
  }

  function renderGroups() {
    dom.groupLayer.innerHTML = model.groups.map(group => {
      const selectedClass = selected?.kind === "group" && selected.id === group.id ? " selected" : "";
      return `<g class="group${selectedClass}" data-kind="group" data-id="${group.id}">
        <rect class="group-shape" x="${group.x}" y="${group.y}" width="${group.w}" height="${group.h}" rx="20" fill="${safeColor(group.color)}" stroke="${safeColor(group.color)}"/>
        <rect class="group-label-bg" x="${group.x + 18}" y="${group.y - 16}" width="${Math.max(96, group.name.length * 18 + 32)}" height="34" rx="17" stroke="${safeColor(group.color)}"/>
        <text class="group-label" x="${group.x + 34}" y="${group.y + 6}">${escapeHtml(group.name)}</text>
      </g>`;
    }).join("");
  }

  function renderEdges() {
    const relevantNode = selected?.kind === "node" && selectedNodes.size <= 1 ? selected.id : hoverNodeId;
    const defs = [];
    dom.edgeLayer.innerHTML = model.edges.filter(isVisibleInTime).map(edge => {
      const source = nodeById(edge.source);
      const target = nodeById(edge.target);
      if (!source || !target || !isVisibleInTime(source) || !isVisibleInTime(target)) return "";
      const p = boundaryPoints(source, target);
      const selectedClass = selected?.kind === "edge" && selected.id === edge.id ? " selected" : "";
      const related = !relevantNode || edge.source === relevantNode || edge.target === relevantNode;
      const relationClass = relevantNode ? (related ? " highlighted" : " dimmed") : "";
      const color = safeColor(edge.color, DEFAULT_EDGE.color);
      const markerEnd = edge.direction === "forward" || edge.direction === "both" ? `marker-end="url(#end-${edge.id})"` : "";
      const markerStart = edge.direction === "both" ? `marker-start="url(#start-${edge.id})"` : "";
      const triangleEdge = source.kind === "triangle" || target.kind === "triangle";
      const visibleColor = triangleEdge ? "#ffffff" : color;
      if (markerEnd) defs.push(markerMarkup(`end-${edge.id}`, visibleColor, false));
      if (markerStart) defs.push(markerMarkup(`start-${edge.id}`, visibleColor, true));
      const dash = dashFor(edge.style);
      const labelAngle = Math.atan2(p.y2 - p.y1, p.x2 - p.x1) * 180 / Math.PI;
      const readableAngle = labelAngle > 90 || labelAngle < -90 ? labelAngle + 180 : labelAngle;
      const labelX = (p.x1 + p.x2) / 2, labelY = (p.y1 + p.y2) / 2;
      const diffClass = dom.diffMode?.checked && isChangedInActiveTime(edge) ? " diff-highlight" : "";
      return `<g class="edge${selectedClass}${relationClass}${diffClass}${triangleEdge ? " triangle-edge" : ""}" data-kind="edge" data-id="${edge.id}">
        <path id="path-${edge.id}" class="edge-visible" d="M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}" stroke="${visibleColor}" ${dash ? `stroke-dasharray="${dash}"` : ""} ${markerStart.replaceAll(color, visibleColor)} ${markerEnd.replaceAll(color, visibleColor)}/>
        <path class="edge-hit" d="M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}"/>
        ${edge.label ? `<text class="edge-label" x="${labelX}" y="${labelY - 10}" text-anchor="middle" transform="rotate(${readableAngle} ${labelX} ${labelY})">${escapeHtml(edge.label)}</text>` : ""}
      </g>`;
    }).join("");
    updateDynamicMarkers(defs.join(""));
  }

  function markerMarkup(id, color, reverse) {
    return `<marker id="${id}" viewBox="0 0 8 8" refX="${reverse ? 0.8 : 7.2}" refY="4" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 8 4 L 0 8 z" fill="${color}"/></marker>`;
  }

  function updateDynamicMarkers(markup) {
    let holder = document.getElementById("dynamicMarkers");
    if (!holder) {
      holder = document.createElementNS(SVG_NS, "g");
      holder.id = "dynamicMarkers";
      document.getElementById("canvasDefs").append(holder);
    }
    holder.innerHTML = markup;
  }

  function renderNodes() {
    const relevantNode = selected?.kind === "node" && selectedNodes.size <= 1 ? selected.id : hoverNodeId;
    const relatedIds = new Set();
    if (relevantNode) {
      relatedIds.add(relevantNode);
      for (const edge of model.edges) {
        if (edge.source === relevantNode) relatedIds.add(edge.target);
        if (edge.target === relevantNode) relatedIds.add(edge.source);
      }
    }
    dom.nodeLayer.innerHTML = model.nodes.filter(isVisibleInTime).map(node => {
      const isSelected = selectedNodes.has(node.id) || (selected?.kind === "node" && selected.id === node.id);
      const isCandidate = interaction?.type === "connect" && interaction.candidateId === node.id;
      const dimmed = relevantNode && !relatedIds.has(node.id);
      const diffClass = dom.diffMode?.checked && isChangedInActiveTime(node) ? " diff-highlight" : "";
      const classes = ["node", diffClass, isSelected && "selected", isCandidate && "candidate", dimmed && "dimmed"].filter(Boolean).join(" ");
      const clipId = `clip-${node.id}`;
      const trianglePoints = `0,${-node.r + 5} ${node.r * .78},${node.r * .62} ${-node.r * .78},${node.r * .62}`;
      const triangleInnerPoints = `0,${-node.r + 11} ${node.r * .7},${node.r * .5} ${-node.r * .7},${node.r * .5}`;
      const image = node.imageData
        ? `<image class="avatar" href="${node.imageData}" x="${-node.r}" y="${-node.r}" width="${node.r * 2}" height="${node.r * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
        : node.kind === "triangle"
          ? `<polygon points="${triangleInnerPoints}" fill="#f4edf2"/><text x="0" y="18" text-anchor="middle" font-size="24" fill="#a38b9b">${escapeHtml(node.name.slice(0, 1))}</text>`
          : `<circle cx="0" cy="0" r="${node.r - 5}" fill="#f4edf2"/><text x="0" y="8" text-anchor="middle" font-size="28" fill="#a38b9b">${escapeHtml(node.name.slice(0, 1))}</text>`;
      const shape = node.kind === "triangle"
        ? `<polygon class="card-back" points="0,${-node.r} ${node.r * .88},${node.r * .7} ${-node.r * .88},${node.r * .7}" stroke="${safeColor(node.color)}"/>`
        : `<circle class="card-back" cx="0" cy="0" r="${node.r}" stroke="${safeColor(node.color)}"/>`;
      const badgeText = timeBadgeForNode(node) || (isSelected ? "+" : "");
      const timeTag = badgeText ? `<g class="time-tag" data-time-tag="true" transform="translate(${node.r + 18} 0)"><rect x="-21" y="-11" width="42" height="22" rx="11"/><text x="0" y="4">${escapeHtml(badgeText)}</text></g>` : "";
      return `<g class="${classes}" data-kind="node" data-id="${node.id}" transform="translate(${node.x} ${node.y})">
        <defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">${node.kind === "triangle" ? `<polygon points="${triangleInnerPoints}"/>` : `<circle cx="0" cy="0" r="${node.r - 5}"/>`}</clipPath></defs>
        ${shape}
        ${node.kind === "triangle" ? `<polygon class="triangle-inner" points="${triangleInnerPoints}" fill="#f4edf2"/>` : ""}
        ${image}
        ${timeTag}
        <rect class="name-bg" x="${-Math.max(48, node.name.length * 8)}" y="${node.r + 10}" width="${Math.max(96, node.name.length * 16)}" height="28" rx="14"/>
        <text class="name" x="0" y="${node.r + 29}">${escapeHtml(node.name)}</text>
        <circle class="port" data-port="true" cx="${node.r + 3}" cy="0" r="8"/>
      </g>`;
    }).join("");
  }

  function renderPreview() {
    if (interaction?.type !== "connect") {
      dom.previewLayer.innerHTML = "";
      dom.connectionToast.hidden = true;
      return;
    }
    const source = nodeById(interaction.sourceId);
    const target = interaction.candidateId ? nodeById(interaction.candidateId) : null;
    if (!source) return;
    const endpoint = target || interaction.pointer;
    const p = boundaryPoints(source, { ...endpoint, r: target?.r || 0 });
    const endX = target ? p.x2 : endpoint.x;
    const endY = target ? p.y2 : endpoint.y;
    dom.previewLayer.innerHTML = `<path class="preview-line" d="M ${p.x1} ${p.y1} L ${endX} ${endY}"/>
      ${target ? `<text class="preview-hint" x="${target.x}" y="${target.y - target.r - 18}" text-anchor="middle">将连接到：${escapeHtml(target.name)}</text>` : ""}`;
    dom.connectionToast.hidden = false;
    dom.connectionToast.textContent = target ? `松开连接到「${target.name}」` : "拖到目标头像；Alt 暂时关闭磁吸；Esc 取消";
  }

  function renderInspector() {
    for (const panel of [dom.inspectorEmpty, dom.nodeInspector, dom.edgeInspector, dom.groupInspector]) panel.hidden = true;
    if (!selected) { dom.inspectorEmpty.hidden = false; return; }
    if (selected.kind === "node") {
      const node = nodeById(selected.id);
      if (!node) { selected = null; dom.inspectorEmpty.hidden = false; return; }
      dom.nodeInspector.hidden = false;
      dom.nodeName.value = node.name;
      dom.nodeColor.value = safeColor(node.color);
      dom.nodeNote.value = node.note || "";
      dom.nodeGroup.innerHTML = `<option value="">无阵营</option>${model.groups.map(group => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join("")}`;
      dom.nodeGroup.value = node.groupId || "";
    } else if (selected.kind === "edge") {
      const edge = edgeById(selected.id);
      if (!edge) { selected = null; dom.inspectorEmpty.hidden = false; return; }
      dom.edgeInspector.hidden = false;
      dom.edgeLabel.value = edge.label || "";
      dom.edgeDirection.value = edge.direction;
      dom.edgeColor.value = safeColor(edge.color, DEFAULT_EDGE.color);
      dom.edgeStyle.value = edge.style || "solid";
    } else if (selected.kind === "group") {
      const group = groupById(selected.id);
      if (!group) { selected = null; dom.inspectorEmpty.hidden = false; return; }
      dom.groupInspector.hidden = false;
      dom.groupName.value = group.name;
      dom.groupColor.value = safeColor(group.color);
    }
  }

  function setTool(next) {
    tool = next;
    document.querySelectorAll(".tool[data-tool]").forEach(button => button.classList.toggle("active", button.dataset.tool === next));
    dom.canvas.classList.toggle("tool-connect", next === "connect");
    dom.statusHelp.textContent = next === "connect" ? "关系模式：从任意头像拖向目标，或依次点击两个头像" : "提示：从头像边缘的小圆点拖出关系";
  }

  function selectEntity(kind, id, additive = false) {
    selected = { kind, id };
    if (kind === "node") {
      if (!additive) selectedNodes.clear();
      if (additive && selectedNodes.has(id)) selectedNodes.delete(id); else selectedNodes.add(id);
    } else {
      selectedNodes.clear();
    }
    render();
  }

  function clearSelection() {
    selected = null;
    selectedNodes.clear();
    render();
  }

  function startNodeDrag(event, nodeId) {
    const point = screenToWorld(event);
    const ids = selectedNodes.has(nodeId) ? [...selectedNodes] : [nodeId];
    if (!selectedNodes.has(nodeId)) {
      selectedNodes.clear(); selectedNodes.add(nodeId); selected = { kind: "node", id: nodeId };
    }
    interaction = {
      type: "drag-nodes",
      pointerId: event.pointerId,
      start: point,
      before: snapshot(),
      initial: ids.map(id => ({ id, x: nodeById(id).x, y: nodeById(id).y })),
      moved: false
    };
    dom.canvas.setPointerCapture(event.pointerId);
    dom.canvas.classList.add("dragging");
  }

  function startGroupDrag(event, groupId) {
    const group = groupById(groupId);
    const point = screenToWorld(event);
    const members = model.nodes.filter(node => node.groupId === groupId).map(node => ({ id: node.id, x: node.x, y: node.y }));
    interaction = { type: "drag-group", pointerId: event.pointerId, start: point, before: snapshot(), groupId, initialGroup: { x: group.x, y: group.y }, members, moved: false };
    dom.canvas.setPointerCapture(event.pointerId);
    dom.canvas.classList.add("dragging");
  }

  function startConnection(event, sourceId, reconnectEdgeId = null) {
    const source = nodeById(sourceId);
    if (!source) return;
    interaction = { type: "connect", pointerId: event.pointerId, sourceId, pointer: screenToWorld(event), candidateId: null, reconnectEdgeId, before: snapshot() };
    dom.canvas.setPointerCapture(event.pointerId);
    updateConnection(event);
    render();
  }

  function updateConnection(event) {
    if (interaction?.type !== "connect") return;
    interaction.pointer = screenToWorld(event);
    if (altDown) { interaction.candidateId = null; return; }
    const source = nodeById(interaction.sourceId);
    const direction = { x: interaction.pointer.x - source.x, y: interaction.pointer.y - source.y };
    const directionLength = Math.hypot(direction.x, direction.y) || 1;
    let best = null;
    for (const candidate of model.nodes) {
      if (candidate.id === source.id) continue;
      const cursorDistanceWorld = Math.max(0, Math.hypot(interaction.pointer.x - candidate.x, interaction.pointer.y - candidate.y) - candidate.r);
      const cursorDistancePx = cursorDistanceWorld * model.viewport.scale;
      if (cursorDistancePx > 135) continue;
      const candidateVector = { x: candidate.x - source.x, y: candidate.y - source.y };
      const candidateLength = Math.hypot(candidateVector.x, candidateVector.y) || 1;
      const dot = clamp((direction.x * candidateVector.x + direction.y * candidateVector.y) / (directionLength * candidateLength), -1, 1);
      const anglePenalty = (1 - dot) * 60;
      const currentBonus = interaction.candidateId === candidate.id ? -24 : 0;
      const score = cursorDistancePx + anglePenalty + currentBonus;
      if (!best || score < best.score) best = { id: candidate.id, score };
    }
    interaction.candidateId = best && best.score < 145 ? best.id : null;
  }

  function finishConnection() {
    const current = interaction;
    interaction = null;
    if (!current?.candidateId) { render(); return; }
    if (current.reconnectEdgeId) {
      const edge = edgeById(current.reconnectEdgeId);
      if (edge && edge.target !== current.candidateId) {
        edge.target = current.candidateId;
        pushHistory(current.before);
      }
    } else {
      const duplicate = model.edges.some(edge => edge.source === current.sourceId && edge.target === current.candidateId && edge.label === lastEdgeStyle.label);
      if (!duplicate) {
        const edge = { id: uid("edge"), source: current.sourceId, target: current.candidateId, since: model.activeTimeSliceId === "all" ? null : model.activeTimeSliceId, ...clone(lastEdgeStyle) };
        model.edges.push(edge);
        selected = { kind: "edge", id: edge.id };
        selectedNodes.clear();
        pushHistory(current.before);
      } else {
        showToast("相同关系已经存在");
      }
    }
    render();
  }

  function showToast(message) {
    dom.connectionToast.textContent = message;
    dom.connectionToast.hidden = false;
    setTimeout(() => { if (interaction?.type !== "connect") dom.connectionToast.hidden = true; }, 1400);
  }

  function applyGroupMembership(node) {
    const containing = model.groups.filter(group => node.x >= group.x && node.x <= group.x + group.w && node.y >= group.y && node.y <= group.y + group.h).at(-1);
    node.groupId = containing?.id || null;
    if (containing) node.color = containing.color;
  }

  function onPointerDown(event) {
    const nodeElement = event.target.closest?.(".node");
    const edgeElement = event.target.closest?.(".edge");
    const groupElement = event.target.closest?.(".group");
    const timeTag = event.target.closest?.(".time-tag");
    const isPort = event.target.dataset?.port === "true";
    if (timeTag && nodeElement) {
      event.preventDefault();
      event.stopPropagation();
      addTimeSliceForNode(nodeElement.dataset.id);
      return;
    }
    if (nodeElement) {
      const id = nodeElement.dataset.id;
      const clickedNode = nodeById(id);
      if (clickedNode?.kind === "triangle" && clickedNode.locked && clickedNode.anchorId && !isPort && tool !== "connect") {
        startNodeDrag(event, clickedNode.anchorId);
        return;
      }
      if (isPort || tool === "connect") {
        event.preventDefault();
        startConnection(event, id);
      } else {
        selectEntity("node", id, event.shiftKey);
        startNodeDrag(event, id);
      }
      return;
    }
    if (edgeElement) { selectEntity("edge", edgeElement.dataset.id); return; }
    if (groupElement) {
      selectEntity("group", groupElement.dataset.id);
      startGroupDrag(event, groupElement.dataset.id);
      return;
    }
    selected = null;
    selectedNodes.clear();
    const point = svgPoint(event);
    interaction = { type: "pan", pointerId: event.pointerId, start: point, initial: { ...model.viewport } };
    dom.canvas.setPointerCapture(event.pointerId);
    dom.canvas.classList.add("dragging");
    render();
  }

  function onPointerMove(event) {
    const nodeElement = event.target.closest?.(".node");
    hoverNodeId = nodeElement?.dataset.id || null;
    if (nodeElement && interaction?.type !== "drag-nodes" && interaction?.type !== "connect") {
      const node = nodeById(nodeElement.dataset.id);
      const point = screenToWorld(event);
      const angle = Math.atan2(point.y - node.y, point.x - node.x);
      const port = nodeElement.querySelector(".port");
      if (port) { port.setAttribute("cx", Math.cos(angle) * (node.r + 3)); port.setAttribute("cy", Math.sin(angle) * (node.r + 3)); }
    }
    if (!interaction) return;
    if (interaction.pointerId !== event.pointerId) return;
    if (interaction.type === "pan") {
      const point = svgPoint(event);
      model.viewport.x = interaction.initial.x + point.x - interaction.start.x;
      model.viewport.y = interaction.initial.y + point.y - interaction.start.y;
      render();
    } else if (interaction.type === "drag-nodes") {
      const point = screenToWorld(event);
      let dx = point.x - interaction.start.x;
      let dy = point.y - interaction.start.y;
      if (!altDown) {
        const grid = 12;
        const anchor = interaction.initial[0];
        dx = Math.round((anchor.x + dx) / grid) * grid - anchor.x;
        dy = Math.round((anchor.y + dy) / grid) * grid - anchor.y;
      }
      for (const initial of interaction.initial) {
        const node = nodeById(initial.id);
        node.x = initial.x + dx;
        node.y = initial.y + dy;
      }
      resolveNodeCollisions(interaction.initial.map(item => item.id));
      keepNodesOffEdges(interaction.initial.map(item => item.id));
      syncAnchoredTriangles(interaction.initial.map(item => item.id));
      interaction.moved ||= Math.hypot(dx, dy) > 2;
      render();
    } else if (interaction.type === "drag-group") {
      const point = screenToWorld(event);
      const dx = point.x - interaction.start.x;
      const dy = point.y - interaction.start.y;
      const group = groupById(interaction.groupId);
      group.x = interaction.initialGroup.x + dx;
      group.y = interaction.initialGroup.y + dy;
      for (const member of interaction.members) {
        const node = nodeById(member.id);
        node.x = member.x + dx;
        node.y = member.y + dy;
      }
      const memberIds = interaction.members.map(member => member.id);
      resolveNodeCollisions(memberIds);
      keepNodesOffEdges(memberIds);
      syncAnchoredTriangles(memberIds);
      interaction.moved ||= Math.hypot(dx, dy) > 2;
      render();
    } else if (interaction.type === "connect") {
      updateConnection(event);
      render();
    }
  }

  function onPointerUp(event) {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const finished = interaction;
    if (finished.type === "connect") {
      finishConnection();
    } else {
      interaction = null;
      if (finished.type === "drag-nodes" && finished.moved) {
        for (const item of finished.initial) applyGroupMembership(nodeById(item.id));
        pushHistory(finished.before);
      } else if (finished.type === "drag-group" && finished.moved) {
        pushHistory(finished.before);
      }
      render();
    }
    dom.canvas.classList.remove("dragging");
    try { dom.canvas.releasePointerCapture(event.pointerId); } catch {}
  }

  function onWheel(event) {
    event.preventDefault();
    const rect = dom.canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const wx = (sx - model.viewport.x) / model.viewport.scale;
    const wy = (sy - model.viewport.y) / model.viewport.scale;
    const factor = Math.exp(-event.deltaY * 0.0012);
    const nextScale = clamp(model.viewport.scale * factor, 0.2, 3.5);
    model.viewport.x = sx - wx * nextScale;
    model.viewport.y = sy - wy * nextScale;
    model.viewport.scale = nextScale;
    render();
  }

  async function importFiles(files, origin = null) {
    const valid = [...files].filter(file => /^image\/(png|jpeg|webp|gif)$/i.test(file.type));
    if (!valid.length) { showToast("请选择 PNG、JPG、WebP 或 GIF 图片"); return; }
    const before = snapshot();
    const data = await Promise.all(valid.map(async file => ({
      name: filenameBase(file.name),
      imageData: await makeAvatarData(file),
      sourceName: file.name,
      size: file.size
    })));
    const center = origin || worldCenter();
    const columns = Math.ceil(Math.sqrt(data.length));
    const spacingX = 150;
    const spacingY = 145;
    const newIds = [];
    data.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const node = {
        id: uid("node"), name: item.name, imageData: item.imageData, sourceName: item.sourceName,
        x: center.x + (col - (columns - 1) / 2) * spacingX,
        y: center.y + (row - Math.floor(data.length / columns) / 2) * spacingY,
        kind: "circle", r: 54, color: PALETTE[0], groupId: null, note: "", since: null, until: null, locked: false, anchorId: null
      };
      model.nodes.push(node);
      newIds.push(node.id);
    });
    selectedNodes = new Set(newIds);
    selected = newIds.length ? { kind: "node", id: newIds[0] } : null;
    pushHistory(before);
    render();
  }

  function addTriangle() {
    const anchor = selected?.kind === "node" ? nodeById(selected.id) : null;
    const center = anchor || worldCenter();
    mutate(() => {
      const triangle = { id: uid("node"), kind: "triangle", name: "新三角对象", imageData: null, sourceName: null, x: center.x + 110, y: center.y, r: 54, color: "#F9A3DF", groupId: null, note: "", since: null, until: null, locked: !!anchor, anchorId: anchor?.id || null, lockedOffset: { x: 110, y: 0 } };
      model.nodes.push(triangle);
      selected = { kind: "node", id: triangle.id }; selectedNodes.clear(); selectedNodes.add(triangle.id);
    });
  }

  function addTimeSlice() {
    const label = window.prompt("时期名称", "2025 年");
    if (!label?.trim()) return;
    mutate(() => {
      const id = `period-${Date.now().toString(36)}`;
      model.timeSlices.push({ id, label: label.trim(), order: model.timeSlices.length });
      model.activeTimeSliceId = id;
    });
  }

  function addTimeSliceForNode(nodeId) {
    const node = nodeById(nodeId);
    if (!node) return;
    const label = window.prompt("为此对象新增时期", "2025 年");
    if (!label?.trim()) return;
    mutate(() => {
      const normalized = label.trim();
      let slice = model.timeSlices.find(item => item.label === normalized);
      if (!slice) { slice = { id: `period-${Date.now().toString(36)}`, label: normalized, order: model.timeSlices.length }; model.timeSlices.push(slice); }
      node.since = slice.id;
      model.activeTimeSliceId = slice.id;
    });
  }

  function renderTimeControls() {
    if (!dom.timeSliceSelect) return;
    dom.timeSliceSelect.innerHTML = model.timeSlices.slice().sort((a, b) => a.order - b.order).map(slice => `<option value="${slice.id}">${escapeHtml(slice.label)}</option>`).join("") + `<option value="__new__">＋ 新增时期…</option>`;
    dom.timeSliceSelect.value = model.activeTimeSliceId;
  }

  function addGroup() {
    const center = worldCenter();
    mutate(() => {
      const index = model.groups.length;
      const offsetX = (index % 3 - 1) * 360;
      const offsetY = Math.floor(index / 3) * 290;
      const group = { id: uid("group"), name: `阵营 ${index + 1}`, color: PALETTE[(index + 1) % PALETTE.length], x: center.x - 165 + offsetX, y: center.y - 130 + offsetY, w: 330, h: 260 };
      model.groups.push(group);
      selected = { kind: "group", id: group.id };
      selectedNodes.clear();
    });
  }

  function fitGroupsToMembers() {
    for (const group of model.groups) {
      const members = model.nodes.filter(node => node.groupId === group.id);
      if (!members.length) continue;
      const pad = 72;
      const minX = Math.min(...members.map(node => node.x - node.r)) - pad;
      const maxX = Math.max(...members.map(node => node.x + node.r)) + pad;
      const minY = Math.min(...members.map(node => node.y - node.r)) - pad;
      const maxY = Math.max(...members.map(node => node.y + node.r)) + pad;
      group.x = minX; group.y = minY;
      group.w = Math.max(260, maxX - minX); group.h = Math.max(210, maxY - minY);
    }
  }

  function layoutByGroups() {
    const center = worldCenter();
    const groups = model.groups.length ? model.groups : [{ id: null, x: center.x - 200, y: center.y - 120, w: 400, h: 240 }];
    groups.forEach((group, groupIndex) => {
      const members = model.nodes.filter(node => node.groupId === group.id);
      const columns = Math.max(1, Math.ceil(Math.sqrt(members.length || 1)));
      const rows = Math.max(1, Math.ceil((members.length || 1) / columns));
      const originX = model.groups.length ? group.x + 100 : center.x - (columns - 1) * 90;
      const originY = model.groups.length ? group.y + 92 : center.y - (rows - 1) * 78;
      members.forEach((node, index) => {
        node.x = originX + (index % columns) * 180;
        node.y = originY + Math.floor(index / columns) * 156;
      });
      if (model.groups.length && members.length) {
        group.x = center.x - 420 + (groupIndex % 2) * 440;
        group.y = center.y - 220 + Math.floor(groupIndex / 2) * 360;
        members.forEach((node, index) => { node.x += group.x - (group.x + 100); node.y += group.y - (group.y + 92); });
      }
    });
    fitGroupsToMembers();
  }

  function layoutByLayers() {
    const indegree = new Map(model.nodes.map(node => [node.id, 0]));
    const outgoing = new Map(model.nodes.map(node => [node.id, []]));
    model.edges.forEach(edge => { if (outgoing.has(edge.source) && indegree.has(edge.target)) { outgoing.get(edge.source).push(edge.target); indegree.set(edge.target, indegree.get(edge.target) + 1); } });
    const queue = model.nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id);
    const layer = new Map(queue.map(id => [id, 0]));
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const source = queue[cursor];
      for (const target of outgoing.get(source)) { indegree.set(target, indegree.get(target) - 1); layer.set(target, Math.max(layer.get(target) || 0, (layer.get(source) || 0) + 1)); if (indegree.get(target) === 0) queue.push(target); }
    }
    model.nodes.forEach(node => { if (!layer.has(node.id)) layer.set(node.id, 0); });
    const columns = new Map();
    model.nodes.forEach(node => { const key = layer.get(node.id); if (!columns.has(key)) columns.set(key, []); columns.get(key).push(node); });
    const center = worldCenter();
    [...columns.entries()].sort((a, b) => a[0] - b[0]).forEach(([depth, nodes]) => nodes.forEach((node, index) => { node.x = center.x - 420 + depth * 220; node.y = center.y + (index - (nodes.length - 1) / 2) * 150; }));
    fitGroupsToMembers();
  }

  function layoutByForce() {
    const center = worldCenter();
    model.nodes.forEach((node, index) => { const angle = index * 2.39996; node.x = center.x + Math.cos(angle) * 220; node.y = center.y + Math.sin(angle) * 160; });
    for (let pass = 0; pass < 60; pass++) {
      resolveNodeCollisions(model.nodes.map(node => node.id));
      for (const edge of model.edges) { const a = nodeById(edge.source), b = nodeById(edge.target); if (!a || !b) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, delta = (d - 230) * 0.025; a.x += dx / d * delta; a.y += dy / d * delta; b.x -= dx / d * delta; b.y -= dy / d * delta; }
    }
    fitGroupsToMembers();
  }

  function layoutByCenter() {
    const selectedNode = selected?.kind === "node" ? nodeById(selected.id) : model.nodes[0];
    if (!selectedNode) return;
    const depths = new Map([[selectedNode.id, 0]]);
    const queue = [selectedNode.id];
    while (queue.length) {
      const current = queue.shift();
      const nextDepth = depths.get(current) + 1;
      for (const edge of model.edges) {
        let next = null;
        if (edge.source === current) next = edge.target;
        else if (edge.target === current) next = edge.source;
        if (next && !depths.has(next)) { depths.set(next, nextDepth); queue.push(next); }
      }
    }
    const center = worldCenter();
    const rings = new Map();
    model.nodes.forEach(node => { const depth = Math.min(depths.get(node.id) ?? 3, 3); if (!rings.has(depth)) rings.set(depth, []); rings.get(depth).push(node); });
    selectedNode.x = center.x; selectedNode.y = center.y;
    for (const [depth, nodes] of rings) {
      if (depth === 0) continue;
      const radiusX = depth === 1 ? 230 : depth === 2 ? 430 : 610;
      const radiusY = depth === 1 ? 180 : depth === 2 ? 320 : 450;
      nodes.forEach((node, index) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / nodes.length; node.x = center.x + Math.cos(angle) * radiusX; node.y = center.y + Math.sin(angle) * radiusY; });
    }
    fitGroupsToMembers();
  }

  function tidyLayout() {
    // Only resolve obvious overlaps; preserve the user's overall composition.
    const movingIds = model.nodes.map(node => node.id);
    for (let pass = 0; pass < 2; pass++) resolveNodeCollisions(movingIds);
    keepNodesOffEdges(movingIds);
  }

  function basicLayout() {
    if (!model.nodes.length) return;
    mutate(() => {
      const mode = dom.layoutMode?.value || "groups";
      if (mode === "layers") layoutByLayers();
      else if (mode === "center") layoutByCenter();
      else if (mode === "tidy") tidyLayout();
      else layoutByGroups();
    });
  }

  function contentBounds() {
    if (!model.nodes.length && !model.groups.length) return { x: -500, y: -350, w: 1000, h: 700 };
    const xs = [], ys = [];
    for (const node of model.nodes) { xs.push(node.x - node.r - 20, node.x + node.r + 20); ys.push(node.y - node.r - 20, node.y + node.r + 58); }
    for (const group of model.groups) { xs.push(group.x - 30, group.x + group.w + 30); ys.push(group.y - 45, group.y + group.h + 30); }
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: minX, y: minY, w: Math.max(400, maxX - minX), h: Math.max(300, maxY - minY) };
  }

  function fitContent() {
    const bounds = contentBounds();
    const rect = dom.canvas.getBoundingClientRect();
    const scale = clamp(Math.min((rect.width - 100) / bounds.w, (rect.height - 100) / bounds.h), 0.2, 2);
    model.viewport.scale = scale;
    model.viewport.x = rect.width / 2 - (bounds.x + bounds.w / 2) * scale;
    model.viewport.y = rect.height / 2 - (bounds.y + bounds.h / 2) * scale;
    render();
  }

  function deleteSelection() {
    if (!selected) return;
    mutate(() => {
      if (selected.kind === "node") {
        const ids = selectedNodes.size ? selectedNodes : new Set([selected.id]);
        model.nodes = model.nodes.filter(node => !ids.has(node.id));
        model.edges = model.edges.filter(edge => !ids.has(edge.source) && !ids.has(edge.target));
      } else if (selected.kind === "edge") {
        model.edges = model.edges.filter(edge => edge.id !== selected.id);
      } else if (selected.kind === "group") {
        model.groups = model.groups.filter(group => group.id !== selected.id);
        model.nodes.forEach(node => { if (node.groupId === selected.id) node.groupId = null; });
      }
      selected = null;
      selectedNodes.clear();
    });
  }

  function saveProject() {
    model.title = dom.projectTitle.value.trim() || "未命名关系图";
    model.updatedAt = new Date().toISOString();
    downloadBlob(new Blob([JSON.stringify(model, null, 2)], { type: "application/json" }), `${safeFilename(model.title)}.graphboard.json`);
    setDirty(false);
    scheduleAutosave();
  }

  function normalizeProject(project) {
    if (!project || project.schema !== "graphboard-project" || !Array.isArray(project.nodes) || !Array.isArray(project.edges) || !Array.isArray(project.groups)) throw new Error("不是有效的关系图谱项目文件");
    project.viewport ||= { x: 180, y: 100, scale: 1 };
    project.timeSlices ||= [{ id: "all", label: "全部时期", order: 0 }];
    if (!project.timeSlices.length) project.timeSlices.push({ id: "all", label: "全部时期", order: 0 });
    project.activeTimeSliceId ||= "all";
    project.nodes = project.nodes.map(node => ({ kind: "circle", r: 54, color: PALETTE[0], groupId: null, note: "", since: null, until: null, locked: false, anchorId: null, ...node }));
    project.edges = project.edges.map(edge => ({ ...DEFAULT_EDGE, since: null, until: null, ...edge }));
    return project;
  }

  async function openProject(file) {
    try {
      const parsed = normalizeProject(JSON.parse(await file.text()));
      model = parsed;
      history = [];
      future = [];
      selected = null;
      selectedNodes.clear();
      dom.projectTitle.value = model.title || "未命名关系图";
      setDirty(false);
      render();
      scheduleAutosave();
      showToast("项目已打开");
    } catch (error) {
      showToast(`无法打开：${error.message}`);
    }
  }

  function safeFilename(value) { return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "关系图谱"; }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function exportPng() {
    if (!model.nodes.length && !model.groups.length) { showToast("画布为空，无法导出"); return; }
    const bounds = contentBounds();
    const clone = dom.canvas.cloneNode(true);
    clone.querySelector("#grid")?.remove();
    clone.querySelector("#previewLayer")?.remove();
    clone.querySelectorAll(".port").forEach(element => element.remove());
    clone.querySelectorAll(".selected,.candidate,.dimmed,.highlighted").forEach(element => element.classList.remove("selected", "candidate", "dimmed", "highlighted"));
    clone.querySelector("#world").setAttribute("transform", "");
    clone.setAttribute("xmlns", SVG_NS);
    clone.setAttribute("viewBox", `${bounds.x - 30} ${bounds.y - 30} ${bounds.w + 60} ${bounds.h + 60}`);
    clone.setAttribute("width", bounds.w + 60);
    clone.setAttribute("height", bounds.h + 60);
    const background = document.createElementNS(SVG_NS, "rect");
    background.setAttribute("x", bounds.x - 30); background.setAttribute("y", bounds.y - 30);
    background.setAttribute("width", bounds.w + 60); background.setAttribute("height", bounds.h + 60); background.setAttribute("fill", "white");
    clone.insertBefore(background, clone.firstChild);
    const style = document.createElementNS(SVG_NS, "style");
    style.textContent = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; } }).join("\n");
    clone.insertBefore(style, clone.firstChild);
    const svgText = new XMLSerializer().serializeToString(clone);
    const svgUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = svgUrl; });
      const maxSide = 4096;
      const scale = Math.min(2, maxSide / Math.max(bounds.w + 60, bounds.h + 60));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((bounds.w + 60) * scale));
      canvas.height = Math.max(1, Math.round((bounds.h + 60) * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      downloadBlob(blob, `${safeFilename(model.title)}.png`);
      showToast("PNG 已导出");
    } catch {
      showToast("PNG 导出失败，请检查图片格式");
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  function bindInspector() {
    const bind = (element, eventName, handler) => element.addEventListener(eventName, handler);
    const bindLiveText = (element, apply, repaint) => {
      let before = null;
      element.addEventListener("focus", () => { before = snapshot(); });
      element.addEventListener("input", () => {
        apply(element.value);
        model.updatedAt = new Date().toISOString();
        setDirty(true);
        scheduleAutosave();
        repaint?.();
      });
      element.addEventListener("blur", () => {
        if (!before) return;
        const changed = JSON.stringify(before) !== JSON.stringify(model);
        if (changed) pushHistory(before);
        before = null;
        render();
      });
    };
    bindLiveText(dom.nodeName, value => { nodeById(selected.id).name = value || "未命名对象"; }, renderNodes);
    bind(dom.nodeColor, "change", () => mutate(() => { nodeById(selected.id).color = dom.nodeColor.value; }));
    bind(dom.nodeGroup, "change", () => mutate(() => {
      const node = nodeById(selected.id); node.groupId = dom.nodeGroup.value || null;
      const group = node.groupId && groupById(node.groupId); if (group) node.color = group.color;
    }));
    bindLiveText(dom.nodeNote, value => { nodeById(selected.id).note = value; });
    bindLiveText(dom.edgeLabel, value => { const edge = edgeById(selected.id); edge.label = value; lastEdgeStyle.label = value; }, renderEdges);
    bind(dom.edgeDirection, "change", () => mutate(() => { const edge = edgeById(selected.id); edge.direction = dom.edgeDirection.value; lastEdgeStyle.direction = edge.direction; }));
    bind(dom.edgeColor, "change", () => mutate(() => { const edge = edgeById(selected.id); edge.color = dom.edgeColor.value; lastEdgeStyle.color = edge.color; }));
    bind(dom.edgeStyle, "change", () => mutate(() => { const edge = edgeById(selected.id); edge.style = dom.edgeStyle.value; lastEdgeStyle.style = edge.style; }));
    bindLiveText(dom.groupName, value => { groupById(selected.id).name = value || "未命名阵营"; }, renderGroups);
    bind(dom.groupColor, "change", () => mutate(() => {
      const group = groupById(selected.id); group.color = dom.groupColor.value;
      model.nodes.filter(node => node.groupId === group.id).forEach(node => node.color = group.color);
    }));
    dom.reverseEdgeButton.addEventListener("click", () => mutate(() => { const edge = edgeById(selected.id); [edge.source, edge.target] = [edge.target, edge.source]; }));
    dom.reconnectEdgeButton.addEventListener("click", () => {
      const edge = edgeById(selected.id); if (!edge) return;
      const source = nodeById(edge.source);
      interaction = { type: "connect", pointerId: -1, sourceId: source.id, pointer: { x: source.x, y: source.y }, candidateId: null, reconnectEdgeId: edge.id, before: snapshot() };
      showToast("请将鼠标移到新终点并点击");
      setTool("connect");
      render();
    });
    document.querySelectorAll("[data-delete-selection]").forEach(button => button.addEventListener("click", deleteSelection));
  }

  function bindEvents() {
    dom.canvas.addEventListener("pointerdown", event => {
      if (interaction?.type === "connect" && interaction.pointerId === -1) {
        const nodeElement = event.target.closest?.(".node");
        if (nodeElement && nodeElement.dataset.id !== interaction.sourceId) {
          interaction.candidateId = nodeElement.dataset.id;
          finishConnection();
          setTool("select");
          return;
        }
      }
      onPointerDown(event);
    });
    dom.canvas.addEventListener("pointermove", onPointerMove);
    dom.canvas.addEventListener("pointerup", onPointerUp);
    dom.canvas.addEventListener("pointercancel", onPointerUp);
    dom.canvas.addEventListener("wheel", onWheel, { passive: false });
    dom.canvas.addEventListener("dragover", event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; });
    dom.canvas.addEventListener("drop", event => { event.preventDefault(); importFiles(event.dataTransfer.files, screenToWorld(event)); });
    dom.canvas.addEventListener("dblclick", event => {
      const edgeElement = event.target.closest?.(".edge");
      if (edgeElement) { selectEntity("edge", edgeElement.dataset.id); requestAnimationFrame(() => dom.edgeLabel.focus()); }
      const nodeElement = event.target.closest?.(".node");
      if (nodeElement) { selectEntity("node", nodeElement.dataset.id); requestAnimationFrame(() => { dom.nodeName.focus(); dom.nodeName.select(); }); }
    });

    document.querySelectorAll(".tool[data-tool]").forEach(button => button.addEventListener("click", () => setTool(button.dataset.tool)));
    document.querySelectorAll("[data-example]").forEach(button => button.addEventListener("click", () => loadExample(button.dataset.example)));
    [dom.importButton, dom.emptyImportButton].forEach(button => button.addEventListener("click", () => dom.imageInput.click()));
    dom.imageInput.addEventListener("change", () => { importFiles(dom.imageInput.files); dom.imageInput.value = ""; });
    dom.addGroupButton.addEventListener("click", addGroup);
    dom.addTriangleButton.addEventListener("click", addTriangle);
    dom.timeSliceSelect.addEventListener("change", () => {
      if (dom.timeSliceSelect.value === "__new__") { dom.timeSliceSelect.value = model.activeTimeSliceId; addTimeSlice(); return; }
      model.activeTimeSliceId = dom.timeSliceSelect.value; render(); scheduleAutosave();
    });
    dom.layoutButton.addEventListener("click", basicLayout);
    dom.fitButton.addEventListener("click", fitContent);
    dom.undoButton.addEventListener("click", undo);
    dom.redoButton.addEventListener("click", redo);
    dom.saveButton.addEventListener("click", saveProject);
    dom.openButton.addEventListener("click", () => dom.projectInput.click());
    dom.projectInput.addEventListener("change", () => { if (dom.projectInput.files[0]) openProject(dom.projectInput.files[0]); dom.projectInput.value = ""; });
    dom.exportButton.addEventListener("click", exportPng);
    dom.projectTitle.addEventListener("change", () => mutate(() => { model.title = dom.projectTitle.value.trim() || "未命名关系图"; }));
    dom.replaceImageButton.addEventListener("click", () => dom.replaceImageInput.click());
    dom.replaceImageInput.addEventListener("change", async () => {
      const file = dom.replaceImageInput.files[0]; if (!file || selected?.kind !== "node") return;
      const data = await makeAvatarData(file);
      mutate(() => { const node = nodeById(selected.id); node.imageData = data; node.sourceName = file.name; });
      dom.replaceImageInput.value = "";
    });

    window.addEventListener("keydown", event => {
      altDown = event.altKey;
      spaceDown = event.code === "Space" || spaceDown;
      dom.snapState.classList.toggle("off", altDown);
      dom.snapState.textContent = altDown ? "磁吸暂停" : "磁吸开启";
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      if ((event.key === "Delete" || event.key === "Backspace") && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) { event.preventDefault(); deleteSelection(); }
      if (event.key === "Escape" && interaction?.type === "connect") { interaction = null; render(); }
      if (event.key.toLowerCase() === "v" && !event.ctrlKey && document.activeElement === document.body) setTool("select");
      if (event.key.toLowerCase() === "g" && !event.ctrlKey && document.activeElement === document.body) { setTool("select"); showToast("移动模式：拖动选中对象"); }
      if (event.key.toLowerCase() === "r" && !event.ctrlKey && document.activeElement === document.body) setTool("connect");
      if (event.key.toLowerCase() === "f" && !event.ctrlKey && document.activeElement === document.body) fitContent();
    });
    window.addEventListener("keyup", event => {
      altDown = event.altKey;
      if (event.code === "Space") spaceDown = false;
      dom.snapState.classList.toggle("off", altDown);
      dom.snapState.textContent = altDown ? "磁吸暂停" : "磁吸开启";
    });
    window.addEventListener("beforeunload", event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
    bindInspector();
  }

  function restoreAutosave() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = normalizeProject(JSON.parse(saved));
      if (parsed.nodes.length || parsed.groups.length) {
        model = parsed;
        dom.projectTitle.value = model.title;
        setDirty(false);
      }
    } catch (error) { console.warn("Could not restore autosave", error); }
  }

  bindEvents();
  restoreAutosave();
  setTool("select");
  render();
})();
