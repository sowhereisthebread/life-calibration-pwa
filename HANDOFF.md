# HANDOFF｜TAKO 工程現況

更新：2026-08-10（TASKS × MONEY 核心邏輯重構完成，待 Tako 驗收）

**這是單一現況文件，不是日誌。** 只寫三種東西：接手前非知道不可的事、與視覺基準的刻意偏離、還沒處理的事。
「改了哪些檔案、各改了什麼」由 git history 承擔，本檔不留附錄也不留歷史版本。

---

## 0. 接手前非知道不可的四件事

### 0.1 視覺基準已經不在這個目錄裡

視覺層的唯一依據是 `_design-reference.html`（Design 端的實際渲染成品）。**2026-08-06 移出本工作目錄**，現位於 repo 的兄弟目錄：

```
../_backups/_design-reference.html   （相對於本 repo 根目錄）
109,645 bytes
SHA-256 6044936127a0f79812d2661950127f6fe30f85d11fb844707634c5785f3426a6
```

它含 Design 對話內容，**不進版控、不進這個公開 repo**。本 repo 的 `.gitignore` 保留同名規則當防呆；外層知識庫的 `.gitignore:7` 也擋著 `_backups/`。
**因此那份是本機唯一副本，沒有任何版控備援。** 換機器或重新 clone 時 git 不會帶來它，要從上一層知識庫的 `_backups/` 自行取得。
要動視覺前先確認手上有它。取不到而條文有疑義時以 `TAKO_架構.md` 第五章為準，並把該次判斷記回本檔第 4 節。

### 0.2 基準檔怎麼讀

檔內有六輪探索，**TURN 6 在檔首、最新**：

| 輪 | 內容 |
|---|---|
| TURN 6 | 尺寸階層四階、打卡按鈕三種配置（採用 `6a`）、中英文規則 |
| TURN 5 | 材質六層的定義，以及 `5a` 那台 390×844 的完整 WORK 頁。**`5a` 是唯一的完整頁面模型**，元件與材質的對應以它為準 |
| TURN 4 | ICE 與 GLASS 的判準、章魚四種處理（`4b` 凹刻已被 `5a` 採用）。TURN 4 曾寫「所有卡片用 GLASS」，**已被 TURN 5 的 `5a` 推翻**（主卡片是 ICE） |
| TURN 3 | 銀灰底成立、字壓到 `#16191B`、琥珀降到 `#B4791C` |
| TURN 2 / 1 | 近黑底探索，**已否決，不得引用** |

基準檔引用了一個不在 repo 內的 `support.js`（404）。缺它不影響渲染 —— `<x-dc>` / `<helmet>` 是未知元素，內含的 `<style>` 與 `<link>` 照常生效。

### 0.3 順位與裁決方式

**`_design-reference.html` ＞ `TAKO_架構.md` 第五章。** 非視覺條款一律以架構檔為準。

原 `SPEC.md` 已於 2026-08-06 併入架構.md 第五章，原檔封存在 `_archive/SPEC.md`（逐節對應表在 `_archive/SPEC_併檔對應表.md`）。**封存檔不是現行入口**，不得引用為規則。

裁決方式三條：

1. 基準與架構檔衝突 → 以基準為準，但**必須同一次把架構檔改到與基準一致**。不容許兩份長期並存不同說法 —— 那正是 SPEC.md 要被併掉的原因。
2. 基準沒有對應物（雷達、TASKS／REVIEW／DATA 三頁，以及 WORK 內新增的 PROJECTS 區）→ 以架構檔為準。
3. 基準取不到而條文有疑義 → 以架構檔為準，並把該次判斷記進本檔。

### 0.4 授權範圍

- **已授權，直接施工**：顏色、視覺、材質、UI、UX、頁面配置、介面文字。
- **不在授權範圍**：資料模型、義務／事件結構、記帳規則、狀態機行為。動這些要先取得 Tako 裁決。
- 2026-08-10 的 TASKS × MONEY 重構是 Tako 明確交辦的產品邏輯變更，因此資料模型、狀態機與記帳規則本輪**已獲授權變更**；該次交辦以外的部分，上面兩條照舊。

---

## 1. 現行工程狀態

- **功能版本號為 `0.7.0`**（TASKS × MONEY 核心邏輯重構是正式產品行為變更）、**資產版本號為 `0.4.15`**。`CACHE_NAME`、`index.html` 與 `sw.js` 內的 `style.css?v=`／`app.js?v=` 五處相等；規則見 `DEPLOY.md`〈兩個版本號，各自跳各自的〉。
- **`test.html` 157／157 全綠。**
- 頂層五頁維持 `MONEY / WORK / TASKS / REVIEW / DATA`；PROJECTS 仍以單一 ICE 主卡在 WORK 的 SESSIONS 後、SLEEP 前。
  - MONEY 依序為 QUICK ADD／ACCOUNTS／SPENT／**AUTO PAYMENTS**／RECENT。
  - TASKS 依序為 **TO-DO／SLEEPING／FROZEN／BOOKS**；RADAR 與 AUTO PAYMENT 兩個區段已從 TASKS 移除。

### 1.0 TASKS × MONEY 重構（本輪）

產品條文全部寫進 repo 外的 `TAKO_架構.md`（第二、三、四、五章），本節只記工程現況：

- **schema v3 → v5**，`SUPPORTED_IMPORT_VERSIONS` 為 `[1,2,3,4,5]`。沒有新資料表、沒有 Draft schema，只有兩處：
  - v4：occurrence 層新增 `event.pinned`（boolean，預設 `false`）。
  - v5：`obligation.paymentMethod` 對 **auto** 允許空字串＝「使用者尚未選擇付款來源」。這不是新欄位，是既有欄位新增一個合法值。
- **migration 全部落在 `normalizeObligation()`／`normalizeEvent()`，天然 idempotent**，不需要 marker：
  - 舊 JSON 缺 `pinned` 一律補 `false`。
  - `handling: "auto"`：`bank`／`card` 視為使用者已明確選擇並原樣保留；`cash`（auto 不支援）與缺值一律回到 `""`＝未選，**不猜成 card**。人工 Task 的 `bank` 預設不變。
  - `completionMode: "transfer"` → **不改寫**，見下一條。
- **legacy transfer 的相容策略：惰性 legacy 狀態，零破壞。** 舊值 `"transfer"` 原封不動留在 `completionMode` 當作它自己的狀態，`amount` 也完整保留；`isLegacyTransfer()` 是它的判別式。所有會產生後果的地方（`createLinkedTransaction`、`runAutoPayments`）都只認 `"expense"`，因此它既不會變成 expense、也不會恢復生成移轉交易。`taskEditorFields()` 對它關掉 Amount 與 Paid from，避免出現一個看起來能用、實際上不生交易的欄位。**不使用名稱／狀態等 heuristic 猜哪一筆是 Card payment**，所有 legacy transfer 一視同仁。原始值一直在資料與匯出檔裡，處理可逆。
  - `handling: "auto"` 的資料一律走推導路徑，不會被誤判為 legacy transfer。
- **`completionMode` 對非 legacy 資料完全是推導結果**：`amount !== null && (handling === "auto" || isRepeatCycle(cycle.type))` 才是 `expense`，否則 `none`。UI 沒有任何入口能寫它。
- **`cycle.type === "none"` 現在是終止型**：完成即封存，不再生成下一期無日期 occurrence。`"once"` 仍被 schema 接受，行為與 `none` 相同，UI 兩者都顯示為 `No repeat`，儲存一律寫 `none`。
- `data-core.js` 移除 `radarItems()`，改為 `taskBuckets()`／`occurrenceIsSleeping()`／`occurrenceAttention()`／`mileageStatus()`／`autoPaymentRules()`／`autoPaymentIsSchedulable()`／`reminderWindowDays()`／`daysUntil()`／`isRepeatCycle()`／`isLegacyTransfer()`／`isMileageObligation()`。SLEEPING 沿用既有 `settings.radarDays`，**沒有第二套 reminder days**。
- `data-store.js` 移除 `assertUniqueTransferObligation()`（單一移轉義務限制隨 Card payment 舊規則一起廢止）；`updateEvent()` 新增 `pinned`，且維持「只有 pending occurrence 能改」。

#### Auto payment 的排程與 catch-up

- **建立時不猜任何日期**：新建規則 `cycle.type = "none"`、`event.dueDate = null`、`amount = null`。Repeat 選單多一個空的佔位選項，選它不寫入任何東西。摘要顯示 `Not scheduled`。
- `autoPaymentIsSchedulable()` 是唯一的成立判準：`status === "active"` ＋ `handling === "auto"` ＋ `completionMode === "expense"`（＝有 Amount）＋ `paymentMethod ∈ {bank, card}` ＋ `cycle.type ∈ {monthly, yearly, after_days}`。任何一項缺席就整筆不處理。`createLinkedTransaction()` 另有一道防線：付款來源為空一律不生成交易。
  - **Paid from 也是硬 gate**（v5）。`paymentMethod` 對 auto 允許空字串，空＝未選，`autoPaymentIsSchedulable()` 直接擋掉。三態（未選／CARD／BANK）落在 localStorage 與匯出 JSON 裡，reload 與 import 之後仍分得出來，不靠任何 session memory。
  - **人工 Task 的 Paid from 同樣沒有預設值**（v5）。舊版 Quick Task 建立時傳 `bank`、normalize 缺值也 fallback `bank`，等於系統替使用者選了付款來源；現在一律留空。有 Amount 的循環 Task 在來源未選前，`completionBlockReason()` 會擋下**整個完成動作**（`completeEvent()` 回 `{ changed:false, blocked }`），occurrence 維持 pending，UI 顯示中文提示。**不是只讓 `createLinkedTransaction()` 回 null** —— 那會留下 event 已 done、帳卻沒記的紀錄。
  - **建立時 `paymentMethod` 必須傳空字串。** 傳 `"card"` 會被正規化層當成「使用者明確選過」，於是要 BANK 的規則先扣到 CARD —— 這個 bug 在本輪的 Browser smoke 實際重現過（4 期 × $30,000 扣進 CARD），單元測試抓不到，因為它們直接建 obligation、繞過建立流程。`test.html` 已加一條原始碼斷言擋住 `paymentMethod: "card|bank|cash"` 重新出現在建立流程裡。
- **`runAutoPayments()` 改成迴圈，不再是 `.filter().forEach()` 的 stale snapshot**：每完成一期就重新掃描目前 state，因此新生成的 occurrence 同一輪就會被看見。多筆 obligation 同時多期逾期一併追完。
- **Auto payment 的交易日期取該期自己的 `dueDate`**（`completeEvent(..., { completedDate: dueDate })`）；**人工 Complete 仍由呼叫端傳真正的完成日**，不受影響。
- 兩道 infinite-loop 防護：硬上限 `AUTO_PAYMENT_MAX_CATCHUP = 600`，以及「下一期沒有比本期晚就立刻停」的 non-advancing 檢查。實測 100 年份的月繳規則在 437ms 內收斂於 600 期並正常回傳。
- 使用者在 MONEY 補齊規則後，`change` handler 會就地再跑一次 `runAutoPayments(todayKey)`，**本 session 就處理掉已到期的期別，不必等 reload**。處理本身 idempotent，每次欄位變更都跑也不會重複。

#### Freeze / Unfreeze

- 資料行為集中在 `core.freezeObligation()` / `core.unfreezeObligation()` 與對應的 store 方法，**不再由兩個 UI click handler 各自改 `status`**。
- **Frozen 期間不累積欠期。** Unfreeze 時 `resumedDueDate()` 會把已落後的 pending occurrence 搬到第一個 ≥ today 的合法日期：monthly／yearly 保留 calendar anchor 只換期別，after_days 從解凍當天重新起算，mileage 與單次不動。原本就還沒到期的一律不搬。
- 沒有這一步的話，新的 catch-up engine 會把整段冷凍期補成歷史支出 —— 那正好與「Frozen ＝ 使用者主動 Pause」相反。
- Unfreeze 後若新 Due 剛好等於今天，MONEY 的 handler 會在同一 session 跑一次 `runAutoPayments`；冷凍期間仍然一筆都不補。

#### Undo queue

- `createUndoQueue()`（`LifeCalibrationTaskUX`）以**到期時間戳**判定而非單一 timer，因此每一次 Complete 都有自己的 10 秒窗口，後一筆不覆蓋前一筆。時鐘可注入，測試不必真的等 10 秒。
- app 端每筆各排一個 `setTimeout` 只負責觸發重繪；是否仍可 Undo 一律以 queue 的時間戳為準。
- Undo 只回滾自己那一筆（`undoEvent(eventId)` → `core.undoEventCompletion`），實測 A／B 互不影響。
- `app.js`：`renderRadar()`／`renderCommitments()`／`openObligationEditor()`／`resolveObligationFormMode()`／集中式 `#obligation-form` 全部刪除，改為 `renderTasks()` ＋ `renderAutoPayments()` ＋ 每一列自己的 `taskEditorMarkup()`。`LifeCalibrationObligationUX` 換成 `LifeCalibrationTaskUX`（`taskEditorFields`、`UNDO_WINDOW_MS`）。
- **inline 編輯的寫入節奏**：`input` 只寫值不重繪（保住游標），`change` 才重繪；`cycle` 與 `dueDate` 只在 `change` 寫入，因為它們會重設 recurrence anchor 與分區。
- **Mileage → Monthly／Yearly 的死結已解**：`showDue` 對 mileage 是 false，舊版又在切換當下就要求 Due，於是使用者沒有任何路徑可以先填 Due。現在沒有 Due 時切到 Monthly／Yearly 會**先把週期切過去**（Due 欄位因此出現）並提示補 Due，使用者填了 Due 才由 `calendarRepeatCycleState()` 定 anchor。不猜日期，也不把人鎖在原本的週期裡。
- **Undo 窗口只存在記憶體**，10 秒後只是 UI 消失，完成歷史仍在 `events`／`transactions`。回滾直接沿用既有的 `core.undoEventCompletion()`。
- **里程注意力**：`occurrenceAttention()` 給出 0 逾期／1 今日到期與 service-due／2 即將到期／3 一般無日期／4 update-mileage 的層級，`compareOccurrences()` 先比層級再比日期最後比名稱，所以一般無日期 Task 不會靠名稱排到 service-due 前面。`occurrenceIsSleeping()`、`taskStateClass()`、`taskDueLabel()` 都先判斷 `isMileageObligation()`，legacy／匯入資料在 mileage event 上留的 dueDate 既不會讓它沉睡，也不會用 Due label 蓋掉 mileage status。service-due 與今日到期共用同一條 `--ink` 規則，沒有新色。
- CSS 刪除整個 `.radar*` 區塊、`.task-actions`（wrapper 已不存在，連帶 PR #12 的 `grid-area: secondary` scope 修正一併退役）、`.obligation-form`、`.transfer-summary`、`.mileage-fields`、`.no-date-group`、`.task-main`、`.task-item.is-done`、`.obligation-mode-help`、`.task-actual`。新增 `.task-head`、`.task-pin`、`.task-undo-row`、`.task-mileage`、`.sleeping-section`／`.sleeping-group`、`.auto-payment-group`／`.auto-payment-body`。沒有新 token、沒有新色。
- Calendar Repeat 的 Monthly／Yearly 以 Due 為唯一 UI source of truth，不再顯示 Repeat day／Cycle day／Cycle month。使用者新建、切換進 calendar repeat 或真正修改 Due 時，分別同步內部 `cycle.day` 或 `cycle.month + cycle.day`；編輯器開啟後未修改系統 clamp 產生的 Due 時，既有 anchor 原樣保留。短月與閏年只改當期生成結果，不重新定義 anchor；`nextOccurrenceDate()`、localStorage key 與 JSON 格式均未改（schema 已於本輪升為 v5，見第 1.0 節）。
- MONEY 的 RECENT 只顯示含今天在內最近 7 個日曆日；更舊交易依 local Monday–Sunday 進入預設收合的 WEEKLY HISTORY。RECENT／WEEKLY HISTORY／FUTURE 共用同一套 transaction editor；Date 資料與原生 input value 維持 `YYYY-MM-DD`，可見介面固定顯示 `YYYY/MM/DD`，並由 transaction 專用 wrapper 限制 iOS 原生 input 的 intrinsic width。日期變更後仍由 `occurredOn` 重新歸組；沒有 schema、刪除、匯出入、帳務或統計規則變更。
- TASKS 的人工完成入口維持 compact completion checkbox；可見框 21px、按鈕命中區 44×44px，並保留動態 `aria-label`。本輪把它從展開層移到**收合列**（雷達刪掉後那是唯一的一鍵完成入口），`Update mileage`、completion handler、recurrence 與 MONEY transaction 邏輯未變。
- 同引擎 390×844 實測證明：最新 master 的 GROUND、ICE、GLASS、DEBOSS、ACT token 與 computed style 已對齊 Design 5a，GROUND 四點逐像素相同或只差 1 RGB；偏暖不是色票或 body 合成座標造成。
- 可重現根因是舊 Service Worker／HTTP cache 混用資產：正式 GitHub Pages 的 `style.css` 為未版本化 URL，且回應 `Cache-Control: max-age=600`。現改為 `style.css?v=0.4.9`，與 cache／app 版本共用同一鍵；舊 origin 已實測由 `0.4.8` 更新到 `0.4.9`，離線 warm-cache 與新分頁啟動都成功。
- Tako 已在 iPhone 真機確認銀灰頁面捲動正常，沒有背景跳動或接縫；`backdrop-filter` 與 fixed background 的捲動風險不再是 blocker。顏色後續主觀微調另案處理，不影響本輪 checkbox 驗收。

### 驗收怎麼做的

- 環境：本機 `python -m http.server` + Browser runtime，非 `file://` 直開；Service Worker 測試要使用乾淨 origin，避免舊 localhost 快取混入不同資產版本。
- **改完 `app.js` 後要重新驗證 runtime 時，`?v=` 沒跳號就會吃到瀏覽器 HTTP cache**，看起來像修改沒生效。本輪用一個加 `Cache-Control: no-store` 的臨時 `http.server` handler 跑第二輪驗證。這一步踩過一次，不要再花時間 debug 幻影。
- 五個分頁 × 320／375／390／393／820 px 共 25 組：console 無 error、無水平捲動、bottom nav 五格完整。
- TASKS × MONEY 重構的 runtime 驗證（390×844 為主，五寬度掃描）：
  - Quick add 只填名稱 → 不自動開 editor、輸入框清空、直接列在主清單；點 item 一次就進入可編輯狀態。
  - Progressive disclosure 實測欄位：單次 `name/cycle/dueDate/note`、循環無金額多 `amount`、循環有金額再多 `paymentMethod`、mileage 換成里程欄位、after_days 出現 interval。
  - SLEEPING：`today+45` 進 SLEEPING、`today+3` 留主清單；Pin 遠期 → 回主清單且 Due 與 `radarDays` 不變、`aria-pressed="true"`；Unpin → 回 SLEEPING。把主清單某列的 Due 改遠 → 該列即時沉睡，且因為它正被編輯，SLEEPING 區段自動展開。
  - Complete／Undo：循環財務 Task 完成 → 生成 13965 BANK expense ＋ 下一期 `pinned:false`；`Completed · UNDO` 出現，10 秒後自動消失但 `events` 內完成歷史仍在；按 UNDO → 交易移除、下一期撤銷、`transactionId`／`generatedEventId` 清空、孤兒連結為 0。
  - Card payment 完成 → 0 筆新交易、0 筆 transfer、下一期照生。單次 Task 完成 → obligation `archived`、pending 0、done 歷史保留。
  - Frozen → 不在主清單、不在 SLEEPING、`runAutoPayments` 不產生交易；展開後仍可編輯，操作只有 Unfreeze／Archive；Unfreeze 回主清單。
  - MONEY AUTO PAYMENTS：DOM 順序實測 `SPENT → AUTO PAYMENTS → RECENT`，`<details>` 預設收合；第一層展開只有清單，點某一筆才出現 editor；Repeat 只有 monthly／yearly／after_days、Paid from 只有 bank／card、沒有 Handling／When done、沒有 Complete。到期自動轉 Auto-paid 並生成 card expense，`AUTO` 標記只在交易列。
  - 舊資料相容：以含 `manual + transfer` Card payment、已完成 event 與 transfer transaction 的 v3／v4 JSON 實跑 —— 歷史交易與 done event 逐欄位不變、帳戶餘額不變、legacy transfer 的 `completionMode` 與 `amount` 原封不動保留成惰性狀態、所有 event 補上 `pinned: false`、既有明確 `card`／`bank` 的 auto payment 仍有效、版本升為 5。
  - 匯出／匯入 round trip：`version: 5`、`pinned` 進 JSON 也進 CSV、付款來源的未選／BANK／CASH／CARD 四態 re-import 後完全一致，events／obligations／transactions 數量與 pinned 標記亦一致。
  - Regression：MONEY quick entry 新增一筆後餘額正確（main +42000／cash −120／card −1043）、SPENT 更新、RECENT 與 WEEKLY HISTORY 正常、transaction 可編輯、reload 後狀態不變、SW 以 `life-calibration-v0.4.15` 註冊且 app shell 全部進 warm cache。
  - 觸控命中區：completion checkbox 與 Pin 在 320px 實測皆為 44×44px。
- TASKS completion checkbox 以 320／375／390／393／820 px 實測：收合列上的按鈕皆為 44×44px、可見框 21×21px、沒有可見 `Mark done`，`Update mileage` 保留，五個寬度皆無水平 overflow。月循環完成後下一期、MONEY 交易與 10 秒 Undo 已逐步操作通過，console error 為 0。
- Calendar Repeat 以 TASKS runtime 實際驗證 New／Existing Monthly、31 日短月 unchanged-save、Yearly re-anchor、缺 Due 中文阻擋、After N days 與 Auto payment；Auto-paid transaction 與下一期均保留。375／390／393 px 不顯示手動 anchor 欄位、水平 overflow 為 0、console error 為 0。
- MONEY history 以含 RECENT／WEEKLY HISTORY／FUTURE 的實際 transaction fixture 驗證；375／390／393 px 共 9 個 transaction Date control 均顯示 `YYYY/MM/DD`、高度 44px、wrapper 與整頁水平 overflow 為 0，透明原生 input 仍為 `display:block`、`pointer-events:auto`。直接頁面把 `2026-08-03` 改為 `2026-08-10` 後移入 RECENT，再改為 `2026-08-20` 後移入 FUTURE；console error 為 0。
- **寬度掃描一律要納入 390 與 393** —— 那是 iPhone 14／15／16（390）與 15 Pro／16 Pro（393、402）的實際寬度。批次 A 之前只掃 320／375／820，正好漏掉這一段。
- 對比實測：截圖回灌 canvas 取面色眾數，避開文字筆畫。**取值位置必須是該 token 可能出現的最暗合成背景**，不是卡片頂端（見架構.md 第五章「token 的色碼必須在最暗合成背景上取值」）。
- 現行實測值記在 `style.css` 的 `:root` 註解裡，以那裡為準：`--t-ice-label` 4.67:1、`--t-frozen` 3.38:1（刻意的 3:1 例外）、圖表最淺一階 3.09:1、相鄰兩階 1.34:1。

### 1.1 [1] 問題回報區結案候選

- **弱網啟動**：根因是舊 Service Worker 對所有 GET 採沒有 timeout 的 network-first；裝置仍顯示有網路但 request stalled 時，快取永遠輪不到。現行策略只對 App 入口 navigation 與版本化 app shell 採 cache-first；`style.css` 與 `app.js` 都帶資產版本 query，其他請求保留 3 秒 bounded network-first。新 `CACHE_NAME` 安裝時仍重建完整 app shell，舊 cache 由 activate 清掉，不會把新版本永久鎖死。`test.html` 不是 App 入口，不會被離線 navigation fallback 誤導到 `index.html`。
- **Safe Delete**：只有「所有相關事件皆為 pending，且沒有 event／transaction 連結歷史」的 obligation 可永久刪除；刪除時只移除 obligation 與其 pending events。done、auto-paid 或任何 linked MONEY transaction 一律阻止 hard delete，介面不顯示 Delete 並保留 Archive。判斷與刪除都在 `data-core.js`／`data-store.js`，不只靠 DOM。
- **Card payment / Auto payment**：這兩條的舊規則已於 2026-08-10 的重構整段取代，現況只看第 1.0 節與 `TAKO_架構.md` 第四章，不要引用本節的舊描述。
- **多筆 Auto payment**：同日多筆各自生成 transaction、event link 與下一期 recurrence，交易 title 保留 obligation name。這一條仍然成立。
- **弱網驗證數據**：正常 online 170ms、warm-cache origin 不可達 115ms、伺服器每次 GET 延遲 20 秒時兩次啟動 127ms／125ms。

### 1.2 頂層 IA 重構現況

- `page-projects`／`data-page="projects"`／第三格 `PROJ` 已退役，現為 `page-tasks`／`data-page="tasks"`／第三格 `TASKS`。
- `setPage("work")` 的責任是 `renderToday()` + `renderProjects()`；`setPage("tasks")` 只呼叫 `renderTasks()`；`setPage("money")` 的 `renderMoney()` 內含 `renderAutoPayments()`。Project CRUD 與 task renderer 仍彼此獨立。
- WORK 的 PROJECTS 主卡保留 ACTIVE／PAUSED、New project、Project form、收合／展開與 Delete；內層 form 和 expanded details 不再套第二張 `.card`。

---

## 2. 與視覺基準的刻意偏離

**每一條都是刻意的，不是疏漏。** 下一輪看到不要當成 bug 改回去；要改回去必須先解掉「為什麼」那一欄。

### 偏離一：輸入框與下拉選單不再是等寬字

- **基準**：`5a` 的 `.record-input` 是等寬字。
- **現行**：`.field input` / `.field select` / `.field textarea` / `.record-input` 的 `font-family` 由 `--font-mono` 改為 `--font-ui`。**只有 `input[type="number"]` / `[type="time"]` / `[type="date"]` 保留等寬。**
- **為什麼**：`--font-mono` 是 latin 子集，只承載英數字。這些欄位會裝進使用者手填的中文（Item、專案名、下一步、書名、備註、義務名），以及預設就是中文的帳戶名（`主帳戶`／`現金`／`信用卡`）與分類名。中文套 mono 會 fallback 到系統字，等寬與非等寬在同一欄位裡混排，且 `tabular-nums` 失效。
- **影響範圍**：全站每一個文字輸入框與下拉選單，不只 WORK 頁。
- **要改回去的前提**：先解決中文的承載問題 —— 換全字集字型，或把欄位依「會不會裝中文」分流。

### 偏離二：時間欄位的 12／24 小時顯示由裝置決定，程式不處理

- **現行**：`<input type="time">` 的顯示格式跟隨**裝置／瀏覽器的地區設定**，不跟隨 HTML 的 `lang` 屬性。批次 A 曾加 `lang="en-GB"` 想強制 24 小時制，A-補 已全部移除（睡眠兩欄、課表兩欄、`renderWorkSessions()` 產生的工作段兩欄，共六處）。
- **實測依據**：同一顆 Chrome 對 `zh-TW`／`en-GB`／`en-US` 量到的欄位內在寬度完全相同，代表 `lang` 沒有改變欄位格式；換一個地區設定不同的 Chrome 實例，同一份 HTML 就渲染出 `下午 01:00`。
- **後果**：裝置設為 12 小時制時，該欄位會顯示中文的 `上午`／`下午`，形成「含中文卻套 `--font-mono`」，與偏離一的等寬字規則牴觸。
- **已知並接受**。解法在裝置端（把系統時間設為 24 小時制）。程式端要根治的唯一可靠做法是自製時間控制項取代原生 `input[type="time"]`，屬於較大的改動。
- 2026-08-06 為修 iOS 溢出，對 **`.session-details` 內的** `input[type="time"]` 加了 `appearance: none` 與 `::-webkit-date-and-time-value` 的尺寸規則。**那只動寬高，不動格式** —— 12／24 小時仍完全由裝置決定，本條偏離不受影響，也沒有因此變成自製控制項。睡眠兩欄與課表兩欄不在該規則範圍內，維持原生外觀。

### 偏離三：破壞性動作不使用 ACT

- **基準**：`5a` 的 WORK 頁只有一顆 ACT，沒有給破壞性動作的模型。
- **現行**：`05 ACT` 只給頁面的正向主要動作（MONEY 的 `Add`、DATA 的 `Export JSON`）。刪除、清除維持 GLASS（`.button-danger`，見 `style.css:241` 起的 GLASS 選擇器群）並置於 danger zone。
- **為什麼**：給破壞性動作實心墨等於與正向動作同等份量，反而誘發誤觸。與「警示用排序不用顏色」同一套邏輯：減法比加法安全。
- 此條已於 2026-08-06 寫進架構.md 第五章，成為正式條款。

---

## 3. 實作規則（不在架構.md，但施工時要遵守）

### 時長格式：兩種，依「量的性質」決定，不依所在頁面

判準是「**這個數字是幾天份的**」：一天以內用 `h:mm`，跨越多天的加總用小數時數。日均雖由多天算出，但它表達的是「一天」的量，歸在 `h:mm`。

| 格式 | 函式 | 例 | 使用點 |
|---|---|---|---|
| 小數時數（跨日合計） | `decimalHours()`（`app.js`） | `16.0h` | `#stat-week`、`#stat-month`、`#metric-work` |
| `h:mm`（單日值、單段長度、日均） | `RuntimeCore.formatMinutes()`（`data-core.js`） | `9:30`、`0:00`、`—` | `#sleep-total`、`#today-work-total`、`sessionDuration()` 兩個分支、`#metric-sleep`、REVIEW 每日列的 `SLEEP` 與 `WORK` |

新增時長顯示時先套這條規則，不要看它長在哪一頁。

### 圖表色階要對得到唯一一段

五個色階要對到五段。類別數 ≤ 5 時全部個別顯示；> 5 時前四名各一段、第五名以後併為 `OTHER`，排名列第五列以後一律 `--chart-5`。不加 `--chart-6` —— 同樣的亮度區間切六份，相鄰差會從 1.34:1 掉回 1.26:1。

---

## 4. 還沒處理的事

**這是唯一的待辦清單。** 已完成的項目不留在這裡。

| # | 項目 | 狀態 | 為什麼還沒動 |
|---|---|---|---|
| 1 | **一頁一顆 ACT** | 已決定暫不處理 | DATA 的 `Export JSON`、WORK 的 `Add schedule`／New project、TASKS 的多個表單送出鍵都是段落級主動作。要收斂成一頁一顆需重排頁面結構；留給 REVIEW／DATA 的後續 IA 一併裁決 |
| 2 | **REVIEW / DATA 的資訊架構** | 未設計 | PROJECTS 搬入 WORK 與 TASKS 重組已完成；REVIEW／DATA 目前只有依材質判準套用，版面本身尚未經專門設計 |
| 3 | **DEW 珠的尺寸** | 未定案 | 基準 `5a` 用 9px、`6a` 用 7px，現行取 9px。兩輪不一致，基準本身沒有裁決 |
| 4 | **`index.html:7` 的 `<meta name="description">` 仍是中文** | 批次 C 新發現，未處理 | 內容為「手機優先、資料留在本機的人生記錄工具。」。它不是介面元素，不確定該不該套用「介面預設英文」的語言規則，待 Tako 裁決 |
| 5 | **Auto payment 的封存規則沒有專屬入口** | 本輪未做，刻意 | Auto payment 的 Archive 會讓它從 MONEY 的 AUTO PAYMENTS 消失，但 App 內沒有任何地方列出 archived 規則。既有 obligation 就是這個行為，本輪不擴張；若 Tako 需要「看得到封存的自動扣款」再另案 |
| 6 | **本輪的 iOS 實機確認** | 待 Tako 實機 | Pin（10px 刻字 + 44px 命中區）、收合列的三段式 `.task-head`、SLEEPING／AUTO PAYMENTS 的 `<details>` 都只在本機 Chrome 量過。第 6 節那條「原生控制項與觸控只有實機能判定」同樣適用 |
| 7 | **legacy transfer 規則沒有「轉成一般循環支出」的出口** | 刻意，待 Tako 裁決 | 舊 transfer 規則永久保持惰性、Amount 保值但不在 editor 顯示。若 Tako 想把某一筆改回會記帳的循環 Task，目前只能刪掉重建。給出口就要決定「怎樣算使用者明確要求轉換」，那是新的產品判斷，本輪不自行決定 |

---

## 5. 已驗證的結論（不要重複試）

失敗的嘗試不會進 commit，git history 救不回這一節。

- 近黑底做不出玻璃感；近白底做不出金屬高光。
- Design 5a 與最新 master 在 390×844、同一 Browser engine 下的 GROUND 四點為：左上 `171/178/184`、右上 Design `197/202/206` 對 PWA `198/203/207`、中段 `155/164/171`、下段 `146/155/162`；ICE 頂部與中央完全相同，底部只差 `1/1/2` RGB，ACT 都是 `51/56/62`。因此不調 token。
- GROUND variant 已結案：移除 `background-attachment: fixed` 會讓主畫面亮 `3–12` RGB，反而偏離 Design；獨立 fixed layer 與明確 `100vw × 100dvh` 尺寸都與現況相同，沒有改善；隔離 `html --ground-solid` 對主 viewport 零影響，卻會失去 iOS canvas 保底。現行 body fixed 光場就是正確座標系。
- `backdrop-filter` variant 已結案：分別停用 saturate 或 blur，代表面色只變 `0–1` RGB，不能解釋偏暖；保留 `-webkit-backdrop-filter` 與標準屬性。
- 銀灰底可以，但字必須壓到 `#16191B`、琥珀降到 `#B4791C`。
- 「Q 版感」的來源＝700 字重 + 46px 主數字 + 16px 圓角三者疊加。
- GLASS 的透明度必須低於 ICE —— 反過來的話「疊在內容上」時 GLASS 會遮得更死。
- 露水做成大面積的「面」會與 ICE 打架 → 只能降級成小元件（珠）。
- 按鈕不能用「淡描邊 + 淡凹陷」—— 會與 DEBOSS 輸入框同貌。
- ICE / GROUND / ACT 三階明度無法等距：GROUND L\*67 → ICE L\*81 → ACT L\*20。
- 收合列做成 DEBOSS 會與內含的輸入框疊成四層。解法是卡內列不給材質，只用 `--line` 分隔。
- 單點量測對比值會產生「過關但不成立」的數字。`--t-ice-label` 曾以 `#4A5259` 寫入，卡片頂端合格、RECENT 卡最下方只有 4.45:1。一律取最暗合成背景。

### chip 28px 階：已結案，不再列為待辦（Tako 2026-08-06 裁決）

架構.md 第五章的「chip 26–28px」是**尺寸範圍**，不是要求 26px 與 28px 各要有一個實例。現行 `.target-field` 的 26px 已經落在範圍內，尺寸階層本身沒有缺口。

**不要為了補齊名目而**：把 `.target-field` 無必要地改成 28px、把 `#settings-radar-days` 的 44px 輸入欄壓成 chip、或新增沒有真實用途的 class 或元件（那會變成第二個 `.card-accent`）。

未來若出現確實需要 28px 的真實元件，再依當時需求重新建立任務。**下一輪不要把這一項當成未完成的缺口重開。**

### 基準檔的 `support.js` 404：已查驗結案（2026-08-06）

**結論：沒有任何現行畫面、狀態、事件或互動依賴它。不補檔，不做替代程式，本項關閉。**

查驗方式與證據：

- 全檔搜尋，`support.js` 只有一處引用：`_design-reference.html:6` 的 `<script src="./support.js">`。
- 基準檔沒有任何互動：`onclick` 0 處、`addEventListener` 0 處。
- 另一個 `<script>` 是 `type="text/x-dc"`，瀏覽器不執行未知 MIME，它只是設計工具的 props 宣告。
- 以缺載狀態實跑渲染（本機 HTTP server + headless Chrome，`support.js` 回 404）：816 個元素正常渲染、`body` 背景 `rgb(222,222,219)`＝`#DEDEDB`、文字色 `rgb(26,28,27)`＝`#1A1C1B`，即 `<helmet>` 內的 `<style>` 照常生效；**零 exception**。

下一輪不要再查這一項。

---

## 6. iOS 原生控制項缺陷與命名殘留

本節記兩件事：**已修但還沒經實機確認的 iOS 缺陷**，以及刻意保留的命名殘留。
「已修」在這裡一律等於「本機改完了」，不等於通過 —— 原生控制項的通過標準只有實機。

### 工作段展開層在 iOS Safari 上溢出，且尺寸過大

**a. 實機回報**：iPhone 14（390px viewport、iOS Safari、系統設為 24 小時制），工作段展開層的時間欄位溢出容器，且整個展開層的尺寸偏大。

**b. 與本機量測不衝突**：本機量到 390px 單欄時欄位寬 312px、需求 159px，不溢出。兩邊都沒錯 —— `input[type="time"]` 在 iOS 是**原生控制項**，內在寬度由系統決定（字體、系統字級設定、控制項內距都不受 CSS 完全支配），headless Chrome 量不到那個值。

**c. 這是方法論層級的限制，不是這一個欄位的問題**：凡是涉及原生控制項（`input[type="time"]`、`input[type="date"]`、`select`）的寬度與高度，本機數字只能當**參考值**，不能當通過標準。這類元件一律要實機確認。

**處置**：2026-08-06 已修，**但尚未經實機確認**。做法是關掉 `.session-details input[type="time"]` 的原生外觀，並把 `::-webkit-date-and-time-value` 的寬度放開到可縮至 0，寬度才真正由 grid 欄寬決定；同時把展開層密度收緊（gap 10→8、下緣 14→10、上緣 2→0），`Remove` 改成內容寬靠左，控制項一律維持 44px 命中區。

**範圍刻意收窄**：睡眠兩欄與課表兩欄的 `input[type="time"]` 根因相同，但**沒有實機回報異常，本輪不動**（Tako 2026-08-06 裁決：有實機證據才改）。日後那四欄若也回報溢出，把選擇器擴出去即可，解法一樣。

**c 那條限制依然成立**：這次的修正在本機一樣量不出真值，**通過與否必須由 iPhone 實機判定**，不得以本機數字結案。

### iPhone 主畫面 PWA 頂部狀態列白底

**實機回報**：App 頂部保留一整條白色狀態列背景（時間／訊號／電量那一條），v0.4.0 當時是滿版銀灰、沒有白色切割帶。

**根因不是單一原因，是 `64f8b2a` 一次改了三件事疊起來的**：

| # | 基線 `5488954` | 視覺改版後 |
|---|---|---|
| 1 | `html, body { background: var(--ground) }` —— **根元素自己有底** | 只有 `body` 有，`html` 完全沒有背景 |
| 2 | `--ground: #A4AAB0` —— **實色** | `--ground: linear-gradient(...)` —— 漸層，屬 `background-image` |
| 3 | 無 | `body` 加了 `background-attachment: fixed` |

漸層是 `background-image`，填不滿畫布視口以外的區域；`background-attachment: fixed` 又把繪製區釘在視口上。root 沒有任何不透明 `background-color` 可以墊底，狀態列那一條就露出瀏覽器預設的白。基線因為根元素掛的是實色，不管視口怎麼算都有底。

**雪上加霜**：`f75669f` 把 `--ground-solid: #9CA5AC` 當成「已無用途」刪掉了 —— 那正是這裡需要的實色。

**處置**（2026-08-06，**尚未經實機確認**）：

1. `index.html` 的 viewport 加 `viewport-fit=cover`。沒有它，iOS 的 `env(safe-area-inset-*)` 一律回傳 0，`.app-shell` 與底部導覽那些 safe-area padding 全是空轉，webview 也不會延伸到狀態列下方。`maximum-scale=1, user-scalable=no` 一併保留，防自動放大沒有鬆掉。
2. 復原 `--ground-solid: #9CA5AC`，並在 `html` 上掛 `background-color: var(--ground-solid)` 當 canvas 保底。漸層仍然只在 `body`。
3. `.app-shell` 與 `.bottom-nav` 的 safe-area 規則**一行未改** —— 它們本來就寫對了，只是因為缺 `viewport-fit=cover` 而從來沒有生效過。

`--ground-solid`、`theme-color`、manifest 的 `background_color` 三者同值 `#9CA5AC`，測試會斷言它們一致，改一個就要三個一起改。

**沒有做的事**：沒有寫死 44／47px、沒有人造灰條、沒有隱藏狀態列、沒有把頁首內容往下推。

### Quick Add 四欄在 iOS 失去網格

**實機回報**：`Type`、`Amount`、`Item`、`Paid with` 四欄失去整齊網格，原生 `select`／`number` 的高度、內距與基線和本機 Chrome 不一致。

**根因**：全站沒有任何一條規則對 `select` 下 `appearance: none`（改前唯一一處 `appearance: none` 是 `.date-control` 內的隱藏 date input）。沒關掉原生外觀，iOS 的 `select` 高度、內距與基線就由系統決定，`min-height: 44px` 與 `padding` 都蓋不過去。

**處置**：2026-08-06 已修，**但尚未經實機確認**。關掉 select 的原生外觀改由 CSS 控制盒模型，箭頭自己畫並預留 `padding-right: 34px`（文字不被箭頭擠壓），input 與 select 一律鎖 `height: 44px` 實高而不只是 `min-height`。字級維持 16px，防自動放大要求沒有犧牲。金額欄的 `.money-input` 是 span 包層，不吃這條，仍是 46px。

**範圍刻意收窄**：選擇器是 `.quick-add-grid select` 與 `.quick-add-grid .field > input, .quick-add-grid .field > select`，**只作用於 MONEY Quick Add**（Tako 2026-08-06 裁決）。`.quick-add-grid` 只出現在 `#transaction-form` 的四個列容器；WORK、TASKS、DATA 的下拉維持原生外觀，本輪一律不動。改動這條前先確認是不是真的要動到其他頁。

### 名實不符的殘留命名

- `.status-pill` 已於 2026-08-06 改名為 `.status-indicator`（`style.css`、`index.html`、`app.js` 三處引用全數更新，全 repo 程式碼零殘留）。它沒有容器，只有一顆 9px 琥珀珠加等寬小字，架構.md 第五章又明訂「狀態指示不是 chip」，所以不叫 pill 也不叫 chip。`classList.toggle("is-running")` 的行為與視覺都未改動。
  封存的 `_archive/SPEC.md` 仍有舊名，那是封存檔，不是現行入口，刻意不動。
- `.card-accent`（`style.css`）在 HTML 中已無元素套用，CSS 規則保留為無作用的中性值，未清掉。
- `obligation.transferFromAccountId`／`transferToAccountId` 在 2026-08-10 後已無任何讀取點（transfer 型完成已廢止），但 `normalizeObligation()` 的 `...raw` spread 仍會把舊資料的這兩個欄位原樣帶著走。**這是刻意的無損保留**，不是遺漏；不要為了「清乾淨」而在 migration 裡刪掉使用者既有 JSON 的欄位。