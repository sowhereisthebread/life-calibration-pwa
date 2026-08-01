(() => {
  "use strict";

  const DATA_VERSION = 1;
  const DEFAULT_CATEGORIES = ["生活", "餐飲", "交通", "居家", "醫療", "其他"];

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function localTimeValue(date = new Date()) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function dateFromKey(key) {
    return new Date(`${key}T12:00:00`);
  }

  function createEmptyDay() {
    return {
      sleep: { bedtime: "", wakeTime: "" },
      workSessions: [],
      transactions: [],
      recovery: { activity: "", effect: "" },
      note: "",
      updatedAt: null
    };
  }

  function createEmptyState(now = new Date()) {
    const timestamp = now.toISOString();
    return {
      version: DATA_VERSION,
      days: {},
      projects: [],
      customCategories: [],
      lastCustomCategory: "",
      meta: {
        createdAt: timestamp,
        lastOpenedAt: timestamp,
        lastExportAt: null
      }
    };
  }

  function normalizeState(value) {
    const empty = createEmptyState();
    if (!value || typeof value !== "object") return empty;

    const days = {};
    if (value.days && typeof value.days === "object" && !Array.isArray(value.days)) {
      Object.entries(value.days).forEach(([key, rawDay]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !rawDay || typeof rawDay !== "object") return;
        const base = createEmptyDay();
        days[key] = {
          ...base,
          ...rawDay,
          sleep: { ...base.sleep, ...(rawDay.sleep || {}) },
          workSessions: Array.isArray(rawDay.workSessions) ? rawDay.workSessions : [],
          transactions: Array.isArray(rawDay.transactions) ? rawDay.transactions : [],
          recovery: { ...base.recovery, ...(rawDay.recovery || {}) }
        };
      });
    }

    const customCategories = Array.isArray(value.customCategories) ? value.customCategories.filter(item => typeof item === "string") : [];
    const lastCustomCategory = typeof value.lastCustomCategory === "string" && customCategories.includes(value.lastCustomCategory)
      ? value.lastCustomCategory
      : "";

    return {
      version: DATA_VERSION,
      days,
      projects: Array.isArray(value.projects) ? value.projects : [],
      customCategories,
      lastCustomCategory,
      meta: {
        ...empty.meta,
        ...(value.meta && typeof value.meta === "object" ? value.meta : {})
      }
    };
  }

  function validateImportedState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { valid: false, reason: "檔案內容不是人生主控表資料。" };
    }
    if (value.version !== DATA_VERSION) {
      return { valid: false, reason: `資料版本不相容。目前只支援第 ${DATA_VERSION} 版。` };
    }
    if (!value.days || typeof value.days !== "object" || Array.isArray(value.days)) {
      return { valid: false, reason: "檔案缺少每日資料。" };
    }
    if (!Array.isArray(value.projects)) {
      return { valid: false, reason: "檔案缺少專案清單。" };
    }
    return { valid: true, reason: "" };
  }

  function preferredTransactionCategory(state) {
    const category = state && typeof state.lastCustomCategory === "string" ? state.lastCustomCategory.trim() : "";
    return category && state.customCategories?.includes(category) ? category : DEFAULT_CATEGORIES[0];
  }

  function timeToMinutes(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function durationBetweenTimes(start, end) {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    if (startMinutes === null || endMinutes === null) return null;
    return endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 1440 - startMinutes;
  }

  function workMinutes(sessions = []) {
    return sessions.reduce((total, session) => {
      if (!session || !session.start || !session.end) return total;
      const duration = durationBetweenTimes(session.start, session.end);
      return total + (duration === null ? 0 : duration);
    }, 0);
  }

  function transactionAmount(transaction) {
    const amount = Number(transaction && transaction.amount);
    return Number.isFinite(amount) ? Math.max(0, amount) : 0;
  }

  function dayIncome(day) {
    return (day?.transactions || []).reduce((total, item) => item.type === "income" ? total + transactionAmount(item) : total, 0);
  }

  function dayExpense(day) {
    return (day?.transactions || []).reduce((total, item) => item.type !== "income" ? total + transactionAmount(item) : total, 0);
  }

  function dayNet(day) {
    return dayIncome(day) - dayExpense(day);
  }

  function hasDayRecord(day) {
    if (!day) return false;
    return Boolean(
      day.sleep?.bedtime ||
      day.sleep?.wakeTime ||
      day.workSessions?.length ||
      day.transactions?.length ||
      day.recovery?.activity ||
      day.recovery?.effect ||
      day.note
    );
  }

  function hasAnyDataInState(state) {
    return Boolean(state && ((state.projects?.length || 0) > 0 || Object.values(state.days || {}).some(hasDayRecord)));
  }

  function shouldShowBackupReminder(state, dateKey = localDateKey(), now = Date.now()) {
    if (!hasAnyDataInState(state) || state.meta?.backupSnoozedDate === dateKey) return false;
    const reference = state.meta?.lastExportAt || state.meta?.createdAt;
    const elapsed = reference ? now - new Date(reference).getTime() : Infinity;
    return !Number.isFinite(elapsed) || elapsed >= 7 * 24 * 60 * 60 * 1000;
  }

  function reviewDateKeys(anchorKey = localDateKey()) {
    const anchor = dateFromKey(anchorKey);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(anchor);
      date.setDate(anchor.getDate() - index);
      return localDateKey(date);
    });
  }

  function summarizeReview(state, anchorKey = localDateKey()) {
    const dates = reviewDateKeys(anchorKey);
    let sleepTotal = 0;
    let sleepCount = 0;
    let totalWork = 0;
    let totalExpense = 0;
    let recordedDays = 0;

    const rows = dates.map(date => {
      const day = state.days[date] || createEmptyDay();
      const sleep = durationBetweenTimes(day.sleep?.bedtime, day.sleep?.wakeTime);
      const work = workMinutes(day.workSessions);
      const income = dayIncome(day);
      const expense = dayExpense(day);
      if (sleep !== null) {
        sleepTotal += sleep;
        sleepCount += 1;
      }
      totalWork += work;
      totalExpense += expense;
      if (hasDayRecord(day)) recordedDays += 1;
      return { date, sleep, work, income, expense, net: income - expense, recovery: day.recovery?.effect || "" };
    });

    return {
      rows,
      averageSleep: sleepCount ? Math.round(sleepTotal / sleepCount) : null,
      totalWork,
      totalExpense,
      recordedDays
    };
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function buildCsv(state) {
    const headers = ["日期", "就寢時間", "起床時間", "睡眠時數", "工時", "收入", "支出", "淨額", "恢復效果", "恢復內容", "備註"];
    const rows = Object.keys(state.days)
      .sort()
      .map(date => {
        const day = state.days[date];
        const sleep = durationBetweenTimes(day.sleep?.bedtime, day.sleep?.wakeTime);
        const work = workMinutes(day.workSessions);
        return [
          date,
          day.sleep?.bedtime || "",
          day.sleep?.wakeTime || "",
          sleep === null ? "" : (sleep / 60).toFixed(2),
          (work / 60).toFixed(2),
          dayIncome(day),
          dayExpense(day),
          dayNet(day),
          day.recovery?.effect || "",
          day.recovery?.activity || "",
          day.note || ""
        ].map(csvEscape).join(",");
      });
    return [headers.join(","), ...rows].join("\r\n");
  }

  function formatMinutes(minutes) {
    if (minutes === null || minutes === undefined) return "—";
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes % 60);
    if (!hours) return `${remainder} 分`;
    if (!remainder) return `${hours} 小時`;
    return `${hours} 小時 ${remainder} 分`;
  }

  function uid(prefix = "item") {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const Core = {
    DATA_VERSION,
    DEFAULT_CATEGORIES: [...DEFAULT_CATEGORIES],
    createEmptyDay,
    createEmptyState,
    normalizeState,
    validateImportedState,
    preferredTransactionCategory,
    timeToMinutes,
    durationBetweenTimes,
    workMinutes,
    dayIncome,
    dayExpense,
    dayNet,
    hasDayRecord,
    hasAnyDataInState,
    shouldShowBackupReminder,
    reviewDateKeys,
    summarizeReview,
    csvEscape,
    buildCsv,
    formatMinutes,
    localDateKey
  };

  globalThis.LifeCalibrationCore = Core;

  if (!globalThis.document || !document.getElementById("app")) return;

  const elements = {};
  const todayKey = localDateKey();
  const dataStore = globalThis.LifeCalibrationData.create({
    core: Core,
    onError: (message, error) => console.error(message, error)
  });
  let state = dataStore.readState();
  let toastTimer = null;
  let saveTimer = null;
  let modalAction = null;
  let modalStep = 1;
  let modalReturnFocus = null;

  function queryElements() {
    [
      "today-date", "autosave-status", "today-work-total", "today-net-total", "sleep-bedtime", "sleep-wake",
      "sleep-total", "work-status", "punch-button", "work-sessions", "transaction-form", "transaction-type",
      "transaction-amount", "transaction-category", "transaction-note", "category-options", "transaction-list",
      "recovery-activity", "recovery-effect", "daily-note", "toggle-project-form", "project-form", "project-name",
      "project-next-step", "cancel-project", "project-list", "metric-sleep", "metric-work", "metric-expense",
      "metric-days", "review-list", "backup-reminder", "skip-backup-reminder", "export-json", "export-csv", "import-json", "last-export",
      "current-origin", "clear-data", "confirm-modal", "modal-title", "modal-message", "modal-confirm", "toast"
    ].forEach(id => { elements[id] = document.getElementById(id); });
  }

  function readToday() {
    return state.days[todayKey] || createEmptyDay();
  }

  function refreshState(message = "已自動儲存") {
    state = dataStore.readState();
    showSaveState(message);
    updateBackupReminder();
  }

  function runDataChange(action, message = "已自動儲存") {
    try {
      action();
      refreshState(message);
      return true;
    } catch (error) {
      console.error("儲存本機資料失敗", error);
      showToast("儲存失敗，請先匯出資料並檢查瀏覽器空間。", 5000);
      return false;
    }
  }

  function showSaveState(message) {
    if (!elements["autosave-status"]) return;
    elements["autosave-status"].textContent = message;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      elements["autosave-status"].textContent = "輸入即存";
    }, 1800);
  }

  function showToast(message, duration = 2800) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { elements.toast.hidden = true; }, duration);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function formatDisplayDate(key, includeWeekday = true) {
    return new Intl.DateTimeFormat("zh-TW", {
      month: "numeric",
      day: "numeric",
      ...(includeWeekday ? { weekday: "short" } : {})
    }).format(dateFromKey(key));
  }

  function formatUpdated(value) {
    if (!value) return "尚未更新";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "尚未更新";
    return new Intl.DateTimeFormat("zh-TW", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(date);
  }

  function setPage(pageName) {
    document.querySelectorAll("[data-page]").forEach(page => {
      const active = page.dataset.page === pageName;
      page.hidden = !active;
      page.classList.toggle("is-active", active);
    });
    document.querySelectorAll("[data-page-target]").forEach(button => {
      const active = button.dataset.pageTarget === pageName;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (pageName === "review") renderReview();
    if (pageName === "projects") renderProjects();
    if (pageName === "data") renderDataPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById(`page-${pageName}`)?.focus({ preventScroll: true });
  }

  function populateCategoryOptions() {
    const categories = [...new Set([...DEFAULT_CATEGORIES, ...state.customCategories])];
    elements["category-options"].innerHTML = categories.map(category => `<option value="${escapeHtml(category)}"></option>`).join("");
  }

  function renderToday() {
    const day = readToday();
    elements["sleep-bedtime"].value = day.sleep.bedtime || "";
    elements["sleep-wake"].value = day.sleep.wakeTime || "";
    elements["recovery-activity"].value = day.recovery.activity || "";
    elements["recovery-effect"].value = String(day.recovery.effect || "");
    elements["daily-note"].value = day.note || "";
    renderTodaySummary();
    renderWorkSessions();
    renderTransactions();
  }

  function renderTodaySummary() {
    const day = readToday();
    const sleepMinutes = durationBetweenTimes(day.sleep.bedtime, day.sleep.wakeTime);
    const totalWork = workMinutes(day.workSessions);
    const net = dayNet(day);
    elements["sleep-total"].textContent = formatMinutes(sleepMinutes);
    elements["today-work-total"].textContent = formatMinutes(totalWork);
    elements["today-net-total"].textContent = formatCurrency(net);
  }

  function renderWorkSessions() {
    const day = readToday();
    const openSession = day.workSessions.find(session => session.start && !session.end);
    elements["work-status"].textContent = openSession ? `工作中・${openSession.start}` : (day.workSessions.length ? "今日已打卡" : "尚未上班");
    elements["work-status"].classList.toggle("is-running", Boolean(openSession));
    elements["punch-button"].textContent = openSession ? "下班打卡" : "上班打卡";

    if (!day.workSessions.length) {
      elements["work-sessions"].innerHTML = '<div class="empty-state"><strong>還沒有工作段</strong>按「上班打卡」就會開始第一段。</div>';
      return;
    }

    elements["work-sessions"].innerHTML = day.workSessions.map((session, index) => {
      const duration = session.end ? formatMinutes(durationBetweenTimes(session.start, session.end)) : "未完成，不計工時";
      return `
        <div class="record-row" data-session-id="${escapeHtml(session.id)}">
          <div class="record-row-header">
            <strong>工作段 ${index + 1}・${escapeHtml(duration)}</strong>
            <button type="button" class="record-remove" data-remove-session="${escapeHtml(session.id)}">移除此段</button>
          </div>
          <div class="inline-fields">
            <label class="field"><span>上班</span><input class="record-input" type="time" value="${escapeHtml(session.start || "")}" data-session-field="start"></label>
            <label class="field"><span>下班</span><input class="record-input" type="time" value="${escapeHtml(session.end || "")}" data-session-field="end"></label>
          </div>
        </div>`;
    }).join("");
  }

  function renderTransactions() {
    const transactions = readToday().transactions;
    if (!transactions.length) {
      elements["transaction-list"].innerHTML = '<div class="empty-state"><strong>今天還沒有收支</strong>先記一筆，不完整也沒關係。</div>';
      return;
    }
    elements["transaction-list"].innerHTML = transactions.map((transaction, index) => `
      <div class="record-row" data-transaction-id="${escapeHtml(transaction.id)}">
        <div class="record-row-header">
          <strong>第 ${index + 1} 筆・${transaction.type === "income" ? "收入" : "支出"} ${escapeHtml(formatCurrency(transactionAmount(transaction)))}</strong>
          <button type="button" class="record-remove" data-remove-transaction="${escapeHtml(transaction.id)}">刪除</button>
        </div>
        <div class="inline-fields">
          <label class="field"><span>類型</span><select class="record-input" data-transaction-field="type"><option value="expense" ${transaction.type !== "income" ? "selected" : ""}>支出</option><option value="income" ${transaction.type === "income" ? "selected" : ""}>收入</option></select></label>
          <label class="field"><span>金額</span><input class="record-input" type="number" min="0" step="1" inputmode="decimal" value="${escapeHtml(transaction.amount ?? 0)}" data-transaction-field="amount"></label>
        </div>
        <label class="field"><span>分類</span><input class="record-input" type="text" list="category-options" value="${escapeHtml(transaction.category || "")}" data-transaction-field="category"></label>
        <label class="field"><span>備註</span><input class="record-input" type="text" value="${escapeHtml(transaction.note || "")}" data-transaction-field="note"></label>
      </div>`).join("");
  }

  function renderProjects() {
    const rank = { active: 0, paused: 1, done: 2 };
    const projects = [...state.projects].sort((a, b) => {
      const statusDiff = (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
      if (statusDiff) return statusDiff;
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });

    if (!projects.length) {
      elements["project-list"].innerHTML = '<div class="empty-state"><strong>還沒有專案</strong>新增後，只留下一個清楚的下一步。</div>';
      return;
    }

    elements["project-list"].innerHTML = projects.map(project => `
      <article class="card project-card ${project.status === "done" ? "is-complete" : ""}" data-project-id="${escapeHtml(project.id)}">
        <div class="project-card-header">
          <label class="field"><span>名稱</span><input class="record-input" type="text" value="${escapeHtml(project.name || "")}" data-project-field="name"></label>
          <label class="field"><span>狀態</span><select class="record-input" data-project-field="status"><option value="active" ${project.status === "active" ? "selected" : ""}>進行中</option><option value="paused" ${project.status === "paused" ? "selected" : ""}>暫停</option><option value="done" ${project.status === "done" ? "selected" : ""}>完成</option></select></label>
        </div>
        <label class="field"><span>下一步</span><input class="record-input" type="text" value="${escapeHtml(project.nextStep || "")}" placeholder="下一個可以直接動手的動作" data-project-field="nextStep"></label>
        <div class="record-row-header">
          <p class="project-updated">最後更新：${escapeHtml(formatUpdated(project.updatedAt))}</p>
          <button type="button" class="record-remove" data-remove-project="${escapeHtml(project.id)}">刪除專案</button>
        </div>
      </article>`).join("");
  }

  function renderReview() {
    const summary = summarizeReview(state, todayKey);
    elements["metric-sleep"].textContent = formatMinutes(summary.averageSleep);
    elements["metric-work"].textContent = formatMinutes(summary.totalWork);
    elements["metric-expense"].textContent = formatCurrency(summary.totalExpense);
    elements["metric-days"].textContent = `${summary.recordedDays} 天`;

    elements["review-list"].innerHTML = summary.rows.map(row => `
      <article class="review-day">
        <div class="review-day-header"><strong>${escapeHtml(formatDisplayDate(row.date))}</strong><span>${hasDayRecord(state.days[row.date]) ? "有記錄" : "尚無記錄"}</span></div>
        <div class="review-values">
          <div><span>睡眠</span><strong>${escapeHtml(formatMinutes(row.sleep))}</strong></div>
          <div><span>工時</span><strong>${escapeHtml(formatMinutes(row.work))}</strong></div>
          <div><span>收支淨額</span><strong>${escapeHtml(formatCurrency(row.net))}</strong></div>
          <div><span>恢復效果</span><strong>${row.recovery ? `${escapeHtml(row.recovery)} / 5` : "—"}</strong></div>
        </div>
      </article>`).join("");
  }

  function renderDataPage() {
    const protocolLabel = location.protocol === "file:" ? `直接雙擊（${location.href.split("?")[0]}）` : location.origin;
    elements["current-origin"].textContent = protocolLabel;
    elements["last-export"].textContent = state.meta.lastExportAt ? `最近匯出：${formatUpdated(state.meta.lastExportAt)}` : "尚未匯出備份";
  }

  function renderAll() {
    populateCategoryOptions();
    renderToday();
    renderProjects();
    renderReview();
    renderDataPage();
    updateBackupReminder();
  }

  function hasAnyData() {
    return hasAnyDataInState(state);
  }

  function updateBackupReminder() {
    if (!elements["backup-reminder"]) return;
    elements["backup-reminder"].hidden = !shouldShowBackupReminder(state, todayKey);
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJson({ track = true, suffix = "完整備份" } = {}) {
    const filename = `人生主控表_${todayKey}_${suffix}.json`;
    downloadFile(dataStore.exportJson(), filename, "application/json;charset=utf-8");
    if (track) {
      runDataChange(() => dataStore.markExported(), "備份時間已記錄");
      renderDataPage();
      showToast("完整 JSON 已匯出");
    }
  }

  function exportCsv() {
    downloadFile(`\uFEFF${dataStore.exportCsv()}`, `人生主控表_${todayKey}_每日摘要.csv`, "text/csv;charset=utf-8");
    showToast("每日 CSV 已匯出");
  }

  function openConfirmation({ title, message, firstLabel = "第一次確認", finalLabel = "再次確認", action, trigger }) {
    modalAction = action;
    modalStep = 1;
    modalReturnFocus = trigger || document.activeElement;
    elements["modal-title"].textContent = title;
    elements["modal-message"].textContent = message;
    elements["modal-confirm"].textContent = firstLabel;
    elements["modal-confirm"].dataset.finalLabel = finalLabel;
    elements["confirm-modal"].hidden = false;
    elements["modal-confirm"].focus();
  }

  function closeConfirmation() {
    elements["confirm-modal"].hidden = true;
    modalAction = null;
    modalStep = 1;
    modalReturnFocus?.focus();
  }

  function confirmModalStep() {
    if (modalStep === 1) {
      modalStep = 2;
      elements["modal-title"].textContent = "最後一次確認";
      elements["modal-message"].textContent = "這個動作會改變目前資料。確認後將立即執行。";
      elements["modal-confirm"].textContent = elements["modal-confirm"].dataset.finalLabel || "確認執行";
      return;
    }
    const action = modalAction;
    closeConfirmation();
    action?.();
  }

  function bindAutosaveInput(id, fieldPath) {
    elements[id].addEventListener("input", event => {
      runDataChange(() => dataStore.writeDayField(todayKey, fieldPath, event.target.value));
      renderTodaySummary();
    });
  }

  function bindEvents() {
    document.querySelectorAll("[data-page-target]").forEach(button => {
      button.addEventListener("click", () => setPage(button.dataset.pageTarget));
    });
    document.querySelectorAll("[data-go-page]").forEach(button => {
      button.addEventListener("click", () => setPage(button.dataset.goPage));
    });
    elements["skip-backup-reminder"]?.addEventListener("click", () => {
      runDataChange(() => dataStore.snoozeBackupReminder(todayKey), "今日已略過備份提醒");
      showToast("今天不再提醒，明天會再次顯示");
    });
    document.querySelectorAll("[data-now-target]").forEach(button => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.nowTarget);
        target.value = localTimeValue();
        target.dispatchEvent(new Event("input", { bubbles: true }));
        showToast("已填入現在時間");
      });
    });

    bindAutosaveInput("sleep-bedtime", "sleep.bedtime");
    bindAutosaveInput("sleep-wake", "sleep.wakeTime");
    bindAutosaveInput("recovery-activity", "recovery.activity");
    bindAutosaveInput("recovery-effect", "recovery.effect");
    bindAutosaveInput("daily-note", "note");

    elements["punch-button"].addEventListener("click", () => {
      const day = readToday();
      const openSession = [...day.workSessions].reverse().find(session => session.start && !session.end);
      if (openSession) {
        runDataChange(() => dataStore.updateWorkSession(todayKey, openSession.id, { end: localTimeValue() }));
        showToast("已完成下班打卡");
      } else {
        runDataChange(() => dataStore.addWorkSession(todayKey, { id: uid("work"), start: localTimeValue(), end: "" }));
        showToast("已完成上班打卡");
      }
      renderTodaySummary();
      renderWorkSessions();
    });

    elements["work-sessions"].addEventListener("input", event => {
      const field = event.target.dataset.sessionField;
      const row = event.target.closest("[data-session-id]");
      if (!field || !row) return;
      const session = readToday().workSessions.find(item => item.id === row.dataset.sessionId);
      if (!session) return;
      runDataChange(() => dataStore.updateWorkSession(todayKey, session.id, { [field]: event.target.value }));
      const updatedSession = readToday().workSessions.find(item => item.id === row.dataset.sessionId);
      renderTodaySummary();
      row.querySelector(".record-row-header strong").textContent = updatedSession?.end ? `工作段・${formatMinutes(durationBetweenTimes(updatedSession.start, updatedSession.end))}` : "工作段・未完成，不計工時";
    });

    elements["work-sessions"].addEventListener("click", event => {
      const button = event.target.closest("[data-remove-session]");
      if (!button) return;
      openConfirmation({
        title: "移除這段工作？",
        message: "這段上下班時間會從今天刪除。",
        finalLabel: "確認移除",
        trigger: button,
        action: () => {
          runDataChange(() => dataStore.deleteWorkSession(todayKey, button.dataset.removeSession));
          renderTodaySummary();
          renderWorkSessions();
          showToast("工作段已移除");
        }
      });
    });

    elements["transaction-form"].addEventListener("submit", event => {
      event.preventDefault();
      const category = elements["transaction-category"].value.trim();
      const amountValue = Number(elements["transaction-amount"].value);
      runDataChange(() => dataStore.addTransaction(todayKey, {
          id: uid("money"),
          type: elements["transaction-type"].value === "income" ? "income" : "expense",
          amount: Number.isFinite(amountValue) ? Math.max(0, amountValue) : 0,
          category,
          note: elements["transaction-note"].value.trim()
        }));
      elements["transaction-amount"].value = "";
      elements["transaction-note"].value = "";
      populateCategoryOptions();
      elements["transaction-category"].value = preferredTransactionCategory(state);
      renderTodaySummary();
      renderTransactions();
      elements["transaction-amount"].focus();
      showToast("收支已新增");
    });

    elements["transaction-list"].addEventListener("input", event => {
      const field = event.target.dataset.transactionField;
      const row = event.target.closest("[data-transaction-id]");
      if (!field || !row) return;
      const transaction = readToday().transactions.find(item => item.id === row.dataset.transactionId);
      if (!transaction) return;
      const value = field === "amount" ? Math.max(0, Number(event.target.value) || 0) : event.target.value;
      runDataChange(() => dataStore.updateTransaction(todayKey, transaction.id, { [field]: value }));
      if (field === "category") populateCategoryOptions();
      renderTodaySummary();
    });

    elements["transaction-list"].addEventListener("change", () => renderTransactions());
    elements["transaction-list"].addEventListener("click", event => {
      const button = event.target.closest("[data-remove-transaction]");
      if (!button) return;
      openConfirmation({
        title: "刪除這筆收支？",
        message: "這筆資料會從今天的收支中移除。",
        finalLabel: "確認刪除",
        trigger: button,
        action: () => {
          runDataChange(() => dataStore.deleteTransaction(todayKey, button.dataset.removeTransaction));
          renderTodaySummary();
          renderTransactions();
          showToast("收支已刪除");
        }
      });
    });

    elements["toggle-project-form"].addEventListener("click", () => toggleProjectForm(elements["project-form"].hidden));
    elements["cancel-project"].addEventListener("click", () => toggleProjectForm(false));
    elements["project-form"].addEventListener("submit", event => {
      event.preventDefault();
      const now = new Date().toISOString();
      runDataChange(() => dataStore.addProject({
        id: uid("project"),
        name: elements["project-name"].value.trim() || "未命名專案",
        status: "active",
        nextStep: elements["project-next-step"].value.trim(),
        updatedAt: now
      }));
      elements["project-form"].reset();
      toggleProjectForm(false);
      renderProjects();
      showToast("專案已新增");
    });

    elements["project-list"].addEventListener("input", event => {
      const field = event.target.dataset.projectField;
      const card = event.target.closest("[data-project-id]");
      if (!field || !card) return;
      const project = state.projects.find(item => item.id === card.dataset.projectId);
      if (!project) return;
      runDataChange(() => dataStore.updateProject(project.id, { [field]: event.target.value }));
      const updatedProject = state.projects.find(item => item.id === card.dataset.projectId);
      card.querySelector(".project-updated").textContent = `最後更新：${formatUpdated(updatedProject?.updatedAt)}`;
    });
    elements["project-list"].addEventListener("change", () => renderProjects());
    elements["project-list"].addEventListener("click", event => {
      const button = event.target.closest("[data-remove-project]");
      if (!button) return;
      const project = state.projects.find(item => item.id === button.dataset.removeProject);
      openConfirmation({
        title: "刪除這個專案？",
        message: `「${project?.name || "未命名專案"}」及它的下一步會被刪除。`,
        finalLabel: "確認刪除專案",
        trigger: button,
        action: () => {
          runDataChange(() => dataStore.deleteProject(button.dataset.removeProject));
          renderProjects();
          showToast("專案已刪除");
        }
      });
    });

    elements["export-json"].addEventListener("click", () => exportJson());
    elements["export-csv"].addEventListener("click", exportCsv);
    elements["import-json"].addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const validation = validateImportedState(parsed);
        if (!validation.valid) {
          showToast(validation.reason, 5000);
          return;
        }
        openConfirmation({
          title: "以匯入檔取代全部資料？",
          message: "確認後會先自動下載目前資料的備份，再以選取的 JSON 完整取代。",
          finalLabel: "備份並取代",
          trigger: elements["import-json"],
          action: () => {
            exportJson({ track: false, suffix: "匯入前自動備份" });
            if (runDataChange(() => dataStore.importState(parsed), "匯入資料已儲存")) {
              renderAll();
              showToast("JSON 已匯入並完整取代");
            }
          }
        });
      } catch (error) {
        console.error("匯入 JSON 失敗", error);
        showToast("無法讀取這個 JSON，原資料沒有變動。", 5000);
      } finally {
        event.target.value = "";
      }
    });

    elements["clear-data"].addEventListener("click", event => {
      openConfirmation({
        title: "清除全部資料？",
        message: "今天、專案與回顧資料都會從目前瀏覽器清除。建議先匯出 JSON。",
        finalLabel: "確認清除全部",
        trigger: event.currentTarget,
        action: () => {
          if (!runDataChange(() => dataStore.clear(), "已清除")) return;
          elements["transaction-type"].value = "expense";
          elements["transaction-amount"].value = "";
          elements["transaction-category"].value = preferredTransactionCategory(state);
          elements["transaction-note"].value = "";
          populateCategoryOptions();
          renderAll();
          showToast("全部資料已清除");
        }
      });
    });

    elements["modal-confirm"].addEventListener("click", confirmModalStep);
    document.querySelectorAll("[data-modal-cancel]").forEach(item => item.addEventListener("click", closeConfirmation));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !elements["confirm-modal"].hidden) closeConfirmation();
    });
  }

  function toggleProjectForm(show) {
    elements["project-form"].hidden = !show;
    elements["toggle-project-form"].setAttribute("aria-expanded", String(show));
    if (show) elements["project-name"].focus();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext || location.protocol === "file:") return;
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.warn("Service Worker 註冊失敗", error);
    });
  }

  function init() {
    queryElements();
    elements["today-date"].textContent = new Intl.DateTimeFormat("zh-TW", {
      month: "numeric", day: "numeric", weekday: "short"
    }).format(new Date());
    elements["transaction-category"].value = preferredTransactionCategory(state);
    runDataChange(() => dataStore.touchOpened());
    bindEvents();
    renderAll();
    registerServiceWorker();
    globalThis.lifeCalibrationApp = {
      getState: () => dataStore.readState(),
      storageKey: dataStore.storageKey,
      renderAll
    };
  }

  init();
})();
