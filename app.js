// ===== 可编辑课表（终版 v3）=====
// - 09:00 开始
// - 清除全部
// - 课程块不透明（CSS 里做）
// - 更稳的“落格子”逻辑

const APP_VERSION = "timetable-v3-0900-clear-solid";
console.log("Loaded:", APP_VERSION);

const STORAGE_KEY = "timetable_events_v3";

// 09:00 - 22:00（每小时一格）
const TIME_SLOTS = [
  "09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00",
  "17:00","18:00","19:00","20:00",
  "21:00","22:00"
];

const grid = document.querySelector(".grid");
const dialog = document.getElementById("dialog");
const form = document.getElementById("form");
const addBtn = document.getElementById("addBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const cancelBtn = document.getElementById("cancelBtn");

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

// 生成表格（表头已在 HTML 里，下面生成时间行）
function buildGridBody() {
  // 清掉旧行（保留前 8 个表头格子）
  while (grid.children.length > 8) grid.removeChild(grid.lastChild);

  for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
    const start = TIME_SLOTS[i];
    const end = TIME_SLOTS[i + 1];

    // 时间列
    const timeCell = document.createElement("div");
    timeCell.className = "cell time";
    timeCell.textContent = `${start}–\n${end}`;
    grid.appendChild(timeCell);

    // 周一到周日格子
    for (let day = 1; day <= 7; day++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.day = String(day);
      cell.dataset.slotStart = start;
      cell.dataset.slotEnd = end;
      grid.appendChild(cell);
    }
  }
}

function clearEventsFromCells() {
  document.querySelectorAll(".event").forEach((el) => el.remove());
}

// ✅ 稳定版落格子：只要 start 落在这个格子的区间，就放进去
function findCellForEvent(day, startTime) {
  const cells = document.querySelectorAll(`.cell[data-day="${day}"]`);
  const startMin = timeToMinutes(startTime);

  for (const cell of cells) {
    const slotStart = cell.dataset.slotStart;
    const slotEnd = cell.dataset.slotEnd;
    if (!slotStart || !slotEnd) continue;

    const a = timeToMinutes(slotStart);
    const b = timeToMinutes(slotEnd);

    if (startMin >= a && startMin < b) return cell;
  }
  return null;
}

function renderEvents(events) {
  clearEventsFromCells();

  for (const ev of events) {
    const cell = findCellForEvent(ev.day, ev.start);
    if (!cell) continue;

    const box = document.createElement("div");
    box.className = "event";
    box.dataset.id = ev.id;

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = ev.title;

    const meta = document.createElement("div");
    meta.className = "meta";

    const loc = ev.location ? `📍 ${ev.location}` : "";
    const note = ev.note ? `📝 ${ev.note}` : "";
    meta.innerHTML = `${ev.start}–${ev.end}${loc ? "<br>" + loc : ""}${note ? "<br>" + note : ""}`;

    box.appendChild(title);
    box.appendChild(meta);

    // 点击删除（带确认）
    box.addEventListener("click", () => {
      const ok = confirm(`删除这个日程？\n\n${ev.title} (${ev.start}–${ev.end})`);
      if (!ok) return;
      const next = loadEvents().filter((x) => x.id !== ev.id);
      saveEvents(next);
      renderEvents(next);
    });

    cell.appendChild(box);
  }
}

function openDialog() {
  form.reset();
  form.day.value = "1";
  form.start.value = "09:00";
  form.end.value = "10:00";

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "open");
}

function closeDialog() {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

// 绑定按钮
addBtn.addEventListener("click", openDialog);
cancelBtn.addEventListener("click", closeDialog);

clearAllBtn.addEventListener("click", () => {
  const ok = confirm("确定要清除所有课程吗？此操作无法撤销。");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  renderEvents([]);
});

// 表单保存
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());
  const startMin = timeToMinutes(data.start);
  const endMin = timeToMinutes(data.end);

  if (endMin <= startMin) {
    alert("结束时间必须晚于开始时间。");
    return;
  }

  const ev = {
    id: uid(),
    title: (data.title || "").trim(),
    day: Number(data.day),
    start: data.start,
    end: data.end,
    location: (data.location || "").trim(),
    note: (data.note || "").trim(),
  };

  if (!ev.title) {
    alert("请填写标题。");
    return;
  }

  const events = loadEvents();
  events.push(ev);
  saveEvents(events);

  closeDialog();
  renderEvents(events);
});

// 初始化
buildGridBody();
renderEvents(loadEvents());
