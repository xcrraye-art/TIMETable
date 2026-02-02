// 可编辑课表（本地存储版）
// 数据保存在浏览器 localStorage：同一台设备同一浏览器会记住

const STORAGE_KEY = "timetable_events_v1";

// 课表时间段（你可以改）
const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00",
  "20:00", "21:00"
];

const grid = document.querySelector(".grid");
const dialog = document.getElementById("dialog");
const form = document.getElementById("form");
const addBtn = document.getElementById("addBtn");
const cancelBtn = document.getElementById("cancelBtn");

function pad2(n) { return String(n).padStart(2, "0"); }
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// 渲染网格（表头已在 HTML 里，下面生成时间行）
function buildGridBody() {
  // 移除旧的时间行（保留前 8 个表头格子）
  while (grid.children.length > 8) grid.removeChild(grid.lastChild);

  for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
    const start = TIME_SLOTS[i];
    const end = TIME_SLOTS[i + 1];

    // 时间列
    const timeCell = document.createElement("div");
    timeCell.className = "cell time";
    timeCell.textContent = `${start}–${end}`;
    grid.appendChild(timeCell);

    // 7 天格子
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

function renderEvents(events) {
  clearEventsFromCells();

  // 这里做一个“按开始时间落格子”的简单渲染：
  // 每个事件显示在它开始时间所在的那个 slot 的格子里
  for (const ev of events) {
    const selector = `.cell[data-day="${ev.day}"][data-slotStart="${ev.start}"]`;
    const cell = document.querySelector(selector);
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
  // 给默认值更友好
  form.day.value = "1";
  form.start.value = "09:00";
  form.end.value = "10:00";

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "open"); // 极少数旧浏览器 fallback
}

function closeDialog() {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

addBtn.addEventListener("click", openDialog);
cancelBtn.addEventListener("click", closeDialog);

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());
  const startMin = timeToMinutes(data.start);
  const endMin = timeToMinutes(data.end);

  if (endMin <= startMin) {
    alert("结束时间必须晚于开始时间。");
    return;
  }

  // 限制：必须是我们时间段里存在的 start（简单版）
  if (!TIME_SLOTS.includes(data.start)) {
    alert("开始时间请选整点，并且在课表时间段里（可在 app.js 的 TIME_SLOTS 修改）。");
    return;
  }

  const ev = {
    id: uid(),
    title: data.title.trim(),
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

// 初始化
buildGridBody();
renderEvents(loadEvents());
