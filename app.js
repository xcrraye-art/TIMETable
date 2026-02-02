const APP_VERSION = "v4-grid-span-lunch-themes";
const STORAGE_KEY = "timetable_events_v4";

// 把旧版本可能用过的 key 全部清掉（你现在“清除无效”就是因为以前存过多个 key）
const LEGACY_KEYS = [
  "timetable_events_v1",
  "timetable_events_v2",
  "timetable_events_v3",
  "timetable_events_v4",
  "timetable_events_v5",
  "timetable_events_v2:",
  "timetable_events_v3:"
];

// 配置：9点开始，30分钟一格（这样 09:00–11:00 才能精准跨行）
const GRID_START = "09:00";
const GRID_END = "16:00";       // 你想更长就改成 "22:00"
const STEP_MIN = 30;

// Lunch 固定：13:00–14:00，周一到周五
const LUNCH_START = "13:00";
const LUNCH_END = "14:00";

const DAYS = ["", "周一","周二","周三","周四","周五","周六","周日"];

function timeToMinutes(t){
  const [h,m] = t.split(":").map(Number);
  return h*60 + m;
}
function minutesToTime(min){
  const h = String(Math.floor(min/60)).padStart(2,"0");
  const m = String(min%60).padStart(2,"0");
  return `${h}:${m}`;
}
function genSlots(start, end, stepMin){
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const out = [];
  for(let m=s; m<=e; m+=stepMin) out.push(minutesToTime(m));
  return out;
}
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function loadEvents(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveEvents(events){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

const slots = genSlots(GRID_START, GRID_END, STEP_MIN); // includes end

window.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const grid = document.getElementById("grid");
  const ver = document.getElementById("ver");

  const dialog = document.getElementById("dialog");
  const form = document.getElementById("form");
  const addBtn = document.getElementById("addBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const themeBtn = document.getElementById("themeBtn");

  ver.textContent = `脚本版本：${APP_VERSION} ｜网格：${GRID_START}–${GRID_END}（${STEP_MIN}min/格）`;

  // ===== Theme =====
  const THEME_KEY = "timetable_theme";
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "light" || savedTheme === "dark") body.dataset.theme = savedTheme;

  themeBtn.addEventListener("click", () => {
    body.dataset.theme = (body.dataset.theme === "dark") ? "light" : "dark";
    localStorage.setItem(THEME_KEY, body.dataset.theme);
  });

  // ===== Build grid =====
  function clearGrid(){
    grid.innerHTML = "";
  }

  // grid-row mapping:
  // row 1: header
  // row 2.. : each slot range (slots[i]–slots[i+1])
  function buildGrid(){
    clearGrid();

    // Header row
    const headBlank = document.createElement("div");
    headBlank.className = "cell head";
    headBlank.style.gridRow = "1";
    headBlank.style.gridColumn = "1";
    grid.appendChild(headBlank);

    for(let d=1; d<=7; d++){
      const hd = document.createElement("div");
      hd.className = "cell head";
      hd.textContent = DAYS[d];
      hd.style.gridRow = "1";
      hd.style.gridColumn = String(d+1);
      if (d === 7) hd.classList.add("endcol");
      grid.appendChild(hd);
    }

    // Time rows + day cells
    for(let i=0; i<slots.length-1; i++){
      const row = i + 2; // start from row2
      const start = slots[i];
      const end = slots[i+1];

      const t = document.createElement("div");
      t.className = "cell time";
      t.textContent = `${start}–\n${end}`;
      t.style.gridRow = String(row);
      t.style.gridColumn = "1";
      grid.appendChild(t);

      for(let d=1; d<=7; d++){
        const c = document.createElement("div");
        c.className = "cell";
        c.dataset.day = String(d);
        c.dataset.slotStart = start;
        c.dataset.slotEnd = end;
        c.style.gridRow = String(row);
        c.style.gridColumn = String(d+1);
        if (d === 7) c.classList.add("endcol");
        grid.appendChild(c);
      }
    }
  }

  // ===== Render events as grid items (span rows) =====
  function slotRowIndexForTime(t){
    // returns row number in CSS grid (>=2)
    const min = timeToMinutes(t);
    for(let i=0; i<slots.length-1; i++){
      const a = timeToMinutes(slots[i]);
      const b = timeToMinutes(slots[i+1]);
      if(min >= a && min < b) return i + 2;
    }
    return null;
  }

  function spanRows(start, end){
    const s = timeToMinutes(start);
    const e = timeToMinutes(end);
    const dur = Math.max(0, e - s);
    return Math.max(1, Math.ceil(dur / STEP_MIN));
  }

  function clearRendered(){
    grid.querySelectorAll(".event, .lunch").forEach(el => el.remove());
  }

  function renderLunch(){
    // only show if lunch time is within grid range
    const r = slotRowIndexForTime(LUNCH_START);
    if (!r) return;

    const span = spanRows(LUNCH_START, LUNCH_END);

    const lunch = document.createElement("div");
    lunch.className = "lunch";
    lunch.textContent = "Lunch";

    // Mon-Fri columns = 2..6 (周一 col2, 周五 col6)
    lunch.style.gridRow = `${r} / span ${span}`;
    lunch.style.gridColumn = `2 / 7`; // 2..6 inclusive => end at 7
    lunch.style.zIndex = "15";

    grid.appendChild(lunch);
  }

  function renderEvents(events){
    clearRendered();
    renderLunch();

    for(const ev of events){
      const r = slotRowIndexForTime(ev.start);
      if(!r) continue;

      const span = spanRows(ev.start, ev.end);

      const box = document.createElement("div");
      box.className = "event";

      // grid placement
      const dayCol = Number(ev.day) + 1; // day 1 -> col2
      box.style.gridColumn = String(dayCol);
      box.style.gridRow = `${r} / span ${span}`;

      box.innerHTML = `
        <div class="title"></div>
        <div class="meta"></div>
      `;
      box.querySelector(".title").textContent = ev.title;

      const meta = [
        `${ev.start}–${ev.end}`,
        ev.location ? `📍 ${ev.location}` : null,
        ev.note ? `📝 ${ev.note}` : null,
      ].filter(Boolean).join("<br>");

      box.querySelector(".meta").innerHTML = meta;

      box.addEventListener("click", () => {
        const ok = confirm(`删除这个日程？\n\n${ev.title} (${ev.start}–${ev.end})`);
        if(!ok) return;
        const next = loadEvents().filter(x => x.id !== ev.id);
        saveEvents(next);
        renderEvents(next);
      });

      grid.appendChild(box);
    }
  }

  // ===== Dialog =====
  function openDialog(){
    form.reset();
    form.day.value = "1";
    form.start.value = GRID_START;
    // 默认结束 = start + 60min
    form.end.value = minutesToTime(timeToMinutes(GRID_START) + 60);
    dialog.showModal();
  }
  function closeDialog(){ dialog.close(); }

  addBtn.addEventListener("click", openDialog);
  cancelBtn.addEventListener("click", closeDialog);

  // ===== Clear all (真正有效) =====
  clearAllBtn.addEventListener("click", () => {
    const ok = confirm("确定要清除所有课程吗？此操作无法撤销。");
    if(!ok) return;

    // 清所有旧key + 当前key
    for(const k of LEGACY_KEYS) localStorage.removeItem(k);
    localStorage.removeItem(STORAGE_KEY);

    renderEvents([]);
  });

  // ===== Save =====
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    const title = (data.title || "").trim();
    if(!title){
      alert("请填写标题。");
      return;
    }

    const s = timeToMinutes(data.start);
    const en = timeToMinutes(data.end);
    if(en <= s){
      alert("结束时间必须晚于开始时间。");
      return;
    }

    // 必须在网格范围内
    if (s < timeToMinutes(GRID_START) || en > timeToMinutes(GRID_END)) {
      alert(`时间必须在 ${GRID_START}–${GRID_END} 范围内（你可以在 app.js 修改 GRID_END）。`);
      return;
    }

    const ev = {
      id: uid(),
      title,
      day: Number(data.day),
      start: data.start,
      end: data.end,
      location: (data.location || "").trim(),
      note: (data.note || "").trim(),
    };

    const events = loadEvents();
    events.push(ev);
    saveEvents(events);

    closeDialog();
    renderEvents(events);
  });

  // ===== Init =====
  buildGrid();
  renderEvents(loadEvents());
});
