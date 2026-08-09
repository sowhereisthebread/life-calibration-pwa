(() => {
  "use strict";

  function inferDayFromDue(dueDate) {
    const match = /^\d{4}-\d{2}-(\d{2})$/.exec(String(dueDate || ""));
    if (!match) return null;
    const day = Number(match[1]);
    return day >= 1 && day <= 31 ? day : null;
  }

  globalThis.LifeCalibrationMonthlyRepeatUX = { inferDayFromDue };

  const form = document.getElementById("obligation-form");
  const cycle = document.getElementById("obligation-cycle");
  const due = document.getElementById("obligation-due");
  const dayField = document.getElementById("obligation-cycle-day-field");
  const dayInput = document.getElementById("obligation-cycle-day");
  if (!form || !cycle || !due || !dayField || !dayInput) return;

  const dayLabel = dayField.querySelector("span");
  let monthlyMode = "new";

  function syncMonthlyFields() {
    if (cycle.value !== "monthly") {
      if (dayLabel) dayLabel.textContent = "Cycle day";
      return;
    }

    if (dayLabel) dayLabel.textContent = "Repeat day";

    if (monthlyMode === "existing") {
      dayField.hidden = false;
      return;
    }

    const inferredDay = inferDayFromDue(due.value);
    if (inferredDay === null) {
      dayField.hidden = false;
      return;
    }

    dayInput.value = String(inferredDay);
    dayField.hidden = true;
  }

  function captureEditorMode() {
    if (form.hidden) return;
    monthlyMode = cycle.value === "monthly" ? "existing" : "new";
    syncMonthlyFields();
  }

  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.attributeName === "hidden")) {
      captureEditorMode();
    }
  });
  observer.observe(form, { attributes: true, attributeFilter: ["hidden"] });

  cycle.addEventListener("change", () => {
    if (cycle.value === "monthly" && monthlyMode !== "existing") monthlyMode = "new";
    queueMicrotask(syncMonthlyFields);
  });
  due.addEventListener("input", syncMonthlyFields);
  due.addEventListener("change", syncMonthlyFields);
  form.addEventListener("submit", syncMonthlyFields, true);

  captureEditorMode();
})();
