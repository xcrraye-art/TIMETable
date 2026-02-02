// ===== 可编辑课表（稳定版：保存必定生效）=====
// - 09:00 开始
// - 修复“点保存没反应”
// - 保存后一定渲染到表格
// - localStorage 保存

const STORAGE_KEY = "timetable_events_v2";

// 09:00 - 22:00（每小时一格；你要半小时我也能再升级）
const TIME_SLOTS = [
  "09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00",
  "17:00","18:00","19:00","20:00",
  "21:00","22:00"
];

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

window.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".grid");
  const dialog = document.getElementById("dialog");
  const form = document.getElementById("form");
  const addBtn = document.getElementById("addBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  // 如果这里任何一个是 null，说明你的 HTML id 不匹配
  if (!grid || !dialog || !form || !addBtn || !cancelBtn) {
    alert("页面元素没找到：请检查 index.html 里的 id 是否和脚本一致（grid/dialog/form/addBtn/cancelBtn）");
    return;
  }

  function buildGrid() {
    // 清掉旧格子（保留表头 8 个）
    while (grid.children.length > 8) grid.removeChild(grid.lastChild);

    for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
      const start = TIME_SLOTS[i];
      const end = TIME_SLOTS[i + 1];

      const timeCell = document.createElement("div");
      timeCell.className = "cell time";
      timeCell.textContent = `${start}–${end}`;
      grid.appendChild(timeCell);

      for (let day = 1; day <= 7; day++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.day = String(day);
        cell.dataset.start = start;
        cell.dataset.end = end;
        grid.appendChild(cell);
      }
    }
  }

  function clearEvents() {
    document.querySelectorAll(".event").forEach((e) => e.remove());
  }

  function renderEvents(events) {
    clearEvents();

    for (const ev of events) {
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
      if (!targetCell) continue;

      const box = document.createElement("div");
      box.className = "event";
      box.innerHTML = `
        <div class="title"></div>
        <div class="meta"></div>
      `;
      box.querySelector(".title").textContent = ev.title;

      const metaLines = [
        `${ev.start}–${ev.end}`,
        ev.location ? `📍 ${ev.location}` : null,
        ev.note ? `📝 ${ev.note}` : null,
      ].filter(Boolean);

      box.querySelector(".meta").innerHTML = metaLines.join("<br>");

      box.addEventListener("click", () => {
        const ok = confirm(`删除这个日程？\n\n${ev.title} (${ev.start}–${ev.end})`);
        if (!ok) return;
        const next = loadEvents().filter((x) => x.id !== ev.id);
        saveEvents(next);
        renderEvents(next);
      });

      targetCell.appendChild(box);
    }
  }

  function openDialog() {
    // 给默认值：9点开始
    form.reset();
    if (form.day) form.day.value = "1";
    if (form.start) form.start.value = "09:00";
    if (form.end) form.end.value = "10:00";
    dialog.showModal();
  }

  addBtn.addEventListener("click", openDialog);
  cancelBtn.addEventListener("click", () => dialog.close());

  // 关键：submit 一定会触发
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    // 基本校验
    if (!data.title || !data.title.trim()) {
      alert("请填写标题（课程名/日程）");
      return;
    }
    if (timeToMinutes(data.end) <= timeToMinutes(data.start)) {
      alert("结束时间必须晚于开始时间");
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

    // ✅ 给你一个明确反馈：保存确实发生了
    alert("保存成功 ✅（已写入本机浏览器）");

    dialog.close();
    renderEvents(events);
  });

  // 初始化
  buildGrid();
  renderEvents(loadEvents());
});
