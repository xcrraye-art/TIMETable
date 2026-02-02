// ===== 可编辑课表（稳定修复版）=====
// - 支持整点 / 半点
// - 不要求时间完全匹配格子
// - 课程一定能显示在表格里
// - 数据保存在 localStorage

const STORAGE_KEY = "timetable_events_v1";

// ===== 时间刻度：08:00 - 22:00，每 1 小时一格 =====
const TIME_SLOTS = [
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00",
  "18:00","19:00","20:00","21:00","22:00"
];

// ===== 工具函数 =====
const grid = document.querySelector(".grid");
const dialog = document.getElementById("dialog");
const form = document.getElementById("form");
const addBtn = document.getElementById("addBtn");
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

// ===== 构建课表网格 =====
function buildGrid() {
  // 清掉旧格子（保留表头 8 个）
  while (grid.children.length > 8) grid.removeChild(grid.lastChild);

  for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
    const start = TIME_SLOTS[i];
    const end = TIME_SLOTS[i + 1];

    // 时间列
    const timeCell = document.createElement("div");
    timeCell.className = "cell time";
    timeCell.textContent = `${start}–${end}`;
    grid.appendChild(timeCell);

    // 周一到周日
    for (let day = 1; day <= 7; day++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.day = day;
      cell.dataset.start = start;
      cell.dataset.end = end;
      grid.appendChild(cell);
    }
  }
}

// ===== 清空课程块 =====
function clearEvents() {
  document.querySelectorAll(".event").forEach(e => e.remove());
}

// ===== 渲染课程（关键修复点）=====
function renderEvents(events) {
  clearEvents();

  events.forEach(ev => {
    const startMin = timeToMinutes(ev.start);

    const cells = document.querySelectorAll(`.cell[data-day="${ev.day}"]`);
    let targetCell = null;

    for (const cell of cells) {
      const a = timeToMinutes(cell.dataset.start);
      const b = timeToMinutes(cell.dataset.end);
      if (startMin >= a && startMin < b) {
        targetCell = cell;
        break;
      }
    }

    if (!targetCell) return;

    const box = document.createElement("div");
    box.className = "event";

    box.innerHTML = `
      <div class="title">${ev.title}</div>
      <div class="meta">
        ${ev.start}–${ev.end}
        ${ev.location ? `<br>📍 ${ev.location}` : ""}
        ${ev.note ? `<br>📝 ${ev.note}` : ""}
      </div>
    `;

    box.onclick = () => {
      if (confirm(`删除课程？\n\n${ev.title}`)) {
        const next = loadEvents().filter(x => x.id !== ev.id);
        saveEvents(next);
        renderEvents(next);
      }
    };

    targetCell.appendChild(box);
  });
}

// ===== 弹窗控制 =====
addBtn.onclick = () => dialog.showModal();
cancelBtn.onclick = () => dialog.close();

form.onsubmit = e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  if (timeToMinutes(data.end) <= timeToMinutes(data.start)) {
    alert("结束时间必须晚于开始时间");
    return;
  }

  const events = loadEvents();
  events.push({
    id: uid(),
    title: data.title.trim(),
    day: Number(data.day),
    start: data.start,
    end: data.end,
    location: data.location?.trim(),
    note: data.note?.trim()
  });

  saveEvents(events);
  dialog.close();
  renderEvents(events);
};

// ===== 初始化 =====
buildGrid();
renderEvents(loadEvents());
