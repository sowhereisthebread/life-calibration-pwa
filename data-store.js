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

    function trackCustomCategory(category) {
      const value = String(category || "").trim();
      if (!value || core.DEFAULT_CATEGORIES.includes(value)) return;
      if (!state.customCategories.includes(value)) state.customCategories.push(value);
      state.lastCustomCategory = value;
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
      const entry = clone(transaction);
      entry.category = String(entry.category || "").trim();
      ensureDay(dayKey).transactions.push(entry);
      trackCustomCategory(entry.category);
      persist(dayKey);
      return clone(entry);
    }

    function updateTransaction(dayKey, transactionId, changes) {
      const transaction = ensureDay(dayKey).transactions.find(item => item.id === transactionId);
      if (!transaction) return false;
      ["type", "amount", "category", "note"].forEach(field => {
        if (Object.prototype.hasOwnProperty.call(changes, field)) transaction[field] = changes[field];
      });
      trackCustomCategory(transaction.category);
      persist(dayKey);
      return true;
    }

    function deleteTransaction(dayKey, transactionId) {
      const day = ensureDay(dayKey);
      day.transactions = day.transactions.filter(item => item.id !== transactionId);
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
