# HANDOFF｜TAKO 工程現況

更新：2026-08-10（TASKS completion checkbox 施工完成，待 Draft PR 驗收）

**這是單一現況文件，不是日誌。** 只寫三種東西：接手前非知道不可的事、與視覺基準的刻意偏離、還沒處理的事。
「改了哪些檔案、各改了什麼」由 git history 承擔，本檔不留附錄也不留歷史版本。

---

## 0. 接手前非知道不可的四件事

### 0.1 視覺基準已經不在這個目錄裡

視覺層的唯一依據是 `_design-reference.html`（Design 端的實際渲染成品）。**2026-08-06 移出本工作目錄**，現位於 repo 的兄弟目錄：

```
C:\Users\user\OneDrive\文件\Claude\Projects\_backups\_design-reference.html
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
- `data-store.js` 自視覺改版起全程未動。

---

## 1. 現行工程狀態

- **功能版本號維持 `0.6.0`**（`index.html` 頁首）、**資產版本號為 `0.4.10`**。`CACHE_NAME`、`index.html` 與 `sw.js` 內的 `style.css?v=`／`app.js?v=` 五處相等；規則見 `DEPLOY.md`〈兩個版本號，各自跳各自的〉。
- **`test.html` 96／96 全綠。**
- 頂層五頁已改為 `MONEY / WORK / TASKS / REVIEW / DATA`；PROJECTS 以單一 ICE 主卡搬入 WORK 的 SESSIONS 後、SLEEP 前，TASKS 依序為 RADAR／TO-DO／AUTO PAYMENT／FROZEN／BOOKS。
- PR #7 已合併，merge commit 為 `425d110e57fd235a675dea7028d87e27e5f47587`；銀灰材質資產 `0.4.9` 已進 `master`。本輪分支 `codex/compact-task-done-checkbox` 以該 commit 為基線，尚未 merge 或部署。
- TASKS 的人工完成入口（RADAR 與 TO-DO expanded）統一為無文字的 compact completion checkbox；可見框 21px、按鈕命中區 44×44px，並保留動態 `aria-label`。`Update mileage`、completion handler、recurrence、MONEY transaction、Done／Undo 與 schema 都未變。
- 同引擎 390×844 實測證明：最新 master 的 GROUND、ICE、GLASS、DEBOSS、ACT token 與 computed style 已對齊 Design 5a，GROUND 四點逐像素相同或只差 1 RGB；偏暖不是色票或 body 合成座標造成。
- 可重現根因是舊 Service Worker／HTTP cache 混用資產：正式 GitHub Pages 的 `style.css` 為未版本化 URL，且回應 `Cache-Control: max-age=600`。現改為 `style.css?v=0.4.9`，與 cache／app 版本共用同一鍵；舊 origin 已實測由 `0.4.8` 更新到 `0.4.9`，離線 warm-cache 與新分頁啟動都成功。
- Tako 已在 iPhone 真機確認銀灰頁面捲動正常，沒有背景跳動或接縫；`backdrop-filter` 與 fixed background 的捲動風險不再是 blocker。顏色後續主觀微調另案處理，不影響本輪 checkbox 驗收。

### 驗收怎麼做的

- 環境：本機 `python -m http.server` + Browser runtime，非 `file://` 直開；Service Worker 測試要使用乾淨 origin，避免舊 localhost 快取混入不同資產版本。
- 五個分頁 × 320／375／390／393／820 px 共 25 組：console 無 error、無水平捲動、bottom nav 五格完整。
- TASKS completion checkbox 另以 320／375／390／393／820 px 實測：RADAR 與 TO-DO expanded 的按鈕皆為 44×44px、可見框 21×21px、沒有可見 `Mark done`，`Update mileage` 保留，五個寬度皆無水平 overflow。月循環完成後下一期、MONEY 交易、Done 與 Undo 已逐步操作通過，console error 為 0。
- **寬度掃描一律要納入 390 與 393** —— 那是 iPhone 14／15／16（390）與 15 Pro／16 Pro（393、402）的實際寬度。批次 A 之前只掃 320／375／820，正好漏掉這一段。
- 對比實測：截圖回灌 canvas 取面色眾數，避開文字筆畫。**取值位置必須是該 token 可能出現的最暗合成背景**，不是卡片頂端（見架構.md 第五章「token 的色碼必須在最暗合成背景上取值」）。
- 現行實測值記在 `style.css` 的 `:root` 註解裡，以那裡為準：`--t-ice-label` 4.67:1、`--t-frozen` 3.38:1（刻意的 3:1 例外）、圖表最淺一階 3.09:1、相鄰兩階 1.34:1。

### 1.1 [1] 問題回報區結案候選

- **弱網啟動**：根因是舊 Service Worker 對所有 GET 採沒有 timeout 的 network-first；裝置仍顯示有網路但 request stalled 時，快取永遠輪不到。現行策略只對 App 入口 navigation 與版本化 app shell 採 cache-first；`style.css` 與 `app.js` 都帶資產版本 query，其他請求保留 3 秒 bounded network-first。新 `CACHE_NAME` 安裝時仍重建完整 app shell，舊 cache 由 activate 清掉，不會把新版本永久鎖死。`test.html` 不是 App 入口，不會被離線 navigation fallback 誤導到 `index.html`。
- **Safe Delete**：只有「所有相關事件皆為 pending，且沒有 event／transaction 連結歷史」的 obligation 可永久刪除；刪除時只移除 obligation 與其 pending events。done、auto-paid 或任何 linked MONEY transaction 一律阻止 hard delete，介面不顯示 Delete 並保留 Archive。判斷與刪除都在 `data-core.js`／`data-store.js`，不只靠 DOM。
- **Card payment / Auto payment**：Card payment 維持唯一一筆未封存的 manual transfer（主帳戶 → 信用卡）；Auto payment 正規化為 `handling=auto`、`completionMode=expense`、`paymentMethod=card`，可建立多筆。非法 Auto + Transfer 在 UI 與資料正規化層都會收斂；第二筆 Card payment 由資料層與中文錯誤訊息阻止。
- **Auto payment 區**：TASKS 內的獨立區段只列 active automatic obligations；人工 dated／later／no-date TO-DO 不再重複列出。展開後可 Edit／Freeze／Archive，無歷史時才可 Safe Delete；最近一次 Auto-paid 日期／金額由既有 event 與 transaction 推導，沒有新增重複資料。
- **資料模型**：schema 仍為 v3，`DATA_VERSION` 未變；MONEY 仍是 accounting 正典。多筆同日 Auto payment 各自生成 transaction、event link 與下一期 recurrence，交易 title 保留 obligation name。
- **驗證**：PR #5 基線原有 regression 92／92；本次 IA 加測後為 95／95，四個 JS 檔 `node --check` 通過。弱網驗證數據維持：正常 online 170ms、warm-cache origin 不可達 115ms、伺服器每次 GET 延遲 20 秒時兩次啟動 127ms／125ms。
- **功能版本已定案**：Tako 已裁決問題回報區功能版本為 `0.6.0`；PR #5 當時資產版為 `0.4.7`，本次 IA 因修改 JS／CSS 依規則升為 `0.4.8`。
- **架構文件**：repo 外正式 `TAKO_架構.md` 已同步第二章 TASKS 的 Auto payment 獨立區、第三章 obligation/event（Safe Delete）及第四章自動扣款／卡費模型的現行條文。

### 1.2 頂層 IA 重構現況

- `page-projects`／`data-page="projects"`／第三格 `PROJ` 已退役，現為 `page-tasks`／`data-page="tasks"`／第三格 `TASKS`。
- `setPage("work")` 的責任是 `renderToday()` + `renderProjects()`；`setPage("tasks")` 只呼叫 `renderCommitments()`。Project CRUD 與 commitment renderer 仍彼此獨立。
- WORK 的 PROJECTS 主卡保留 ACTIVE／PAUSED、New project、Project form、收合／展開與 Delete；內層 form 和 expanded details 不再套第二張 `.card`。
- Browser 已實際驗證 PROJECTS 新增／修改／PAUSED／Delete，以及 TASKS 的 RADAR／TO-DO／Mark done／Undo／AUTO PAYMENT／FROZEN／BOOKS。
- schema 仍為 v3，沒有 migration；`data-core.js`／`data-store.js` 本次未修改。

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
| 1 | **iPhone completion checkbox 與原生控制項實機驗收** | 未驗證 | 銀灰 fixed background 的捲動、跳動與接縫已由 Tako 真機確認正常；本輪新的 44×44px checkbox 仍需在 merge／部署後以 iPhone PWA 驗收，既有原生時間／日期控制項也不得只靠桌面 Browser 宣告通過 |
| 2 | **一頁一顆 ACT** | 已決定暫不處理 | DATA 的 `Export JSON`、WORK 的 `Add schedule`／New project、TASKS 的多個表單送出鍵都是段落級主動作。要收斂成一頁一顆需重排頁面結構；留給 REVIEW／DATA 的後續 IA 一併裁決 |
| 3 | **REVIEW / DATA 的資訊架構** | 未設計 | PROJECTS 搬入 WORK 與 TASKS 重組已完成；REVIEW／DATA 目前只有依材質判準套用，版面本身尚未經專門設計 |
| 4 | **DEW 珠的尺寸** | 未定案 | 基準 `5a` 用 9px、`6a` 用 7px，現行取 9px。兩輪不一致，基準本身沒有裁決 |
| 5 | **`index.html:7` 的 `<meta name="description">` 仍是中文** | 批次 C 新發現，未處理 | 內容為「手機優先、資料留在本機的人生記錄工具。」。它不是介面元素，不確定該不該套用「介面預設英文」的語言規則，待 Tako 裁決 |

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
