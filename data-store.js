(() => {
  "use strict";

  const DEFAULT_STORAGE_KEY = "lifeCalibrationData";
  const DAY_FIELD_PATHS = new Set([
    "sleep.bedtime",
    "sleep.wakeTime",
    "recovery.activity",
    "recovery.effect",
    "note"
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function create({ core, storage = globalThis.localStorage, storageKey = DEFAULT_STORAGE_KEY, now = () => new Date(), onError = () => {} } = {}) {
    if (!core) throw new Error("資料模組缺少核心函式。");
    if (!storage) throw new Error("目前環境沒有可用的本機儲存空間。");

    function timestamp() {
      const value = now();
      return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    }

    function load() {
      try {
        const raw = storage.getItem(storageKey);
        return raw ? core.normalizeState(JSON.parse(raw)) : core.createEmptyState(new Date(timestamp()));
      } catch (error) {
        onError("讀取本機資料失敗", error);
        return core.createEmptyState(new Date(timestamp()));
      }
    }

    let state = load();

    function persist(dayKey = null) {
      if (dayKey && state.days[dayKey]) state.days[dayKey].updatedAt = timestamp();
      try {
        storage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        onError("儲存本機資料失敗", error);
        throw error;
      }
    }

    function ensureDay(dayKey) {
      if (!state.days[dayKey]) state.days[dayKey] = core.createEmptyDay();
      return state.days[dayKey];
    }

    function trackCategory(transaction, increment = true) {
      if (transaction.type !== "expense") return;
      const name = String(transaction.category || "").trim();
      if (!name) return;
      let category = state.categories.find(item => item.name === name);
      if (!category) {
        category = { id: core.uid("category"), name, active: true, useCount: 0, lastAmount: null, lastUsedAt: null };
        state.categories.push(category);
      }
      if (increment) category.useCount += 1;
      category.lastAmount = Number(transaction.amount) || 0;
      category.lastUsedAt = transaction.occurredOn || null;
    }

    function readState() {
      return clone(state);
    }

    function readDay(dayKey) {
      return clone(state.days[dayKey] || core.createEmptyDay());
    }

    function writeDayField(dayKey, fieldPath, value) {
      if (!DAY_FIELD_PATHS.has(fieldPath)) throw new Error(`不支援的每日欄位：${fieldPath}`);
      const day = ensureDay(dayKey);
      const parts = fieldPath.split(".");
      if (parts.length === 1) day[parts[0]] = value;
      else day[parts[0]][parts[1]] = value;
      persist(dayKey);
      return readDay(dayKey);
    }

    function addWorkSession(dayKey, session) {
      ensureDay(dayKey).workSessions.push(clone(session));
      persist(dayKey);
      return readDay(dayKey);
    }

    function updateWorkSession(dayKey, sessionId, changes) {
      const session = ensureDay(dayKey).workSessions.find(item => item.id === sessionId);
      if (!session) return false;
      ["start", "end"].forEach(field => {
        if (Object.prototype.hasOwnProperty.call(changes, field)) session[field] = changes[field];
      });
      persist(dayKey);
      return true;
    }

    function deleteWorkSession(dayKey, sessionId) {
      const day = ensureDay(dayKey);
      day.workSessions = day.workSessions.filter(item => item.id !== sessionId);
      persist(dayKey);
      return readDay(dayKey);
    }

    function addTransaction(dayKey, transaction) {
      const entry = core.normalizeTransaction(transaction, dayKey);
      entry.category = String(entry.category || "").trim();
      ensureDay(dayKey).transactions.push(entry);
      trackCategory(entry);
      persist(dayKey);
      return clone(entry);
    }

    function updateTransaction(dayKey, transactionId, changes) {
      const transaction = ensureDay(dayKey).transactions.find(item => item.id === transactionId);
      if (!transaction) return false;
      ["type", "amount", "category", "title", "note", "paymentMethod", "accountId", "incomeSource", "fromAccountId", "toAccountId", "eventId"].forEach(field => {
        if (Object.prototype.hasOwnProperty.call(changes, field)) transaction[field] = changes[field];
      });
      trackCategory(transaction, false);
      persist(dayKey);
      return true;
    }

    function deleteTransaction(dayKey, transactionId) {
      const day = ensureDay(dayKey);
      day.transactions = day.transactions.filter(item => item.id !== transactionId);
      const linkedEvent = state.events.find(item => item.transactionId === transactionId);
      if (linkedEvent) linkedEvent.transactionId = "";
      persist(dayKey);
      return readDay(dayKey);
    }

    function addProject(project) {
      state.projects.push(clone(project));
      persist();
      return clone(project);
    }

    function updateProject(projectId, changes) {
      const project = state.projects.find(item => item.id === projectId);
      if (!project) return false;
      ["name", "status", "nextStep"].forEach(field => {
        if (Object.prototype.hasOwnProperty.call(changes, field)) project[field] = changes[field];
      });
      project.updatedAt = timestamp();
      persist();
      return true;
    }

    function deleteProject(projectId) {
      state.projects = state.projects.filter(item => item.id !== projectId);
      persist();
      return readState().projects;
    }

    function addObligation(obligation, dueDate = null) {
      const entry = core.normalizeObligation({ ...obligation, id: obligation.id || core.uid("obligation"), createdAt: obligation.createdAt || timestamp(), updatedAt: timestamp() });
      state.obligations.push(entry);
      const event = core.normalizeEvent({ id: core.uid("event"), obligationId: entry.id, dueDate, status: "pending" });
      state.events.push(event);
      persist();
      return { obligation: clone(entry), event: clone(event) };
    }

    function updateObligation(obligationId, changes) {
      const index = state.obligations.findIndex(item => item.id === obligationId);
      if (index < 0) return false;
      state.obligations[index] = core.normalizeObligation({ ...state.obligations[index], ...clone(changes), updatedAt: timestamp() });
      persist();
      return true;
    }

    function updateEvent(eventId, changes) {
      const event = state.events.find(item => item.id === eventId);
      if (!event) return false;
      ["dueDate", "actualAmount"].forEach(field => {
        if (Object.prototype.hasOwnProperty.call(changes, field)) event[field] = changes[field];
      });
      persist();
      return true;
    }

    function completeEvent(eventId, options = {}) {
      const result = core.completeEvent(state, eventId, { ...options, completedAt: options.completedAt || timestamp() });
      if (!result.changed) return false;
      state = result.state;
      persist();
      return true;
    }

    function undoEvent(eventId) {
      const result = core.undoEventCompletion(state, eventId);
      if (!result.changed) return false;
      state = result.state;
      persist();
      return true;
    }

    function runAutoPayments(todayKey) {
      const result = core.runAutoPayments(state, todayKey);
      state = result.state;
      if (result.completedEventIds.length) persist();
      return clone(result.completedEventIds);
    }

    function updateAccount(accountId, changes) {
      const account = state.accounts.find(item => item.id === accountId);
      if (!account) return false;
      ["name", "startingBalance", "active"].forEach(field => {
        if (Object.prototype.hasOwnProperty.call(changes, field)) account[field] = changes[field];
      });
      persist();
      return true;
    }

    function addCategory(name) {
      const value = String(name || "").trim();
      if (!value) return null;
      const existing = state.categories.find(item => item.name === value);
      if (existing) {
        existing.active = true;
        persist();
        return clone(existing);
      }
      const category = { id: core.uid("category"), name: value, active: true, useCount: 0, lastAmount: null, lastUsedAt: null };
      state.categories.push(category);
      persist();
      return clone(category);
    }

    function updateCategory(categoryId, changes) {
      const category = state.categories.find(item => item.id === categoryId);
      if (!category) return false;
      if (Object.prototype.hasOwnProperty.call(changes, "name")) {
        const oldName = category.name;
        const newName = String(changes.name || "").trim();
        if (newName) {
          category.name = newName;
          Object.values(state.days).forEach(day => day.transactions.forEach(transaction => {
            if (transaction.category === oldName) transaction.category = newName;
          }));
          state.obligations.forEach(obligation => {
            if (obligation.category === oldName) obligation.category = newName;
          });
        }
      }
      if (Object.prototype.hasOwnProperty.call(changes, "active")) category.active = Boolean(changes.active);
      persist();
      return true;
    }

    function addBook(book) {
      const entry = { id: book.id || core.uid("book"), name: String(book.name || "未命名"), status: ["current", "queued", "frozen", "finished"].includes(book.status) ? book.status : "queued" };
      state.books.push(entry);
      persist();
      return clone(entry);
    }

    function updateBook(bookId, changes) {
      const book = state.books.find(item => item.id === bookId);
      if (!book) return false;
      ["name", "status"].forEach(field => {
        if (Object.prototype.hasOwnProperty.call(changes, field)) book[field] = changes[field];
      });
      persist();
      return true;
    }

    function addScheduleItem(item) {
      const entry = { id: item.id || core.uid("schedule"), weekday: Math.min(7, Math.max(1, Number(item.weekday) || 1)), start: item.start || "", end: item.end || "", name: String(item.name || "") };
      state.schedule.push(entry);
      persist();
      return clone(entry);
    }

    function updateSettings(changes) {
      if (Object.prototype.hasOwnProperty.call(changes, "radarDays")) state.settings.radarDays = Math.max(0, Number(changes.radarDays) || 0);
      if (Object.prototype.hasOwnProperty.call(changes, "monthlyIncomeTarget")) state.settings.monthlyIncomeTarget = Math.max(0, Number(changes.monthlyIncomeTarget) || 0);
      persist();
      return clone(state.settings);
    }

    function setStatementAmount(monthKey, amount) {
      state.statements[monthKey] = Math.max(0, Number(amount) || 0);
      persist();
      return state.statements[monthKey];
    }

    function snoozeBackupReminder(dayKey) {
      state.meta.backupSnoozedDate = dayKey;
      persist();
    }

    function markExported() {
      state.meta.lastExportAt = timestamp();
      state.meta.backupSnoozedDate = null;
      persist();
      return state.meta.lastExportAt;
    }

    function touchOpened() {
      state.meta.lastOpenedAt = timestamp();
      persist();
    }

    function exportJson() {
      return JSON.stringify(state, null, 2);
    }

    function exportCsv() {
      return core.buildCsv(state);
    }

    function importState(value) {
      const validation = core.validateImportedState(value);
      if (!validation.valid) throw new Error(validation.reason);
      const imported = core.normalizeState(value);
      const previous = state;
      try {
        state = imported;
        persist();
      } catch (error) {
        state = previous;
        throw error;
      }
      return readState();
    }

    function clear() {
      state = core.createEmptyState(new Date(timestamp()));
      storage.removeItem(storageKey);
      persist();
      return readState();
    }

    return Object.freeze({
      readState,
      readDay,
      writeDayField,
      addWorkSession,
      updateWorkSession,
      deleteWorkSession,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addProject,
      updateProject,
      deleteProject,
      addObligation,
      updateObligation,
      updateEvent,
      completeEvent,
      undoEvent,
      runAutoPayments,
      updateAccount,
      addCategory,
      updateCategory,
      addBook,
      updateBook,
      addScheduleItem,
      updateSettings,
      setStatementAmount,
      snoozeBackupReminder,
      markExported,
      touchOpened,
      exportJson,
      exportCsv,
      importState,
      clear,
      storageKey
    });
  }

  globalThis.LifeCalibrationData = Object.freeze({ create });
})();
