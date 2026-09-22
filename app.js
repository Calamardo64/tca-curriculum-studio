"use strict";

const STORAGE_KEY = "tca-curriculum-external-v1";
const SNAPSHOT_KEY = "tca-curriculum-external-snapshots-v1";
const SCHEMA_VERSION = 1;

const LEVELS = [
  { id: "level-1", number: 1, name: "White Pawn", piece: "♙" },
  { id: "level-2", number: 2, name: "Black Pawn", piece: "♟" },
  { id: "level-3", number: 3, name: "White Knight", piece: "♘" },
  { id: "level-4", number: 4, name: "Black Knight", piece: "♞" },
  { id: "level-5", number: 5, name: "White Bishop", piece: "♗" },
  { id: "level-6", number: 6, name: "Black Bishop", piece: "♝" },
  { id: "level-7", number: 7, name: "White Rook", piece: "♖" },
  { id: "level-8", number: 8, name: "Black Rook", piece: "♜" },
  { id: "level-9", number: 9, name: "White Queen", piece: "♕" },
  { id: "level-10", number: 10, name: "Black Queen", piece: "♛" },
];

const INITIAL_CURRICULUM = {
  "level-1": [
    "Board and name of the pieces",
    "Movement of the Rook, Bishop, Queen",
    "Movement of the King, Check",
    "Movement of the Knight",
    "Movement of the Pawn",
    "Castling",
    "Introduction to Checkmate, Stalemate",
    "Promotion",
    "Basic Checkmates (Backrank and ladder)",
    "Scholar’s Mate",
  ],
  "level-2": [
    "Review Level 1",
    "Checkmate Q+K vs K",
    "Checkmate in 1, different patterns",
    "Threats, defence, hanging pieces",
    "Notation",
    "5 types of draw",
    "Double Attack",
    "Pin",
    "En Passant",
    "Basic Endgames (Rule of the square)",
  ],
  "level-3": [
    "Recap Level 2",
    "Double Attack (preparatory move)",
    "Pin (preparatory move)",
    "Checkmate R+K vs K",
    "Mate in 2",
    "What to do in the Opening",
    "What not to do in the Opening",
    "Discovered Check, Double Check, Discovered Attack",
    "Skewer",
    "Pawn endgames, Opposition",
  ],
  "level-4": [
    "Recap Level 3",
    "Checkmate Patterns (Lolli, Anastasia, Arabian…)",
    "Defending actively",
    "Exchanging",
    "Morphy’s games",
    "Greco’s Games",
    "Fight for the initiative (introduction)",
    "Introduction to Sacrifices",
    "Pawn Structure Introduction",
    "Types of Centre",
  ],
  "level-5": [
    "Recap Level 4",
    "Attacking the king",
    "Open Files",
    "Outposts",
    "World Champions",
    "Endgame Principles",
    "Queen vs Pawns",
    "Mate in 3",
    "Mate in 2 without check, domination",
    "Basic Rook Endgames",
  ],
  "level-6": [
    "Recap Level 5",
    "Introduction to 1.e4",
    "Introduction to 1.d4",
    "Elimination of the Defence",
    "Interference",
    "Blocking",
    "Promotion Tactics",
    "Defensive Tactics",
    "Defending against Passed pawns",
    "Magnet Tactics",
  ],
  "level-7": [
    "Recap Level 6",
    "Rook Endgames, Lucena and Philidor",
    "Trapping pieces",
    "Sacrifices on h7,h2",
    "Sacrifices on g7,g2",
    "Sacrifices on f7,f2",
    "Introduction to Sicilian",
    "Introduction to Caro-Kann, French",
    "Facing Irregular openings",
    "The 7th Rank",
  ],
  "level-8": [
    "Recap Level 7",
    "Zugzwang",
    "Triangulation, Pawn Endgames Strategy",
    "Opposite Color Bishop Endgames",
    "Bishop vs Pawns",
    "Knight vs Pawns",
    "Checkmate with 2 bishops",
    "Clearing Tactics",
    "Planning (Opening the position)",
    "Planning (Activating pieces)",
  ],
  "level-9": [
    "Introduction to Fortresses",
    "Breakthrough in Pawn Endgames",
    "Introduction to Queen’s Gambit",
    "Introduction to London System",
    "Introduction to KID and Grunfeld",
    "Exploiting the uncastled king",
    "Planning (Exploiting weaknesses)",
    "Planning (Defending our weaknesses)",
    "Material decisions (greedy or not)",
    "Introduction to Queen Endgames",
  ],
  "level-10": [
    "Introduction to Nimzoindian, QID",
    "5 Ways of defending (advanced examples)",
    "Tournament Regulations",
    "Defending our king",
    "Defending against passed pawns (advanced examples)",
  ],
};

const STATUS_META = {
  unreviewed: { label: "Unreviewed", short: "Open" },
  discuss: { label: "Discuss", short: "Discuss" },
  agreed: { label: "Agreed", short: "Agreed" },
  revise: { label: "Needs revision", short: "Revise" },
};

const ROLE_META = {
  unclassified: { label: "Unclassified", short: "Unclassified" },
  new: { label: "New topic", short: "New" },
  reinforcement: { label: "Reinforcement", short: "Reinforce" },
  recap: { label: "Recap / review", short: "Recap" },
};

const storedBoard = loadBoard();
let board = storedBoard || createInitialBoard();
const shouldPersistInitialBoard = !storedBoard;
let snapshots = loadSnapshots();
let past = [];
let future = [];
let catalog = [];
let libraryTab = "catalog";
let activeView = "board";
let selectedCardId = null;
let inspectorDraftVotes = 0;
let activeAdd = null;
let importCandidate = null;
let comparison = null;
let draggedCardId = null;
let lastSavedAt = board.updatedAt || new Date().toISOString();
let saveFailed = false;
let inspectorReturnFocus = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function uid(prefix = "item") {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function makeCard(title, extra = {}) {
  return {
    id: extra.id || uid("topic"),
    title: String(title).trim().slice(0, 140),
    status: extra.status || "unreviewed",
    role: extra.role || "unclassified",
    category: extra.category || "",
    notes: extra.notes || "",
    votes: Number.isFinite(extra.votes) ? Math.max(0, Math.min(999, extra.votes)) : 0,
    ...(extra.topicId ? { topicId: extra.topicId } : {}),
    ...(extra.custom ? { custom: true } : {}),
  };
}

function createInitialBoard() {
  const levels = {};
  LEVELS.forEach((level) => {
    levels[level.id] = INITIAL_CURRICULUM[level.id].map((title, index) =>
      makeCard(title, { id: `initial-${level.number}-${index + 1}` }),
    );
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    versionName: "January 2027 · Initial curriculum draft",
    updatedAt: new Date().toISOString(),
    levels,
    pending: [],
  };
}

function sanitizeCard(value, usedIds) {
  if (!value || typeof value !== "object" || typeof value.title !== "string" || !value.title.trim()) return null;
  let id = typeof value.id === "string" && value.id.length < 180 ? value.id : uid("topic");
  if (usedIds.has(id)) id = uid("topic");
  usedIds.add(id);
  const statusMap = { open: "unreviewed", discussion: "discuss", review: "revise" };
  const rawStatus = statusMap[value.status] || value.status;
  const status = Object.hasOwn(STATUS_META, rawStatus) ? rawStatus : "unreviewed";
  const role = Object.hasOwn(ROLE_META, value.role) ? value.role : "unclassified";
  return makeCard(value.title, {
    id,
    status,
    role,
    category: typeof value.category === "string" ? value.category.trim().slice(0, 80) : "",
    notes: typeof value.notes === "string" ? value.notes.trim().slice(0, 1500) : "",
    votes: Math.trunc(Number(value.votes) || 0),
    topicId: typeof value.topicId === "string" ? value.topicId.slice(0, 100) : "",
    custom: value.custom === true,
  });
}

function sanitizeBoard(value) {
  if (!value || typeof value !== "object" || !value.levels || typeof value.levels !== "object") return null;
  const usedIds = new Set();
  const levels = {};
  const overflow = [];
  for (const level of LEVELS) {
    if (!Array.isArray(value.levels[level.id])) return null;
    const cards = value.levels[level.id]
      .slice(0, 510)
      .map((card) => sanitizeCard(card, usedIds))
      .filter(Boolean);
    levels[level.id] = cards.slice(0, 10);
    overflow.push(...cards.slice(10));
  }
  const pendingSource = Array.isArray(value.pending) ? value.pending : [];
  const pending = pendingSource
    .slice(0, 500)
    .map((card) => sanitizeCard(card, usedIds))
    .filter(Boolean);
  return {
    schemaVersion: SCHEMA_VERSION,
    versionName:
      typeof value.versionName === "string" && value.versionName.trim()
        ? value.versionName.trim().slice(0, 80)
        : "Imported curriculum",
    updatedAt:
      typeof value.updatedAt === "string" && !Number.isNaN(new Date(value.updatedAt).getTime())
        ? value.updatedAt
        : new Date().toISOString(),
    levels,
    pending: [...overflow, ...pending].slice(0, 500),
  };
}

function loadBoard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeBoard(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function loadSnapshots() {
  try {
    const raw = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        const clean = sanitizeBoard(item?.board);
        if (!clean) return null;
        return {
          id: typeof item.id === "string" ? item.id : uid("version"),
          name: typeof item.name === "string" ? item.name.slice(0, 80) : "Saved version",
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
          board: clean,
        };
      })
      .filter(Boolean)
      .slice(0, 50);
  } catch {
    return [];
  }
}

function saveBoard() {
  const savedAt = new Date().toISOString();
  board.updatedAt = savedAt;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    lastSavedAt = savedAt;
    saveFailed = false;
    updateSaveState();
  } catch {
    saveFailed = true;
    updateSaveState();
    showToast("Browser storage is unavailable. Download a JSON backup now.", "error", 7000);
  }
}

function saveSnapshots(nextSnapshots = snapshots) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(nextSnapshots));
    return true;
  } catch {
    showToast("There is not enough browser storage for more versions.", "error");
    return false;
  }
}

function commit(next, message, { addHistory = true } = {}) {
  const clean = sanitizeBoard(next);
  if (!clean) {
    showToast("That change could not be applied.", "error");
    return;
  }
  if (addHistory) {
    past = [...past.slice(-79), clone(board)];
    future = [];
  }
  board = clean;
  comparison = comparison ? buildComparison(comparison.snapshot, board) : null;
  saveBoard();
  renderAll();
  if (message) showToast(message, "success");
}

function totalPlaced(target = board) {
  return LEVELS.reduce((sum, level) => sum + target.levels[level.id].length, 0);
}

function findCard(target, cardId) {
  for (const level of LEVELS) {
    const index = target.levels[level.id].findIndex((card) => card.id === cardId);
    if (index >= 0) return { card: target.levels[level.id][index], location: level.id, index };
  }
  const index = target.pending.findIndex((card) => card.id === cardId);
  if (index >= 0) return { card: target.pending[index], location: "pending", index };
  return null;
}

function locationLabel(location) {
  if (location === "pending") return "Unassigned topics";
  const level = LEVELS.find((item) => item.id === location);
  return level ? `Level ${level.number} · ${level.name}` : "Unknown location";
}

function renderAll() {
  renderHeader();
  renderBoard();
  renderOverview();
  renderLibrary();
  renderInspector();
  updateUndoRedo();
}

function renderHeader() {
  const placed = totalPlaced();
  $("#placed-count").textContent = placed;
  $("#presentation-count").textContent = placed;
  $("#presentation-title").textContent = board.versionName;
  $("#version-name").value = board.versionName;
  $("#pending-tab-count").textContent = board.pending.length;
  $("#board-summary").textContent = `${placed} filled · ${100 - placed} open position${100 - placed === 1 ? "" : "s"}`;
}

function updateSaveState() {
  const state = $("#save-state");
  state.classList.toggle("save-error", saveFailed);
  if (saveFailed) {
    $("#save-label").textContent = "Not saved · export JSON";
    state.title = "Browser storage is unavailable; download a JSON backup";
    return;
  }
  const date = new Date(lastSavedAt);
  const time = Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  $("#save-label").textContent = `Saved on this device${time ? ` · ${time}` : ""}`;
  state.title = "Changes are stored only in this browser";
}

function updateUndoRedo() {
  $("#undo-btn").disabled = past.length === 0;
  $("#redo-btn").disabled = future.length === 0;
}

function cardBadges(card) {
  const role = card.role !== "unclassified" ? `<span class="type-badge role-${card.role}">${ROLE_META[card.role].short}</span>` : "";
  const note = card.notes ? `<span class="meta-icon" title="Has meeting notes">▤</span>` : "";
  const votes = card.votes ? `<span class="vote-badge" title="Coach support">✓ ${card.votes}</span>` : "";
  return `<span class="status-badge status-${card.status}">${STATUS_META[card.status].short}</span>${role}${note}${votes}`;
}

function renderBoard() {
  $("#levels-grid").innerHTML = LEVELS.map((level) => {
    const cards = board.levels[level.id];
    const slots = Array.from({ length: 10 }, (_, index) => {
      const card = cards[index];
      const diff = card && comparison?.changes?.get(card.id);
      if (!card) {
        if (index > cards.length) {
          return `<div class="slot empty empty-locked" aria-label="Open position ${index + 1}">
            <div class="empty-slot empty-placeholder"><span>${String(index + 1).padStart(2, "0")}</span><span aria-hidden="true">○</span><strong>Open position</strong></div>
          </div>`;
        }
        return `<div class="slot empty" data-level="${level.id}" data-position="${index}">
          <button class="empty-slot" type="button" data-action="add-empty" data-level="${level.id}" data-position="${index}">
            <span>${String(index + 1).padStart(2, "0")}</span><span aria-hidden="true">＋</span><strong>Add topic</strong>
          </button>
        </div>`;
      }
      return `<div class="slot" data-level="${level.id}" data-position="${index}">
        <article class="topic-card status-${card.status}${diff ? ` diff-${diff}` : ""}" draggable="true" data-card-id="${escapeHtml(card.id)}" title="${escapeHtml(card.title)}">
          <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
          <button class="card-main" type="button" data-action="open-card" data-card-id="${escapeHtml(card.id)}">
            <span class="card-title">${escapeHtml(card.title)}</span>
            <span class="card-meta">${cardBadges(card)}</span>
          </button>
          <button class="card-actions" type="button" data-action="open-card" data-card-id="${escapeHtml(card.id)}" aria-label="Edit ${escapeHtml(card.title)}">•••</button>
          <span class="drag-handle" aria-hidden="true">⠿</span>
        </article>
      </div>`;
    }).join("");
    const dots = Array.from({ length: 10 }, (_, index) => `<span class="${index < cards.length ? "filled" : ""}">${index + 1}</span>`).join("");
    return `<section class="level-card theme-level-${level.number}" data-level-card="${level.id}">
      <header class="level-header"><span class="level-piece" aria-hidden="true">${level.piece}</span><div><span>Level ${level.number}</span><h2>${level.name}</h2></div><strong>${cards.length}<small>/10</small></strong></header>
      <div class="progress-dots" aria-label="${cards.length} of 10 positions filled">${dots}</div>
      <div class="level-slots">${slots}</div>
    </section>`;
  }).join("");

  const banner = $("#comparison-banner");
  if (comparison) {
    banner.classList.remove("hidden");
    banner.innerHTML = `<div><strong>Comparing with “${escapeHtml(comparison.name)}”</strong><span>${comparison.added} added · ${comparison.moved} moved · ${comparison.changed} edited · ${comparison.removed.length} removed</span></div><button class="btn btn-outline" type="button" data-action="close-comparison">Close comparison</button>`;
  } else {
    banner.classList.add("hidden");
    banner.innerHTML = "";
  }
}

function roleCounts(cards) {
  return cards.reduce(
    (counts, card) => {
      counts[card.role] += 1;
      return counts;
    },
    { new: 0, reinforcement: 0, recap: 0, unclassified: 0 },
  );
}

function renderOverview() {
  const placed = totalPlaced();
  const fullLevels = LEVELS.filter((level) => board.levels[level.id].length === 10).length;
  const allCards = [...LEVELS.flatMap((level) => board.levels[level.id]), ...board.pending];
  const unclassified = allCards.filter((card) => card.role === "unclassified").length;
  const agreed = allCards.filter((card) => card.status === "agreed").length;
  $("#metric-grid").innerHTML = [
    [placed, "Filled positions", `${100 - placed} still open`],
    [fullLevels, "Complete levels", `${10 - fullLevels} need topics`],
    [unclassified, "Roles to classify", "New or reinforcement"],
    [agreed, "Agreed topics", `${allCards.length - agreed} still under review`],
  ].map(([value, label, detail]) => `<article class="metric-card"><strong>${value}</strong><span>${label}</span><small>${detail}</small></article>`).join("");

  $("#level-map").innerHTML = LEVELS.map((level) => {
    const cells = Array.from({ length: 10 }, (_, index) => {
      const card = board.levels[level.id][index];
      return card
        ? `<button class="map-cell filled status-${card.status}" type="button" data-action="open-card" data-card-id="${escapeHtml(card.id)}" title="${escapeHtml(card.title)}">${index + 1}</button>`
        : `<span class="map-cell" title="Open position">${index + 1}</span>`;
    }).join("");
    return `<div class="map-row theme-level-${level.number}"><strong>${level.piece}<span>L${level.number}</span></strong><div>${cells}</div></div>`;
  }).join("");

  const incomplete = LEVELS.filter((level) => board.levels[level.id].length < 10);
  const alerts = [
    ...incomplete.map((level) => ({ tone: "warning", title: `${level.name} has ${10 - board.levels[level.id].length} open positions`, text: `${board.levels[level.id].length}/10 topics are currently assigned.` })),
    { tone: "info", title: `${unclassified} topics are not yet labelled`, text: "The proposed five-new/five-reinforcement balance has not been decided." },
    { tone: "info", title: "The proposal says 8 levels but defines 10", text: "The wording should be corrected before the system is circulated as final." },
    { tone: "neutral", title: "Advanced and Masters remain future tracks", text: "White King and Black King are recorded in the brief but do not yet have topic lists." },
    { tone: "neutral", title: "Some entries may contain several lessons", text: "Examples include threats/defence/hanging pieces and discovered check/double check/discovered attack." },
  ];
  $("#alert-list").innerHTML = alerts.map((item) => `<li class="${item.tone}"><span></span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></li>`).join("");

  $("#level-table-body").innerHTML = LEVELS.map((level) => {
    const cards = board.levels[level.id];
    const roles = roleCounts(cards);
    const levelAgreed = cards.filter((card) => card.status === "agreed").length;
    return `<tr><th><span class="table-piece theme-level-${level.number}">${level.piece}</span><span>Level ${level.number}<small>${level.name}</small></span></th><td><strong>${cards.length}/10</strong></td><td>${roles.new}</td><td>${roles.reinforcement}</td><td>${roles.recap}</td><td>${roles.unclassified}</td><td>${levelAgreed}</td></tr>`;
  }).join("");
}

function renderLibrary() {
  const search = normalize($("#library-search")?.value || "");
  const macro = $("#macro-filter")?.value || "all";
  const sort = $("#sort-filter")?.value || "alpha";
  $("#pending-tab-count").textContent = board.pending.length;
  $$("[data-library-tab]").forEach((button) => {
    const active = button.dataset.libraryTab === libraryTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  if (libraryTab === "pending") {
    $("#topic-list").innerHTML = board.pending.length
      ? board.pending.map((card, index) => `<article class="library-card pending-card" draggable="true" data-card-id="${escapeHtml(card.id)}"><span class="library-grip">⠿</span><button class="library-copy" type="button" data-action="open-card" data-card-id="${escapeHtml(card.id)}"><strong>${escapeHtml(card.title)}</strong><small>Unassigned · position ${index + 1}</small></button><button class="library-add" type="button" data-action="open-card" data-card-id="${escapeHtml(card.id)}" aria-label="Move ${escapeHtml(card.title)}">→</button></article>`).join("")
      : `<div class="empty-library"><span>◇</span><strong>No unassigned topics</strong><p>Topics moved out of a level appear here without being deleted.</p></div>`;
    return;
  }

  let filtered = catalog.filter((topic) => {
    if (macro !== "all" && topic.macro !== macro) return false;
    if (!search) return true;
    return normalize(`${topic.title} ${topic.variants || ""} ${topic.works || ""} ${topic.macro || ""}`).includes(search);
  });
  filtered.sort((a, b) => sort === "books" ? (b.bookCount || 0) - (a.bookCount || 0) || a.title.localeCompare(b.title) : a.title.localeCompare(b.title));
  $("#catalog-tab-count").textContent = filtered.length;
  $("#library-count").textContent = catalog.length || 379;
  const visible = filtered.slice(0, 250);
  $("#topic-list").innerHTML = visible.length
    ? visible.map((topic) => `<article class="library-card macro-${macroTone(topic.macro)}"><span class="library-grip" aria-hidden="true">⠿</span><div class="library-copy"><strong>${escapeHtml(topic.title)}</strong><small><span>${escapeHtml(topic.macro || "Uncategorised")}</span> · ${topic.bookCount || 0} book${topic.bookCount === 1 ? "" : "s"}</small></div><button class="library-add" type="button" data-action="add-catalog" data-topic-id="${escapeHtml(topic.id)}" aria-label="Add ${escapeHtml(topic.title)}">＋</button></article>`).join("") + (filtered.length > 250 ? `<p class="result-limit">Showing the first 250 results. Refine the search to see more.</p>` : "")
    : `<div class="empty-library"><span>⌕</span><strong>No matching topics</strong><p>Try another term or clear the area filter.</p></div>`;
}

function macroTone(value) {
  const key = normalize(value);
  if (key.includes("tactic") || key.includes("attack") || key.includes("mate")) return "red";
  if (key.includes("endgame") || key.includes("final")) return "blue";
  if (key.includes("opening") || key.includes("apertura")) return "green";
  if (key.includes("pawn") || key.includes("structure")) return "amber";
  if (key.includes("calculation") || key.includes("decision")) return "purple";
  return "slate";
}

function openInspector(cardId) {
  const found = findCard(board, cardId);
  if (!found) return;
  if (!selectedCardId) inspectorReturnFocus = document.activeElement;
  selectedCardId = cardId;
  inspectorDraftVotes = found.card.votes || 0;
  renderInspector();
  requestAnimationFrame(() => $("#edit-title")?.focus());
}

function closeInspector() {
  const closingCardId = selectedCardId;
  selectedCardId = null;
  $("#inspector").classList.remove("open");
  $("#inspector").setAttribute("aria-hidden", "true");
  $("#inspector").inert = true;
  $("#inspector-backdrop").classList.add("hidden");
  const fallbackFocus = closingCardId
    ? $$("[data-card-id]").find((element) => element.dataset.cardId === closingCardId)?.querySelector(".card-main, .library-copy")
    : null;
  if (inspectorReturnFocus?.isConnected) inspectorReturnFocus.focus();
  else fallbackFocus?.focus();
  inspectorReturnFocus = null;
}

function saveAndCloseInspector() {
  if (!selectedCardId) {
    closeInspector();
    return true;
  }
  const found = findCard(board, selectedCardId);
  if (!found) {
    closeInspector();
    return true;
  }
  const values = inspectorValues();
  const current = {
    title: found.card.title,
    status: found.card.status,
    role: found.card.role,
    category: found.card.category || "",
    notes: found.card.notes || "",
    votes: found.card.votes || 0,
  };
  if (JSON.stringify(values) !== JSON.stringify(current) && !saveInspector({ silent: true })) return false;
  closeInspector();
  return true;
}

function renderInspector() {
  const found = selectedCardId ? findCard(board, selectedCardId) : null;
  if (!found) {
    closeInspector();
    return;
  }
  $("#inspector").classList.add("open");
  $("#inspector").setAttribute("aria-hidden", "false");
  $("#inspector").inert = false;
  $("#inspector-backdrop").classList.remove("hidden");
  $("#inspector-heading").textContent = found.card.title;
  $("#inspector-location").textContent = locationLabel(found.location);
  $("#edit-title").value = found.card.title;
  $("#edit-status").innerHTML = Object.entries(STATUS_META).map(([value, meta]) => `<option value="${value}">${meta.label}</option>`).join("");
  $("#edit-status").value = found.card.status;
  $("#edit-role").innerHTML = Object.entries(ROLE_META).map(([value, meta]) => `<option value="${value}">${meta.label}</option>`).join("");
  $("#edit-role").value = found.card.role;
  $("#edit-category").value = found.card.category || "";
  $("#edit-notes").value = found.card.notes || "";
  $("#notes-count").textContent = (found.card.notes || "").length;
  $("#vote-count").textContent = inspectorDraftVotes;
  $("#vote-down").disabled = inspectorDraftVotes <= 0;
  $("#edit-level").innerHTML = `<option value="pending">Unassigned topics</option>${LEVELS.map((level) => `<option value="${level.id}">Level ${level.number} · ${level.name}</option>`).join("")}`;
  $("#edit-level").value = found.location;
  updateInspectorPositions(found.location, found.index);
  $("#unassign-card-btn").disabled = found.location === "pending";
}

function updateInspectorPositions(location, selectedIndex = 0) {
  const select = $("#edit-position");
  if (location === "pending") {
    select.innerHTML = `<option value="0">Top of unassigned list</option>`;
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.innerHTML = Array.from({ length: 10 }, (_, index) => `<option value="${index}">Position ${index + 1}</option>`).join("");
  select.value = String(Math.max(0, Math.min(9, selectedIndex)));
}

function inspectorValues() {
  return {
    title: $("#edit-title").value.trim().slice(0, 140),
    status: $("#edit-status").value,
    role: $("#edit-role").value,
    category: $("#edit-category").value.trim().slice(0, 80),
    notes: $("#edit-notes").value.trim().slice(0, 1500),
    votes: inspectorDraftVotes,
  };
}

function patchCardInBoard(target, cardId, values) {
  const found = findCard(target, cardId);
  if (!found) return false;
  Object.assign(found.card, values);
  return true;
}

function saveInspector({ silent = false } = {}) {
  if (!selectedCardId) return false;
  const values = inspectorValues();
  if (values.title.length < 2) {
    showToast("A topic title needs at least two characters.", "error");
    return false;
  }
  const next = clone(board);
  if (!patchCardInBoard(next, selectedCardId, values)) return false;
  commit(next, silent ? "" : "Topic updated");
  return true;
}

function moveCardInBoard(target, cardId, destination, requestedIndex = 0) {
  const found = findCard(target, cardId);
  if (!found) return false;
  if (found.location === destination) {
    const list = destination === "pending" ? target.pending : target.levels[destination];
    const [card] = list.splice(found.index, 1);
    list.splice(Math.max(0, Math.min(requestedIndex, list.length)), 0, card);
    return true;
  }

  const source = found.location === "pending" ? target.pending : target.levels[found.location];
  if (destination === "pending") {
    const [card] = source.splice(found.index, 1);
    target.pending.splice(Math.max(0, Math.min(requestedIndex, target.pending.length)), 0, card);
    return true;
  }

  const destinationList = target.levels[destination];
  const position = Math.max(0, Math.min(requestedIndex, 9));
  if (destinationList.length >= 10) {
    const incoming = source[found.index];
    const displaced = destinationList[position];
    destinationList[position] = incoming;
    source[found.index] = displaced;
    return true;
  }
  const [card] = source.splice(found.index, 1);
  destinationList.splice(Math.min(position, destinationList.length), 0, card);
  return true;
}

function moveSelectedCard() {
  if (!selectedCardId) return;
  const values = inspectorValues();
  if (values.title.length < 2) return showToast("A topic title needs at least two characters.", "error");
  const destination = $("#edit-level").value;
  const position = Number($("#edit-position").value || 0);
  const next = clone(board);
  patchCardInBoard(next, selectedCardId, values);
  if (!moveCardInBoard(next, selectedCardId, destination, position)) return;
  commit(next, `Moved to ${locationLabel(destination)}`);
}

function duplicateSelectedCard() {
  if (!selectedCardId || !saveInspector({ silent: true })) return;
  const found = findCard(board, selectedCardId);
  if (!found) return;
  const next = clone(board);
  const copy = { ...clone(found.card), id: uid("topic"), title: `${found.card.title} · Copy` };
  if (found.location === "pending") {
    next.pending.splice(found.index + 1, 0, copy);
  } else if (next.levels[found.location].length < 10) {
    next.levels[found.location].splice(found.index + 1, 0, copy);
  } else {
    next.pending.unshift(copy);
  }
  commit(next, "Duplicate created");
  selectedCardId = copy.id;
  renderInspector();
}

function unassignSelectedCard() {
  if (!selectedCardId) return;
  const values = inspectorValues();
  if (values.title.length < 2) return showToast("A topic title needs at least two characters.", "error");
  const next = clone(board);
  if (!patchCardInBoard(next, selectedCardId, values)) return;
  if (!moveCardInBoard(next, selectedCardId, "pending", 0)) return;
  commit(next, "Topic moved to unassigned");
}

function deleteSelectedCard() {
  if (!selectedCardId) return;
  const found = findCard(board, selectedCardId);
  if (!found || !confirm(`Delete “${found.card.title}”? You can still use Undo.`)) return;
  const next = clone(board);
  const current = findCard(next, selectedCardId);
  const list = current.location === "pending" ? next.pending : next.levels[current.location];
  list.splice(current.index, 1);
  closeInspector();
  commit(next, "Topic deleted");
}

function openAddDialog({ title = "", topicId = "", level = "level-1", position = null, meta = "", custom = true } = {}) {
  activeAdd = { topicId, custom };
  $("#add-title").value = title;
  $("#add-title").readOnly = !custom;
  $("#add-source-meta").textContent = meta;
  $("#add-level").innerHTML = `<option value="pending">Unassigned topics</option>${LEVELS.map((item) => `<option value="${item.id}">Level ${item.number} · ${item.name} (${board.levels[item.id].length}/10)</option>`).join("")}`;
  $("#add-level").value = level;
  updateAddPositions(level, position);
  $("#add-dialog-title").textContent = custom ? "Create a custom topic" : "Add catalogue topic";
  $("#add-topic-dialog").showModal();
  if (custom) $("#add-title").focus();
}

function updateAddPositions(level, selectedPosition = null) {
  const select = $("#add-position");
  if (level === "pending") {
    select.innerHTML = `<option value="0">Top of unassigned list</option>`;
    select.disabled = true;
    return;
  }
  select.disabled = false;
  const levelIsFull = board.levels[level].length >= 10;
  select.innerHTML = Array.from({ length: 10 }, (_, index) => `<option value="${index}">Position ${index + 1}${levelIsFull && board.levels[level][index] ? " · replace to Unassigned" : ""}</option>`).join("");
  const fallback = Math.min(board.levels[level].length, 9);
  select.value = String(selectedPosition === null ? fallback : Math.max(0, Math.min(9, selectedPosition)));
}

function addTopicFromDialog() {
  const title = $("#add-title").value.trim();
  if (title.length < 2) return showToast("A topic title needs at least two characters.", "error");
  const destination = $("#add-level").value;
  const position = Number($("#add-position").value || 0);
  const card = makeCard(title, { topicId: activeAdd?.topicId, custom: activeAdd?.custom });
  const next = clone(board);
  if (destination === "pending") {
    next.pending.unshift(card);
  } else {
    const list = next.levels[destination];
    if (list.length >= 10) {
      const displaced = list[position];
      list[position] = card;
      if (displaced) next.pending.unshift(displaced);
    } else {
      list.splice(Math.min(position, list.length), 0, card);
    }
  }
  const duplicate = destination !== "pending" && next.levels[destination].filter((item) => normalize(item.title) === normalize(title)).length > 1;
  commit(next, `Added to ${locationLabel(destination)}`);
  $("#add-topic-dialog").close();
  if (duplicate) showToast("This level now contains a repeated title. It has been kept intentionally.", "warning", 5000);
}

function undo() {
  if (!past.length) return;
  future = [clone(board), ...future].slice(0, 80);
  board = past.pop();
  saveBoard();
  renderAll();
  showToast("Change undone", "info");
}

function redo() {
  if (!future.length) return;
  past = [...past.slice(-79), clone(board)];
  board = future.shift();
  saveBoard();
  renderAll();
  showToast("Change restored", "info");
}

function createSnapshot(name, snapshotBoard = board) {
  const snapshot = {
    id: uid("version"),
    name: String(name || `Version ${snapshots.length + 1}`).trim().slice(0, 80),
    createdAt: new Date().toISOString(),
    board: clone(snapshotBoard),
  };
  const nextSnapshots = [snapshot, ...snapshots].slice(0, 50);
  if (!saveSnapshots(nextSnapshots)) return null;
  snapshots = nextSnapshots;
  return snapshot;
}

function renderSnapshots() {
  $("#snapshot-list").innerHTML = snapshots.length
    ? snapshots.map((snapshot) => `<div class="snapshot-row"><div><strong>${escapeHtml(snapshot.name)}</strong><span>${totalPlaced(snapshot.board)}/100 topics · ${new Date(snapshot.createdAt).toLocaleString()}</span></div><button class="btn btn-ghost" type="button" data-snapshot-action="compare" data-snapshot-id="${escapeHtml(snapshot.id)}">Compare</button><button class="btn btn-outline" type="button" data-snapshot-action="restore" data-snapshot-id="${escapeHtml(snapshot.id)}">Restore</button><button class="icon-btn" type="button" data-snapshot-action="delete" data-snapshot-id="${escapeHtml(snapshot.id)}" aria-label="Delete ${escapeHtml(snapshot.name)}">×</button></div>`).join("")
    : `<div class="empty-snapshots">No versions saved yet.</div>`;
}

function boardIndex(target) {
  const map = new Map();
  LEVELS.forEach((level) => target.levels[level.id].forEach((card, index) => map.set(card.id, { card, location: level.id, index })));
  target.pending.forEach((card, index) => map.set(card.id, { card, location: "pending", index }));
  return map;
}

function buildComparison(snapshot, current) {
  const before = boardIndex(snapshot.board);
  const after = boardIndex(current);
  const changes = new Map();
  const removed = [];
  after.forEach((entry, id) => {
    const previous = before.get(id);
    if (!previous) changes.set(id, "added");
    else if (previous.location !== entry.location || previous.index !== entry.index) changes.set(id, "moved");
    else if (JSON.stringify(previous.card) !== JSON.stringify(entry.card)) changes.set(id, "changed");
  });
  before.forEach((entry, id) => { if (!after.has(id)) removed.push(entry.card); });
  return {
    snapshot,
    name: snapshot.name,
    changes,
    removed,
    added: [...changes.values()].filter((value) => value === "added").length,
    moved: [...changes.values()].filter((value) => value === "moved").length,
    changed: [...changes.values()].filter((value) => value === "changed").length,
  };
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function encodeSharedBoard(target) {
  const bytes = new TextEncoder().encode(JSON.stringify(target));
  if (typeof CompressionStream !== "undefined") {
    const compressed = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
    return `1.g.${bytesToBase64Url(new Uint8Array(compressed))}`;
  }
  return `1.j.${bytesToBase64Url(bytes)}`;
}

async function decodeSharedBoard(value) {
  const [version, encoding, payload] = value.split(".", 3);
  if (version !== "1" || !payload || !["g", "j"].includes(encoding)) throw new Error("invalid-share");
  let bytes = base64UrlToBytes(payload);
  if (encoding === "g") {
    if (typeof DecompressionStream === "undefined") throw new Error("unsupported-share");
    const raw = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    bytes = new Uint8Array(raw);
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function prepareShareLink() {
  try {
    const encoded = await encodeSharedBoard(board);
    const url = new URL(location.href);
    url.hash = `share=${encoded}`;
    $("#share-link").value = url.toString();
    $("#share-dialog").showModal();
    if (url.toString().length > 24000) showToast("This link is long. JSON may be more reliable in messaging apps.", "warning", 6000);
  } catch {
    showToast("The share link could not be created.", "error");
  }
}

async function copyShareLink() {
  const value = $("#share-link").value;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    $("#share-link").select();
    document.execCommand("copy");
  }
  showToast("Editable link copied", "success");
}

function openImportCandidate(candidate, source = "shared link") {
  const clean = sanitizeBoard(candidate);
  if (!clean) return showToast("This file or link does not contain a valid TCA board.", "error");
  importCandidate = clean;
  $("#import-summary").innerHTML = `<span class="import-icon">⇩</span><div><strong>${escapeHtml(clean.versionName)}</strong><span>${totalPlaced(clean)}/100 topics · ${clean.pending.length} unassigned</span><small>Source: ${escapeHtml(source)}</small></div>`;
  $("#import-dialog").showModal();
}

function clearShareHash() {
  if (location.hash.startsWith("#share=")) history.replaceState(null, "", `${location.pathname}${location.search}`);
}

function acceptImport() {
  if (!importCandidate) return;
  if (!createSnapshot("Before opening shared copy")) {
    showToast("The shared copy was not opened because the recovery version could not be saved.", "error", 7000);
    return;
  }
  const next = clone(importCandidate);
  importCandidate = null;
  $("#import-dialog").close();
  clearShareHash();
  commit(next, "Shared copy opened");
}

function rejectImport() {
  importCandidate = null;
  $("#import-dialog").close();
  clearShareHash();
  showToast("Your current board was kept", "info");
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tca-curriculum";
}

function exportJson() {
  const payload = { format: "tca-curriculum-board", version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), board };
  downloadFile(`${slugify(board.versionName)}.json`, JSON.stringify(payload, null, 2), "application/json");
  showToast("JSON backup downloaded", "success");
}

function csvValue(value) {
  let text = String(value ?? "");
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportCsv() {
  const rows = [["Location", "Level", "Position", "Topic", "Role", "Status", "Category", "Support", "Notes"]];
  LEVELS.forEach((level) => board.levels[level.id].forEach((card, index) => rows.push([level.name, level.number, index + 1, card.title, ROLE_META[card.role].label, STATUS_META[card.status].label, card.category, card.votes, card.notes])));
  board.pending.forEach((card, index) => rows.push(["Unassigned", "", index + 1, card.title, ROLE_META[card.role].label, STATUS_META[card.status].label, card.category, card.votes, card.notes]));
  const csv = `\ufeff${rows.map((row) => row.map(csvValue).join(",")).join("\r\n")}`;
  downloadFile(`${slugify(board.versionName)}.csv`, csv, "text/csv;charset=utf-8");
  showToast("CSV downloaded", "success");
}

function setView(view) {
  activeView = view;
  $("#board-view").classList.toggle("hidden", view !== "board");
  $("#overview-view").classList.toggle("hidden", view !== "overview");
  $$("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function enterPresentation() {
  if (!saveAndCloseInspector()) return;
  document.body.classList.add("presentation-mode");
  $("#presentation-bar").classList.remove("hidden");
  setView("board");
}

function exitPresentation() {
  document.body.classList.remove("presentation-mode");
  $("#presentation-bar").classList.add("hidden");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

function showToast(message, tone = "info", duration = 3500) {
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.innerHTML = `<span></span><p>${escapeHtml(message)}</p><button type="button" aria-label="Dismiss">×</button>`;
  toast.querySelector("button").addEventListener("click", () => toast.remove());
  $("#toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function handleAction(action, element) {
  if (action === "open-card") return openInspector(element.dataset.cardId);
  if (action === "add-empty") return openAddDialog({ level: element.dataset.level, position: Number(element.dataset.position), custom: true });
  if (action === "add-catalog") {
    const topic = catalog.find((item) => item.id === element.dataset.topicId);
    if (topic) openAddDialog({ title: topic.title, topicId: topic.id, custom: false, meta: `${topic.macro || "Uncategorised"} · ${topic.bookCount || 0} books` });
    return;
  }
  if (action === "share-copy") return void prepareShareLink();
  if (action === "export-json") return exportJson();
  if (action === "export-csv") return exportCsv();
  if (action === "import-json") return $("#import-file").click();
  if (action === "print") return window.print();
  if (action === "close-comparison") { comparison = null; return renderAll(); }
  if (action === "reset") {
    if (!confirm("Reset the board to the original January 2027 draft? A recovery version will be saved first.")) return;
    if (!createSnapshot("Before reset")) {
      showToast("Reset was cancelled because the recovery version could not be saved.", "error", 7000);
      return;
    }
    closeInspector();
    return commit(createInitialBoard(), "Original draft restored");
  }
}

function bindEvents() {
  $("#version-name").addEventListener("change", (event) => {
    const next = clone(board);
    next.versionName = event.target.value.trim().slice(0, 80) || "Untitled curriculum";
    commit(next, "Board name updated");
  });
  $("#undo-btn").addEventListener("click", undo);
  $("#redo-btn").addEventListener("click", redo);
  $("#versions-btn").addEventListener("click", () => { renderSnapshots(); $("#versions-dialog").showModal(); });
  $("#present-btn").addEventListener("click", enterPresentation);
  $("#exit-presentation-btn").addEventListener("click", exitPresentation);
  $("#fullscreen-btn").addEventListener("click", () => document.documentElement.requestFullscreen?.().catch(() => showToast("Full screen was not allowed by this browser.", "warning")));
  $("#overview-print-btn").addEventListener("click", () => window.print());
  $("#custom-topic-btn").addEventListener("click", () => openAddDialog({ custom: true }));
  $("#close-inspector").addEventListener("click", saveAndCloseInspector);
  $("#inspector-backdrop").addEventListener("click", saveAndCloseInspector);
  $("#save-topic-btn").addEventListener("click", () => saveInspector());
  $("#move-card-btn").addEventListener("click", moveSelectedCard);
  $("#duplicate-card-btn").addEventListener("click", duplicateSelectedCard);
  $("#unassign-card-btn").addEventListener("click", unassignSelectedCard);
  $("#delete-card-btn").addEventListener("click", deleteSelectedCard);
  $("#vote-up").addEventListener("click", () => { inspectorDraftVotes = Math.min(999, inspectorDraftVotes + 1); $("#vote-count").textContent = inspectorDraftVotes; $("#vote-down").disabled = false; });
  $("#vote-down").addEventListener("click", () => { inspectorDraftVotes = Math.max(0, inspectorDraftVotes - 1); $("#vote-count").textContent = inspectorDraftVotes; $("#vote-down").disabled = inspectorDraftVotes === 0; });
  $("#edit-notes").addEventListener("input", (event) => { $("#notes-count").textContent = event.target.value.length; });
  $("#edit-level").addEventListener("change", (event) => updateInspectorPositions(event.target.value, 0));
  $("#library-search").addEventListener("input", renderLibrary);
  $("#macro-filter").addEventListener("change", renderLibrary);
  $("#sort-filter").addEventListener("change", renderLibrary);
  $("#add-level").addEventListener("change", (event) => updateAddPositions(event.target.value));
  $("#add-topic-form").addEventListener("submit", (event) => { event.preventDefault(); addTopicFromDialog(); });
  $$('[data-close-dialog]').forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  $("#copy-share-btn").addEventListener("click", () => void copyShareLink());
  $("#keep-board-btn").addEventListener("click", rejectImport);
  $("#close-import-btn").addEventListener("click", rejectImport);
  $("#import-dialog").addEventListener("cancel", (event) => {
    event.preventDefault();
    rejectImport();
  });
  $("#open-import-btn").addEventListener("click", acceptImport);
  $("#save-snapshot-btn").addEventListener("click", () => {
    const name = $("#snapshot-name").value.trim() || `Version ${snapshots.length + 1}`;
    if (!createSnapshot(name)) return;
    $("#snapshot-name").value = "";
    renderSnapshots();
    showToast(`Saved: ${name}`, "success");
  });
  $("#import-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) return showToast("That JSON file is larger than 2 MB. Please use a smaller curriculum backup.", "error", 7000);
    try {
      const parsed = JSON.parse(await file.text());
      openImportCandidate(parsed.board || parsed, file.name);
    } catch {
      showToast("That file is not a valid TCA board.", "error");
    }
  });
  $("#reload-board-btn").addEventListener("click", () => location.reload());

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) return setView(viewButton.dataset.view);
    const tabButton = event.target.closest("[data-library-tab]");
    if (tabButton) { libraryTab = tabButton.dataset.libraryTab; return renderLibrary(); }
    const actionElement = event.target.closest("[data-action]");
    if (actionElement) {
      const menu = actionElement.closest("details");
      handleAction(actionElement.dataset.action, actionElement);
      if (menu) menu.open = false;
    }
    const snapshotAction = event.target.closest("[data-snapshot-action]");
    if (snapshotAction) handleSnapshotAction(snapshotAction.dataset.snapshotAction, snapshotAction.dataset.snapshotId);
  });

  document.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-card-id]");
    if (!card) return;
    draggedCardId = card.dataset.cardId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedCardId);
    card.classList.add("dragging");
  });
  document.addEventListener("dragend", (event) => {
    event.target.closest("[data-card-id]")?.classList.remove("dragging");
    draggedCardId = null;
    $$(".slot.drag-over").forEach((slot) => slot.classList.remove("drag-over"));
  });
  document.addEventListener("dragover", (event) => {
    const slot = event.target.closest(".slot");
    if (!slot || slot.classList.contains("empty-locked") || !draggedCardId) return;
    event.preventDefault();
    $$(".slot.drag-over").forEach((item) => item.classList.remove("drag-over"));
    slot.classList.add("drag-over");
  });
  document.addEventListener("drop", (event) => {
    const slot = event.target.closest(".slot");
    if (!slot || slot.classList.contains("empty-locked") || !draggedCardId) return;
    event.preventDefault();
    const next = clone(board);
    if (moveCardInBoard(next, draggedCardId, slot.dataset.level, Number(slot.dataset.position))) {
      commit(next, `Moved to ${locationLabel(slot.dataset.level)}`);
    }
    draggedCardId = null;
  });

  document.addEventListener("keydown", (event) => {
    const editable = event.target.closest?.("input, textarea, select, [contenteditable='true']");
    if (editable) return;
    if (event.key === "Escape" && selectedCardId) {
      event.preventDefault();
      saveAndCloseInspector();
      return;
    }
    if (event.key === "Escape" && document.body.classList.contains("presentation-mode")) exitPresentation();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && event.newValue && event.newValue !== JSON.stringify(board)) $("#cross-tab-alert").classList.remove("hidden");
  });
}

function handleSnapshotAction(action, id) {
  const snapshot = snapshots.find((item) => item.id === id);
  if (!snapshot) return;
  if (action === "compare") {
    comparison = buildComparison(snapshot, board);
    $("#versions-dialog").close();
    setView("board");
    renderAll();
  }
  if (action === "restore" && confirm(`Restore “${snapshot.name}”? The current board will remain available through Undo.`)) {
    $("#versions-dialog").close();
    comparison = null;
    commit(clone(snapshot.board), `Restored: ${snapshot.name}`);
  }
  if (action === "delete" && confirm(`Delete saved version “${snapshot.name}”?`)) {
    const nextSnapshots = snapshots.filter((item) => item.id !== id);
    if (!saveSnapshots(nextSnapshots)) return;
    snapshots = nextSnapshots;
    if (comparison?.snapshot?.id === id) comparison = null;
    renderSnapshots();
  }
}

async function loadCatalogue() {
  try {
    const response = await fetch("./data/topics.json", { cache: "force-cache" });
    if (!response.ok) throw new Error("catalogue");
    catalog = await response.json();
    const macros = [...new Set(catalog.map((topic) => topic.macro).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    $("#macro-filter").innerHTML = `<option value="all">All areas</option>${macros.map((macro) => `<option value="${escapeHtml(macro)}">${escapeHtml(macro)}</option>`).join("")}`;
    renderLibrary();
  } catch {
    $("#topic-list").innerHTML = `<div class="empty-library"><strong>Catalogue unavailable</strong><p>The curriculum board still works. Reload later to recover the bibliography.</p></div>`;
    showToast("The topic catalogue could not be loaded.", "warning");
  }
}

async function readShareHash() {
  if (!location.hash.startsWith("#share=")) return;
  const encoded = location.hash.slice("#share=".length);
  if (encoded.length > 120000) {
    clearShareHash();
    return showToast("This shared link is too long. Ask for the JSON file instead.", "error", 7000);
  }
  try {
    const decoded = await decodeSharedBoard(encoded);
    openImportCandidate(decoded, "shared link");
  } catch {
    clearShareHash();
    showToast("This shared link is invalid or incomplete.", "error", 7000);
  }
}

async function init() {
  bindEvents();
  renderAll();
  setView("board");
  if (shouldPersistInitialBoard) saveBoard();
  else updateSaveState();
  await Promise.all([loadCatalogue(), readShareHash()]);
}

document.addEventListener("DOMContentLoaded", () => void init());
