# HANDOFF｜TAKO 視覺改版對齊 `_design-reference.html`

日期：2026-08-05
範圍：把 TAKO App 的視覺實作改成與 `_design-reference.html` 一致，並同步所有相關文件。

## 0. 接手前要知道的三件事

1. **視覺層的唯一依據是 `_design-reference.html`**（本目錄下）。它是 Design 端的實際渲染成品。`SPEC.md` 是它的文字化，`TAKO_架構.md` 第五章是產品正典的視覺條款。三者衝突時的順位：**`_design-reference.html` ＞ `SPEC.md` ＞ `TAKO_架構.md` 第五章**。
2. **基準檔內有六輪探索，TURN 6 在檔首、最新。** TURN 5 的 `5a`（390×844 的 WORK 頁）是唯一的完整頁面模型，元件與材質的對應以它為準。TURN 4 曾寫「所有卡片用 GLASS」，已被 TURN 5 推翻（主卡片是 ICE）。TURN 2／1 是近黑底探索，已否決，不得引用。
3. **`test.html` 目前 69／72，三項未通過，這不是程式缺陷** — 三項都是測試在斷言改版前的值。詳見第 4 節，需 Tako 裁決。

## 1. 改了哪些檔案，各改了什麼

### `style.css`（全檔改寫）

- `:root` 全面對齊基準的實際渲染值：底色雙層漸層、四個材質變數、DEW、十一個情境文字色、五級圓角（卡片 12／小格 10／按鈕輸入 9／chip 7／大容器 20）、版面節奏（`--block-gap: 17px`、`--card-gap: 15px`、`--nav-height: 84px`）。
- **移除 `--silver`**。基準的頁首字標是純色 `#2E3439` 等寬字，不是金屬漸層填字。移除後全系統沒有任何漸層填進文字。
- 新增 `--t-ground-mono: #2E3439`（銀底上的等寬字：字標、小格數值）與 `--ground-solid: #9CA5AC`（漸層中段實色，只供 SVG `fill` 使用）。
- **材質重新指派**（這是本次最大的改動）：
  - 打卡按鈕由 GLASS 改回 **ACT**。基準 `6a` 的 36px 打卡鍵是實心墨 — 尺寸與材質是兩個獨立維度，把主要動作縮小不等於降級成次要動作。
  - 「上班中」狀態**拿掉容器**。基準沒有 chip，只有一顆 9px 琥珀珠加等寬小字直接坐在卡片上。`.status-pill` 這個 class 名是歷史殘留。
  - 本月營收由 GLASS 小格改成**獨立 ICE 卡片**。
  - 營收目標由 44px 滿寬 DEBOSS 橫列改成**卡片標題列右側的 26px DEBOSS chip**（radius 7px，命中區用 `::before { inset: -9px 0 }` 補到 44px）。
  - **卡片內部的「列」一律拿掉材質**，只用 `border-top: 1px solid var(--line)` 分隔。適用：工作段列、帳戶管理列、書單列、已完成待辦、收合列（`.project-summary` / `.task-summary`）、收合群組（`.recess-group`）、展開後的細節區塊（`.project-details` / `.task-details`）。
  - 這一項同時解掉四層嵌套：基準的 DEBOSS 只給「可填或可設定的東西」，收合列不屬於這層；做成 DEBOSS 會與內含的輸入框疊成四層。
- GLASS **移除外投影** `0 3px 10px`，只留下緣 inset 切線（基準 `5a` 的 GLASS 沒有外投影）。
- 導覽列：項目 50px、nav padding `8px 6px calc(8px + max(18px, safe-area))`、標籤 mono 10.5px、移除項目圓角。
- 字級字距全面對齊基準：hero 主數字 32px／卡片級 26px／一律 `letter-spacing: -.02em`；區段標籤 mono 10px `.2em`；欄位標籤 mono 10px `.18em`；狀態 mono 10.5px；頁面標題 27px。
- 新增 `@font-face`（IBM Plex Mono 400／500，指向 `./fonts/`）。
- 新增版面：`.hero-row` / `.hero-value` / `.hero-unit`（主數字與單位 baseline 對齊）、`.money-input`（46px DEBOSS 外框含 `$` 前綴）、`.stat` / `.stat-row`（三格 GLASS 小格）、`.sessions-card` / `.session-row`、`.button-mono`（SCHEDULE 這類刻字型按鈕）。

### `index.html`

- 頁首版本號由 `v0.4.0` 改為 `0.4.0`（基準無 `v` 前綴）。
- `<meta name="theme-color">` 由 `#A4AAB0` 改為 `#9CA5AC`。
- 加 `<link rel="preload">` 給 500 字重的 woff2；`app.js` 查詢字串升到 `?v=0.4.1`。
- 導覽列第三格由 `PROJECTS` 改為 `PROJ`（基準用短詞）。
- **WORK 頁依基準 `5a` 重排**，由原本的兩塊拆成四塊：
  1. `#work-card`（SHIFT）— 標題列只有 `01 · SHIFT` 一行 mono 刻字（**移除中文 h3**）＋ 狀態；主數字列（今天累計 + 單位在右 + 36px ACT 打卡鍵）；今日營收（label + `$` 前綴 + DEBOSS 46px）。
  2. `#work-summary`（本月營收）— ICE 卡，標題列右側 26px DEBOSS 目標 chip；主數字 + 達成率；琥珀進度條。
  3. `.stat-row` — 時薪／本週／本月 三格 GLASS。
  4. `.sessions-card`（今日工作段）— 標題列右側顯示段數，工作段列在內。
- SCHEDULE 按鈕改 `button-mono`，文字由 `Schedule` 改為 `SCHEDULE`。

### `app.js`（只動四處純顯示邏輯）

`data-store.js` **完全未動**。沒有觸及資料模型、義務／事件結構、記帳規則或狀態機。

1. `renderTodaySummary()` — 算 `本月營收 ÷ 目標` 的比例，寫入 `#work-revenue-percent` 的文字。
2. `renderTodaySummary()` — 同一比例寫入 `#work-revenue-bar` 的 `style.width`。
3. `renderWorkSessions()` — 寫入 `#work-session-count` 的「N 段」。
4. `renderWorkSessions()` — 打卡按鈕文字由「上班打卡／下班打卡」改為「上班／下班」，空狀態句子同步。

另在 `queryElements()` 的 id 清單補上這三個新元素。比例只驅動顯示，不寫入任何資料。

### `data-core.js`（只動一個格式函式）

- `formatMinutes()` 的輸出由「N 小時 M 分」改為基準的 `h:mm`：小時不補零、分鐘補兩位、零值 `0:00`、null 仍是 `—`。
- 八個呼叫點都是「分鐘數的時長」（今日工時、工作段時長、睡眠總時數、REVIEW 的平均睡眠／總工時／每日睡眠與工時），共用同一格式，**未分出第二個函式** — 同一個數字在 WORK 顯示 `9:30`、在 REVIEW 顯示「9 小時 30 分」會更難讀。時長與時鐘時間並置的疑慮，基準自己已經給了答案（工作段列同一行就是 `09:30 — 12:00` 與 `2:30`）。
- 沒有任何測試斷言 `formatMinutes()` 的輸出；改前改後 `test.html` 的失敗項完全相同。

### `.gitignore`

- 加入 `_design-reference.html` 與 `*.zip`。這是公開 repo，這兩項含 Design 對話與知識庫內容，不得公開。
- 兩者仍留在本機工作目錄，只是不進版控。**`_design-reference.html` 是視覺基準，施工時必讀** — 它不在 git 裡，換機器或重新 clone 時要另外取得。

### `sw.js`

- `CACHE_NAME` 升到 `life-calibration-v0.4.1`，`APP_SHELL` 內的 `app.js` 查詢字串同步。
- `APP_SHELL` 加入兩個 woff2。

### `manifest.json`

- `theme_color` 與 `background_color` 都改為 `#9CA5AC`（`background_color` 原為 `#0B0C0D`，是深底時代的殘留）。

### `fonts/`（新增目錄）

- `ibm-plex-mono-400.woff2`（14,708 bytes）、`ibm-plex-mono-500.woff2`（14,888 bytes）。latin 子集，取自 Google Fonts 為 IBM Plex Mono v20 產生的 woff2。
- `LICENSE.txt` — SIL OFL 1.1 與來源說明。

### 文件

| 檔案 | 改了什麼 |
|---|---|
| `SPEC.md` | 改寫為 v2。改成「描述實作後的實際狀況」而非應然規範；宣告基準為唯一依據並說明六輪的取捨；新增**第三節「材質層與元件對應」**（v1 完全缺這塊，是上一輪自行推導的來源）；尺寸與材質解耦；`--silver` 廢止；圓角改成五級實際值；補上字型自帶的事實；新增第七節「基準有但未實作」與第九節「停下來回報」。 |
| `TAKO_架構.md` | 檔頭加上視覺基準的順位宣告；第二章 WORK 列改成四塊結構、雷達珠 7px→9px；第五章色票表移除 `--silver`、加 `--t-ground-mono` 與 `--ground-solid` 與圓角；「金屬的位置」改成字標純色、章魚 `opacity: .9`；「材質分層與尺寸階層」加上「卡片內部的列沒有材質」與「尺寸與材質是兩個獨立維度」；「字體與圖示」改成字型已自帶；語言章的分頁名改 `PROJ`。 |
| `README.md` | 五分頁描述對齊實況（MONEY 餘額列唯讀、WORK 四塊、DATA 含帳戶管理、PROJECTS 顯示 `PROJ`）；新增「視覺層」段落說明三份文件的順位與字型自帶。 |
| `TAKO_專案入口.md` | 補上視覺基準、SPEC v2、順位與本檔位置。 |
| `STATUS.md` | 版本段說明「v0.4.0 功能 + 視覺改版，資產升到 0.4.1」；新增視覺改版的驗收狀態，含 `test.html` 69／72 的三項與原因；新增資產段與兩條 `#待補`。 |
| `DEPLOY.md` | iPhone 安裝檢查改成 `PROJ`；新增一條檢查等寬字有沒有正確載入。 |

## 2. 基準有但仍未實作的項目，及原因

| 項目 | 基準 | 現行 | 原因 |
|---|---|---|---|
| 工作段列 | 唯讀兩欄 `09:30 — 12:00` / `2:30` | 「工作段 N・時長」標題 + 兩個帶標籤的時間輸入 + 移除連結 | markup 在 `app.js` 的 `renderWorkSessions()`，超出本次授權的四項顯示邏輯。材質已依基準改成無材質分隔列。 |
| 狀態文字 | `上班中` | `工作中・13:00` | `app.js` 字串，不在授權的四項內。 |
| 日期格式 | `8/4 TUE` | `8/5（週三）` | `app.js` 的 `Intl.DateTimeFormat`，不在授權的四項內。 |
| 時薪／本週／本月 | `$220` / `22.5h` / `96h` | 容器與版面已做，數值顯示 `—` | app 不計算這三項；依指示不編造計算邏輯。 |
| 目標 chip 的千分位 | `目標 60,000` | `目標 60000` | 基準是靜態文字，實作必須可編輯（架構.md 靈活原則）；`<input type="number">` 不支援千分位顯示。 |
| 雷達「逾期 N 天」 | — | `Overdue · 2026-08-02` | 字串由 `app.js` 的 `renderRadar()` 產生，不在授權的四項內。用 CSS 的 `::before` 硬加會變成「逾期 Overdue · …」。 |
| Auto-paid「自動」標記 | — | `.auto-tag` 的 CSS 已備好，無元素套用 | markup 在 `app.js` 的 `renderTransactions()`，不在授權的四項內。 |
| chip 28px 階 | GLASS 未選／DEBOSS 已選 | 只有營收目標一個 26px DEBOSS chip | 付款方式等仍是 44px DEBOSS `<select>`；基準沒有付款方式 chip 的對應物。 |
| 完整中英文盤點 | — | 只做了 `SPEC.md` 第五節表列的項目 | 需逐頁盤點後裁決。 |

## 3. 停下來回報、沒有自行決定的項目

1. **其他卡片的中文 h3。** 基準只顯示 SHIFT 卡，它的標題列只有 `01 · SHIFT` 一行 mono 刻字，沒有中文副標；`#work-card` 已照做。但 `#money-card`（`QUICK ADD` + `Add transaction`）、恢復卡（`03・恢復` + `什麼讓你恢復一點？`）在基準裡沒有對應物 — 恢復卡的中文標題是提問，不是重複的標題。一律保持原狀，未自行刪除。
2. **`02・睡眠` / `03・恢復` 的分隔符與語言。** 基準只給了 `01 · SHIFT`。02、03 要不要也改成英文刻字、`・` 要不要統一成 ` · `，基準沒有依據。
3. **到期雷達的整體版面。** 基準沒有雷達的模型。現行沿用「一張 ICE 卡片 + `--line` 分隔列 + 排序表達強度」的既有作法，未改動。
4. **一頁一顆 ACT。** 基準 `5a` 的 WORK 頁只有一顆 ACT。現行 DATA 頁的 Export JSON、WORK 開課表後的 Add schedule、PROJECTS 的多個表單送出鍵都是段落級主動作。要收斂成一頁一顆需重排頁面結構，基準沒有這些頁面的模型。**已決定：暫不處理，留給 PROJECTS／REVIEW／DATA 三頁重排時一併做**，不單獨為了湊數量去動現有頁面。
5. **`test.html` 的視覺斷言。** 三個 test 未通過、共四條斷言要更新。見第 4 節。改測試等於施工者自行放寬驗收規格，未動。

## 4. 已知但未處理的問題

### `test.html` 69／72

三項未通過，全部是測試在斷言改版前的值。`data-store.js` 與 `test.html` 未被改動，`data-core.js` 只改了 `formatMinutes()` 的輸出格式（沒有任何測試斷言它）；資料層 69 項全數通過，且 `formatMinutes()` 改格式前後失敗項完全相同。

| 位置 | 斷言 | 現況 |
|---|---|---|
| `test.html:597` | `manifest.theme_color === "#A4AAB0"` | 已依基準改為 `#9CA5AC` |
| `test.html:613` | 全站不得有任何 `[placeholder]` | 基準的今日營收欄有 placeholder「輸入金額」 |
| `test.html:630` | 頁首必須含字串 `v0.4.0` | 已改為 `0.4.0`（基準無 `v` 前綴） |
| `test.html:631` | `script[src="./app.js?v=0.4.0"]` | 已改為 `?v=0.4.1`（與 630 同一個 test，被 630 先擋下） |

要不要把這四條斷言更新成新值，屬於驗收規格的變更，需 Tako 裁決。

### 未驗證的部分

- **iPhone 實機**：完全沒驗過。
- **`background-attachment: fixed` 疊多層 `backdrop-filter` 的捲動效能**：桌面 headless 正常，真手機（尤其舊機）可能掉幀。這是本次視覺最主要的效能風險。
- **Service Worker 的字型快取**：`sw.js` 的 `APP_SHELL` 已列入兩個 woff2，但沒有做離線斷網實測。
- **PWA 更新路徑**：`CACHE_NAME` 已升版，舊 client 應會在下次啟動時換快取，未實測。

### 其他

- **320px 下工作段的時間輸入框會截字**：`上午 09:30` 只顯示得出 `上午 09`。原因是 `.field input` 現在是等寬 16px＋左右 13px padding，在 `.inline-fields` 兩欄格中每欄只剩約 98px。不造成水平捲動，但可讀性受損。這是視覺改版帶進來的（改版前是 14.4px 非等寬）。尚未處理 — 修法是在 `@media (max-width: 389px)` 內把 `.inline-fields input[type="time"]` 的字級與 padding 調小，但那會動到全站輸入框的尺寸規則，超出授權範圍。
- **`.nav-item.is-active` 借用了 `--ink`。** 作用中分頁的文字色現在寫成 `color: var(--ink)`。基準 `5a` 該處的值確實是 `#16191B`，與 `--ink` 同值，所以**顏色沒有錯**；問題是 token 被連動了 — `--ink` 的職責是「主要文字色」，導覽列作用中狀態的職責是「你現在在哪一頁」，兩者沒有理由一起變。哪天為了正文可讀性調 `--ink`，導覽列會跟著變，而那不是任何人的本意。應該獨立成自己的 token（例如 `--t-nav-active`）。待處理。
- `.status-pill` 這個 class 名已名實不符（它不再是 pill，沒有容器）。未改名，以免動到 `app.js` 的 `classList.toggle("is-running")`。
- `_design-reference.html` 引用了一個不在 repo 內的 `support.js`（404）。缺它不影響渲染。
- `.card-accent`（`#work-card` 曾用）已在 HTML 中移除，CSS 裡的同名規則保留為無作用的中性值，未清掉。

## 5. 待辦清單（下一輪處理）

彙整所有已知、已討論、但這一輪沒有動的事。細節都在前面各節，這裡只給一個入口。

| # | 待辦 | 狀態 | 細節在 |
|---|---|---|---|
| 1 | **`test.html` 四條視覺斷言待更新** — `theme_color`（`#A4AAB0` → `#9CA5AC`）、`[placeholder]` 全站禁用（基準的今日營收欄有 placeholder）、頁首版本號（`v0.4.0` → `0.4.0`）、`app.js` 查詢字串（`?v=0.4.0` → `?v=0.4.1`） | 待 Tako 裁決。改測試等於施工者自行放寬驗收規格，不自行動 | 第 4 節 |
| 2 | **`02・睡眠` / `03・恢復` 是否改英文刻字、`・` 是否統一成 ` · `** | 待裁決。基準只給了 `01 · SHIFT`，02／03 沒有依據 | 第 3 節第 2 項 |
| 3 | **一頁一顆 ACT** | **已決定暫不處理**，留給 PROJECTS／REVIEW／DATA 三頁重排時一併做 | 第 3 節第 4 項 |
| 4 | **`--ink` 用在 `.nav-item.is-active` 是借用主要文字色** — 顏色值正確但 token 被連動，兩者沒有理由一起變。應獨立成自己的 token | 待處理 | 第 4 節「其他」 |
| 5 | **`SPEC.md` 與 `TAKO_架構.md` 職能重疊** — SPEC 已從「規格」變成「現況紀錄」，與架構.md 第五章講同一件事。依架構.md 第六章「同一件事只保留一份有效版本」，內容應併進架構.md 之後刪除 `SPEC.md` | 待下一輪處理。併檔時注意：`README.md`、`STATUS.md`、`TAKO_專案入口.md`、本檔都指向 `SPEC.md`，要一起改 | — |
| 6 | **`_design-reference.html` 施工完成後應移出工作目錄或移進 `_backups/`** — 它含 Design 對話內容，已被 `.gitignore` 擋在版控外，但仍留在公開 repo 的工作目錄裡 | 待處理。移走前確認接手者已知道它是視覺基準（本檔第 0 節） | 第 1 節 `.gitignore` |
| 7 | 320px 下工作段時間輸入框截字 | 待處理，修法已寫明 | 第 4 節「其他」 |
| 8 | iPhone 實機驗收、離線斷網字型快取、`backdrop-filter` 捲動效能 | 未驗證 | 第 4 節「未驗證的部分」 |

## 6. 驗收怎麼做的

- 環境：本機 `python -m http.server` + headless Chrome 150 走 CDP，非 file:// 直開。
- **五個分頁 × 320／375／820 三個寬度 = 15 組**：console 無 error、無水平捲動、無殘留白底元素（掃全樹 computed style，`rgb > 235` 且 alpha > .85 判定）。
- **WORK 頁與基準 TURN 5 的 `5a` 做 390×844 並排截圖比對**，種入與 `5a` 相同的情境（兩段工作段其中一段進行中、本月營收 38,400、目標 60,000 → 64%）。
- **字型**：`document.fonts` 回報 `IBM Plex Mono 400 loaded` 與 `500 loaded`，`document.fonts.check('500 32px "IBM Plex Mono"')` 為 true，且是從 `./fonts/` 載入而非 CDN。
- **合成後對比實測**（375px，截圖回灌 canvas 取面色眾數，避開文字筆畫）：`--t-nav-idle` 6.77:1、`--t-ice-label` 5.29:1、`--t-ice-sub` 5.73:1、`--ink` on ICE 11.76:1、`--t-deboss-on-ice` 4.65:1、`--t-deboss-on-ground` 4.85:1、`--t-frozen` 3.89:1（刻意的例外）。
- `test.html`：69／72，三項原因見第 4 節。
