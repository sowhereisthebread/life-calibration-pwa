# TAKO v0.7.0｜現行狀態

更新：2026-08-10

## 版本與 Git

- 功能版本：**`0.7.0`**；TASKS × MONEY 核心邏輯重構，屬正式產品行為變更。
- 資產版本：**`0.4.15`**；`CACHE_NAME`、`index.html` 與 `sw.js` 內的 `style.css?v=`／`app.js?v=` 五處一致。
- 正式分支：`master`；上一個已發布狀態為 PR #12（功能 `0.6.2`／資產 `0.4.14`），發布於 <https://sowhereisthebread.github.io/life-calibration-pwa/>。本輪尚未發布。
- 頂層導覽維持 `MONEY / WORK / TASKS / REVIEW / DATA`；PROJECTS 仍在 WORK 的 SESSIONS 後、SLEEP 前。MONEY 為 QUICK ADD／ACCOUNTS／SPENT／**AUTO PAYMENTS**／RECENT，TASKS 為 **TO-DO／SLEEPING／FROZEN／BOOKS**。
- 獨立到期雷達已刪除；Auto payment 已從 TASKS 移到 MONEY；Card payment 的 `manual + transfer` 舊規則廢止，改為不記帳的循環提醒。弱網啟動、Safe Delete 與 linked MONEY title 均保留。

## 驗收結果

- **`test.html`：157／157 全數通過**；廢止依附於雷達、集中式 obligation form 與 transfer 型 Card payment 的舊測試，新增 SLEEPING／Pin／單次終止／規則對歷史單向／Frozen 副作用／Auto payment 位置與 UX／schema v5 匯出入，以及驗收各輪要求的 Auto payment 不猜 Due 與不猜付款來源、多期 catch-up 與交易日期、legacy transfer 保值、獨立 Undo queue、mileage 注意力排序、Frozen 不累積 catch-up、人工循環 Task 未選來源時擋下完成、Mileage → Monthly／Yearly 轉換等 targeted tests。
- `node --check app.js`、`node --check data-store.js`、`node --check data-core.js`、`node --check sw.js` 通過；localStorage key 與 `data-core.js` recurrence engine 不變，schema 由 v3 升為 v5（v4 新增 `event.pinned`；v5 讓 auto 的 `paymentMethod` 可為空＝尚未選擇付款來源）。
- TASKS 的 Monthly／Yearly 只顯示 Repeats 與 Due；使用者真正修改 Due 時同步更新內部 `cycle.day`／`cycle.month`，未修改系統 clamp 產生的 Due 時則保留原 anchor，因此每月 31 日仍可依 1/31 → 2/28 → 3/31 運作，2/29 yearly anchor 亦不漂移。Monthly／Yearly 缺少 Due 時以中文錯誤阻止儲存。
- MONEY RECENT 現只顯示含今天在內最近 7 個日曆日；較舊 transaction 依 local Monday–Sunday 進入預設收合的 WEEKLY HISTORY，展開後仍依日顯示並使用同一套 transaction editor。Date 資料與 native input value 維持 `YYYY-MM-DD`，可見介面固定為 `YYYY/MM/DD`；修改 Date 後依 `occurredOn` 自動移到正確位置，future transaction 仍保留可見。
- Browser 以 RECENT／WEEKLY HISTORY／FUTURE fixture 掃描 375／390／393 px：共 9 個 Date control 均為 44px、固定 `YYYY/MM/DD`、native input 保留可互動層，control 與整頁水平 overflow 均為 0。`2026-08-03` 改為 `2026-08-10` 後移入 RECENT，再改為 `2026-08-20` 後移入 FUTURE；console error 為 0。
- Browser 掃描 320／375／390／393／820 px：五頁矩陣無白屏、非預期水平 overflow 為 0、bottom nav 五格完整、console error 為 0；completion checkbox 與 Pin 在 320px 實測皆為 44×44px 命中區。
- 本輪 runtime 逐項驗證（quick add／展開即編輯／progressive disclosure／SLEEPING 與 Pin／Complete 與 10 秒 Undo／Card payment 不生交易／單次終止／Frozen 無副作用／MONEY AUTO PAYMENTS 兩層展開／舊 v3 JSON 遷移／匯出入 round trip）明細記於 `HANDOFF.md`〈驗收怎麼做的〉。
- PROJECTS 既有新增、展開、修改、切 PAUSED、兩階段 Delete 全部可用。TASKS 現為 **TO-DO／SLEEPING／FROZEN／BOOKS**：獨立 Radar 已移除、Done 區已移除（改為每筆各自 10 秒的 Undo queue）、Auto payment 已移到 MONEY 的 AUTO PAYMENTS。completion checkbox（收合列）、recurring 下一期、MONEY 連動、Update mileage、FROZEN、BOOKS 均保留並實測通過。
- 390×844 的 PROJECTS 外層為單一 ICE；project form 無 `.card`，expanded details 為透明、無 border、無 shadow，不形成 ICE → ICE。
- 390×844 的 Design 5a 與 PWA 實際材質像素已比對；GROUND 四點相同或只差 1 RGB，ICE／ACT 相同或只差 0–2 RGB。偏暖根因是未版本化 `style.css` 可被舊 Service Worker／HTTP cache 沿用，不是 token 或 compositing。
- Service Worker 已實測從同 origin 的 `0.4.8` 更新到 `0.4.9`；伺服器停止後，既有頁 reload 與新分頁啟動都能由 warm cache 完整載入，IBM Plex Mono 亦可用。
- schema 由 v3 升為 v5、localStorage key 維持 `lifeCalibrationData`；project、manual task、auto payment、frozen task、book 的舊 JSON round trip 後 ID 與內容皆保留。migration 只調整未來 active rule，歷史 transaction 與已完成 event 逐欄位不變。
- 上一輪（`0.6.2`）Tako 已完成 iPhone 實機驗收：銀灰捲動、completion checkbox、transaction Date 固定 `YYYY/MM/DD`／原生 picker／零 overflow、Calendar Repeat Due single source of truth 均已結案。**本輪 `0.7.0` 尚未經實機確認，也未由 Tako 驗收。** 未處理項目集中在 `HANDOFF.md` 第 4 節，本檔不重複列。

## 資料與相容性

- 現行資料版本為 **schema v5**，localStorage key 維持 `lifeCalibrationData`。
- 第 1、2、3、4 版的瀏覽器資料與匯出 JSON 可自動遷移到 v5；匯入接受 v1／v2／v3／v4／v5。
- v3 → v4 新增 occurrence 層的 `event.pinned`（預設 `false`）。v4 → v5 讓 `paymentMethod` 可為空字串＝「使用者尚未明確選擇付款來源」：auto payment 未選之前一律不自動扣款，人工循環 Task 未選之前不得完成會產生 expense 的 occurrence。既有明確 `card`／`bank`／`cash` 的來源一律原樣保留、繼續有效；auto 的 `cash`（不支援）回到未選而不猜成 card。已廢止的 `completionMode: "transfer"` **不做任何改寫**：原值與 Amount 原封不動保留成惰性 legacy 狀態，只是不再產生任何後果。全程不重算也不改寫任何已完成 event 或既有 transaction。
- v1／v2 各帳戶的非零期初餘額會各自轉成一次、有遷移標記且指定原帳戶的收入交易；零值不生成交易，轉換後帳戶不再保留期初餘額欄位。
- 舊資料或 JSON 中的 `category`／`categories` 僅為相容欄位，現行支出輸入沒有分類 UI。
- 資料只存在目前瀏覽器與目前 origin 的 localStorage；不同網址、IP、通訊埠、瀏覽器或裝置不會自動同步。這是現行產品邊界，不是待裁決項目。
- JSON 是完整備份與還原格式；CSV 只供分析，不能取代完整備份。

## 資產

- 等寬字 IBM Plex Mono 自帶於 `fonts/`（latin 子集 400／500，共 29,596 bytes，SIL OFL 1.1），已列入 `sw.js` 的 `APP_SHELL`，不依賴 CDN。
- 視覺基準 `_design-reference.html` **已於 2026-08-06 移出本 repo 的工作目錄**，現位於兄弟目錄 `../_backups/`（109,645 bytes，SHA-256 `6044936…`）。它不在版控內，也沒有版控備援；取得方式與注意事項見 `HANDOFF.md` 第 0.1 節。

產品簡介見 `README.md`；視覺基準 `_design-reference.html` 已移出工作目錄（取得方式見 `HANDOFF.md` 第 0 節），其文字條款併入 `TAKO/TAKO_架構.md` 第五章；工程現況與未處理項目見 `HANDOFF.md`；產品正典為上一層知識庫的 `TAKO/TAKO_架構.md`；原始碼與 `test.html` 是實作及驗收證據。本檔只記錄 App repo 的版本、驗收與工程狀態，普通版本演進與修復歷程由 Git history 保存，不作為現行入口或規則。
