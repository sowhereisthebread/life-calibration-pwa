(() => {
  "use strict";

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
  let editingObligationId = null;
  let editingEventId = null;
  let mileageObligationId = null;
  let mileageReturnFocus = null;
  let expandedProjectId = null;
  let expandedTaskKey = null;
  let expandedBookId = null;
  let expandedSessionId = null;

  function queryElements() {
    [
      "today-date", "autosave-status", "today-work-total", "work-month-revenue", "work-revenue-percent", "work-revenue-bar",
      "work-session-count", "revenue-target", "work-revenue", "stat-hourly", "stat-week", "stat-month", "sleep-bedtime", "sleep-wake",
      "sleep-total", "work-status", "punch-button", "work-sessions", "transaction-form", "transaction-type",
      "transaction-amount", "transaction-item", "transaction-title-field", "transaction-note", "transaction-payment-method", "transaction-income-source",
      "transaction-income-account", "transaction-from-account", "transaction-to-account", "expense-fields", "income-fields", "transfer-fields",
      "transaction-list", "money-radar", "money-radar-list", "account-balances",
      "account-form", "account-name", "account-manager",
      "month-spent", "spending-chart", "category-ranking", "recent-transactions",
      "recovery-activity", "recovery-effect", "daily-note", "toggle-project-form", "project-form", "project-name",
      "project-next-step", "cancel-project", "project-list", "metric-sleep", "metric-work", "metric-expense",
      "projects-radar", "projects-radar-list", "quick-task-form", "quick-task-name", "obligation-form",
      "obligation-form-title", "cancel-obligation-edit", "obligation-submit", "obligation-name", "obligation-cycle", "obligation-due",
      "obligation-cycle-day-field", "obligation-cycle-day", "obligation-cycle-month-field", "obligation-cycle-month", "obligation-interval-field", "obligation-interval", "obligation-amount", "obligation-handling",
      "obligation-completion-mode", "obligation-payment-method-field", "obligation-payment-method", "obligation-transfer-fields", "obligation-status", "obligation-note", "mileage-fields",
      "obligation-last-mileage", "obligation-current-mileage", "obligation-mileage-updated", "obligation-reminder-days", "obligation-threshold",
      "task-dated", "task-later", "task-later-list", "task-no-date", "task-done", "book-form", "book-name", "book-list", "frozen-list", "frozen-count",
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
    if (pageName === "work") renderToday();
    if (pageName === "money") renderMoney();
    if (pageName === "review") renderReview();
    if (pageName === "projects") {
      renderProjects();
      renderCommitments();
    }
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
    elements["revenue-target"].value = String(state.settings?.monthlyIncomeTarget ?? 60000);

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

  function renderTransactions() {
    const transactions = RuntimeCore.allTransactions(state).sort((a, b) => String(b.occurredOn).localeCompare(String(a.occurredOn)));
    if (!transactions.length) {
      elements["transaction-list"].innerHTML = '<div class="empty-state"><strong>Nothing logged yet.</strong>Add the first transaction above.</div>';
      return;
    }
    const groups = transactions.reduce((result, transaction) => {
      (result[transaction.occurredOn] ||= []).push(transaction);
      return result;
    }, {});
    const typeLabel = { expense: "Expense", income: "Income", transfer: "Transfer" };
    // Auto-paid 標記：交易上的 eventId 指到狀態為 auto-paid 的事件就標。純衍生，不新增欄位。
    const autoPaidEventIds = new Set(state.events.filter(event => event.status === "auto-paid").map(event => event.id));
    elements["transaction-list"].innerHTML = Object.entries(groups).map(([dayKey, items]) => `
      <section class="transaction-day" aria-label="${escapeHtml(dayKey)}">
        <p class="transaction-date">${escapeHtml(formatDisplayDate(dayKey))}</p>
        ${items.map(transaction => `
          <details class="transaction-row" data-transaction-id="${escapeHtml(transaction.id)}" data-day-key="${escapeHtml(dayKey)}">
            <summary><span>${escapeHtml(transaction.type === "expense" ? (transaction.category || "Other") : (transaction.title || transaction.incomeSource || typeLabel[transaction.type]))}${autoPaidEventIds.has(transaction.eventId) ? '<span class="auto-tag">AUTO</span>' : ""}</span><strong>${escapeHtml(formatCurrency(transaction.amount))}</strong></summary>
            <div class="transaction-editor">
              <div class="inline-fields">
                <label class="field"><span>Type</span><select class="record-input" data-transaction-field="type"><option value="expense" ${transaction.type === "expense" ? "selected" : ""}>Expense</option><option value="income" ${transaction.type === "income" ? "selected" : ""}>Income</option><option value="transfer" ${transaction.type === "transfer" ? "selected" : ""}>Transfer</option></select></label>
                <label class="field"><span>Amount</span><input class="record-input" type="number" min="0" step="1" inputmode="decimal" value="${escapeHtml(transaction.amount ?? 0)}" data-transaction-field="amount"></label>
              </div>
              ${transaction.type === "expense" ? `
                <label class="field"><span>Item</span><input class="record-input" type="text" value="${escapeHtml(transaction.category || "")}" data-transaction-field="category"></label>
                <label class="field"><span>Paid with</span><select class="record-input" data-transaction-field="paymentMethod"><option value="" ${!transaction.paymentMethod ? "selected" : ""}>Unknown</option><option value="card" ${transaction.paymentMethod === "card" ? "selected" : ""}>Card</option><option value="cash" ${transaction.paymentMethod === "cash" ? "selected" : ""}>Cash</option><option value="bank" ${transaction.paymentMethod === "bank" ? "selected" : ""}>Bank</option></select></label>
              ` : `<label class="field"><span>Title (optional)</span><input class="record-input" type="text" value="${escapeHtml(transaction.title || "")}" data-transaction-field="title"></label>`}
              <button type="button" class="record-remove" data-remove-transaction="${escapeHtml(transaction.id)}">Delete</button>
            </div>
          </details>`).join("")}
      </section>`).join("");
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

  function renderRadar() {
    const items = RuntimeCore.radarItems(state, todayKey);
    elements["money-radar"].hidden = !items.length;
    elements["projects-radar"].hidden = !items.length;
    if (!items.length) {
      elements["money-radar-list"].innerHTML = "";
      elements["projects-radar-list"].innerHTML = "";
      return;
    }
    const label = { overdue: "Overdue", today: "Due today", soon: "Due soon", "service-due": "Service due", "update-mileage": "Update mileage" };
    // 相對天數：架構.md 第二章要求「逾期 N 天」。diff 由 radarItems() 依既有的到期日算出，純衍生。
    const relativeLabel = item => {
      if (item.kind === "overdue") return `Overdue ${Math.abs(item.diff)}d`;
      if (item.kind === "soon") return `Due in ${item.diff}d`;
      return label[item.kind];
    };
    const markup = items.map(item => `
      <article class="radar-item is-${escapeHtml(item.kind)}">
        <div><strong>${escapeHtml(item.obligation.name)}</strong><span>${escapeHtml(relativeLabel(item))}${item.event?.dueDate ? ` · ${escapeHtml(formatDisplayDate(item.event.dueDate))}` : ""}</span></div>
        ${item.event ? `<button type="button" class="button button-quiet" data-complete-event="${escapeHtml(item.event.id)}">Mark done</button>` : `<button type="button" class="button button-quiet" data-update-mileage="${escapeHtml(item.obligation.id)}">Update mileage</button>`}
      </article>`).join("");
    elements["money-radar-list"].innerHTML = markup;
    elements["projects-radar-list"].innerHTML = markup;
  }

  function renderAccounts() {
    const balances = RuntimeCore.accountBalances(state);
    elements["account-balances"].innerHTML = state.accounts.filter(account => account.active).map(account => `
      <article class="account-item"><span>${escapeHtml(account.name)}</span><strong>${escapeHtml(formatCurrency(balances[account.id] || 0))}</strong></article>
    `).join("");
    elements["account-manager"].innerHTML = state.accounts.map(account => `
      <article class="manager-row ${account.active ? "" : "is-archived"}" data-account-id="${escapeHtml(account.id)}">
        <label class="field"><span>${account.system ? "System account" : (account.active ? "Custom account" : "Archived account")}</span><input class="record-input" type="text" value="${escapeHtml(account.name)}" data-account-name aria-label="Account name ${escapeHtml(account.name)}"></label>
        <div class="manager-row-meta"><strong>${escapeHtml(formatCurrency(balances[account.id] || 0))}</strong>${account.system ? '<span class="status-pill">Always active</span>' : `<button type="button" class="button button-quiet" data-account-active="${account.active ? "false" : "true"}">${account.active ? "Archive" : "Unarchive"}</button>`}</div>
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
    const tailShade = shades[shades.length - 1];   // 最淺一階＝OTHER 與第六名以後
    if (!ranking.length) {
      elements["spending-chart"].innerHTML = '<div class="chart-empty">Nothing logged yet.</div>';
      elements["category-ranking"].innerHTML = "";
      return;
    }
    // 圖只畫前五名，第六名以後併成 OTHER，讓分段面積加總等於上方的支出總額。
    // 純顯示層加總：不新增欄位，也不動 categoryRanking 的回傳結構。
    const tailPercent = ranking.slice(5).reduce((sum, item) => sum + item.percent, 0);
    const segments = ranking.slice(0, 5).map((item, index) => ({ percent: item.percent, color: shades[index] }));
    if (tailPercent > 0) segments.push({ percent: tailPercent, color: tailShade });

    let offset = 0;
    const gap = segments.length > 1 ? SEGMENT_GAP : 0;
    const circles = segments.map(segment => {
      const drawn = Math.max(0.3, segment.percent - gap);
      const circle = `<circle cx="60" cy="60" r="46" pathLength="100" fill="none" stroke="${segment.color}" stroke-width="20" stroke-dasharray="${drawn} ${100 - drawn}" stroke-dashoffset="${-(offset + gap / 2)}" />`;
      offset += segment.percent;
      return circle;
    }).join("");
    elements["spending-chart"].innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="Spending by category this month"><g transform="rotate(-90 60 60)">${circles}</g></svg>`;
    elements["category-ranking"].innerHTML = ranking.map((item, index) => `<div><i style="--rank-color:${index < shades.length ? shades[index] : tailShade}"></i><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(formatCurrency(item.amount))}</strong><small>${item.percent.toFixed(0)}%</small></div>`).join("");
  }

  function renderMoney() {
    renderTransactionForm();
    renderRadar();
    renderAccounts();
    renderSpending();
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
          ${expanded ? `<div id="${escapeHtml(detailsId)}" class="card project-details">
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

  function taskMarkup(event, obligation) {
    const expanded = expandedTaskKey === event.id;
    const dueLabel = event.dueDate ? `Due ${formatDisplayDate(event.dueDate)}` : "";
    const note = obligation.note || "";
    const detailId = `task-details-${event.id}`;
    const cycleLabel = { none: "None", once: "Once", monthly: "Monthly", yearly: "Yearly", after_days: "After N days", mileage: "By mileage" }[obligation.cycle.type] || "None";
    const completionLabel = { none: "No transaction", expense: "Expense", transfer: "Account transfer" }[obligation.completionMode] || "No transaction";
    return `
      <article class="task-item ${expanded ? "is-expanded" : ""}" data-obligation-id="${escapeHtml(obligation.id)}" data-event-id="${escapeHtml(event.id)}">
        <button type="button" class="task-summary" data-toggle-task="${escapeHtml(event.id)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(detailId)}">
          <span class="task-summary-copy"><strong title="${escapeHtml(obligation.name)}">${escapeHtml(obligation.name)}</strong>${dueLabel || note ? `<span class="task-summary-meta ${dueLabel ? "has-due" : ""}">${dueLabel ? `<span>${escapeHtml(dueLabel)}</span>` : ""}${note ? `<span class="task-note" title="${escapeHtml(note)}">${escapeHtml(note)}</span>` : ""}</span>` : ""}</span>
          <span class="task-chevron" aria-hidden="true"></span>
        </button>
        ${expanded ? `<div id="${escapeHtml(detailId)}" class="task-details">
          <strong class="task-detail-name">${escapeHtml(obligation.name)}</strong>
          <div class="task-details-meta"><span>Repeats <strong>${escapeHtml(cycleLabel)}</strong></span><span>When done <strong>${escapeHtml(completionLabel)}</strong></span>${obligation.amount !== null ? `<span>Amount <strong>${escapeHtml(formatCurrency(obligation.amount))}</strong></span>` : ""}</div>
          <label class="field task-actual"><span>Actual amount</span><input class="record-input" type="number" min="0" step="1" inputmode="decimal" value="${escapeHtml(event.actualAmount ?? obligation.amount ?? "")}" data-event-field="actualAmount"></label>
          <div class="task-actions"><button type="button" class="button button-primary" data-complete-event="${escapeHtml(event.id)}">Mark done</button><div class="task-actions-secondary"><button type="button" class="button button-quiet" data-edit-obligation="${escapeHtml(obligation.id)}">Edit</button><button type="button" class="button button-quiet" data-freeze-obligation="${escapeHtml(obligation.id)}">Freeze</button><button type="button" class="button button-quiet" data-archive-obligation="${escapeHtml(obligation.id)}">Archive</button></div></div>
        </div>` : ""}
      </article>`;
  }

  function frozenTaskMarkup(obligation) {
    const taskKey = `frozen:${obligation.id}`;
    const expanded = expandedTaskKey === taskKey;
    const detailId = `frozen-details-${obligation.id}`;
    return `<article class="task-item ${expanded ? "is-expanded" : ""}" data-obligation-id="${escapeHtml(obligation.id)}">
      <button type="button" class="task-summary" data-toggle-task="${escapeHtml(taskKey)}" aria-expanded="${expanded}" aria-controls="${escapeHtml(detailId)}"><span class="task-summary-copy"><strong title="${escapeHtml(obligation.name)}">${escapeHtml(obligation.name)}</strong>${obligation.note ? `<span class="task-summary-meta"><span class="task-note" title="${escapeHtml(obligation.note)}">${escapeHtml(obligation.note)}</span></span>` : ""}</span><span class="task-chevron" aria-hidden="true"></span></button>
      ${expanded ? `<div id="${escapeHtml(detailId)}" class="task-details"><strong class="task-detail-name">${escapeHtml(obligation.name)}</strong><div class="task-details-meta"><span>Status <strong>Frozen</strong></span>${obligation.amount !== null ? `<span>Amount <strong>${escapeHtml(formatCurrency(obligation.amount))}</strong></span>` : ""}</div><div class="task-actions-secondary"><button type="button" class="button button-quiet" data-edit-obligation="${escapeHtml(obligation.id)}">Edit</button><button type="button" class="button button-primary" data-unfreeze-obligation="${escapeHtml(obligation.id)}">Unfreeze</button></div></div>` : ""}
    </article>`;
  }

  function renderCommitments() {
    renderRadar();
    const pending = state.events.filter(event => event.status === "pending").map(event => ({
      event,
      obligation: state.obligations.find(item => item.id === event.obligationId)
    })).filter(item => item.obligation && item.obligation.status === "active");
    const cutoff = new Date(RuntimeCore.dateFromKey(todayKey));
    cutoff.setDate(cutoff.getDate() + 30);
    const cutoffKey = RuntimeCore.localDateKey(cutoff);
    const dated = pending.filter(item => item.event.dueDate && item.event.dueDate <= cutoffKey).sort((a, b) => a.event.dueDate.localeCompare(b.event.dueDate));
    const later = pending.filter(item => item.event.dueDate && item.event.dueDate > cutoffKey).sort((a, b) => a.event.dueDate.localeCompare(b.event.dueDate));
    const noDate = pending.filter(item => !item.event.dueDate);
    const empty = '<div class="empty-state compact-empty">Nothing due.</div>';
    elements["task-dated"].innerHTML = dated.length ? dated.map(item => taskMarkup(item.event, item.obligation)).join("") : empty;
    elements["task-later"].hidden = !later.length;
    elements["task-later-list"].innerHTML = later.map(item => taskMarkup(item.event, item.obligation)).join("");
    elements["task-no-date"].innerHTML = noDate.length ? noDate.map(item => taskMarkup(item.event, item.obligation)).join("") : '<div class="empty-state compact-empty">Nothing here.</div>';

    const done = state.events.filter(event => event.status !== "pending").sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")));
    elements["task-done"].innerHTML = done.length ? done.map(event => {
      const obligation = state.obligations.find(item => item.id === event.obligationId);
      return `<article class="task-item is-done"><div class="task-main"><strong>${escapeHtml(obligation?.name || "Archived item")}</strong><span>${event.status === "auto-paid" ? "Auto-paid" : "Done"} · ${escapeHtml(event.completedAt?.slice(0, 10) || "")}</span></div><button type="button" class="button button-quiet" data-undo-event="${escapeHtml(event.id)}">Undo</button></article>`;
    }).join("") : empty;

    const frozen = state.obligations.filter(item => item.status === "frozen");
    elements["frozen-list"].innerHTML = frozen.length ? frozen.map(frozenTaskMarkup).join("") : '<div class="empty-state compact-empty">Nothing frozen.</div>';
    elements["frozen-count"].textContent = frozen.length ? ` · ${frozen.length}` : "";
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
    renderCommitments();
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

  function syncObligationCycleFields() {
    const cycle = elements["obligation-cycle"].value;
    elements["mileage-fields"].hidden = cycle !== "mileage";
    elements["obligation-due"].disabled = cycle === "none" || cycle === "mileage";
    elements["obligation-cycle-day-field"].hidden = !["monthly", "yearly"].includes(cycle);
    elements["obligation-cycle-month-field"].hidden = cycle !== "yearly";
    elements["obligation-interval-field"].hidden = cycle !== "after_days";
    syncDateControls();
  }

  function syncObligationCompletionFields() {
    const mode = elements["obligation-completion-mode"].value;
    elements["obligation-payment-method-field"].hidden = mode !== "expense";
    elements["obligation-transfer-fields"].hidden = mode !== "transfer";
  }

  function resetObligationForm({ close = false } = {}) {
    editingObligationId = null;
    editingEventId = null;
    elements["obligation-form"].reset();
    elements["obligation-cycle-day"].value = "1";
    elements["obligation-cycle-month"].value = "1";
    elements["obligation-interval"].value = "1";
    elements["obligation-reminder-days"].value = "15";
    elements["obligation-threshold"].value = "10000";
    elements["obligation-payment-method"].value = "bank";
    elements["obligation-form-title"].textContent = "Task details";
    elements["obligation-submit"].textContent = "Save task";
    elements["cancel-obligation-edit"].hidden = false;
    syncObligationCycleFields();
    syncObligationCompletionFields();
    if (close) {
      elements["obligation-form"].hidden = true;
      expandedTaskKey = null;
    }
  }

  function openObligationEditor(obligationId, eventId = null) {
    const obligation = state.obligations.find(item => item.id === obligationId);
    if (!obligation) return;
    const currentEvent = state.events.find(item => item.id === eventId && item.status === "pending")
      || state.events.find(item => item.obligationId === obligationId && item.status === "pending")
      || null;
    editingObligationId = obligation.id;
    editingEventId = currentEvent?.id || null;
    elements["obligation-name"].value = obligation.name;
    elements["obligation-cycle"].value = obligation.cycle.type;
    elements["obligation-due"].value = currentEvent?.dueDate || "";
    elements["obligation-cycle-day"].value = String(obligation.cycle.day || 1);
    elements["obligation-cycle-month"].value = String(obligation.cycle.month || 1);
    elements["obligation-interval"].value = String(obligation.cycle.days || 1);
    elements["obligation-amount"].value = obligation.amount ?? "";
    elements["obligation-handling"].value = obligation.handling;
    elements["obligation-completion-mode"].value = obligation.completionMode;
    elements["obligation-payment-method"].value = obligation.paymentMethod;
    elements["obligation-status"].value = obligation.status === "frozen" ? "frozen" : "active";
    elements["obligation-note"].value = obligation.note || "";
    elements["obligation-last-mileage"].value = obligation.service.lastServiceMileage ?? "";
    elements["obligation-current-mileage"].value = obligation.service.currentMileage ?? "";
    elements["obligation-mileage-updated"].value = obligation.service.mileageUpdatedAt ? String(obligation.service.mileageUpdatedAt).slice(0, 10) : "";
    elements["obligation-reminder-days"].value = String(obligation.service.reminderDays || 15);
    elements["obligation-threshold"].value = String(obligation.service.thresholdKm || 10000);
    elements["obligation-form-title"].textContent = "Edit task";
    elements["obligation-submit"].textContent = "Save changes";
    elements["cancel-obligation-edit"].hidden = false;
    elements["obligation-form"].hidden = false;
    syncObligationCycleFields();
    syncObligationCompletionFields();
    elements["obligation-form"].scrollIntoView({ behavior: "smooth", block: "start" });
    elements["obligation-name"].focus({ preventScroll: true });
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
      runDataChange(() => dataStore.updateSettings({ monthlyIncomeTarget: Math.max(0, Number(event.target.value) || 0) }));
    });

    elements["settings-radar-days"].addEventListener("input", event => {
      runDataChange(() => dataStore.updateSettings({ radarDays: Math.max(0, Number(event.target.value) || 0) }));
      renderRadar();
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

    elements["money-radar-list"].addEventListener("click", event => {
      const complete = event.target.closest("[data-complete-event]");
      const mileage = event.target.closest("[data-update-mileage]");
      if (mileage) {
        openMileageEditor(mileage.dataset.updateMileage, mileage);
      } else if (complete && runDataChange(() => dataStore.completeEvent(complete.dataset.completeEvent, { completedDate: todayKey }))) {
        renderMoney();
        showToast("Marked done");
      }
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

    elements["cancel-obligation-edit"].addEventListener("click", () => {
      resetObligationForm({ close: true });
      renderCommitments();
    });

    elements["obligation-cycle"].addEventListener("change", syncObligationCycleFields);
    elements["obligation-completion-mode"].addEventListener("change", syncObligationCompletionFields);
    elements["obligation-amount"].addEventListener("input", () => {
      if (elements["obligation-completion-mode"].value === "transfer") return;
      elements["obligation-completion-mode"].value = elements["obligation-amount"].value === "" ? "none" : "expense";
      syncObligationCompletionFields();
    });
    elements["obligation-handling"].addEventListener("change", () => {
      elements["obligation-payment-method"].value = elements["obligation-handling"].value === "auto" ? "card" : "bank";
    });

    elements["quick-task-form"].addEventListener("submit", event => {
      event.preventDefault();
      const name = elements["quick-task-name"].value.trim();
      if (!name) {
        showToast("Enter a task name");
        elements["quick-task-name"].focus();
        return;
      }
      let created = null;
      const saved = runDataChange(() => {
        created = dataStore.addObligation({ name, cycle: { type: "none" }, amount: null, handling: "manual", completionMode: "none", paymentMethod: "bank", status: "active", note: "" }, null);
      });
      if (!saved || !created) return;
      elements["quick-task-name"].value = "";
      renderCommitments();
      openObligationEditor(created.obligation.id, created.event.id);
      showToast("Task added — add details");
    });

    elements["obligation-form"].addEventListener("submit", event => {
      event.preventDefault();
      const cycleType = elements["obligation-cycle"].value;
      const dueDate = elements["obligation-due"].value || null;
      const completionMode = elements["obligation-completion-mode"].value;
      if (completionMode === "transfer" && state.obligations.some(item => item.id !== editingObligationId && item.completionMode === "transfer" && item.status !== "archived")) {
        showToast("Card payment is the only transfer obligation and already exists.", 5000);
        return;
      }
      const cycle = {
        type: cycleType,
        day: Math.min(31, Math.max(1, Number(elements["obligation-cycle-day"].value) || 1)),
        month: Math.min(12, Math.max(1, Number(elements["obligation-cycle-month"].value) || 1)),
        days: Math.max(1, Number(elements["obligation-interval"].value) || 1)
      };
      const amount = elements["obligation-amount"].value === "" ? null : Math.max(0, Number(elements["obligation-amount"].value) || 0);
      const obligation = {
        name: elements["obligation-name"].value.trim() || "UNNAMED",
        cycle,
        amount,
        handling: elements["obligation-handling"].value,
        completionMode,
        paymentMethod: elements["obligation-payment-method"].value,
        transferFromAccountId: "main",
        transferToAccountId: "card",
        status: elements["obligation-status"].value,
        note: elements["obligation-note"].value.trim(),
        service: {
          lastServiceMileage: elements["obligation-last-mileage"].value || null,
          currentMileage: elements["obligation-current-mileage"].value || null,
          mileageUpdatedAt: elements["obligation-mileage-updated"].value || null,
          reminderDays: Number(elements["obligation-reminder-days"].value) || 15,
          thresholdKm: Number(elements["obligation-threshold"].value) || 10000
        }
      };
      const wasEditing = Boolean(editingObligationId);
      if (wasEditing) {
        const obligationId = editingObligationId;
        const eventId = editingEventId;
        runDataChange(() => {
          dataStore.updateObligation(obligationId, obligation);
          if (eventId) dataStore.updateEvent(eventId, { dueDate: cycleType === "none" || cycleType === "mileage" ? null : dueDate });
        });
      } else {
        runDataChange(() => dataStore.addObligation(obligation, cycleType === "none" || cycleType === "mileage" ? null : dueDate));
      }
      resetObligationForm({ close: true });
      renderCommitments();
      renderMoney();
      showToast(wasEditing ? "Obligation updated" : "Obligation added");
    });

    const projectsPage = document.getElementById("page-projects");
    projectsPage.addEventListener("input", event => {
      const row = event.target.closest("[data-event-id]");
      if (row && event.target.dataset.eventField === "actualAmount") {
        const value = event.target.value === "" ? null : Math.max(0, Number(event.target.value) || 0);
        runDataChange(() => dataStore.updateEvent(row.dataset.eventId, { actualAmount: value }));
      }
      const book = event.target.closest("[data-book-id]");
      if (book && event.target.dataset.bookField) {
        runDataChange(() => dataStore.updateBook(book.dataset.bookId, { [event.target.dataset.bookField]: event.target.value }));
      }
    });
    projectsPage.addEventListener("change", event => {
      if (event.target.dataset.bookField === "status") renderBooks();
    });
    projectsPage.addEventListener("click", event => {
      const toggleTask = event.target.closest("[data-toggle-task]");
      const toggleBook = event.target.closest("[data-toggle-book]");
      const complete = event.target.closest("[data-complete-event]");
      const edit = event.target.closest("[data-edit-obligation]");
      const mileage = event.target.closest("[data-update-mileage]");
      const freeze = event.target.closest("[data-freeze-obligation]");
      const archive = event.target.closest("[data-archive-obligation]");
      const unfreeze = event.target.closest("[data-unfreeze-obligation]");
      const undo = event.target.closest("[data-undo-event]");
      const removeBook = event.target.closest("[data-remove-book]");
      if (toggleTask) {
        expandedTaskKey = expandedTaskKey === toggleTask.dataset.toggleTask ? null : toggleTask.dataset.toggleTask;
        renderCommitments();
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
      if (edit) {
        openObligationEditor(edit.dataset.editObligation, edit.closest("[data-event-id]")?.dataset.eventId || null);
        return;
      } else if (mileage) {
        openMileageEditor(mileage.dataset.updateMileage, mileage);
        return;
      } else if (complete) {
        const row = complete.closest("[data-event-id]");
        const amountInput = row?.querySelector("[data-event-field='actualAmount']");
        const actualAmount = amountInput?.value === "" ? null : Number(amountInput?.value);
        runDataChange(() => dataStore.completeEvent(complete.dataset.completeEvent, { completedDate: todayKey, actualAmount }));
        expandedTaskKey = null;
        showToast("Marked done");
      } else if (freeze) {
        runDataChange(() => dataStore.updateObligation(freeze.dataset.freezeObligation, { status: "frozen" }));
        expandedTaskKey = null;
        showToast("Frozen");
      } else if (archive) {
        runDataChange(() => dataStore.updateObligation(archive.dataset.archiveObligation, { status: "archived" }));
        expandedTaskKey = null;
        showToast("Archived");
      } else if (unfreeze) {
        runDataChange(() => dataStore.updateObligation(unfreeze.dataset.unfreezeObligation, { status: "active" }));
        expandedTaskKey = null;
        showToast("Unfrozen");
      } else if (undo) {
        runDataChange(() => dataStore.undoEvent(undo.dataset.undoEvent));
        showToast("Undone");
      } else {
        return;
      }
      renderCommitments();
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
      renderCommitments();
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
