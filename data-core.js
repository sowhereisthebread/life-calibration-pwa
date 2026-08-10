(() => {
  "use strict";

  const DATA_VERSION = 5;
  const SUPPORTED_IMPORT_VERSIONS = [1, 2, 3, 4, 5];
  // 有 Repeat 才是循環 Task；沒有 Repeat（none／舊 once）＝單次 Task，完成即結束。
  const REPEAT_CYCLE_TYPES = ["monthly", "yearly", "after_days", "mileage"];
  // Auto payment 是「依穩定規則自動發生」的財務規則，因此只認這三種週期。
  const AUTO_PAYMENT_CYCLE_TYPES = ["monthly", "yearly", "after_days"];
  // catch-up 的硬上限：壞資料造成 recurrence 不前進時的最後一道防線。
  const AUTO_PAYMENT_MAX_CATCHUP = 600;
  const STARTING_BALANCE_MIGRATION = "v3-starting-balance-to-income";
  const DEFAULT_CATEGORY_NAMES = ["吃飯", "咖啡", "加油", "交通", "衣物", "生活", "醫療", "其他"];
  const DEFAULT_ACCOUNTS = [
    { id: "main", name: "主帳戶", kind: "main" },
    { id: "cash", name: "現金", kind: "cash" },
    { id: "card", name: "信用卡", kind: "card" }
  ];
  const SYSTEM_ACCOUNT_IDS = new Set(DEFAULT_ACCOUNTS.map(account => account.id));

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

  function exportFilename(extension, date = new Date()) {
    const normalizedExtension = String(extension || "").toLowerCase();
    if (!["json", "csv"].includes(normalizedExtension)) throw new Error("不支援的匯出格式。");
    const value = date instanceof Date ? date : new Date(date);
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    return `TAKO_${localDateKey(value)}_${hours}${minutes}.${normalizedExtension}`;
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

  function numberOrDefault(value, fallback, minimum = 0) {
    if (value === "" || value === null || value === undefined) return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, number) : fallback;
  }

  function normalizeWorkRevenue(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function isSystemAccount(accountId) {
    return SYSTEM_ACCOUNT_IDS.has(String(accountId || ""));
  }

  function createEmptyDay() {
    return {
      sleep: { bedtime: "", wakeTime: "" },
      workSessions: [],
      workRevenue: null,
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
    return DEFAULT_ACCOUNTS.map(account => ({ ...account, active: true, system: true }));
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
    // 遷移交易保留舊資料的正負號，才能無損承接信用卡等負期初值。
    const migrationAmount = raw?.migrationMarker?.startsWith(`${STARTING_BALANCE_MIGRATION}:`) && type === "income"
      ? Number(raw?.amount)
      : null;
    return {
      ...(raw && typeof raw === "object" ? raw : {}),
      id: String(raw?.id || uid("transaction")),
      type,
      amount: Number.isFinite(migrationAmount) ? migrationAmount : (numberOrNull(raw?.amount) ?? 0),
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
      workRevenue: normalizeWorkRevenue(raw.workRevenue),
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

  function isRepeatCycle(cycleType) {
    return REPEAT_CYCLE_TYPES.includes(String(cycleType || ""));
  }

  // 完成時的財務後果由前面的意圖唯一推導，不再是自由選單（架構.md 第三章）：
  //   Auto payment（handling=auto）與循環 Task：有 Amount → expense。
  //   沒有 Amount → 不記帳（規則尚未設定完成時不生成 $0 交易）。
  //   單次 Task → 永遠不記帳，即使舊資料留著金額。
  //
  // 舊的 `transfer`（manual Card payment）於 v4 廢止，但**不做破壞性改寫**：
  // 原值 `"transfer"` 原封不動留在 completionMode 當作一個惰性的 legacy 狀態，
  // 使用者原本填的 `amount` 也完整保留。所有會產生後果的地方都只認 `"expense"`，
  // 因此 legacy transfer 既不會變成 expense、也不會恢復生成移轉交易；
  // 新 UI 沒有任何入口能再選到它，`taskEditorFields()` 也不對它顯示 Amount／Paid from。
  // 這個策略可逆：使用者的原始值一直在資料與匯出檔裡，隨時能還原。
  function isLegacyTransfer(obligation) {
    return obligation?.completionMode === "transfer";
  }

  function normalizeObligation(raw) {
    const handling = raw?.handling === "auto" ? "auto" : "manual";
    const cycle = normalizeCycle(raw?.cycle);
    // Auto payment 一律走推導路徑；legacy transfer 只可能是舊的 manual 卡費繳款。
    const legacyTransfer = raw?.completionMode === "transfer" && handling !== "auto";
    const amount = numberOrNull(raw?.amount);
    const completionMode = legacyTransfer
      ? "transfer"
      : (amount !== null && (handling === "auto" || isRepeatCycle(cycle.type)) ? "expense" : "none");
    const requestedPaymentMethod = ["card", "cash", "bank"].includes(raw?.paymentMethod) ? raw.paymentMethod : "";
    return {
      ...(raw && typeof raw === "object" ? raw : {}),
      id: String(raw?.id || uid("obligation")),
      name: String(raw?.name || "未命名待辦"),
      cycle,
      amount,
      handling,
      completionMode,
      // 付款來源**沒有預設值**：空字串代表使用者還沒選過。系統不替使用者猜要從哪個帳戶付錢。
      // Auto payment 只支援 BANK／CARD；人工 Task 三種都可以。
      // 舊資料若已是明確的合法值一律原樣保留，不得被清掉。
      paymentMethod: handling === "auto"
        ? (["bank", "card"].includes(requestedPaymentMethod) ? requestedPaymentMethod : "")
        : requestedPaymentMethod,
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
      // Pin 屬 occurrence 層：只繞過 Sleeping，不改 Due、不改提醒窗口、不代表 Priority。
      pinned: raw?.pinned === true,
      completedAt: raw?.completedAt || null,
      actualAmount: numberOrNull(raw?.actualAmount),
      transactionId: String(raw?.transactionId || ""),
      generatedEventId: String(raw?.generatedEventId || ""),
      previousObligationStatus: String(raw?.previousObligationStatus || ""),
      previousServiceMileage: numberOrNull(raw?.previousServiceMileage)
    };
  }

  function normalizeAccount(raw, fallback = {}) {
    const id = String(raw?.id || fallback.id || uid("account"));
    const system = isSystemAccount(id);
    return {
      id,
      name: String(raw?.name || fallback.name || "未命名帳戶"),
      kind: ["main", "cash", "card", "other"].includes(raw?.kind) ? raw.kind : (fallback.kind || "other"),
      active: system ? true : raw?.active !== false,
      system
    };
  }

  function normalizeProject(raw) {
    return {
      ...(raw && typeof raw === "object" ? raw : {}),
      id: String(raw?.id || uid("project")),
      name: String(raw?.name || "未命名專案"),
      status: raw?.status === "paused" ? "paused" : "active",
      nextStep: String(raw?.nextStep || ""),
      updatedAt: raw?.updatedAt || null
    };
  }

  function normalizeBook(raw) {
    return {
      ...(raw && typeof raw === "object" ? raw : {}),
      id: String(raw?.id || uid("book")),
      name: String(raw?.name || "未命名"),
      status: ["current", "queued", "frozen"].includes(raw?.status) ? raw.status : "queued"
    };
  }

  function dateKeyFromValue(value) {
    if (validDateKey(value)) return String(value);
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : localDateKey(date);
  }

  function migrationDateKey(value) {
    const createdAt = dateKeyFromValue(value?.meta?.createdAt);
    if (createdAt) return createdAt;
    const candidates = [
      ...Object.keys(value?.days || {}),
      ...Object.values(value?.days || {}).flatMap(day => (day?.transactions || []).map(item => item?.occurredOn)),
      ...(value?.projects || []).flatMap(item => [item?.createdAt, item?.updatedAt]),
      ...(value?.obligations || []).flatMap(item => [item?.createdAt, item?.updatedAt]),
      ...(value?.events || []).flatMap(item => [item?.dueDate, item?.completedAt]),
      value?.meta?.lastOpenedAt,
      value?.meta?.lastExportAt
    ].map(dateKeyFromValue).filter(Boolean).sort();
    return candidates[0] || localDateKey();
  }

  function migrateStartingBalances(state, source) {
    if (![1, 2].includes(Number(source?.version)) || !Array.isArray(source?.accounts)) return;
    const dayKey = migrationDateKey(source);
    let migrated = false;
    source.accounts.forEach(rawAccount => {
      const accountId = String(rawAccount?.id || "");
      const amount = Number(rawAccount?.startingBalance);
      if (!accountId || !Number.isFinite(amount) || amount === 0 || !state.accounts.some(account => account.id === accountId)) return;
      const migrationMarker = `${STARTING_BALANCE_MIGRATION}:${accountId}`;
      const exists = Object.values(state.days).some(item => item.transactions.some(transaction => transaction.migrationMarker === migrationMarker));
      if (exists) return;
      const day = state.days[dayKey] || (state.days[dayKey] = createEmptyDay());
      day.transactions.push(normalizeTransaction({
        id: `migration-starting-balance-${accountId}`,
        type: "income",
        amount,
        title: "期初金額移轉",
        incomeSource: "期初金額移轉",
        accountId,
        occurredOn: dayKey,
        migrationMarker
      }, dayKey));
      migrated = true;
    });
    if (migrated) {
      state.meta.migrations = {
        ...(state.meta.migrations && typeof state.meta.migrations === "object" ? state.meta.migrations : {}),
        [STARTING_BALANCE_MIGRATION]: true
      };
    }
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
    const createdAt = value.meta?.createdAt ? new Date(value.meta.createdAt) : new Date();
    const state = createEmptyState(Number.isNaN(createdAt.getTime()) ? new Date() : createdAt);

    Object.entries(value.days && typeof value.days === "object" && !Array.isArray(value.days) ? value.days : {}).forEach(([key, day]) => {
      if (validDateKey(key)) state.days[key] = normalizeDay(day, key);
    });
    state.projects = Array.isArray(value.projects) ? value.projects.filter(item => item?.status !== "done").map(normalizeProject) : [];
    state.obligations = Array.isArray(value.obligations) ? value.obligations.map(normalizeObligation) : [];
    state.events = Array.isArray(value.events) ? value.events.map(normalizeEvent) : [];
    state.accounts = Array.isArray(value.accounts) && value.accounts.length
      ? value.accounts.map(normalizeAccount)
      : createDefaultAccounts();
    DEFAULT_ACCOUNTS.forEach(defaultAccount => {
      if (!state.accounts.some(account => account.id === defaultAccount.id)) {
        state.accounts.push(normalizeAccount({ ...defaultAccount, active: true }));
      }
    });

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

    state.books = Array.isArray(value.books) ? value.books.filter(item => item?.status !== "finished").map(normalizeBook) : [];
    state.schedule = Array.isArray(value.schedule) ? clone(value.schedule) : [];
    state.settings = {
      radarDays: numberOrDefault(value.settings?.radarDays, 7),
      monthlyIncomeTarget: numberOrDefault(value.settings?.monthlyIncomeTarget, 60000)
    };
    state.statements = value.statements && typeof value.statements === "object" && !Array.isArray(value.statements)
      ? clone(value.statements)
      : {};
    state.meta = {
      ...empty.meta,
      ...(value.meta && typeof value.meta === "object" ? value.meta : {})
    };
    migrateStartingBalances(state, value);
    state.version = DATA_VERSION;
    return state;
  }

  function validateImportedState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { valid: false, reason: "檔案內容不是人生主控表資料。" };
    }
    if (!SUPPORTED_IMPORT_VERSIONS.includes(value.version)) {
      return { valid: false, reason: "資料版本不相容。目前支援第 1、2、3 版。" };
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

  // ── Freeze / Unfreeze ────────────────────────────────────────────────
  // Frozen ＝ 使用者主動 Pause，**不累積等待日後 catch-up 的欠處理期別**。
  // Unfreeze ＝ 從現在恢復規則，不是補跑 Frozen 期間。
  // 因此解凍時把已經落後的 pending occurrence 往前搬到第一個 >= today 的合法日期，
  // 但保留原本的 calendar anchor（cycle.day／cycle.month），不重新定義規則本身。

  function firstMonthlyOnOrAfter(todayKey, day) {
    const today = dateFromKey(todayKey);
    for (let step = 0; step <= 2; step += 1) {
      const candidate = dateWithClampedDay(today.getFullYear(), today.getMonth() + step, day);
      if (candidate >= todayKey) return candidate;
    }
    return dateWithClampedDay(today.getFullYear(), today.getMonth() + 1, day);
  }

  function firstYearlyOnOrAfter(todayKey, month, day) {
    const today = dateFromKey(todayKey);
    for (let step = 0; step <= 2; step += 1) {
      const candidate = dateWithClampedDay(today.getFullYear() + step, month - 1, day);
      if (candidate >= todayKey) return candidate;
    }
    return dateWithClampedDay(today.getFullYear() + 1, month - 1, day);
  }

  // 回傳解凍後這個 occurrence 應該落在哪一天。原本就還沒到期的一律不動。
  function resumedDueDate(obligation, dueDate, todayKey) {
    if (!validDateKey(dueDate) || dueDate >= todayKey) return dueDate ?? null;
    const cycle = normalizeCycle(obligation?.cycle);
    if (cycle.type === "monthly") return firstMonthlyOnOrAfter(todayKey, cycle.day);
    if (cycle.type === "yearly") return firstYearlyOnOrAfter(todayKey, cycle.month, cycle.day);
    if (cycle.type === "after_days") return addDays(todayKey, cycle.days);
    // mileage 依既有里程語意，不做日期 catch-up；單次 Task 正常恢復，日期不動。
    return dueDate;
  }

  function freezeObligation(inputState, obligationId, now = new Date()) {
    const state = normalizeState(inputState);
    const obligation = state.obligations.find(item => item.id === obligationId);
    if (!obligation || obligation.status === "frozen") return { state, changed: false };
    obligation.status = "frozen";
    obligation.updatedAt = (now instanceof Date ? now : new Date(now)).toISOString();
    return { state, changed: true };
  }

  function unfreezeObligation(inputState, obligationId, todayKey = localDateKey(), now = new Date()) {
    const state = normalizeState(inputState);
    const obligation = state.obligations.find(item => item.id === obligationId);
    if (!obligation || obligation.status !== "frozen") return { state, changed: false };
    obligation.status = "active";
    obligation.updatedAt = (now instanceof Date ? now : new Date(now)).toISOString();
    state.events.forEach(event => {
      if (event.obligationId !== obligationId || event.status !== "pending") return;
      event.dueDate = resumedDueDate(obligation, event.dueDate, todayKey);
    });
    return { state, changed: true };
  }

  function ensureDay(state, dayKey) {
    if (!state.days[dayKey]) state.days[dayKey] = createEmptyDay();
    return state.days[dayKey];
  }

  // 只有 expense 一種後果。BANK → CARD 的卡費移轉改由使用者直接在 MONEY 操作，
  // TASKS 不再為 Card payment 保留 transfer 例外（架構.md 第四章）。
  function createLinkedTransaction(obligation, event, completedDateKey, amount) {
    if (obligation.completionMode !== "expense") return null;
    // 沒有明確的付款來源就不生成交易。寧可少一筆帳，也不替使用者猜一個帳戶去扣款。
    if (!obligation.paymentMethod) return null;
    return normalizeTransaction({
      id: uid("transaction"),
      type: "expense",
      amount,
      category: obligation.category || "其他",
      title: obligation.name,
      paymentMethod: obligation.paymentMethod,
      eventId: event.id,
      occurredOn: completedDateKey
    }, completedDateKey);
  }

  // 這一期完成會產生 expense，但付款來源還沒設定時，**整個完成動作必須被擋下**。
  // 不能讓 event 變成 done 卻靜默不記帳 —— 那會產生一筆做完了、錢卻沒進帳本的紀錄。
  function completionBlockReason(obligation) {
    if (obligation?.completionMode !== "expense") return "";
    if (!obligation.paymentMethod) return "這筆有金額的循環項目還沒設定 Paid from；請先選付款來源再完成。";
    return "";
  }

  function completeEvent(inputState, eventId, options = {}) {
    const state = normalizeState(inputState);
    const event = state.events.find(item => item.id === eventId);
    if (!event || event.status !== "pending") return { state, changed: false };
    const obligation = state.obligations.find(item => item.id === event.obligationId);
    if (!obligation) return { state, changed: false };
    const blocked = completionBlockReason(obligation);
    if (blocked) return { state, changed: false, blocked };

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

    // 下一期永遠從 pinned=false 開始：本期的 Pin 不傳給下一期（架構.md 第三章）。
    const nextDueDate = nextOccurrenceDate(obligation, event, completedDateKey);
    if (["monthly", "yearly", "after_days"].includes(obligation.cycle.type)) {
      const nextEvent = normalizeEvent({ obligationId: obligation.id, dueDate: nextDueDate, status: "pending" });
      state.events.push(nextEvent);
      event.generatedEventId = nextEvent.id;
    } else if (obligation.cycle.type === "mileage") {
      obligation.service.lastServiceMileage = obligation.service.currentMileage;
      const nextEvent = normalizeEvent({ obligationId: obligation.id, dueDate: null, status: "pending" });
      state.events.push(nextEvent);
      event.generatedEventId = nextEvent.id;
    } else {
      // 沒有 Repeat（none 與舊 once）＝單次 Task：完成後從 TASKS 消失且不再回來。
      // No date 也不再是常駐 Task。完成歷史仍留在 events 與 transactions。
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

  // 一筆 Auto payment 規則要能自動扣款，每一項必要資料都得由使用者明確設定：
  // Amount（→ completionMode 才會是 expense）、recurrence、Paid from（BANK／CARD，
  // 空字串＝還沒選）、Due（在 event 上判斷），以及規則本身仍然啟用。
  // 任何一項缺席就整筆不處理：不生成 $0 交易、不猜付款來源、也不把期別白白滾掉。
  function autoPaymentIsSchedulable(obligation) {
    return Boolean(obligation)
      && obligation.status === "active"
      && obligation.handling === "auto"
      && obligation.completionMode === "expense"
      && ["bank", "card"].includes(obligation.paymentMethod)
      && AUTO_PAYMENT_CYCLE_TYPES.includes(obligation.cycle?.type);
  }

  // 一次 run 追到第一個未到期的 occurrence 為止。
  // 每完成一期就重新掃描目前 state，因此新生成的下一期同一輪就會被看見 ——
  // 不用 filter().forEach() 的 stale snapshot。
  // Auto payment 的交易日期取該期自己的 dueDate（不是開 App 那天）；
  // 人工 Complete 仍由呼叫端傳入真正的完成日，不受這裡影響。
  function runAutoPayments(inputState, todayKey = localDateKey()) {
    let state = normalizeState(inputState);
    const completedEventIds = [];
    for (let guard = 0; guard < AUTO_PAYMENT_MAX_CATCHUP; guard += 1) {
      const due = state.events
        .filter(event => event.status === "pending" && event.dueDate && event.dueDate <= todayKey
          && autoPaymentIsSchedulable(state.obligations.find(item => item.id === event.obligationId)))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (!due) break;
      const dueDate = due.dueDate;
      const result = completeEvent(state, due.id, { completedDate: dueDate, autoPaid: true });
      if (!result.changed) break;
      state = result.state;
      completedEventIds.push(due.id);
      // 不前進的 recurrence 是壞資料：下一期沒有比本期晚就立刻停，別讓它繞成無限迴圈。
      const generated = state.events.find(item => item.id === result.event.generatedEventId);
      if (generated && generated.dueDate && generated.dueDate <= dueDate) break;
    }
    return { state, completedEventIds };
  }

  function transactionAmount(transaction) {
    const amount = Number(transaction?.amount);
    if (!Number.isFinite(amount)) return 0;
    if (transaction?.type === "income" && transaction?.migrationMarker?.startsWith(`${STARTING_BALANCE_MIGRATION}:`)) return amount;
    return Math.max(0, amount);
  }

  function transactionDisplayName(transaction) {
    return transaction?.title || transaction?.category || "Other";
  }

  function allTransactions(state) {
    return Object.entries(state?.days || {}).flatMap(([dayKey, day]) =>
      (day.transactions || []).map(transaction => ({ ...transaction, occurredOn: transaction.occurredOn || dayKey }))
    );
  }

  function obligationDeletionPolicy(inputState, obligationId) {
    const state = normalizeState(inputState);
    const id = String(obligationId || "");
    const obligation = state.obligations.find(item => item.id === id);
    if (!obligation) {
      return { allowed: false, reason: "找不到這筆待辦，未執行刪除。", pendingEventCount: 0 };
    }

    const relatedEvents = state.events.filter(event => event.obligationId === id);
    const eventIds = new Set(relatedEvents.map(event => event.id));
    const transactionIds = new Set(relatedEvents.map(event => event.transactionId).filter(Boolean));
    const hasHistoricalEvent = relatedEvents.some(event => event.status !== "pending");
    const hasLinkedTransaction = allTransactions(state).some(transaction =>
      eventIds.has(transaction.eventId) || transactionIds.has(transaction.id)
    );

    if (hasHistoricalEvent || hasLinkedTransaction) {
      return {
        allowed: false,
        reason: "這筆待辦已有完成、自動扣款或交易紀錄，不能永久刪除；請改用 Archive。",
        pendingEventCount: relatedEvents.filter(event => event.status === "pending").length
      };
    }

    return {
      allowed: true,
      reason: "",
      pendingEventCount: relatedEvents.filter(event => event.status === "pending").length
    };
  }

  function deleteObligationSafely(inputState, obligationId) {
    const state = normalizeState(inputState);
    const policy = obligationDeletionPolicy(state, obligationId);
    if (!policy.allowed) return { state, changed: false, ...policy };
    const id = String(obligationId || "");
    state.obligations = state.obligations.filter(obligation => obligation.id !== id);
    state.events = state.events.filter(event => event.obligationId !== id);
    return { state, changed: true, ...policy };
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

  function monthWorkRevenue(state, monthKey) {
    return Object.entries(state?.days || {}).reduce((total, [dayKey, day]) => {
      if (!dayKey.startsWith(monthKey)) return total;
      return total + (normalizeWorkRevenue(day?.workRevenue) ?? 0);
    }, 0);
  }

  function monthExpense(state, monthKey) {
    return monthTransactions(state, monthKey).reduce((total, item) => item.type === "expense" ? total + transactionAmount(item) : total, 0);
  }

  function accountBalances(state) {
    const balances = Object.fromEntries((state.accounts || []).map(account => [account.id, 0]));
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

  function selectableAccounts(state) {
    return (state.accounts || []).filter(account => account.active !== false);
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
      normalizeWorkRevenue(day.workRevenue) !== null || day.recovery?.activity || day.recovery?.effect || day.note
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

  // ── 注意力分區 ────────────────────────────────────────────────
  // 獨立的到期雷達已廢止：TASKS 主清單本身就是注意力入口。
  // 主清單 ＝ 現在需要注意；SLEEPING ＝ 有效但還沒進提醒窗口；FROZEN ＝ 使用者主動 Pause。
  // 提醒窗口沿用既有 settings.radarDays，不另建第二套 reminder days。

  function reminderWindowDays(state) {
    return Math.max(0, Number(state?.settings?.radarDays) || 0);
  }

  function daysUntil(dueDate, todayKey) {
    return Math.round((dateFromKey(dueDate) - dateFromKey(todayKey)) / 86400000);
  }

  function isMileageObligation(obligation) {
    return obligation?.cycle?.type === "mileage";
  }

  // Pin 只做一件事：繞過 Sleeping。不改 Due、不改窗口、不改排序語意。
  // 里程義務一律以里程語意為準：即使 legacy／匯入的 JSON 在它的 event 上留了 dueDate，
  // 也不得因此沉睡（雷達廢止後，這是它唯一的可見面）。
  function occurrenceIsSleeping(event, todayKey, windowDays, obligation) {
    if (isMileageObligation(obligation)) return false;
    if (!event?.dueDate || event.pinned === true) return false;
    return daysUntil(event.dueDate, todayKey) > windowDays;
  }

  // 里程義務沒有 Due，狀態改由主清單的摘要列承載（原本掛在雷達上）。
  function mileageStatus(obligation, todayKey = localDateKey()) {
    if (obligation?.cycle?.type !== "mileage") return "";
    const service = obligation.service || {};
    if (service.currentMileage !== null && service.lastServiceMileage !== null
      && service.currentMileage - service.lastServiceMileage >= service.thresholdKm) return "service-due";
    if (service.mileageUpdatedAt) {
      const updatedKey = localDateKey(new Date(service.mileageUpdatedAt));
      if (Math.floor((dateFromKey(todayKey) - dateFromKey(updatedKey)) / 86400000) > service.reminderDays) return "update-mileage";
    }
    return "";
  }

  // 注意力層級，數字越小越上面。這是舊雷達 priority 的接手者：雷達沒了，
  // 但它承載的「誰需要現在動手」語意必須留在主清單的排序裡。
  //   0 逾期
  //   1 今日到期／該保養（service-due 與 Today due 同級）
  //   2 提醒窗口內即將到期
  //   3 一般無日期
  //   4 更新里程（低強度，排在所有需要立即處理的項目之後）
  const OCCURRENCE_RANK = { overdue: 0, today: 1, "service-due": 1, soon: 2, plain: 3, "update-mileage": 4 };

  function occurrenceAttention(item, todayKey, windowDays) {
    if (isMileageObligation(item.obligation)) {
      return mileageStatus(item.obligation, todayKey) || "plain";
    }
    if (!item.event.dueDate) return "plain";
    const diff = daysUntil(item.event.dueDate, todayKey);
    if (diff < 0) return "overdue";
    if (diff === 0) return "today";
    return diff <= windowDays ? "soon" : "plain";
  }

  // 先比注意力層級，同級才比日期，最後才比名稱 ——
  // 這樣一般無日期 Task 不會靠名稱排到 service-due 前面。
  function compareOccurrences(a, b, todayKey, windowDays) {
    const rank = OCCURRENCE_RANK[occurrenceAttention(a, todayKey, windowDays)]
      - OCCURRENCE_RANK[occurrenceAttention(b, todayKey, windowDays)];
    if (rank) return rank;
    // 里程以里程語意為準，它的 legacy dueDate 不參與排序。
    const aDue = isMileageObligation(a.obligation) ? "" : (a.event.dueDate || "");
    const bDue = isMileageObligation(b.obligation) ? "" : (b.event.dueDate || "");
    if (aDue && bDue && aDue !== bDue) return aDue.localeCompare(bDue);
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    return String(a.obligation.name || "").localeCompare(String(b.obligation.name || ""), "zh-TW");
  }

  function taskBuckets(state, todayKey = localDateKey()) {
    const windowDays = reminderWindowDays(state);
    const obligationsById = new Map((state?.obligations || []).map(item => [item.id, item]));
    const active = [];
    const sleeping = [];
    (state?.events || []).forEach(event => {
      if (event.status !== "pending") return;
      const obligation = obligationsById.get(event.obligationId);
      // Auto payment 不進 TASKS、不進 Sleeping；Frozen 不自動醒來。
      if (!obligation || obligation.handling === "auto" || obligation.status !== "active") return;
      const item = { event, obligation };
      if (occurrenceIsSleeping(event, todayKey, windowDays, obligation)) sleeping.push(item);
      else active.push(item);
    });
    const byAttention = (a, b) => compareOccurrences(a, b, todayKey, windowDays);
    const frozen = (state?.obligations || [])
      .filter(item => item.status === "frozen" && item.handling !== "auto")
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-TW"));
    return { active: active.sort(byAttention), sleeping: sleeping.sort(byAttention), frozen };
  }

  // Auto payment 已移出 TASKS，改由 MONEY 承載；含 frozen 以便在 MONEY 內解凍。
  function autoPaymentRules(state) {
    return (state?.obligations || [])
      .filter(item => item.handling === "auto" && item.status !== "archived")
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-TW"));
  }

  function csvEscape(value) {
    const text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function buildCsv(state) {
    const rows = [["資料類型", "日期", "識別碼", "名稱", "狀態或種類", "金額", "明細"]];
    Object.entries(state.days).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, day]) => {
      rows.push(["每日", date, "", "", "", day.workRevenue ?? "", { sleep: day.sleep, workRevenue: day.workRevenue, recovery: day.recovery, note: day.note }]);
      day.workSessions.forEach(item => rows.push(["工作段", date, item.id, "", "", "", item]));
      day.transactions.forEach(item => rows.push(["交易", date, item.id, item.title || item.category, item.type, item.amount, item]));
    });
    [
      ["專案", state.projects], ["義務", state.obligations], ["事件", state.events], ["帳戶", state.accounts],
      ["分類", state.categories], ["書單", state.books], ["課表", state.schedule]
    ].forEach(([type, list]) => list.forEach(item => rows.push([type, "", item.id || "", item.name || "", item.status || item.kind || "", item.amount ?? "", item])));
    rows.push(["設定", "", "", "", "", "", state.settings]);
    Object.entries(state.statements).forEach(([month, amount]) => rows.push(["帳單", month, "", "", "", amount, ""]));
    return rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
  }

  // h:mm（小時不補零、分鐘補兩位），零值是 0:00 不是 0 分。
  // 依視覺基準 _design-reference.html：主數字 3:24、工作段列 2:30 / 0:54、未開工 0:00。
  //
  // 時長顯示有兩種格式，判準是「這個數字是幾天份的」，不是它長在哪一頁：
  //   一天以內（單日值、單段長度、日均）→ 本函式的 h:mm，共七個呼叫點：
  //     #sleep-total、#today-work-total、sessionDuration() 兩個分支、#metric-sleep、
  //     REVIEW 每日列的 SLEEP 與 WORK。
  //   跨越多天的加總 → app.js 的 decimalHours()（16.0h），三個呼叫點：
  //     #stat-week、#stat-month、#metric-work。
  // 日均雖然由多天算出，但它表達的是「一天」的量，所以歸在 h:mm。
  // 完整規則見 HANDOFF.md 第 3 節；新增時長顯示時先套那條規則。
  //
  // 同一個數字在 WORK 顯示 9:30、在 REVIEW 顯示「9 小時 30 分」會更難讀，
  // 所以單日這一側只有這一個格式。時長與時鐘時間並置的疑慮，基準自己已經
  // 給了答案（工作段列同一行是 09:30 — 12:00 與 2:30）。
  function formatMinutes(minutes) {
    if (minutes === null || minutes === undefined) return "—";
    const total = Math.round(Number(minutes));
    if (!Number.isFinite(total)) return "—";
    const sign = total < 0 ? "-" : "";
    const absolute = Math.abs(total);
    const hours = Math.floor(absolute / 60);
    const remainder = absolute % 60;
    return `${sign}${hours}:${String(remainder).padStart(2, "0")}`;
  }

  globalThis.LifeCalibrationCore = Object.freeze({
    DATA_VERSION,
    SUPPORTED_IMPORT_VERSIONS: [...SUPPORTED_IMPORT_VERSIONS],
    STARTING_BALANCE_MIGRATION,
    DEFAULT_CATEGORY_NAMES: [...DEFAULT_CATEGORY_NAMES],
    DEFAULT_CATEGORIES: [...DEFAULT_CATEGORY_NAMES],
    DEFAULT_ACCOUNTS: clone(DEFAULT_ACCOUNTS),
    SYSTEM_ACCOUNT_IDS: [...SYSTEM_ACCOUNT_IDS],
    clone,
    uid,
    localDateKey,
    exportFilename,
    dateFromKey,
    createEmptyDay,
    createEmptyState,
    normalizeWorkRevenue,
    normalizeTransaction,
    normalizeObligation,
    normalizeEvent,
    normalizeState,
    isSystemAccount,
    validateImportedState,
    nextOccurrenceDate,
    completeEvent,
    undoEventCompletion,
    runAutoPayments,
    transactionAmount,
    transactionDisplayName,
    allTransactions,
    obligationDeletionPolicy,
    deleteObligationSafely,
    dayIncome,
    dayExpense,
    dayNet,
    monthIncome,
    monthWorkRevenue,
    monthExpense,
    monthTransactions,
    accountBalances,
    selectableAccounts,
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
    isRepeatCycle,
    isLegacyTransfer,
    isMileageObligation,
    completionBlockReason,
    resumedDueDate,
    freezeObligation,
    unfreezeObligation,
    reminderWindowDays,
    daysUntil,
    occurrenceIsSleeping,
    occurrenceAttention,
    mileageStatus,
    taskBuckets,
    autoPaymentRules,
    autoPaymentIsSchedulable,
    csvEscape,
    buildCsv,
    formatMinutes
  });
})();
