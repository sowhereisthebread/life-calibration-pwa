(() => {
  "use strict";

  const DATA_VERSION = 2;
  const SUPPORTED_IMPORT_VERSIONS = [1, 2];
  const DEFAULT_CATEGORY_NAMES = ["吃飯", "咖啡", "加油", "交通", "衣物", "生活", "醫療", "其他"];
  const DEFAULT_ACCOUNTS = [
    { id: "main", name: "主帳戶", kind: "main" },
    { id: "cash", name: "現金", kind: "cash" },
    { id: "card", name: "信用卡", kind: "card" }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function uid(prefix = "item") {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function localDateKey(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  function dateFromKey(key) {
    return new Date(`${key}T12:00:00`);
  }

  function validDateKey(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(dateFromKey(value).getTime());
  }

  function numberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : null;
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

  function createDefaultCategories() {
    return DEFAULT_CATEGORY_NAMES.map((name, index) => ({
      id: `category-${index + 1}`,
      name,
      active: true,
      useCount: 0,
      lastAmount: null,
      lastUsedAt: null
    }));
  }

  function createDefaultAccounts() {
    return DEFAULT_ACCOUNTS.map(account => ({ ...account, startingBalance: 0, active: true }));
  }

  function createEmptyState(now = new Date()) {
    const timestamp = (now instanceof Date ? now : new Date(now)).toISOString();
    return {
      version: DATA_VERSION,
      days: {},
      projects: [],
      obligations: [],
      events: [],
      accounts: createDefaultAccounts(),
      categories: createDefaultCategories(),
      books: [],
      schedule: [],
      settings: { radarDays: 7, monthlyIncomeTarget: 60000 },
      statements: {},
      meta: {
        createdAt: timestamp,
        lastOpenedAt: timestamp,
        lastExportAt: null,
        backupSnoozedDate: null
      }
    };
  }

  function normalizeTransaction(raw, dayKey = "") {
    const type = ["income", "expense", "transfer"].includes(raw?.type) ? raw.type : "expense";
    return {
      ...(raw && typeof raw === "object" ? raw : {}),
      id: String(raw?.id || uid("transaction")),
      type,
      amount: numberOrNull(raw?.amount) ?? 0,
      category: String(raw?.category || ""),
      title: String(raw?.title ?? raw?.note ?? ""),
      note: String(raw?.note || ""),
      paymentMethod: ["card", "cash", "bank"].includes(raw?.paymentMethod) ? raw.paymentMethod : "",
      accountId: String(raw?.accountId || ""),
      incomeSource: String(raw?.incomeSource || ""),
      fromAccountId: String(raw?.fromAccountId || ""),
      toAccountId: String(raw?.toAccountId || ""),
      eventId: String(raw?.eventId || ""),
      occurredOn: validDateKey(raw?.occurredOn) ? raw.occurredOn : dayKey
    };
  }

  function normalizeDay(rawDay, dayKey) {
    const base = createEmptyDay();
    const raw = rawDay && typeof rawDay === "object" ? rawDay : {};
    return {
      ...base,
      ...raw,
      sleep: { ...base.sleep, ...(raw.sleep && typeof raw.sleep === "object" ? raw.sleep : {}) },
      workSessions: Array.isArray(raw.workSessions) ? clone(raw.workSessions) : [],
      transactions: Array.isArray(raw.transactions) ? raw.transactions.map(item => normalizeTransaction(item, dayKey)) : [],
      recovery: { ...base.recovery, ...(raw.recovery && typeof raw.recovery === "object" ? raw.recovery : {}) },
      note: String(raw.note || "")
    };
  }

  function normalizeCycle(raw) {
    const type = ["monthly", "yearly", "after_days", "mileage", "once", "none"].includes(raw?.type) ? raw.type : "none";
    return {
      type,
      day: Math.min(31, Math.max(1, Number(raw?.day) || 1)),
      month: Math.min(12, Math.max(1, Number(raw?.month) || 1)),
      days: Math.max(1, Number(raw?.days) || 1)
    };
  }

  function normalizeObligation(raw) {
    const handling = raw?.handling === "auto" ? "auto" : "manual";
    const completionMode = ["none", "expense", "transfer"].includes(raw?.completionMode)
      ? raw.completionMode
      : (numberOrNull(raw?.amount) === null ? "none" : "expense");
    return {
      ...(raw && typeof raw === "object" ? raw : {}),
      id: String(raw?.id || uid("obligation")),
      name: String(raw?.name || "未命名待辦"),
      cycle: normalizeCycle(raw?.cycle),
      amount: numberOrNull(raw?.amount),
      handling,
      completionMode,
      paymentMethod: ["card", "cash", "bank"].includes(raw?.paymentMethod)
        ? raw.paymentMethod
        : (handling === "auto" ? "card" : "bank"),
      transferFromAccountId: String(raw?.transferFromAccountId || "main"),
      transferToAccountId: String(raw?.transferToAccountId || "card"),
      category: String(raw?.category || "其他"),
      status: ["active", "frozen", "archived"].includes(raw?.status) ? raw.status : "active",
      note: String(raw?.note || ""),
      service: {
        lastServiceMileage: numberOrNull(raw?.service?.lastServiceMileage),
        currentMileage: numberOrNull(raw?.service?.currentMileage),
        mileageUpdatedAt: raw?.service?.mileageUpdatedAt || null,
        reminderDays: Math.max(1, Number(raw?.service?.reminderDays) || 15),
        thresholdKm: Math.max(1, Number(raw?.service?.thresholdKm) || 10000)
      },
      createdAt: raw?.createdAt || null,
      updatedAt: raw?.updatedAt || null
    };
  }

  function normalizeEvent(raw) {
    return {
      ...(raw && typeof raw === "object" ? raw : {}),
      id: String(raw?.id || uid("event")),
      obligationId: String(raw?.obligationId || ""),
      dueDate: validDateKey(raw?.dueDate) ? raw.dueDate : null,
      status: ["pending", "done", "auto-paid"].includes(raw?.status) ? raw.status : "pending",
      completedAt: raw?.completedAt || null,
      actualAmount: numberOrNull(raw?.actualAmount),
      transactionId: String(raw?.transactionId || ""),
      generatedEventId: String(raw?.generatedEventId || ""),
      previousObligationStatus: String(raw?.previousObligationStatus || ""),
      previousServiceMileage: numberOrNull(raw?.previousServiceMileage)
    };
  }

  function normalizeAccount(raw, fallback = {}) {
    return {
      id: String(raw?.id || fallback.id || uid("account")),
      name: String(raw?.name || fallback.name || "未命名帳戶"),
      kind: ["main", "cash", "card", "other"].includes(raw?.kind) ? raw.kind : (fallback.kind || "other"),
      startingBalance: Number.isFinite(Number(raw?.startingBalance)) ? Number(raw.startingBalance) : 0,
      active: raw?.active !== false
    };
  }

  function normalizeCategory(raw, index = 0) {
    return {
      id: String(raw?.id || `category-${index + 1}`),
      name: String(raw?.name || "其他"),
      active: raw?.active !== false,
      useCount: Math.max(0, Number(raw?.useCount) || 0),
      lastAmount: numberOrNull(raw?.lastAmount),
      lastUsedAt: raw?.lastUsedAt || null
    };
  }

  function refreshCategoryStats(state) {
    const byName = new Map(state.categories.map(category => [category.name, category]));
    Object.entries(state.days).sort(([a], [b]) => a.localeCompare(b)).forEach(([dayKey, day]) => {
      day.transactions.forEach(transaction => {
        if (transaction.type !== "expense" || !transaction.category) return;
        if (!byName.has(transaction.category)) {
          const category = normalizeCategory({ name: transaction.category }, state.categories.length);
          state.categories.push(category);
          byName.set(category.name, category);
        }
        const category = byName.get(transaction.category);
        category.useCount += 1;
        category.lastAmount = transaction.amount;
        category.lastUsedAt = dayKey;
      });
    });
  }

  function normalizeState(value) {
    const empty = createEmptyState();
    if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
    const state = createEmptyState(value.meta?.createdAt ? new Date(value.meta.createdAt) : new Date());

    Object.entries(value.days && typeof value.days === "object" && !Array.isArray(value.days) ? value.days : {}).forEach(([key, day]) => {
      if (validDateKey(key)) state.days[key] = normalizeDay(day, key);
    });
    state.projects = Array.isArray(value.projects) ? clone(value.projects) : [];
    state.obligations = Array.isArray(value.obligations) ? value.obligations.map(normalizeObligation) : [];
    state.events = Array.isArray(value.events) ? value.events.map(normalizeEvent) : [];
    state.accounts = Array.isArray(value.accounts) && value.accounts.length
      ? value.accounts.map(normalizeAccount)
      : createDefaultAccounts();

    if (Array.isArray(value.categories) && value.categories.length) {
      state.categories = value.categories.map(normalizeCategory);
    } else {
      state.categories = createDefaultCategories();
      const legacyNames = [
        ...(Array.isArray(value.customCategories) ? value.customCategories : []),
        ...Object.values(state.days).flatMap(day => day.transactions.map(item => item.category))
      ].filter(Boolean);
      [...new Set(legacyNames)].forEach(name => {
        if (!state.categories.some(category => category.name === name)) {
          state.categories.push(normalizeCategory({ name }, state.categories.length));
        }
      });
      refreshCategoryStats(state);
    }

    state.books = Array.isArray(value.books) ? clone(value.books) : [];
    state.schedule = Array.isArray(value.schedule) ? clone(value.schedule) : [];
    state.settings = {
      radarDays: Math.max(0, Number(value.settings?.radarDays) || 7),
      monthlyIncomeTarget: Math.max(0, Number(value.settings?.monthlyIncomeTarget) || 60000)
    };
    state.statements = value.statements && typeof value.statements === "object" && !Array.isArray(value.statements)
      ? clone(value.statements)
      : {};
    state.meta = {
      ...empty.meta,
      ...(value.meta && typeof value.meta === "object" ? value.meta : {})
    };
    state.version = DATA_VERSION;
    return state;
  }

  function validateImportedState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { valid: false, reason: "檔案內容不是人生主控表資料。" };
    }
    if (!SUPPORTED_IMPORT_VERSIONS.includes(value.version)) {
      return { valid: false, reason: "資料版本不相容。目前支援第 1、2 版。" };
    }
    if (!value.days || typeof value.days !== "object" || Array.isArray(value.days)) {
      return { valid: false, reason: "檔案缺少每日資料。" };
    }
    if (!Array.isArray(value.projects)) {
      return { valid: false, reason: "檔案缺少專案清單。" };
    }
    return { valid: true, reason: "" };
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function dateWithClampedDay(year, monthIndex, day) {
    return localDateKey(new Date(year, monthIndex, Math.min(day, daysInMonth(year, monthIndex)), 12));
  }

  function addDays(dateKey, days) {
    const date = dateFromKey(dateKey);
    date.setDate(date.getDate() + Number(days));
    return localDateKey(date);
  }

  function nextOccurrenceDate(obligation, event, completedDateKey) {
    const cycle = normalizeCycle(obligation?.cycle);
    const anchorKey = validDateKey(event?.dueDate) ? event.dueDate : completedDateKey;
    const anchor = dateFromKey(anchorKey);
    if (cycle.type === "monthly") {
      return dateWithClampedDay(anchor.getFullYear(), anchor.getMonth() + 1, cycle.day);
    }
    if (cycle.type === "yearly") {
      return dateWithClampedDay(anchor.getFullYear() + 1, cycle.month - 1, cycle.day);
    }
    if (cycle.type === "after_days") return addDays(completedDateKey, cycle.days);
    return null;
  }

  function ensureDay(state, dayKey) {
    if (!state.days[dayKey]) state.days[dayKey] = createEmptyDay();
    return state.days[dayKey];
  }

  function createLinkedTransaction(obligation, event, completedDateKey, amount) {
    if (obligation.completionMode === "none") return null;
    if (obligation.completionMode === "transfer") {
      return normalizeTransaction({
        id: uid("transaction"),
        type: "transfer",
        amount,
        title: obligation.name,
        fromAccountId: obligation.transferFromAccountId || "main",
        toAccountId: obligation.transferToAccountId || "card",
        eventId: event.id,
        occurredOn: completedDateKey
      }, completedDateKey);
    }
    return normalizeTransaction({
      id: uid("transaction"),
      type: "expense",
      amount,
      category: obligation.category || "其他",
      title: obligation.name,
      paymentMethod: obligation.paymentMethod || (obligation.handling === "auto" ? "card" : "bank"),
      eventId: event.id,
      occurredOn: completedDateKey
    }, completedDateKey);
  }

  function completeEvent(inputState, eventId, options = {}) {
    const state = normalizeState(inputState);
    const event = state.events.find(item => item.id === eventId);
    if (!event || event.status !== "pending") return { state, changed: false };
    const obligation = state.obligations.find(item => item.id === event.obligationId);
    if (!obligation) return { state, changed: false };

    const completedDateKey = validDateKey(options.completedDate) ? options.completedDate : localDateKey(options.now || new Date());
    const completedAt = options.completedAt || `${completedDateKey}T12:00:00`;
    const amount = numberOrNull(options.actualAmount) ?? obligation.amount ?? 0;
    event.previousObligationStatus = obligation.status;
    event.previousServiceMileage = obligation.service.lastServiceMileage;
    event.status = options.autoPaid ? "auto-paid" : "done";
    event.completedAt = completedAt;
    event.actualAmount = numberOrNull(options.actualAmount) ?? obligation.amount;

    if (!event.transactionId) {
      const transaction = createLinkedTransaction(obligation, event, completedDateKey, amount);
      if (transaction) {
        ensureDay(state, completedDateKey).transactions.push(transaction);
        event.transactionId = transaction.id;
      }
    }

    const nextDueDate = nextOccurrenceDate(obligation, event, completedDateKey);
    if (["monthly", "yearly", "after_days"].includes(obligation.cycle.type)) {
      const nextEvent = normalizeEvent({ obligationId: obligation.id, dueDate: nextDueDate, status: "pending" });
      state.events.push(nextEvent);
      event.generatedEventId = nextEvent.id;
    } else if (obligation.cycle.type === "none" || obligation.cycle.type === "mileage") {
      if (obligation.cycle.type === "mileage") {
        obligation.service.lastServiceMileage = obligation.service.currentMileage;
      }
      const nextEvent = normalizeEvent({ obligationId: obligation.id, dueDate: null, status: "pending" });
      state.events.push(nextEvent);
      event.generatedEventId = nextEvent.id;
    } else if (obligation.cycle.type === "once") {
      obligation.status = "archived";
    }
    obligation.updatedAt = completedAt;
    return { state, changed: true, event: clone(event) };
  }

  function undoEventCompletion(inputState, eventId) {
    const state = normalizeState(inputState);
    const event = state.events.find(item => item.id === eventId);
    if (!event || event.status === "pending") return { state, changed: false };
    const obligation = state.obligations.find(item => item.id === event.obligationId);
    if (event.generatedEventId) state.events = state.events.filter(item => item.id !== event.generatedEventId);
    if (event.transactionId) {
      Object.values(state.days).forEach(day => {
        day.transactions = day.transactions.filter(transaction => transaction.id !== event.transactionId);
      });
    }
    if (obligation) {
      obligation.status = event.previousObligationStatus || "active";
      if (obligation.cycle.type === "mileage") obligation.service.lastServiceMileage = event.previousServiceMileage;
    }
    event.status = "pending";
    event.completedAt = null;
    event.actualAmount = null;
    event.transactionId = "";
    event.generatedEventId = "";
    event.previousObligationStatus = "";
    event.previousServiceMileage = null;
    return { state, changed: true };
  }

  function runAutoPayments(inputState, todayKey = localDateKey()) {
    let state = normalizeState(inputState);
    const completedEventIds = [];
    state.events
      .filter(event => event.status === "pending" && event.dueDate && event.dueDate <= todayKey)
      .forEach(event => {
        const obligation = state.obligations.find(item => item.id === event.obligationId);
        if (!obligation || obligation.status !== "active" || obligation.handling !== "auto") return;
        const result = completeEvent(state, event.id, { completedDate: todayKey, autoPaid: true });
        state = result.state;
        if (result.changed) completedEventIds.push(event.id);
      });
    return { state, completedEventIds };
  }

  function transactionAmount(transaction) {
    return numberOrNull(transaction?.amount) ?? 0;
  }

  function allTransactions(state) {
    return Object.entries(state?.days || {}).flatMap(([dayKey, day]) =>
      (day.transactions || []).map(transaction => ({ ...transaction, occurredOn: transaction.occurredOn || dayKey }))
    );
  }

  function dayIncome(day) {
    return (day?.transactions || []).reduce((total, item) => item.type === "income" ? total + transactionAmount(item) : total, 0);
  }

  function dayExpense(day) {
    return (day?.transactions || []).reduce((total, item) => item.type === "expense" ? total + transactionAmount(item) : total, 0);
  }

  function dayNet(day) {
    return dayIncome(day) - dayExpense(day);
  }

  function monthTransactions(state, monthKey) {
    return allTransactions(state).filter(item => String(item.occurredOn || "").startsWith(monthKey));
  }

  function monthIncome(state, monthKey) {
    return monthTransactions(state, monthKey).reduce((total, item) => item.type === "income" ? total + transactionAmount(item) : total, 0);
  }

  function monthExpense(state, monthKey) {
    return monthTransactions(state, monthKey).reduce((total, item) => item.type === "expense" ? total + transactionAmount(item) : total, 0);
  }

  function accountBalances(state) {
    const balances = Object.fromEntries((state.accounts || []).map(account => [account.id, Number(account.startingBalance) || 0]));
    const paymentAccount = { card: "card", cash: "cash", bank: "main" };
    allTransactions(state).forEach(transaction => {
      const amount = transactionAmount(transaction);
      if (transaction.type === "expense") {
        const accountId = paymentAccount[transaction.paymentMethod];
        if (accountId && Object.prototype.hasOwnProperty.call(balances, accountId)) balances[accountId] -= amount;
      } else if (transaction.type === "income") {
        const accountId = transaction.accountId || "main";
        if (Object.prototype.hasOwnProperty.call(balances, accountId)) balances[accountId] += amount;
      } else if (transaction.type === "transfer") {
        if (Object.prototype.hasOwnProperty.call(balances, transaction.fromAccountId)) balances[transaction.fromAccountId] -= amount;
        if (Object.prototype.hasOwnProperty.call(balances, transaction.toAccountId)) balances[transaction.toAccountId] += amount;
      }
    });
    return balances;
  }

  function previousMonthKey(monthKey) {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month - 2, 1, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function cardStatementGap(state, monthKey, statementAmount) {
    const previous = previousMonthKey(monthKey);
    const recorded = monthTransactions(state, previous).reduce((total, item) =>
      item.type === "expense" && item.paymentMethod === "card" ? total + transactionAmount(item) : total, 0);
    return { statementAmount: numberOrNull(statementAmount) ?? 0, recorded, gap: (numberOrNull(statementAmount) ?? 0) - recorded };
  }

  function categoryRanking(state, monthKey) {
    const totals = new Map();
    monthTransactions(state, monthKey).forEach(item => {
      if (item.type !== "expense") return;
      const name = item.category || "其他";
      totals.set(name, (totals.get(name) || 0) + transactionAmount(item));
    });
    const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount, percent: total ? amount / total * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }

  function orderedCategories(state) {
    return (state.categories || []).map((category, index) => ({ category, index }))
      .filter(item => item.category.active)
      .sort((a, b) => (b.category.useCount || 0) - (a.category.useCount || 0) || a.index - b.index)
      .map(item => item.category);
  }

  function hasDayRecord(day) {
    return Boolean(day && (
      day.sleep?.bedtime || day.sleep?.wakeTime || day.workSessions?.length || day.transactions?.length ||
      day.recovery?.activity || day.recovery?.effect || day.note
    ));
  }

  function hasAnyDataInState(state) {
    return Boolean(state && (
      state.projects?.length || state.obligations?.length || state.books?.length || state.schedule?.length ||
      Object.values(state.days || {}).some(hasDayRecord)
    ));
  }

  function shouldShowBackupReminder(state, dateKey = localDateKey(), now = Date.now()) {
    if (!hasAnyDataInState(state) || state.meta?.backupSnoozedDate === dateKey) return false;
    const reference = state.meta?.lastExportAt || state.meta?.createdAt;
    const elapsed = reference ? now - new Date(reference).getTime() : Infinity;
    return !Number.isFinite(elapsed) || elapsed >= 7 * 24 * 60 * 60 * 1000;
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
      if (!session?.start || !session?.end) return total;
      return total + (durationBetweenTimes(session.start, session.end) ?? 0);
    }, 0);
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
    let sleepTotal = 0;
    let sleepCount = 0;
    let totalWork = 0;
    let totalExpense = 0;
    let recordedDays = 0;
    const rows = reviewDateKeys(anchorKey).map(date => {
      const day = state.days[date] || createEmptyDay();
      const sleep = durationBetweenTimes(day.sleep?.bedtime, day.sleep?.wakeTime);
      const work = workMinutes(day.workSessions);
      const income = dayIncome(day);
      const expense = dayExpense(day);
      if (sleep !== null) { sleepTotal += sleep; sleepCount += 1; }
      totalWork += work;
      totalExpense += expense;
      if (hasDayRecord(day)) recordedDays += 1;
      return { date, sleep, work, income, expense, net: income - expense, recovery: day.recovery?.effect || "" };
    });
    return { rows, averageSleep: sleepCount ? Math.round(sleepTotal / sleepCount) : null, totalWork, totalExpense, recordedDays };
  }

  function radarItems(state, todayKey = localDateKey()) {
    const today = dateFromKey(todayKey);
    const ahead = Math.max(0, Number(state.settings?.radarDays) || 7);
    const items = [];
    state.events.filter(event => event.status === "pending").forEach(event => {
      const obligation = state.obligations.find(item => item.id === event.obligationId);
      if (!obligation || obligation.status !== "active" || obligation.handling === "auto" || !event.dueDate) return;
      const diff = Math.round((dateFromKey(event.dueDate) - today) / 86400000);
      if (diff < 0) items.push({ kind: "overdue", priority: 0, diff, event, obligation });
      else if (diff === 0) items.push({ kind: "today", priority: 1, diff, event, obligation });
      else if (diff <= ahead) items.push({ kind: "soon", priority: 2, diff, event, obligation });
    });
    state.obligations.filter(item => item.status === "active" && item.cycle.type === "mileage").forEach(obligation => {
      const service = obligation.service;
      if (service.currentMileage !== null && service.lastServiceMileage !== null && service.currentMileage - service.lastServiceMileage >= service.thresholdKm) {
        items.push({ kind: "service-due", priority: 1, obligation });
      } else if (service.mileageUpdatedAt) {
        const updatedKey = localDateKey(new Date(service.mileageUpdatedAt));
        const diff = Math.floor((today - dateFromKey(updatedKey)) / 86400000);
        if (diff > service.reminderDays) items.push({ kind: "update-mileage", priority: 3, obligation, diff });
      }
    });
    return items.sort((a, b) => a.priority - b.priority || String(a.event?.dueDate || "").localeCompare(String(b.event?.dueDate || "")));
  }

  function csvEscape(value) {
    const text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function buildCsv(state) {
    const rows = [["資料類型", "日期", "識別碼", "名稱", "狀態或種類", "金額", "明細"]];
    Object.entries(state.days).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, day]) => {
      rows.push(["每日", date, "", "", "", "", { sleep: day.sleep, recovery: day.recovery, note: day.note }]);
      day.workSessions.forEach(item => rows.push(["工作段", date, item.id, "", "", "", item]));
      day.transactions.forEach(item => rows.push(["交易", date, item.id, item.title || item.category, item.type, item.amount, item]));
    });
    [
      ["專案", state.projects], ["義務", state.obligations], ["事件", state.events], ["帳戶", state.accounts],
      ["分類", state.categories], ["書單", state.books], ["課表", state.schedule]
    ].forEach(([type, list]) => list.forEach(item => rows.push([type, "", item.id || "", item.name || "", item.status || item.kind || "", item.amount ?? item.startingBalance ?? "", item])));
    rows.push(["設定", "", "", "", "", "", state.settings]);
    Object.entries(state.statements).forEach(([month, amount]) => rows.push(["帳單", month, "", "", "", amount, ""]));
    return rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
  }

  function formatMinutes(minutes) {
    if (minutes === null || minutes === undefined) return "—";
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes % 60);
    if (!hours) return `${remainder} 分`;
    if (!remainder) return `${hours} 小時`;
    return `${hours} 小時 ${remainder} 分`;
  }

  globalThis.LifeCalibrationCore = Object.freeze({
    DATA_VERSION,
    SUPPORTED_IMPORT_VERSIONS: [...SUPPORTED_IMPORT_VERSIONS],
    DEFAULT_CATEGORY_NAMES: [...DEFAULT_CATEGORY_NAMES],
    DEFAULT_CATEGORIES: [...DEFAULT_CATEGORY_NAMES],
    DEFAULT_ACCOUNTS: clone(DEFAULT_ACCOUNTS),
    clone,
    uid,
    localDateKey,
    dateFromKey,
    createEmptyDay,
    createEmptyState,
    normalizeTransaction,
    normalizeObligation,
    normalizeEvent,
    normalizeState,
    validateImportedState,
    nextOccurrenceDate,
    completeEvent,
    undoEventCompletion,
    runAutoPayments,
    transactionAmount,
    allTransactions,
    dayIncome,
    dayExpense,
    dayNet,
    monthIncome,
    monthExpense,
    monthTransactions,
    accountBalances,
    previousMonthKey,
    cardStatementGap,
    categoryRanking,
    orderedCategories,
    hasDayRecord,
    hasAnyDataInState,
    shouldShowBackupReminder,
    timeToMinutes,
    durationBetweenTimes,
    workMinutes,
    reviewDateKeys,
    summarizeReview,
    radarItems,
    csvEscape,
    buildCsv,
    formatMinutes
  });
})();
