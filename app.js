(() => {
  "use strict";

  function calendarDueAnchor(dueDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dueDate || ""));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day, 12);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
    return { month, day };
  }

  function calendarRepeatCycleState({
    cycleType,
    dueDate,
    existingCycle = null,
    originalCycleType = "",
    originalDueDate = null,
    intervalDays = 1
  }) {
    const hasExistingCycle = Boolean(existingCycle && typeof existingCycle === "object");
    const cycle = {
      type: cycleType,
      day: Math.min(31, Math.max(1, Number(existingCycle?.day) || 1)),
      month: Math.min(12, Math.max(1, Number(existingCycle?.month) || 1)),
      days: Math.max(1, Number(intervalDays) || 1)
    };
    if (cycleType !== "monthly" && cycleType !== "yearly") {
      return { cycle, reanchored: false, error: "" };
    }

    const anchor = calendarDueAnchor(dueDate);
    if (!anchor) {
      return { cycle: null, reanchored: false, error: "Monthly／Yearly 重複需要先設定 Due 日期。" };
    }
    const reanchored = !hasExistingCycle
      || originalCycleType !== cycleType
      || String(originalDueDate || "") !== String(dueDate || "");
    if (reanchored) {
      cycle.day = anchor.day;
      if (cycleType === "yearly") cycle.month = anchor.month;
    }
    return { cycle, reanchored, error: "" };
  }

  globalThis.LifeCalibrationCalendarRepeatUX = { calendarDueAnchor, calendarRepeatCycleState };

  // Task／Auto payment editor 的欄位可見性由前面的使用者意圖唯一推導，不再用
  // Handling／When done 這類自由選單把刪掉的複雜度偷偷加回來（架構.md 第三章）。
  function taskEditorFields({ cycleType = "none", amount = null, handling = "manual", completionMode = "" } = {}) {
    const repeats = Boolean(globalThis.LifeCalibrationCore?.isRepeatCycle(cycleType));
    const auto = handling === "auto";
    const hasAmount = amount !== null && amount !== undefined && amount !== "";
    // 廢止的 legacy transfer 規則保持惰性：資料裡的 amount 完整保留，但不在新 UI 暴露，
    // 否則會出現一個看起來能用、實際上不產生任何交易的金額欄位。
    const legacyTransfer = completionMode === "transfer";
    return {
      repeats,
      legacyTransfer,
      showDue: cycleType !== "mileage",
      showInterval: cycleType === "after_days",
      showMileage: cycleType === "mileage",
      // 單次 Task 不顯示 Amount：金額是循環 Task 與 Auto payment 才有的財務能力。
      showAmount: !legacyTransfer && (auto || repeats),
      // 有 Amount 才需要一次設定付款來源；沒有金額就不問。
      showPaidFrom: !legacyTransfer && (auto || repeats) && hasAmount,
      // Auto payment 不支援 CASH。
      paidFromOptions: auto ? ["bank", "card"] : ["bank", "cash", "card"]
    };
  }

  // 完成後的快速復原窗口。10 秒只是日常 UI 的復原窗口，不代表完成歷史之後被刪除。
  const UNDO_WINDOW_MS = 10000;

  // 每一次 Complete 都有自己的 10 秒窗口，彼此不覆蓋。
  // 以到期時間戳判定而不是靠單一 timer，因此可注入時鐘、可測，也不會互相回滾錯項目。
  function createUndoQueue({ windowMs = UNDO_WINDOW_MS, now = () => Date.now() } = {}) {
    let entries = [];
    function prune(at) {
      entries = entries.filter(entry => entry.expiresAt > at);
      return entries;
    }
    return {
      windowMs,
      push(eventId, name, at = now()) {
        prune(at);
        entries.push({ eventId, name, expiresAt: at + windowMs });
        return entries.slice();
      },
      remove(eventId) {
        entries = entries.filter(entry => entry.eventId !== eventId);
        return entries.slice();
      },
      active(at = now()) {
        return prune(at).slice();
      },
      has(eventId, at = now()) {
        return prune(at).some(entry => entry.eventId === eventId);
      }
    };
  }

  globalThis.LifeCalibrationTaskUX = Object.freeze({ taskEditorFields, createUndoQueue, UNDO_WINDOW_MS });

  function dateKeyParts(dateKey) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
    if (!match) return null;
    const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    const date = new Date(parts.year, parts.month - 1, parts.day, 12);
    if (date.getFullYear() !== parts.year || date.getMonth() !== parts.month - 1 || date.getDate() !== parts.day) return null;
    return parts;
  }

  function formatDateInputDisplay(dateKey) {
    const parts = dateKeyParts(dateKey);
    if (!parts) return "";
    return `${String(parts.year).padStart(4, "0")}/${String(parts.month).padStart(2, "0")}/${String(parts.day).padStart(2, "0")}`;
  }

  globalThis.LifeCalibrationTransactionDateUX = Object.freeze({ formatDateInputDisplay });

  function localDateFromKey(dateKey) {
    const parts = dateKeyParts(dateKey);
    return parts ? new Date(parts.year, parts.month - 1, parts.day, 12) : null;
  }

  function localKeyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function addLocalDays(dateKey, days) {
    const date = localDateFromKey(dateKey);
    if (!date) return "";
    date.setDate(date.getDate() + Number(days));
    return localKeyFromDate(date);
  }

  function mondayKey(dateKey) {
    const date = localDateFromKey(dateKey);
    if (!date) return "";
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return localKeyFromDate(date);
  }

  function sortTransactionsNewest(transactions) {
    return [...transactions].sort((a, b) => String(b.occurredOn).localeCompare(String(a.occurredOn)));
  }

  function partitionMoneyTransactions(transactions, currentDayKey) {
    const recentStart = addLocalDays(currentDayKey, -6);
    if (!recentStart) throw new Error("Invalid current date key");
    const recent = [];
    const history = [];
    const future = [];
    sortTransactionsNewest(transactions).forEach(transaction => {
      const occurredOn = String(transaction.occurredOn || "");
      if (occurredOn > currentDayKey) future.push(transaction);
      else if (occurredOn >= recentStart) recent.push(transaction);
      else history.push(transaction);
    });
    const weeklyMap = new Map();
    history.forEach(transaction => {
      const startKey = mondayKey(transaction.occurredOn);
      const group = weeklyMap.get(startKey) || {
        startKey,
        endKey: addLocalDays(startKey, 6),
        transactions: []
      };
      group.transactions.push(transaction);
      weeklyMap.set(startKey, group);
    });
    const weeks = [...weeklyMap.values()].sort((a, b) => b.startKey.localeCompare(a.startKey));
    return { recentStart, recent, future, history, weeks };
  }

  function formatHistoryWeekRange(startKey, endKey) {
    const start = dateKeyParts(startKey);
    const end = dateKeyParts(endKey);
    if (!start || !end) return "";
    if (start.year === end.year) return `${start.month}/${start.day}–${end.month}/${end.day}`;
    return `${start.month}/${start.day}/${start.year}–${end.month}/${end.day}/${end.year}`;
  }

  globalThis.LifeCalibrationMoneyHistoryUX = Object.freeze({
    addLocalDays,
    mondayKey,
    partitionMoneyTransactions,
    formatHistoryWeekRange
  });

  const RuntimeCore = globalThis.LifeCalibrationCore;
  const appRoot = globalThis.document?.getElementById("app");
  if (!RuntimeCore) {
    const message = "核心資料模組載入失敗。為保護本機資料，TAKO 已停止啟動且不會寫入資料，請重新整理後再試。";
    console.error(message);
    if (appRoot) {
      appRoot.textContent = message;
      appRoot.setAttribute("role", "alert");
      appRoot.setAttribute("aria-live", "assertive");
    }
    return;
  }
  if (!appRoot) return;

  function localTimeValue(date = new Date()) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  const elements = {};
  const todayKey = RuntimeCore.localDateKey();
  const dataStore = globalThis.LifeCalibrationData.create({
    core: RuntimeCore,
    onError: (message, error) => console.error(message, error)
  });
  dataStore.runAutoPayments?.(todayKey);
  let state = dataStore.readState();
  let toastTimer = null;
  let saveTimer = null;
  let modalAction = null;
  let modalStep = 1;
  let modalReturnFocus = null;
  let mileageObligationId = null;
  let mileageReturnFocus = null;
  let expandedProjectId = null;
  let expandedTaskKey = null;
  let expandedAutoPaymentId = null;
  let expandedBookId = null;
  let expandedSessionId = null;
  // 完成後的 10 秒復原窗口只存在記憶體，不落地；完成歷史本身仍在 events／transactions。
  const undoQueue = createUndoQueue();

  function queryElements() {
    [
      "today-date", "autosave-status", "today-work-total", "work-month-revenue", "work-revenue-percent", "work-revenue-bar",
      "work-session-count", "revenue-target", "work-revenue", "stat-hourly", "stat-week", "stat-month", "sleep-bedtime", "sleep-wake",
      "sleep-total", "work-status", "punch-button", "work-sessions", "transaction-form", "transaction-type",
      "transaction-amount", "transaction-item", "transaction-title-field", "transaction-note", "transaction-payment-method", "transaction-income-source",
      "transaction-income-account", "transaction-from-account", "transaction-to-account", "expense-fields", "income-fields", "transfer-fields",
      "transaction-list", "account-balances",
      "account-form", "account-name", "account-manager",
      "month-spent", "spending-chart", "category-ranking", "recent-transactions",
      "recovery-activity", "recovery-effect", "daily-note", "toggle-project-form", "project-form", "project-name",
      "project-next-step", "cancel-project", "project-list", "metric-sleep", "metric-work", "metric-expense",
      "quick-task-form", "quick-task-name", "task-active",
      "sleeping-section", "sleeping-group", "sleeping-list", "sleeping-count",
      "auto-payment-group", "auto-payment-count", "auto-payment-form", "auto-payment-name", "auto-payment-list",
      "book-form", "book-name", "book-list", "frozen-list", "frozen-count",
      "toggle-schedule", "schedule-section", "schedule-form", "schedule-weekday", "schedule-start", "schedule-end", "schedule-name", "schedule-list",
      "metric-days", "review-list", "review-month-income", "review-month-expense", "review-month-net", "statement-amount", "statement-recorded", "statement-gap",
      "backup-reminder", "skip-backup-reminder", "export-json", "export-csv", "import-json", "last-export",
      "settings-radar-days", "current-origin", "clear-data", "confirm-modal", "modal-title", "modal-message", "modal-confirm",
      "mileage-modal", "mileage-form", "mileage-modal-title", "mileage-current", "mileage-date", "toast"
    ].forEach(id => { elements[id] = document.getElementById(id); });
  }

  function readToday() {
    return state.days[todayKey] || RuntimeCore.createEmptyDay();
  }

  function refreshState(message = "Saved") {
    state = dataStore.readState();
    showSaveState(message);
    updateBackupReminder();
  }

  function runDataChange(action, message = "Saved") {
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
      elements["autosave-status"].textContent = "Autosave on";
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

  // 不走 Intl 的 currency 樣式：同一份程式在不同語系環境下會輸出 NT$／$／TWD 三種形態，
  // 靜態初值就永遠對不齊。符號固定 $，千分位自行插入，整數四捨五入。
  function formatCurrency(value) {
    const rounded = Math.round(Number(value) || 0);
    const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${rounded < 0 ? "-" : ""}$${digits}`;
  }

  // 營收目標的千分位：input[type="number"] 顯示不出 60,000（基準是含千分位的），
  // 改用 type="text" + inputmode="numeric" 自行格式化。這兩個函式只處理顯示字串，
  // 存進 monthlyIncomeTarget 的仍然是非負整數，資料欄位不變。
  function parseTargetInput(text) {
    const digits = String(text ?? "").replace(/[^\d]/g, "");   // 逗號、空白、全形與任何雜訊一律剝掉
    if (!digits) return 0;                                      // 空值與純非法輸入一律歸 0（＝沒有目標）
    return Math.min(Number(digits), Number.MAX_SAFE_INTEGER);
  }

  function formatThousands(value) {
    return String(Math.max(0, Math.round(Number(value) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // 日期一律 8/4 TUE：月/日用 en-US 的 numeric，星期另外取 short 再轉大寫。
  // 兩個 formatter 是必要的 — 同一個 formatter 給 weekday 會排成「Tue, 8/4」。
  function formatDisplayDate(key, includeWeekday = true) {
    const date = RuntimeCore.dateFromKey(key);
    const monthDay = new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" }).format(date);
    if (!includeWeekday) return monthDay;
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).toUpperCase();
    return `${monthDay} ${weekday}`;
  }

  function formatUpdated(value) {
    if (!value) return "Never";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Never";
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
    if (pageName === "work") {
      renderToday();
      renderProjects();
    }
    if (pageName === "money") renderMoney();
    if (pageName === "review") renderReview();
    if (pageName === "tasks") renderTasks();
    if (pageName === "data") renderDataPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById(`page-${pageName}`)?.focus({ preventScroll: true });
  }

  function renderToday() {
    const day = readToday();
    elements["sleep-bedtime"].value = day.sleep.bedtime || "";
    elements["sleep-wake"].value = day.sleep.wakeTime || "";
    elements["work-revenue"].value = day.workRevenue ?? "";
    elements["recovery-activity"].value = day.recovery.activity || "";
    elements["recovery-effect"].value = String(day.recovery.effect || "");
    elements["daily-note"].value = day.note || "";
    renderTodaySummary();
    renderWorkSessions();
    renderTransactions();
    renderSchedule();
  }

  // 週一起算的一週範圍（週一 → 週日）。
  function weekRange(dateKey) {
    const monday = RuntimeCore.dateFromKey(dateKey);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return [RuntimeCore.localDateKey(monday), RuntimeCore.localDateKey(sunday)];
  }

  function workMinutesBetween(fromKey, toKey) {
    return Object.entries(state.days).reduce((total, [dayKey, day]) =>
      dayKey >= fromKey && dayKey <= toKey ? total + RuntimeCore.workMinutes(day.workSessions) : total, 0);
  }

  // 跨日合計專用：小數一位加 h。單日與單段時長不用這個，維持 h:mm。
  function decimalHours(minutes) {
    return `${(Math.max(0, Number(minutes) || 0) / 60).toFixed(1)}h`;
  }

  function workMinutesInMonth(monthKey) {
    return Object.entries(state.days).reduce((total, [dayKey, day]) =>
      dayKey.startsWith(monthKey) ? total + RuntimeCore.workMinutes(day.workSessions) : total, 0);
  }

  // 時薪＝當日營收 ÷ 當日「完整」工作段總時數。本週＝週一起算，本月＝自然月。
  // 進行中（沒有結束時間）的工作段一律不計入 — RuntimeCore.workMinutes() 本來就會略過。
  // 三格全是純衍生：只讀既有欄位做加總與除法，不新增欄位、不寫入任何資料。
  function renderWorkStats() {
    const day = readToday();
    const todayMinutes = RuntimeCore.workMinutes(day.workSessions);
    const revenue = RuntimeCore.normalizeWorkRevenue(day.workRevenue);
    const [weekStart, weekEnd] = weekRange(todayKey);
    elements["stat-hourly"].textContent = revenue !== null && todayMinutes > 0
      ? formatCurrency(revenue / (todayMinutes / 60))
      : "—";
    // 跨日的合計用小數時數（基準 5a 的 22.5h／96h）；單日與單段時長維持 h:mm。
    elements["stat-week"].textContent = decimalHours(workMinutesBetween(weekStart, weekEnd));
    elements["stat-month"].textContent = decimalHours(workMinutesInMonth(todayKey.slice(0, 7)));
  }

  function renderTodaySummary() {
    const day = readToday();
    const sleepMinutes = RuntimeCore.durationBetweenTimes(day.sleep.bedtime, day.sleep.wakeTime);
    const totalWork = RuntimeCore.workMinutes(day.workSessions);
    const monthKey = todayKey.slice(0, 7);
    const monthRevenue = RuntimeCore.monthWorkRevenue(state, monthKey);
    const target = Math.max(0, Number(state.settings?.monthlyIncomeTarget ?? 60000) || 0);
    elements["sleep-total"].textContent = RuntimeCore.formatMinutes(sleepMinutes);
    elements["today-work-total"].textContent = RuntimeCore.formatMinutes(totalWork);
    elements["work-month-revenue"].textContent = formatCurrency(monthRevenue);
    // 使用者正在這一格打字時不覆蓋，否則重排字串會把游標推到尾端。
    if (document.activeElement !== elements["revenue-target"]) {
      elements["revenue-target"].value = formatThousands(state.settings?.monthlyIncomeTarget ?? 60000);
    }

    // 目標達成率：只驅動百分比文字與進度條寬度，不影響任何資料
    const ratio = target > 0 ? Math.max(0, Math.min(1, monthRevenue / target)) : 0;
    if (elements["work-revenue-percent"]) {
      elements["work-revenue-percent"].textContent = `${Math.round(ratio * 100)}%`;
    }
    if (elements["work-revenue-bar"]) {
      elements["work-revenue-bar"].style.width = `${(ratio * 100).toFixed(1)}%`;
    }
    renderWorkStats();
  }

  function renderSchedule(forceOpen = false) {
    const weekdayLabel = ["", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const entries = [...(state.schedule || [])].sort((a, b) => a.weekday - b.weekday || String(a.start).localeCompare(String(b.start)));
    const open = forceOpen || entries.length > 0 || elements["toggle-schedule"].getAttribute("aria-expanded") === "true";
    elements["schedule-section"].hidden = !open;
    elements["toggle-schedule"].setAttribute("aria-expanded", String(open));
    elements["schedule-list"].innerHTML = entries.length ? entries.map(item => `
      <article class="record-row schedule-row">
        <div><strong>${escapeHtml(item.name || "UNNAMED")}</strong><span>${escapeHtml(weekdayLabel[item.weekday] || "")} · ${escapeHtml(item.start || "—")}–${escapeHtml(item.end || "—")}</span></div>
      </article>`).join("") : '<div class="empty-state compact-empty">Nothing scheduled.</div>';
  }

  // 工作段列的唯讀兩欄：時間區間與時長。未完成的工作段保留並標示 OPEN。
  function sessionTimesMarkup(session) {
    return `<span class="session-time">${escapeHtml(session.start || "—")}</span>`
      + `<span class="session-dash" aria-hidden="true">—</span>`
      + (session.end ? `<span class="session-time">${escapeHtml(session.end)}</span>` : "");
  }

  // 未完成的工作段顯示「即時累計 + OPEN」（基準 5a 的 13:00 — 進行中 0:54 就是這個位置）。
  // 累計是 start 到現在的純衍生值，只在重新渲染時更新，不寫入任何資料。
  // 注意：TODAY 主數字仍然只計完整段（架構.md 第二章），這裡不影響它。
  function sessionDuration(session) {
    if (session.end) {
      return RuntimeCore.formatMinutes(RuntimeCore.durationBetweenTimes(session.start, session.end));
    }
    const elapsed = RuntimeCore.durationBetweenTimes(session.start, localTimeValue());
    return elapsed === null ? "OPEN" : `${RuntimeCore.formatMinutes(elapsed)} OPEN`;
  }

  // 只補摘要列的顯示，不整段重繪 — 重繪會讓正在輸入的時間欄位失焦。
  function updateSessionRow(sessionId, session) {
    const row = elements["work-sessions"].querySelector(`.session-row[data-session-id="${sessionId}"]`);
    if (!row || !session) return;
    row.querySelector(".session-duration").textContent = sessionDuration(session);
    row.querySelector(".session-times").innerHTML = sessionTimesMarkup(session);
  }

  function renderWorkSessions() {
    const day = readToday();
    const openSession = day.workSessions.find(session => session.start && !session.end);
    elements["work-status"].textContent = openSession ? `ON SHIFT · ${openSession.start}` : "";
    elements["work-status"].classList.toggle("is-running", Boolean(openSession));
    elements["punch-button"].textContent = openSession ? "OUT" : "IN";
    if (elements["work-session-count"]) {
      elements["work-session-count"].textContent = String(day.workSessions.length);
    }

    if (!day.workSessions.length) {
      elements["work-sessions"].innerHTML = '<div class="empty-state"><strong>No sessions yet.</strong>Tap IN to start the first one.</div>';
      return;
    }

    elements["work-sessions"].innerHTML = day.workSessions.map(session => {
      const expanded = expandedSessionId === session.id;
      const detailId = `session-details-${session.id}`;
      return `
        <button type="button" class="session-row" data-session-id="${escapeHtml(session.id)}" data-toggle-session="${escapeHtml(session.id)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(detailId)}">
          <span class="session-times">${sessionTimesMarkup(session)}</span>
          <strong class="session-duration">${escapeHtml(sessionDuration(session))}</strong>
          <span class="task-chevron" aria-hidden="true"></span>
        </button>
        ${expanded ? `<div id="${escapeHtml(detailId)}" class="session-details" data-session-id="${escapeHtml(session.id)}">
          <div class="inline-fields">
            <label class="field"><span>IN</span><input class="record-input" type="time" value="${escapeHtml(session.start || "")}" data-session-field="start"></label>
            <label class="field"><span>OUT</span><input class="record-input" type="time" value="${escapeHtml(session.end || "")}" data-session-field="end"></label>
          </div>
          <button type="button" class="record-remove" data-remove-session="${escapeHtml(session.id)}">Remove</button>
        </div>` : ""}`;
    }).join("");
  }

  const transactionTypeLabel = { expense: "Expense", income: "Income", transfer: "Transfer" };

  function transactionMarkup(transaction, dayKey, autoPaidEventIds) {
    const displayName = transaction.type === "expense"
      ? RuntimeCore.transactionDisplayName(transaction)
      : (transaction.title || transaction.incomeSource || transactionTypeLabel[transaction.type]);
    const occurredOn = transaction.occurredOn || dayKey;
    return `
      <details class="transaction-row" data-transaction-id="${escapeHtml(transaction.id)}" data-day-key="${escapeHtml(dayKey)}">
        <summary><span>${escapeHtml(displayName)}${autoPaidEventIds.has(transaction.eventId) ? '<span class="auto-tag">AUTO</span>' : ""}</span><strong>${escapeHtml(formatCurrency(transaction.amount))}</strong></summary>
        <div class="transaction-editor">
          <div class="inline-fields">
            <label class="field"><span>Type</span><select class="record-input" data-transaction-field="type"><option value="expense" ${transaction.type === "expense" ? "selected" : ""}>Expense</option><option value="income" ${transaction.type === "income" ? "selected" : ""}>Income</option><option value="transfer" ${transaction.type === "transfer" ? "selected" : ""}>Transfer</option></select></label>
            <label class="field"><span>Amount</span><input class="record-input" type="number" min="0" step="1" inputmode="decimal" value="${escapeHtml(transaction.amount ?? 0)}" data-transaction-field="amount"></label>
          </div>
          <label class="field">
            <span>Date</span>
            <span class="transaction-date-control">
              <span class="transaction-date-display" aria-hidden="true">${escapeHtml(formatDateInputDisplay(occurredOn))}</span>
              <input type="date" value="${escapeHtml(occurredOn)}" data-transaction-field="occurredOn" aria-label="Date">
            </span>
          </label>
          ${transaction.type === "expense" ? `
            <label class="field"><span>Item</span><input class="record-input" type="text" value="${escapeHtml(transaction.category || "")}" data-transaction-field="category"></label>
            <label class="field"><span>Paid with</span><select class="record-input" data-transaction-field="paymentMethod"><option value="" ${!transaction.paymentMethod ? "selected" : ""}>Unknown</option><option value="card" ${transaction.paymentMethod === "card" ? "selected" : ""}>Card</option><option value="cash" ${transaction.paymentMethod === "cash" ? "selected" : ""}>Cash</option><option value="bank" ${transaction.paymentMethod === "bank" ? "selected" : ""}>Bank</option></select></label>
          ` : `<label class="field"><span>Title (optional)</span><input class="record-input" type="text" value="${escapeHtml(transaction.title || "")}" data-transaction-field="title"></label>`}
          <button type="button" class="record-remove" data-remove-transaction="${escapeHtml(transaction.id)}">Delete</button>
        </div>
      </details>`;
  }

  function transactionDaysMarkup(transactions, autoPaidEventIds) {
    const groups = sortTransactionsNewest(transactions).reduce((result, transaction) => {
      (result[transaction.occurredOn] ||= []).push(transaction);
      return result;
    }, {});
    return Object.entries(groups).map(([dayKey, items]) => `
      <section class="transaction-day" aria-label="${escapeHtml(dayKey)}">
        <p class="transaction-date">${escapeHtml(formatDisplayDate(dayKey))}</p>
        ${items.map(transaction => transactionMarkup(transaction, dayKey, autoPaidEventIds)).join("")}
      </section>`).join("");
  }

  function renderTransactions() {
    const transactions = RuntimeCore.allTransactions(state);
    if (!transactions.length) {
      elements["transaction-list"].innerHTML = '<div class="empty-state"><strong>Nothing logged yet.</strong>Add the first transaction above.</div>';
      return;
    }
    const view = partitionMoneyTransactions(transactions, todayKey);
    // Auto-paid 標記：交易上的 eventId 指到狀態為 auto-paid 的事件就標。純衍生，不新增欄位。
    const autoPaidEventIds = new Set(state.events.filter(event => event.status === "auto-paid").map(event => event.id));
    const recentEmptyDetail = view.history.length
      ? "Older entries remain in Weekly History."
      : "Future entries are shown below.";
    const recentMarkup = view.recent.length
      ? transactionDaysMarkup(view.recent, autoPaidEventIds)
      : `<div class="empty-state"><strong>No recent transactions.</strong>${recentEmptyDetail}</div>`;
    const futureMarkup = view.future.length ? `
      <section class="transaction-subsection" aria-labelledby="future-transactions-heading">
        <p id="future-transactions-heading" class="transaction-subheading">FUTURE</p>
        ${transactionDaysMarkup(view.future, autoPaidEventIds)}
      </section>` : "";
    const historyMarkup = view.weeks.length ? `
      <section class="transaction-subsection" aria-labelledby="weekly-history-heading">
        <p id="weekly-history-heading" class="transaction-subheading">WEEKLY HISTORY</p>
        <div class="weekly-history-list">
          ${view.weeks.map(week => `
            <details class="weekly-history-group">
              <summary>
                <span class="weekly-history-range">${escapeHtml(formatHistoryWeekRange(week.startKey, week.endKey))}</span>
                <small>${week.transactions.length} ${week.transactions.length === 1 ? "transaction" : "transactions"}</small>
                <span class="weekly-history-chevron" aria-hidden="true"></span>
              </summary>
              <div class="weekly-history-content">
                ${transactionDaysMarkup(week.transactions, autoPaidEventIds)}
              </div>
            </details>`).join("")}
        </div>
      </section>` : "";
    elements["transaction-list"].innerHTML = recentMarkup + futureMarkup + historyMarkup;
  }

  function renderTransactionForm() {
    const type = elements["transaction-type"].value;
    elements["expense-fields"].hidden = type !== "expense";
    elements["income-fields"].hidden = type !== "income";
    elements["transfer-fields"].hidden = type !== "transfer";
    elements["transaction-title-field"].hidden = type === "expense";
    const accountOptions = RuntimeCore.selectableAccounts(state).map(account => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`).join("");
    ["transaction-income-account", "transaction-from-account", "transaction-to-account"].forEach(id => {
      if (!elements[id]) return;
      const previous = elements[id].value;
      elements[id].innerHTML = accountOptions;
      if (previous && state.accounts.some(account => account.id === previous && account.active)) elements[id].value = previous;
    });
    if (elements["transaction-income-account"] && !elements["transaction-income-account"].value) elements["transaction-income-account"].value = "main";
    if (elements["transaction-from-account"] && !elements["transaction-from-account"].value) elements["transaction-from-account"].value = "main";
    if (elements["transaction-to-account"] && !elements["transaction-to-account"].value) elements["transaction-to-account"].value = "card";
    if (type === "transfer" && elements["transaction-from-account"].value === elements["transaction-to-account"].value) {
      elements["transaction-from-account"].value = "main";
      elements["transaction-to-account"].value = "card";
    }
  }

  function renderAccounts() {
    const balances = RuntimeCore.accountBalances(state);
    elements["account-balances"].innerHTML = state.accounts.filter(account => account.active).map(account => `
      <article class="account-item"><span>${escapeHtml(account.name)}</span><strong>${escapeHtml(formatCurrency(balances[account.id] || 0))}</strong></article>
    `).join("");
    elements["account-manager"].innerHTML = state.accounts.map(account => `
      <article class="manager-row ${account.active ? "" : "is-archived"}" data-account-id="${escapeHtml(account.id)}">
        <label class="field"><span>${account.system ? "System account" : (account.active ? "Custom account" : "Archived account")}</span><input class="record-input" type="text" value="${escapeHtml(account.name)}" data-account-name aria-label="Account name ${escapeHtml(account.name)}"></label>
        <div class="manager-row-meta"><strong>${escapeHtml(formatCurrency(balances[account.id] || 0))}</strong>${account.system ? '<span class="status-indicator">Always active</span>' : `<button type="button" class="button button-quiet" data-account-active="${account.active ? "false" : "true"}">${account.active ? "Archive" : "Unarchive"}</button>`}</div>
      </article>`).join("");
  }

  // 圓餅圖與 Item 排名的五階資料色。讀 CSS 變數，色票只有一份來源。
  function chartShades() {
    const root = getComputedStyle(document.documentElement);
    return [1, 2, 3, 4, 5].map(step => root.getPropertyValue(`--chart-${step}`).trim());
  }

  // 分段之間的髮絲間隙，單位是 pathLength（圓周＝100）。
  // SVG 以 150px 渲染時 1 個 pathLength 單位 ≈ 3.6 CSS px，0.44 ≈ 1.6px。
  // 間隙是負空間：SVG 不畫東西，露出的就是卡片自己的 ICE 背景。
  const SEGMENT_GAP = 0.44;

  function renderSpending() {
    const monthKey = todayKey.slice(0, 7);
    const total = RuntimeCore.monthExpense(state, monthKey);
    const ranking = RuntimeCore.categoryRanking(state, monthKey);
    elements["month-spent"].textContent = formatCurrency(total);
    // 色階由 :root 的 --chart-1…--chart-5 定義，不在這裡寫死色碼。
    const shades = chartShades();
    const tailShade = shades[shades.length - 1];   // 最淺一階＝OTHER 那一段
    if (!ranking.length) {
      elements["spending-chart"].innerHTML = '<div class="chart-empty">Nothing logged yet.</div>';
      elements["category-ranking"].innerHTML = "";
      return;
    }
    // 五個色階要對到五段：類別數 ≤ 5 就全部個別顯示；超過就前四名各一段、
    // 第五名以後併成 OTHER，讓每個排名色點都對得到唯一一段。
    // 純顯示層加總：不新增欄位，也不動 categoryRanking 的回傳結構。
    const hasOther = ranking.length > shades.length;
    const individual = hasOther ? shades.length - 1 : ranking.length;
    const segments = ranking.slice(0, individual).map((item, index) => ({ percent: item.percent, color: shades[index] }));
    const tailPercent = ranking.slice(individual).reduce((sum, item) => sum + item.percent, 0);
    if (hasOther && tailPercent > 0) segments.push({ percent: tailPercent, color: tailShade });

    let offset = 0;
    const gap = segments.length > 1 ? SEGMENT_GAP : 0;
    const circles = segments.map(segment => {
      const drawn = Math.max(0.3, segment.percent - gap);
      const circle = `<circle cx="60" cy="60" r="46" pathLength="100" fill="none" stroke="${segment.color}" stroke-width="20" stroke-dasharray="${drawn} ${100 - drawn}" stroke-dashoffset="${-(offset + gap / 2)}" />`;
      offset += segment.percent;
      return circle;
    }).join("");
    elements["spending-chart"].innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="Spending by category this month"><g transform="rotate(-90 60 60)">${circles}</g></svg>`;
    // 有 OTHER 時，第五名以後的色點一律用 OTHER 那一段的色
    const dotShade = index => (hasOther && index >= individual) ? tailShade : shades[index];
    elements["category-ranking"].innerHTML = ranking.map((item, index) => `<div><i style="--rank-color:${dotShade(index)}"></i><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(formatCurrency(item.amount))}</strong><small>${item.percent.toFixed(0)}%</small></div>`).join("");
  }

  function renderMoney() {
    renderTransactionForm();
    renderAccounts();
    renderSpending();
    renderAutoPayments();
    renderTransactions();
  }

  function renderProjects() {
    const openSections = new Set([...elements["project-list"].querySelectorAll("details[open][data-project-section]")].map(group => group.dataset.projectSection));
    const projects = [...state.projects].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    const projectMarkup = project => {
      const expanded = expandedProjectId === project.id;
      const detailsId = `project-details-${project.id}`;
      return `
        <article class="project-item ${expanded ? "is-expanded" : ""}" data-project-id="${escapeHtml(project.id)}">
          <button type="button" class="project-summary" data-toggle-project="${escapeHtml(project.id)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(detailsId)}">
            <strong>${escapeHtml(project.name || "UNNAMED")}</strong><span aria-hidden="true"></span>
          </button>
          ${expanded ? `<div id="${escapeHtml(detailsId)}" class="project-details">
            <div class="project-card-header">
              <label class="field"><span>NAME</span><input class="record-input" type="text" value="${escapeHtml(project.name || "")}" data-project-field="name"></label>
              <label class="field"><span>STATUS</span><select class="record-input" data-project-field="status"><option value="active" ${project.status === "active" ? "selected" : ""}>Active</option><option value="paused" ${project.status === "paused" ? "selected" : ""}>Paused</option></select></label>
            </div>
            <label class="field"><span>NEXT STEP</span><input class="record-input" type="text" value="${escapeHtml(project.nextStep || "")}" data-project-field="nextStep"></label>
            <p class="project-updated">Updated ${escapeHtml(formatUpdated(project.updatedAt))}</p>
            <div class="project-actions">
              <button type="button" class="button button-primary" data-close-project="${escapeHtml(project.id)}">Save & close</button>
              <button type="button" class="record-remove" data-remove-project="${escapeHtml(project.id)}">Delete project</button>
            </div>
          </div>` : ""}
        </article>`;
    };
    const active = projects.filter(project => project.status === "active");
    const paused = projects.filter(project => project.status === "paused");
    const collapsedGroup = (status, label, items) => `
      <details class="recess-group project-status-group" data-project-section="${status}" ${openSections.has(status) || items.some(project => project.id === expandedProjectId) ? "open" : ""}>
        <summary>${label} · ${items.length}</summary>
        <div class="project-status-list">${items.map(projectMarkup).join("") || '<div class="empty-state compact-empty">Nothing here.</div>'}</div>
      </details>`;
    elements["project-list"].innerHTML = `
      ${active.map(projectMarkup).join("") || '<div class="empty-state compact-empty"><strong>No active projects.</strong>Add one and keep a single clear next step.</div>'}
      ${collapsedGroup("paused", "PAUSED", paused)}`;
  }

  // ── TASKS ────────────────────────────────────────────────────────────────
  // 收合 ＝ 快速掃描；展開 ＝ 查看 ＋ 直接修改。沒有「點開再按 Edit」這一層。

  const CYCLE_OPTIONS = [
    { value: "none", label: "No repeat" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
    { value: "after_days", label: "After N days" },
    { value: "mileage", label: "By mileage" }
  ];
  // Auto payment 是「依穩定規則自動發生」的財務規則，因此只提供循環週期。
  const AUTO_CYCLE_OPTIONS = CYCLE_OPTIONS.filter(option => ["monthly", "yearly", "after_days"].includes(option.value));
  const PAID_FROM_LABELS = { bank: "Bank", cash: "Cash", card: "Card" };

  function completionControlMarkup(event, obligation) {
    return `<button type="button" class="task-done-check" data-complete-event="${escapeHtml(event.id)}" aria-label="${escapeHtml(`Mark ${obligation.name} done`)}"></button>`;
  }

  // Pin 只做一件事：繞過 Sleeping，把該 occurrence 留在主要 TASKS。
  // 已經在提醒窗口內的項目不顯示這個控制 —— 那裡按下去沒有任何作用。
  // 里程義務永遠不沉睡，即使 legacy 資料留了 dueDate，Pin 對它也沒有意義。
  function pinControlMarkup(event, obligation, windowDays) {
    if (RuntimeCore.isMileageObligation(obligation) || !event.dueDate) return "";
    const pinned = event.pinned === true;
    if (!pinned && RuntimeCore.daysUntil(event.dueDate, todayKey) <= windowDays) return "";
    return `<button type="button" class="task-pin" data-toggle-pin="${escapeHtml(event.id)}" aria-pressed="${pinned}" aria-label="${escapeHtml(`${pinned ? "Unpin" : "Pin"} ${obligation.name}`)}">PIN</button>`;
  }

  // 逾期／今日到期的強度靠字重與字色，逼近中的用琥珀珠 —— 沿用原雷達的強度階層，
  // 只是改由主清單本身承載，同一件事不再出現在兩個地方。
  // 里程義務一律以里程語意為準：legacy／匯入資料就算在 event 上留了 dueDate，
  // 也不得用一般的 Due 顯示蓋掉 mileage status。
  function taskStateClass(event, obligation, windowDays) {
    if (RuntimeCore.isMileageObligation(obligation)) {
      return RuntimeCore.mileageStatus(obligation, todayKey) === "service-due" ? "is-service-due" : "";
    }
    if (event.dueDate) {
      const diff = RuntimeCore.daysUntil(event.dueDate, todayKey);
      if (diff < 0) return "is-overdue";
      if (diff === 0) return "is-today";
      return diff <= windowDays ? "is-soon" : "";
    }
    return "";
  }

  function taskDueLabel(event, obligation) {
    if (RuntimeCore.isMileageObligation(obligation)) {
      const mileage = RuntimeCore.mileageStatus(obligation, todayKey);
      if (mileage === "service-due") return "Service due";
      if (mileage === "update-mileage") return "Update mileage";
      return "";
    }
    if (event.dueDate) {
      const diff = RuntimeCore.daysUntil(event.dueDate, todayKey);
      const date = formatDisplayDate(event.dueDate);
      if (diff < 0) return `Overdue ${Math.abs(diff)}d · ${date}`;
      if (diff === 0) return `Due today · ${date}`;
      return `Due ${date}`;
    }
    return "";
  }

  function taskSummaryCopy(event, obligation) {
    const dueLabel = taskDueLabel(event, obligation);
    const note = obligation.note || "";
    const meta = dueLabel || note
      ? `<span class="task-summary-meta ${dueLabel ? "has-due" : ""}">${dueLabel ? `<span>${escapeHtml(dueLabel)}</span>` : ""}${note ? `<span class="task-note" title="${escapeHtml(note)}">${escapeHtml(note)}</span>` : ""}</span>`
      : "";
    return `<span class="task-summary-copy"><strong title="${escapeHtml(obligation.name)}">${escapeHtml(obligation.name)}</strong>${meta}</span>`;
  }

  function selectFieldMarkup(field, value, options) {
    return `<select class="record-input" data-task-field="${escapeHtml(field)}">${options
      .map(option => `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
      .join("")}</select>`;
  }

  function dueControlMarkup(event) {
    const value = event?.dueDate || "";
    return `<span class="date-control ${value ? "" : "is-empty"}">
      <span class="date-control-value" data-date-placeholder="Select date" aria-hidden="true">${escapeHtml(value || "Select date")}</span>
      <span class="date-control-icon" aria-hidden="true"></span>
      <input type="date" value="${escapeHtml(value)}" data-date-control data-task-field="dueDate" aria-label="Due date">
    </span>`;
  }

  function mileageEditorMarkup(obligation) {
    const service = obligation.service;
    return `<div class="task-mileage">
      <div class="two-column">
        <label class="field"><span>Last service</span><input class="record-input" type="number" min="0" step="1" inputmode="numeric" value="${escapeHtml(service.lastServiceMileage ?? "")}" data-task-field="lastServiceMileage"></label>
        <label class="field"><span>Current</span><input class="record-input" type="number" min="0" step="1" inputmode="numeric" value="${escapeHtml(service.currentMileage ?? "")}" data-task-field="currentMileage"></label>
      </div>
      <div class="two-column">
        <label class="field"><span>Reminder days</span><input class="record-input" type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(service.reminderDays)}" data-task-field="reminderDays"></label>
        <label class="field"><span>Threshold km</span><input class="record-input" type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(service.thresholdKm)}" data-task-field="thresholdKm"></label>
      </div>
      <button type="button" class="button button-quiet" data-update-mileage="${escapeHtml(obligation.id)}">Update mileage</button>
    </div>`;
  }

  // 展開後就是編輯狀態本身。欄位依 taskEditorFields() 逐步揭露，沒啟用的能力不顯示。
  function taskEditorMarkup(event, obligation) {
    const fields = taskEditorFields({
      cycleType: obligation.cycle.type,
      amount: obligation.amount,
      handling: obligation.handling,
      completionMode: obligation.completionMode
    });
    const paidFrom = fields.paidFromOptions.map(value => ({ value, label: PAID_FROM_LABELS[value] }));
    // 付款來源沒被明確選過時同樣給空的佔位選項 —— 絕不預選一個帳戶讓它看起來像已設定。
    const paidFromChosen = fields.paidFromOptions.includes(obligation.paymentMethod);
    const paidFromOptions = paidFromChosen ? paidFrom : [{ value: "", label: "Select source" }, ...paidFrom];
    // Auto payment 的週期沒被明確選過時給一個空的佔位選項 —— 不預選任何週期。
    const autoCycleChosen = AUTO_CYCLE_OPTIONS.some(option => option.value === obligation.cycle.type);
    const isAuto = obligation.handling === "auto";
    const cycleValue = isAuto && !autoCycleChosen ? "" : obligation.cycle.type;
    const cycleOptions = !isAuto
      ? CYCLE_OPTIONS
      : (autoCycleChosen ? AUTO_CYCLE_OPTIONS : [{ value: "", label: "Select repeat" }, ...AUTO_CYCLE_OPTIONS]);
    return `
      <label class="field"><span>Name</span><input class="record-input" type="text" value="${escapeHtml(obligation.name)}" data-task-field="name"></label>
      <div class="two-column">
        <label class="field"><span>Repeat</span>${selectFieldMarkup("cycle", cycleValue, cycleOptions)}</label>
        ${fields.showDue ? `<label class="field"><span>Due</span>${dueControlMarkup(event)}</label>` : ""}
      </div>
      ${fields.showInterval ? `<label class="field"><span>Days / interval</span><input class="record-input" type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(obligation.cycle.days || 1)}" data-task-field="intervalDays"></label>` : ""}
      ${fields.showAmount ? `<div class="two-column">
        <label class="field"><span>Amount</span><input class="record-input" type="number" min="0" step="1" inputmode="decimal" value="${escapeHtml(obligation.amount ?? "")}" data-task-field="amount"></label>
        ${fields.showPaidFrom ? `<label class="field"><span>Paid from</span>${selectFieldMarkup("paymentMethod", paidFromChosen ? obligation.paymentMethod : "", paidFromOptions)}</label>` : ""}
      </div>` : ""}
      <label class="field"><span>Note</span><input class="record-input" type="text" value="${escapeHtml(obligation.note || "")}" data-task-field="note"></label>
      ${fields.showMileage ? mileageEditorMarkup(obligation) : ""}`;
  }

  function taskMarkup(item, windowDays) {
    const { event, obligation } = item;
    const expanded = expandedTaskKey === event.id;
    const detailId = `task-details-${event.id}`;
    const deleteButton = safeDeleteButton(obligation);
    return `
      <article class="task-item ${taskStateClass(event, obligation, windowDays)} ${expanded ? "is-expanded" : ""}" data-obligation-id="${escapeHtml(obligation.id)}" data-event-id="${escapeHtml(event.id)}">
        <div class="task-head">
          ${completionControlMarkup(event, obligation)}
          <button type="button" class="task-summary" data-toggle-task="${escapeHtml(event.id)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(detailId)}">
            ${taskSummaryCopy(event, obligation)}
            <span class="task-chevron" aria-hidden="true"></span>
          </button>
          ${pinControlMarkup(event, obligation, windowDays)}
        </div>
        ${expanded ? `<div id="${escapeHtml(detailId)}" class="task-details">
          ${taskEditorMarkup(event, obligation)}
          <div class="task-actions-secondary"><button type="button" class="button button-quiet" data-freeze-obligation="${escapeHtml(obligation.id)}">Freeze</button><button type="button" class="button button-quiet" data-archive-obligation="${escapeHtml(obligation.id)}">Archive</button>${deleteButton}</div>
        </div>` : ""}
      </article>`;
  }

  // 完成後的 `Completed · UNDO`：不保留日常可見的 Done 區，只留 10 秒的復原窗口。
  // 同時可以有多筆，最近完成的在最上面，各自獨立到期、獨立回滾。
  function undoRowMarkup() {
    return undoQueue.active().reverse().map(entry => `<article class="task-item task-undo">
      <div class="task-undo-row"><span>Completed · ${escapeHtml(entry.name)}</span><button type="button" class="button button-quiet" data-undo-event="${escapeHtml(entry.eventId)}">UNDO</button></div>
    </article>`).join("");
  }

  function safeDeleteButton(obligation) {
    const policy = RuntimeCore.obligationDeletionPolicy(state, obligation.id);
    return policy.allowed
      ? `<button type="button" class="button button-danger" data-delete-obligation="${escapeHtml(obligation.id)}">Delete</button>`
      : "";
  }

  // Safe Delete：只有全部事件仍未處理、且沒有任何連結交易的規則能永久刪除。
  function confirmObligationDelete(trigger, afterDelete) {
    const obligationId = trigger.dataset.deleteObligation;
    const obligation = state.obligations.find(item => item.id === obligationId);
    const policy = RuntimeCore.obligationDeletionPolicy(state, obligationId);
    if (!policy.allowed) {
      showToast(policy.reason, 5000);
      return;
    }
    openConfirmation({
      title: "DELETE TASK",
      message: `「${obligation?.name || "UNNAMED"}」尚未有歷史紀錄；刪除後，未處理事件也會一併移除。`,
      finalLabel: "DELETE",
      trigger,
      action: () => {
        let deletion = null;
        const saved = runDataChange(() => { deletion = dataStore.deleteObligationSafely(obligationId); });
        if (!saved) return;
        if (!deletion?.deleted) {
          showToast(deletion?.reason || "這筆待辦目前不能刪除；請改用 Archive。", 5000);
          return;
        }
        afterDelete?.();
        showToast("Task deleted");
      }
    });
  }

  function latestAutoPayment(obligationId) {
    const event = state.events
      .filter(item => item.obligationId === obligationId && item.status === "auto-paid")
      .sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")))[0];
    if (!event) return null;
    const transaction = RuntimeCore.allTransactions(state).find(item => item.id === event.transactionId || item.eventId === event.id);
    return {
      date: event.completedAt?.slice(0, 10) || transaction?.occurredOn || "",
      amount: transaction?.amount ?? event.actualAmount
    };
  }

  function pendingEventFor(obligationId) {
    return state.events
      .filter(event => event.obligationId === obligationId && event.status === "pending")
      .sort((a, b) => String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31")))[0] || null;
  }

  // Auto payment 住在 MONEY：設定一次、之後自動運作的財務規則。
  // 第一層點擊只展開清單；再點某一筆才進入該筆的可編輯狀態。
  function autoPaymentMarkup(obligation) {
    const expanded = expandedAutoPaymentId === obligation.id;
    const detailId = `auto-payment-details-${obligation.id}`;
    const pendingEvent = pendingEventFor(obligation.id);
    const latest = latestAutoPayment(obligation.id);
    const frozen = obligation.status === "frozen";
    // 規則四項必要資料沒齊就不會自動扣款，摘要要直說，別讓半成品看起來像正常規則。
    const schedulable = RuntimeCore.autoPaymentIsSchedulable(obligation);
    const dueLabel = frozen
      ? "Paused"
      : (!schedulable ? "Not scheduled" : (pendingEvent?.dueDate ? `Next ${formatDisplayDate(pendingEvent.dueDate, false)}` : "No next date"));
    // 付款來源沒選就直說，不要用 fallback 讓它看起來已經設定好。
    const sourceLabel = obligation.amount === null
      ? "No amount set"
      : `${formatCurrency(obligation.amount)} · ${PAID_FROM_LABELS[obligation.paymentMethod] || "No source set"}`;
    const latestLabel = latest?.date
      ? `<span>Last paid <strong>${escapeHtml(formatDisplayDate(latest.date, false))}${latest.amount !== null && latest.amount !== undefined ? ` · ${escapeHtml(formatCurrency(latest.amount))}` : ""}</strong></span>`
      : "";
    const deleteButton = safeDeleteButton(obligation);
    return `<article class="task-item auto-payment-item ${frozen ? "is-frozen-rule" : ""} ${expanded ? "is-expanded" : ""}" data-obligation-id="${escapeHtml(obligation.id)}" data-event-id="${escapeHtml(pendingEvent?.id || "")}">
      <button type="button" class="task-summary" data-toggle-auto-payment="${escapeHtml(obligation.id)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(detailId)}">
        <span class="task-summary-copy"><strong title="${escapeHtml(obligation.name)}">${escapeHtml(obligation.name)}</strong><span class="task-summary-meta has-due"><span>${escapeHtml(dueLabel)}</span><span class="auto-payment-status">${escapeHtml(sourceLabel)}</span></span></span><span class="task-chevron" aria-hidden="true"></span>
      </button>
      ${expanded ? `<div id="${escapeHtml(detailId)}" class="task-details">
        ${taskEditorMarkup(pendingEvent, obligation)}
        ${latestLabel ? `<div class="task-details-meta">${latestLabel}</div>` : ""}
        <div class="task-actions-secondary">${frozen
          ? `<button type="button" class="button button-primary" data-unfreeze-obligation="${escapeHtml(obligation.id)}">Unfreeze</button>`
          : `<button type="button" class="button button-quiet" data-freeze-obligation="${escapeHtml(obligation.id)}">Freeze</button>`}<button type="button" class="button button-quiet" data-archive-obligation="${escapeHtml(obligation.id)}">Archive</button>${deleteButton}</div>
      </div>` : ""}
    </article>`;
  }

  // Frozen ＝ 使用者主動 Pause：不自動醒來、不提醒、不生成新的 occurrence、不產生交易。
  function frozenTaskMarkup(obligation) {
    const taskKey = `frozen:${obligation.id}`;
    const expanded = expandedTaskKey === taskKey;
    const detailId = `frozen-details-${obligation.id}`;
    const pendingEvent = pendingEventFor(obligation.id);
    return `<article class="task-item ${expanded ? "is-expanded" : ""}" data-obligation-id="${escapeHtml(obligation.id)}" data-event-id="${escapeHtml(pendingEvent?.id || "")}">
      <button type="button" class="task-summary" data-toggle-task="${escapeHtml(taskKey)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(detailId)}"><span class="task-summary-copy"><strong title="${escapeHtml(obligation.name)}">${escapeHtml(obligation.name)}</strong>${obligation.note ? `<span class="task-summary-meta"><span class="task-note" title="${escapeHtml(obligation.note)}">${escapeHtml(obligation.note)}</span></span>` : ""}</span><span class="task-chevron" aria-hidden="true"></span></button>
      ${expanded ? `<div id="${escapeHtml(detailId)}" class="task-details">
        ${taskEditorMarkup(pendingEvent, obligation)}
        <div class="task-actions-secondary"><button type="button" class="button button-primary" data-unfreeze-obligation="${escapeHtml(obligation.id)}">Unfreeze</button><button type="button" class="button button-quiet" data-archive-obligation="${escapeHtml(obligation.id)}">Archive</button></div>
      </div>` : ""}
    </article>`;
  }

  function renderAutoPayments() {
    const rules = RuntimeCore.autoPaymentRules(state);
    elements["auto-payment-count"].textContent = rules.length ? ` · ${rules.length}` : "";
    elements["auto-payment-list"].innerHTML = rules.length
      ? rules.map(autoPaymentMarkup).join("")
      : '<div class="empty-state compact-empty">No automatic payments.</div>';
    syncDateControls();
  }

  function renderTasks() {
    const windowDays = RuntimeCore.reminderWindowDays(state);
    const buckets = RuntimeCore.taskBuckets(state, todayKey);
    const activeRows = `${undoRowMarkup()}${buckets.active.map(item => taskMarkup(item, windowDays)).join("")}`;
    elements["task-active"].innerHTML = activeRows || '<div class="empty-state compact-empty">Nothing to handle right now.</div>';

    // SLEEPING：事情有效，只是時間還沒到。預設收合，空的時候整段不佔位置。
    // 正在編輯的那一列若因為改了 Due 而沉睡，區段跟著展開，不讓編輯狀態憑空消失。
    elements["sleeping-section"].hidden = !buckets.sleeping.length;
    elements["sleeping-count"].textContent = buckets.sleeping.length ? ` · ${buckets.sleeping.length}` : "";
    elements["sleeping-list"].innerHTML = buckets.sleeping.map(item => taskMarkup(item, windowDays)).join("");
    if (buckets.sleeping.some(item => item.event.id === expandedTaskKey)) elements["sleeping-group"].open = true;

    elements["frozen-list"].innerHTML = buckets.frozen.length
      ? buckets.frozen.map(frozenTaskMarkup).join("")
      : '<div class="empty-state compact-empty">Nothing frozen.</div>';
    elements["frozen-count"].textContent = buckets.frozen.length ? ` · ${buckets.frozen.length}` : "";
    syncDateControls();
    renderBooks();
  }

  function renderBooks() {
    const statusLabel = { current: "This month", queued: "Queued", frozen: "Frozen" };
    const openSections = new Set([...elements["book-list"].querySelectorAll("details[open][data-book-section]")].map(group => group.dataset.bookSection));
    // 與待辦同一模式：收合時只有書名與狀態，展開後才有編輯與 Delete。
    const bookMarkup = book => {
      const expanded = expandedBookId === book.id;
      const detailId = `book-details-${book.id}`;
      return `
      <article class="book-item ${book.status === "current" ? "is-current" : ""} ${expanded ? "is-expanded" : ""}" data-book-id="${escapeHtml(book.id)}">
        <button type="button" class="task-summary book-summary" data-toggle-book="${escapeHtml(book.id)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(detailId)}">
          <span class="task-summary-copy"><strong title="${escapeHtml(book.name)}">${escapeHtml(book.name)}</strong><span class="task-summary-meta"><span>${escapeHtml(statusLabel[book.status] || "Queued")}</span></span></span>
          <span class="task-chevron" aria-hidden="true"></span>
        </button>
        ${expanded ? `<div id="${escapeHtml(detailId)}" class="task-details book-details">
          <label class="field"><span>Name</span><input class="record-input" type="text" value="${escapeHtml(book.name)}" data-book-field="name"></label>
          <label class="field"><span>Status</span><select class="record-input" data-book-field="status"><option value="current" ${book.status === "current" ? "selected" : ""}>This month</option><option value="queued" ${book.status === "queued" ? "selected" : ""}>Queued</option><option value="frozen" ${book.status === "frozen" ? "selected" : ""}>Frozen</option></select></label>
          <div class="task-actions-secondary"><button type="button" class="button button-quiet" data-remove-book="${escapeHtml(book.id)}">Delete</button></div>
        </div>` : ""}
      </article>`;
    };
    const current = state.books.filter(book => book.status === "current");
    const collapsedGroup = (status, label) => {
      const items = state.books.filter(book => book.status === status);
      if (!items.length) return "";
      const holdsExpanded = items.some(book => book.id === expandedBookId);
      return `<details class="recess-group book-status-group" data-book-section="${status}" ${openSections.has(status) || holdsExpanded ? "open" : ""}><summary>${label} · ${items.length}</summary><div class="book-status-list">${items.map(bookMarkup).join("")}</div></details>`;
    };
    elements["book-list"].innerHTML = state.books.length ? `
      ${current.length ? `<section class="book-current-section"><h4>THIS MONTH</h4>${current.map(bookMarkup).join("")}</section>` : ""}
      ${collapsedGroup("queued", "QUEUED")}
      ${collapsedGroup("frozen", "FROZEN")}` : '<div class="empty-state compact-empty">Nothing here.</div>';
  }

  function renderReview() {
    const summary = RuntimeCore.summarizeReview(state, todayKey);
    // AVG SLEEP 是日均，維持 h:mm；TOTAL WORK 是七天合計，屬跨日合計，用小數時數。
    elements["metric-sleep"].textContent = RuntimeCore.formatMinutes(summary.averageSleep);
    elements["metric-work"].textContent = decimalHours(summary.totalWork);
    elements["metric-expense"].textContent = formatCurrency(summary.totalExpense);
    elements["metric-days"].textContent = String(summary.recordedDays);

    elements["review-list"].innerHTML = summary.rows.map(row => {
      // 與 WORK 三格同一算式：當日營收 ÷ 當日「完整」工作段總時數。
      // row.work 來自 workMinutes()，本來就略過沒有結束時間的工作段。
      const revenue = RuntimeCore.normalizeWorkRevenue(state.days[row.date]?.workRevenue);
      const hourly = revenue !== null && row.work > 0 ? formatCurrency(revenue / (row.work / 60)) : "—";
      return `
      <article class="review-day">
        <div class="review-day-header"><strong>${escapeHtml(formatDisplayDate(row.date))}</strong><span>${RuntimeCore.hasDayRecord(state.days[row.date]) ? "LOGGED" : "EMPTY"}</span></div>
        <div class="review-values">
          <div><span>SLEEP</span><strong>${escapeHtml(RuntimeCore.formatMinutes(row.sleep))}</strong></div>
          <div><span>WORK</span><strong>${escapeHtml(RuntimeCore.formatMinutes(row.work))}</strong></div>
          <div><span>HOURLY</span><strong>${escapeHtml(hourly)}</strong></div>
          <div><span>NET</span><strong>${escapeHtml(formatCurrency(row.net))}</strong></div>
          <div><span>RECOVERY</span><strong>${row.recovery ? `${escapeHtml(row.recovery)} / 5` : "—"}</strong></div>
        </div>
      </article>`;
    }).join("");

    const monthKey = todayKey.slice(0, 7);
    const income = RuntimeCore.monthIncome(state, monthKey);
    const expense = RuntimeCore.monthExpense(state, monthKey);
    const statementValue = state.statements?.[monthKey];
    const statement = RuntimeCore.cardStatementGap(state, monthKey, statementValue);
    elements["review-month-income"].textContent = formatCurrency(income);
    elements["review-month-expense"].textContent = formatCurrency(expense);
    elements["review-month-net"].textContent = formatCurrency(income - expense);
    elements["statement-amount"].value = statementValue ?? "";
    elements["statement-recorded"].textContent = formatCurrency(statement.recorded);
    elements["statement-gap"].textContent = formatCurrency(statement.gap);
  }

  function renderDataPage() {
    const protocolLabel = location.protocol === "file:" ? `Local file (${location.href.split("?")[0]})` : location.origin;
    elements["current-origin"].textContent = protocolLabel;
    elements["last-export"].textContent = state.meta.lastExportAt ? `Last export: ${formatUpdated(state.meta.lastExportAt)}` : "No export yet";
    elements["settings-radar-days"].value = String(state.settings?.radarDays ?? 7);
  }

  function renderAll() {
    renderMoney();
    renderToday();
    renderProjects();
    renderTasks();
    renderReview();
    renderDataPage();
    updateBackupReminder();
  }

  function hasAnyData() {
    return RuntimeCore.hasAnyDataInState(state);
  }

  function updateBackupReminder() {
    if (!elements["backup-reminder"]) return;
    elements["backup-reminder"].hidden = !RuntimeCore.shouldShowBackupReminder(state, todayKey);
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

  function downloadJsonBackup({ track = true } = {}) {
    const filename = RuntimeCore.exportFilename("json");
    downloadFile(dataStore.exportJson({ markExported: track }), filename, "application/json;charset=utf-8");
    if (track) {
      refreshState("Backup logged");
      renderDataPage();
      showToast("JSON exported");
    }
  }

  function downloadCsvExport() {
    downloadFile(`\uFEFF${dataStore.exportCsv()}`, RuntimeCore.exportFilename("csv"), "text/csv;charset=utf-8");
    showToast("CSV exported");
  }

  function openConfirmation({ title, message, firstLabel = "CONFIRM", finalLabel = "CONFIRM", action, trigger }) {
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
      elements["modal-title"].textContent = "FINAL CONFIRM";
      elements["modal-message"].textContent = "這個動作會改變目前資料。確認後將立即執行。";
      elements["modal-confirm"].textContent = elements["modal-confirm"].dataset.finalLabel || "CONFIRM";
      return;
    }
    const action = modalAction;
    closeConfirmation();
    action?.();
  }

  function syncDateControl(input) {
    const control = input?.closest(".date-control");
    const value = control?.querySelector(".date-control-value");
    if (!control || !value) return;
    value.textContent = input.value || value.dataset.datePlaceholder || "Select date";
    control.classList.toggle("is-empty", !input.value);
    control.classList.toggle("is-disabled", input.disabled);
  }

  function syncDateControls() {
    document.querySelectorAll("input[data-date-control]").forEach(syncDateControl);
  }

  function bindDateControls() {
    document.querySelectorAll("input[data-date-control]").forEach(input => {
      input.addEventListener("input", () => syncDateControl(input));
      input.addEventListener("change", () => syncDateControl(input));
    });
    syncDateControls();
  }

  // ── 展開即編輯的寫入路徑 ────────────────────────────────────────────────
  // input 只寫值不重繪（保住游標）；change 才重繪，因為欄位可見性、排序與分區可能改變。

  // Repeat 與 Due 只在 change 時寫入：它們會重設 recurrence anchor 與分區，
  // 邊輸入邊寫會在使用者還沒選完時就重繪。其餘欄位邊打邊存。
  function isLiveTaskField(target) {
    const field = target?.dataset?.taskField;
    return Boolean(field) && field !== "cycle" && field !== "dueDate";
  }

  function taskRowIds(target) {
    const row = target.closest("[data-obligation-id]");
    return { obligationId: row?.dataset.obligationId || "", eventId: row?.dataset.eventId || "" };
  }

  function numberFieldValue(value, { min = 0, fallback = null } = {}) {
    if (value === "") return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, number) : fallback;
  }

  // Monthly／Yearly 的 Due 同時是 calendar recurrence anchor 的唯一 UI 入口。
  // 只有真正切換週期或真正改 Due 時才重設 anchor；沒動就不動。
  function resolveCycleFor(obligation, event, { cycleType, dueDate }) {
    return calendarRepeatCycleState({
      cycleType,
      dueDate,
      existingCycle: obligation.cycle,
      originalCycleType: obligation.cycle.type,
      originalDueDate: event?.dueDate || null,
      intervalDays: obligation.cycle.days
    });
  }

  function applyCycleChange(obligation, event, nextType) {
    const dueDate = nextType === "mileage" ? null : (event?.dueDate || null);
    // 從沒有 Due 的狀態（Mileage、No repeat）切到 Monthly／Yearly：先讓週期切過去，
    // Due 欄位才會出現，使用者填了 Due 之後才定 anchor。
    // 舊做法是直接擋下切換，但 Mileage 的 Due 欄位本來就不顯示，使用者因此沒有任何
    // 路徑可以先填 Due —— 那是個死結。這裡不猜日期，只是不把人鎖在原本的週期裡。
    if (!dueDate && (nextType === "monthly" || nextType === "yearly")) {
      const switched = runDataChange(() => {
        dataStore.updateObligation(obligation.id, { cycle: { ...obligation.cycle, type: nextType } });
        if (event?.dueDate) dataStore.updateEvent(event.id, { dueDate: null });
      });
      if (switched) showToast("Monthly／Yearly 重複需要先設定 Due 日期。", 5000);
      return switched;
    }
    const result = resolveCycleFor(obligation, event, { cycleType: nextType, dueDate });
    if (result.error) {
      showToast(result.error, 5000);
      return false;
    }
    return runDataChange(() => {
      dataStore.updateObligation(obligation.id, { cycle: result.cycle });
      if (event && nextType === "mileage" && event.dueDate) dataStore.updateEvent(event.id, { dueDate: null });
    });
  }

  function applyDueChange(obligation, event, value) {
    if (!event) return false;
    const dueDate = value || null;
    const result = resolveCycleFor(obligation, event, { cycleType: obligation.cycle.type, dueDate });
    if (result.error) {
      showToast(result.error, 5000);
      return false;
    }
    return runDataChange(() => {
      dataStore.updateEvent(event.id, { dueDate });
      dataStore.updateObligation(obligation.id, { cycle: result.cycle });
    });
  }

  // 回傳 true 代表這次變更需要重繪。
  function writeTaskField(target) {
    const field = target.dataset.taskField;
    if (!field) return false;
    const { obligationId, eventId } = taskRowIds(target);
    const obligation = state.obligations.find(item => item.id === obligationId);
    if (!obligation) return false;
    const event = state.events.find(item => item.id === eventId && item.status === "pending") || null;
    const value = target.value;
    // 空值＝Auto payment 的「尚未選擇週期」佔位選項，不寫入任何東西。
    if (field === "cycle") return value ? applyCycleChange(obligation, event, value) : false;
    if (field === "dueDate") return applyDueChange(obligation, event, value);
    if (field === "name") {
      // 名稱清空時不寫入，避免中途存成預設名；重繪會把原名補回欄位。
      if (!value.trim()) return false;
      return runDataChange(() => dataStore.updateObligation(obligationId, { name: value }));
    }
    if (field === "note") return runDataChange(() => dataStore.updateObligation(obligationId, { note: value }));
    if (field === "amount") return runDataChange(() => dataStore.updateObligation(obligationId, { amount: numberFieldValue(value) }));
    // 空值＝「Select source」佔位選項，不寫入；規則維持未設定狀態。
    if (field === "paymentMethod") return value ? runDataChange(() => dataStore.updateObligation(obligationId, { paymentMethod: value })) : false;
    if (field === "intervalDays") {
      return runDataChange(() => dataStore.updateObligation(obligationId, { cycle: { ...obligation.cycle, days: numberFieldValue(value, { min: 1, fallback: 1 }) } }));
    }
    if (["lastServiceMileage", "currentMileage"].includes(field)) {
      return runDataChange(() => dataStore.updateObligation(obligationId, { service: { [field]: numberFieldValue(value) } }));
    }
    if (["reminderDays", "thresholdKm"].includes(field)) {
      const fallback = field === "reminderDays" ? 15 : 10000;
      return runDataChange(() => dataStore.updateObligation(obligationId, { service: { [field]: numberFieldValue(value, { min: 1, fallback }) } }));
    }
    return false;
  }

  // 每筆各自排一個重繪 timer；到期與否仍由 queue 的時間戳決定，timer 只負責把列收掉。
  function startUndoWindow(eventId, name) {
    undoQueue.push(eventId, name);
    setTimeout(renderTasks, UNDO_WINDOW_MS + 50);
  }

  function clearUndoWindow(eventId) {
    undoQueue.remove(eventId);
  }

  function openMileageEditor(obligationId, trigger) {
    const obligation = state.obligations.find(item => item.id === obligationId && item.cycle.type === "mileage");
    if (!obligation) return;
    mileageObligationId = obligation.id;
    mileageReturnFocus = trigger || document.activeElement;
    elements["mileage-modal-title"].textContent = `Update mileage · ${obligation.name}`;
    elements["mileage-current"].value = obligation.service.currentMileage ?? "";
    elements["mileage-date"].value = todayKey;
    syncDateControl(elements["mileage-date"]);
    elements["mileage-modal"].hidden = false;
    elements["mileage-current"].focus();
    elements["mileage-current"].select();
  }

  function closeMileageEditor() {
    elements["mileage-modal"].hidden = true;
    mileageObligationId = null;
    mileageReturnFocus?.focus();
    mileageReturnFocus = null;
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
      runDataChange(() => dataStore.snoozeBackupReminder(todayKey), "Reminder skipped");
      showToast("Hidden for today. It returns tomorrow.");
    });
    document.querySelectorAll("[data-now-target]").forEach(button => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.nowTarget);
        target.value = localTimeValue();
        target.dispatchEvent(new Event("input", { bubbles: true }));
        showToast("Filled with the current time");
      });
    });

    bindAutosaveInput("sleep-bedtime", "sleep.bedtime");
    bindAutosaveInput("sleep-wake", "sleep.wakeTime");
    elements["work-revenue"].addEventListener("input", event => {
      const value = RuntimeCore.normalizeWorkRevenue(event.target.value);
      if (event.target.value !== "" && value === null) event.target.value = "";
      runDataChange(() => dataStore.writeDayField(todayKey, "workRevenue", value));
      renderTodaySummary();
    });
    bindAutosaveInput("recovery-activity", "recovery.activity");
    bindAutosaveInput("recovery-effect", "recovery.effect");
    bindAutosaveInput("daily-note", "note");

    elements["revenue-target"].addEventListener("input", event => {
      runDataChange(() => dataStore.updateSettings({ monthlyIncomeTarget: parseTargetInput(event.target.value) }));
    });

    // 千分位在離開欄位時才補上：打字中重排字串會把游標推走。
    // 貼上「60,000」「60 000」或純數字都會在這裡正規化成一致的顯示。
    elements["revenue-target"].addEventListener("blur", event => {
      event.target.value = formatThousands(parseTargetInput(event.target.value));
    });

    elements["settings-radar-days"].addEventListener("input", event => {
      runDataChange(() => dataStore.updateSettings({ radarDays: Math.max(0, Number(event.target.value) || 0) }));
      renderTasks();
    });
    elements["toggle-schedule"].addEventListener("click", () => {
      const open = elements["schedule-section"].hidden;
      elements["toggle-schedule"].setAttribute("aria-expanded", String(open));
      renderSchedule(open);
      if (open) elements["schedule-name"].focus();
    });

    elements["schedule-form"].addEventListener("submit", event => {
      event.preventDefault();
      const name = elements["schedule-name"].value.trim();
      if (!name) {
        showToast("Enter a name");
        elements["schedule-name"].focus();
        return;
      }
      runDataChange(() => dataStore.addScheduleItem({
        weekday: Number(elements["schedule-weekday"].value),
        start: elements["schedule-start"].value,
        end: elements["schedule-end"].value,
        name
      }));
      elements["schedule-form"].reset();
      renderSchedule(true);
      showToast("Schedule added");
    });

    elements["punch-button"].addEventListener("click", () => {
      const day = readToday();
      const openSession = [...day.workSessions].reverse().find(session => session.start && !session.end);
      if (openSession) {
        runDataChange(() => dataStore.updateWorkSession(todayKey, openSession.id, { end: localTimeValue() }));
        showToast("Clocked out");
      } else {
        runDataChange(() => dataStore.addWorkSession(todayKey, { id: RuntimeCore.uid("work"), start: localTimeValue(), end: "" }));
        showToast("Clocked in");
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
      updateSessionRow(row.dataset.sessionId, updatedSession);
    });

    elements["work-sessions"].addEventListener("click", event => {
      const toggle = event.target.closest("[data-toggle-session]");
      if (toggle) {
        expandedSessionId = expandedSessionId === toggle.dataset.toggleSession ? null : toggle.dataset.toggleSession;
        renderWorkSessions();
        return;
      }
      const button = event.target.closest("[data-remove-session]");
      if (!button) return;
      openConfirmation({
        title: "REMOVE SESSION",
        message: "這段上下班時間會從今天刪除。",
        finalLabel: "REMOVE",
        trigger: button,
        action: () => {
          runDataChange(() => dataStore.deleteWorkSession(todayKey, button.dataset.removeSession));
          expandedSessionId = null;
          renderTodaySummary();
          renderWorkSessions();
          showToast("Session removed");
        }
      });
    });

    elements["transaction-form"].addEventListener("submit", event => {
      event.preventDefault();
      const type = elements["transaction-type"].value;
      const item = elements["transaction-item"].value.trim();
      const title = type === "expense" ? "" : elements["transaction-note"].value.trim();
      const amountValue = Number(elements["transaction-amount"].value);
      runDataChange(() => dataStore.addTransaction(todayKey, {
          id: RuntimeCore.uid("money"),
          type,
          amount: Number.isFinite(amountValue) ? Math.max(0, amountValue) : 0,
          category: type === "expense" ? item : "",
          title,
          note: title,
          paymentMethod: type === "expense" ? elements["transaction-payment-method"].value : "",
          incomeSource: type === "income" ? elements["transaction-income-source"].value.trim() : "",
          accountId: type === "income" ? elements["transaction-income-account"].value : "",
          fromAccountId: type === "transfer" ? elements["transaction-from-account"].value : "",
          toAccountId: type === "transfer" ? elements["transaction-to-account"].value : "",
          occurredOn: todayKey
        }));
      elements["transaction-amount"].value = "";
      elements["transaction-item"].value = "";
      elements["transaction-note"].value = "";
      if (type === "income") elements["transaction-income-source"].value = "";
      renderMoney();
      renderTodaySummary();
      elements["transaction-amount"].focus();
      showToast("Transaction added");
    });

    elements["transaction-type"].addEventListener("change", renderTransactionForm);

    elements["transaction-list"].addEventListener("input", event => {
      const field = event.target.dataset.transactionField;
      const row = event.target.closest("[data-transaction-id]");
      if (!field || !row) return;
      const dayKey = row.dataset.dayKey;
      const transaction = state.days[dayKey]?.transactions.find(item => item.id === row.dataset.transactionId);
      if (!transaction) return;
      const value = field === "amount" ? Math.max(0, Number(event.target.value) || 0) : event.target.value;
      runDataChange(() => dataStore.updateTransaction(dayKey, transaction.id, { [field]: value }));
      renderSpending();
      renderAccounts();
    });

    elements["transaction-list"].addEventListener("change", () => renderTransactions());
    elements["transaction-list"].addEventListener("click", event => {
      const button = event.target.closest("[data-remove-transaction]");
      if (!button) return;
      openConfirmation({
        title: "DELETE TRANSACTION",
        message: "這筆資料會從今天的收支中移除。",
        finalLabel: "DELETE",
        trigger: button,
        action: () => {
          const row = button.closest("[data-day-key]");
          runDataChange(() => dataStore.deleteTransaction(row.dataset.dayKey, button.dataset.removeTransaction));
          renderTodaySummary();
          renderMoney();
          showToast("Transaction deleted");
        }
      });
    });

    elements["account-form"].addEventListener("submit", event => {
      event.preventDefault();
      const name = elements["account-name"].value.trim();
      if (!name) {
        showToast("Enter an account name");
        elements["account-name"].focus();
        return;
      }
      runDataChange(() => dataStore.addAccount(name));
      elements["account-form"].reset();
      renderAccounts();
      renderTransactionForm();
      showToast("Account added");
    });

    elements["account-manager"].addEventListener("change", event => {
      const row = event.target.closest("[data-account-id]");
      if (!row || !event.target.matches("[data-account-name]")) return;
      runDataChange(() => dataStore.updateAccount(row.dataset.accountId, { name: event.target.value }));
      renderAccounts();
      renderTransactionForm();
    });

    elements["account-manager"].addEventListener("click", event => {
      const button = event.target.closest("[data-account-active]");
      const row = button?.closest("[data-account-id]");
      if (!button || !row) return;
      runDataChange(() => dataStore.updateAccount(row.dataset.accountId, { active: button.dataset.accountActive === "true" }));
      renderAccounts();
      renderTransactionForm();
      showToast(button.dataset.accountActive === "true" ? "Account unarchived" : "Account archived");
    });

    elements["toggle-project-form"].addEventListener("click", () => toggleProjectForm(elements["project-form"].hidden));
    elements["cancel-project"].addEventListener("click", () => toggleProjectForm(false));
    elements["project-form"].addEventListener("submit", event => {
      event.preventDefault();
      const now = new Date().toISOString();
      runDataChange(() => dataStore.addProject({
        id: RuntimeCore.uid("project"),
        name: elements["project-name"].value.trim() || "UNNAMED",
        status: "active",
        nextStep: elements["project-next-step"].value.trim(),
        updatedAt: now
      }));
      elements["project-form"].reset();
      toggleProjectForm(false);
      renderProjects();
      showToast("Project added");
    });

    elements["project-list"].addEventListener("input", event => {
      const field = event.target.dataset.projectField;
      const card = event.target.closest("[data-project-id]");
      if (!field || !card) return;
      const project = state.projects.find(item => item.id === card.dataset.projectId);
      if (!project) return;
      runDataChange(() => dataStore.updateProject(project.id, { [field]: event.target.value }));
      const updatedProject = state.projects.find(item => item.id === card.dataset.projectId);
      card.querySelector(".project-updated").textContent = `Updated ${formatUpdated(updatedProject?.updatedAt)}`;
    });
    elements["project-list"].addEventListener("change", () => renderProjects());
    elements["project-list"].addEventListener("click", event => {
      const toggle = event.target.closest("[data-toggle-project]");
      const close = event.target.closest("[data-close-project]");
      const button = event.target.closest("[data-remove-project]");
      if (toggle) {
        expandedProjectId = expandedProjectId === toggle.dataset.toggleProject ? null : toggle.dataset.toggleProject;
        renderProjects();
        return;
      }
      if (close) {
        expandedProjectId = null;
        renderProjects();
        showToast("Project saved");
        return;
      }
      if (!button) return;
      const project = state.projects.find(item => item.id === button.dataset.removeProject);
      openConfirmation({
        title: "DELETE PROJECT",
        message: `「${project?.name || "UNNAMED"}」及它的下一步會被刪除。`,
        finalLabel: "DELETE",
        trigger: button,
        action: () => {
          runDataChange(() => dataStore.deleteProject(button.dataset.removeProject));
          expandedProjectId = null;
          renderProjects();
          showToast("Project deleted");
        }
      });
    });

    // 輸入名稱並 Add 就是一個完整合法的建立動作：不自動打開 editor，直接回到清單。
    elements["quick-task-form"].addEventListener("submit", event => {
      event.preventDefault();
      const name = elements["quick-task-name"].value.trim();
      if (!name) {
        showToast("Enter a task name");
        elements["quick-task-name"].focus();
        return;
      }
      const saved = runDataChange(() => dataStore.addObligation({
        // 付款來源刻意留空：這個 Task 之後若變成 recurring + Amount，來源必須由使用者自己選。
        name, cycle: { type: "none" }, amount: null, handling: "manual", paymentMethod: "", status: "active", note: ""
      }, null));
      if (!saved) return;
      elements["quick-task-name"].value = "";
      renderTasks();
      showToast("Task added");
    });

    // Auto payment 建立時就要設定穩定規則，因此新增後直接展開該筆的 editor。
    elements["auto-payment-form"].addEventListener("submit", event => {
      event.preventDefault();
      const name = elements["auto-payment-name"].value.trim();
      if (!name) {
        showToast("Enter an auto payment name");
        elements["auto-payment-name"].focus();
        return;
      }
      // 建立時不猜任何日期：週期未選、Due 為空、金額為空。
      // 規則要能自動扣款，Amount／recurrence／Due 都必須由使用者在下面的 editor 明確設定，
      // 在那之前 autoPaymentIsSchedulable() 會擋掉所有自動交易。
      let created = null;
      const saved = runDataChange(() => {
        created = dataStore.addObligation({
          name,
          cycle: { type: "none" },
          amount: null,
          handling: "auto",
          // 付款來源刻意不給值：空字串＝使用者還沒選。給 "card" 會被正規化層當成明確選擇，
          // 然後在使用者其實要 BANK 的情況下先扣到 CARD。
          paymentMethod: "",
          status: "active",
          note: ""
        }, null);
      });
      if (!saved || !created) return;
      elements["auto-payment-name"].value = "";
      elements["auto-payment-group"].open = true;
      expandedAutoPaymentId = created.obligation.id;
      renderAutoPayments();
      showToast("Auto payment added — set the rule");
    });

    const moneyPage = document.getElementById("page-money");
    moneyPage.addEventListener("input", event => {
      if (!isLiveTaskField(event.target)) return;
      writeTaskField(event.target);
    });
    moneyPage.addEventListener("change", event => {
      if (!event.target.dataset.taskField) return;
      writeTaskField(event.target);
      // 使用者把規則補齊、而 Due 已經 <= 今天時，本 session 就處理掉，不用等 reload。
      // runAutoPayments 本身是 idempotent 的，欄位每次變更都跑也不會產生重複交易。
      runDataChange(() => dataStore.runAutoPayments(todayKey));
      renderMoney();
    });
    moneyPage.addEventListener("click", event => {
      const toggle = event.target.closest("[data-toggle-auto-payment]");
      const freeze = event.target.closest("[data-freeze-obligation]");
      const unfreeze = event.target.closest("[data-unfreeze-obligation]");
      const archive = event.target.closest("[data-archive-obligation]");
      const deleteObligation = event.target.closest("[data-delete-obligation]");
      if (toggle) {
        expandedAutoPaymentId = expandedAutoPaymentId === toggle.dataset.toggleAutoPayment ? null : toggle.dataset.toggleAutoPayment;
        renderAutoPayments();
        return;
      }
      if (deleteObligation) {
        confirmObligationDelete(deleteObligation, () => {
          expandedAutoPaymentId = null;
          renderAutoPayments();
          renderTasks();
        });
        return;
      }
      if (freeze) runDataChange(() => dataStore.freezeObligation(freeze.dataset.freezeObligation));
      else if (unfreeze) {
        // 解凍後 occurrence 會被搬到第一個 >= today 的合法日期；剛好等於今天就在本 session 執行。
        runDataChange(() => {
          dataStore.unfreezeObligation(unfreeze.dataset.unfreezeObligation, todayKey);
          dataStore.runAutoPayments(todayKey);
        });
      }
      else if (archive) {
        runDataChange(() => dataStore.updateObligation(archive.dataset.archiveObligation, { status: "archived" }));
        expandedAutoPaymentId = null;
      } else return;
      renderAutoPayments();
      renderTasks();
    });

    const tasksPage = document.getElementById("page-tasks");
    tasksPage.addEventListener("input", event => {
      if (isLiveTaskField(event.target)) {
        writeTaskField(event.target);
        return;
      }
      if (event.target.dataset.taskField) return;
      const book = event.target.closest("[data-book-id]");
      if (book && event.target.dataset.bookField) {
        runDataChange(() => dataStore.updateBook(book.dataset.bookId, { [event.target.dataset.bookField]: event.target.value }));
      }
    });
    tasksPage.addEventListener("change", event => {
      if (event.target.dataset.taskField) {
        writeTaskField(event.target);
        renderTasks();
        renderMoney();
        return;
      }
      if (event.target.dataset.bookField === "status") renderBooks();
    });
    tasksPage.addEventListener("click", event => {
      const toggleTask = event.target.closest("[data-toggle-task]");
      const togglePin = event.target.closest("[data-toggle-pin]");
      const toggleBook = event.target.closest("[data-toggle-book]");
      const complete = event.target.closest("[data-complete-event]");
      const mileage = event.target.closest("[data-update-mileage]");
      const freeze = event.target.closest("[data-freeze-obligation]");
      const archive = event.target.closest("[data-archive-obligation]");
      const unfreeze = event.target.closest("[data-unfreeze-obligation]");
      const deleteObligation = event.target.closest("[data-delete-obligation]");
      const undo = event.target.closest("[data-undo-event]");
      const removeBook = event.target.closest("[data-remove-book]");
      if (togglePin) {
        const target = state.events.find(item => item.id === togglePin.dataset.togglePin);
        if (!target) return;
        runDataChange(() => dataStore.updateEvent(target.id, { pinned: target.pinned !== true }));
        renderTasks();
        return;
      }
      if (toggleTask) {
        expandedTaskKey = expandedTaskKey === toggleTask.dataset.toggleTask ? null : toggleTask.dataset.toggleTask;
        renderTasks();
        return;
      }
      if (toggleBook) {
        expandedBookId = expandedBookId === toggleBook.dataset.toggleBook ? null : toggleBook.dataset.toggleBook;
        renderBooks();
        return;
      }
      if (removeBook) {
        const book = state.books.find(item => item.id === removeBook.dataset.removeBook);
        openConfirmation({
          title: "DELETE BOOK",
          message: `「${book?.name || "UNNAMED"}」會從書單移除。`,
          finalLabel: "DELETE",
          trigger: removeBook,
          action: () => {
            runDataChange(() => dataStore.deleteBook(removeBook.dataset.removeBook));
            expandedBookId = null;
            renderBooks();
            showToast("Book deleted");
          }
        });
        return;
      }
      if (deleteObligation) {
        confirmObligationDelete(deleteObligation, () => {
          expandedTaskKey = null;
          renderTasks();
        });
        return;
      }
      if (mileage) {
        openMileageEditor(mileage.dataset.updateMileage, mileage);
        return;
      } else if (complete) {
        // 使用者只表達「這件事我完成了」；後果（結束或生下一期、記不記帳）由資料決定。
        const eventId = complete.dataset.completeEvent;
        const target = state.obligations.find(item =>
          item.id === state.events.find(record => record.id === eventId)?.obligationId);
        // 有金額卻還沒設付款來源時擋下整個完成動作，occurrence 維持 pending。
        const blocked = RuntimeCore.completionBlockReason(target);
        if (blocked) {
          showToast(blocked, 5000);
          expandedTaskKey = eventId;
          renderTasks();
          return;
        }
        const obligationName = target?.name || "Task";
        const saved = runDataChange(() => dataStore.completeEvent(eventId, { completedDate: todayKey }));
        if (!saved) return;
        expandedTaskKey = null;
        startUndoWindow(eventId, obligationName);
      } else if (freeze) {
        runDataChange(() => dataStore.freezeObligation(freeze.dataset.freezeObligation));
        expandedTaskKey = null;
        showToast("Frozen");
      } else if (archive) {
        runDataChange(() => dataStore.updateObligation(archive.dataset.archiveObligation, { status: "archived" }));
        expandedTaskKey = null;
        showToast("Archived");
      } else if (unfreeze) {
        runDataChange(() => dataStore.unfreezeObligation(unfreeze.dataset.unfreezeObligation, todayKey));
        expandedTaskKey = null;
        showToast("Unfrozen");
      } else if (undo) {
        // 原子性回滾整次 Complete：本期恢復、生成的下一期撤銷、連動交易移除。
        // 只動這一筆，不影響同時存在於窗口內的其他 Undo。
        runDataChange(() => dataStore.undoEvent(undo.dataset.undoEvent));
        clearUndoWindow(undo.dataset.undoEvent);
        showToast("Undone");
      } else {
        return;
      }
      renderTasks();
      renderMoney();
    });

    elements["mileage-form"].addEventListener("submit", event => {
      event.preventDefault();
      const mileage = Number(elements["mileage-current"].value);
      const date = elements["mileage-date"].value;
      if (!Number.isFinite(mileage) || mileage < 0 || !date || !mileageObligationId) {
        showToast("Enter mileage and update date");
        return;
      }
      const obligationId = mileageObligationId;
      runDataChange(() => dataStore.updateMileage(obligationId, mileage, date));
      closeMileageEditor();
      renderTasks();
      renderMoney();
      showToast("Mileage updated");
    });

    document.querySelectorAll("[data-mileage-cancel]").forEach(item => item.addEventListener("click", closeMileageEditor));

    elements["book-form"].addEventListener("submit", event => {
      event.preventDefault();
      const name = elements["book-name"].value.trim();
      if (!name) return;
      runDataChange(() => dataStore.addBook({ name, status: "queued" }));
      elements["book-name"].value = "";
      renderBooks();
      showToast("Book added");
    });

    elements["statement-amount"].addEventListener("input", event => {
      const monthKey = todayKey.slice(0, 7);
      runDataChange(() => dataStore.setStatementAmount(monthKey, Math.max(0, Number(event.target.value) || 0)));
      const statement = RuntimeCore.cardStatementGap(state, monthKey, state.statements?.[monthKey]);
      elements["statement-recorded"].textContent = formatCurrency(statement.recorded);
      elements["statement-gap"].textContent = formatCurrency(statement.gap);
    });

    elements["export-json"].addEventListener("click", () => downloadJsonBackup());
    elements["export-csv"].addEventListener("click", downloadCsvExport);
    elements["import-json"].addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const validation = RuntimeCore.validateImportedState(parsed);
        if (!validation.valid) {
          showToast(validation.reason, 5000);
          return;
        }
        openConfirmation({
          title: "REPLACE ALL DATA",
          message: "確認後會先自動下載目前資料的備份，再以選取的 JSON 完整取代。",
          finalLabel: "CONFIRM",
          trigger: elements["import-json"],
          action: () => {
            downloadJsonBackup({ track: false });
            if (runDataChange(() => dataStore.importState(parsed), "Saved")) {
              renderAll();
              showToast("JSON imported and replaced everything");
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
        title: "CLEAR ALL DATA",
        message: "今天、專案與回顧資料都會從目前瀏覽器清除。建議先匯出 JSON。",
        finalLabel: "CONFIRM",
        trigger: event.currentTarget,
        action: () => {
          if (!runDataChange(() => dataStore.clear(), "Cleared")) return;
          elements["transaction-type"].value = "expense";
          elements["transaction-amount"].value = "";
          elements["transaction-item"].value = "";
          elements["transaction-note"].value = "";
          renderAll();
          showToast("All data cleared");
        }
      });
    });

    elements["modal-confirm"].addEventListener("click", confirmModalStep);
    document.querySelectorAll("[data-modal-cancel]").forEach(item => item.addEventListener("click", closeConfirmation));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !elements["confirm-modal"].hidden) closeConfirmation();
      if (event.key === "Escape" && !elements["mileage-modal"].hidden) closeMileageEditor();
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
    elements["today-date"].textContent = formatDisplayDate(todayKey);
    elements["transaction-item"].value = "";
    runDataChange(() => dataStore.touchOpened());
    bindDateControls();
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
