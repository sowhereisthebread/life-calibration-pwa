# TAKO 視覺規格 v2｜SPEC.md

生效對象：`sowhereisthebread/life-calibration-pwa`（branch `master`）

**唯一視覺基準是同目錄的 `_design-reference.html`。** 本檔描述的是依該基準施工後 `style.css` / `index.html` 的**實際狀況**，不是應然規範。本檔與基準衝突時以基準為準；本檔與 code 不一致時，兩邊都要改到一致為止。

基準檔內有六輪探索，**TURN 6 在檔首、最新**：

- **TURN 6** — 尺寸階層四階、打卡按鈕三種配置（採用 `6a`）、中英文規則。
- **TURN 5** — 材質六層的定義，以及 `5a` 那台 390×844 的完整 WORK 頁。**`5a` 是唯一的完整頁面模型**，元件與材質的對應關係以它為準。
- **TURN 4** — ICE 與 GLASS 的判準、章魚四種處理（`4b` 凹刻已被 `5a` 採用）。TURN 4 曾寫「所有卡片用 GLASS」，**已被 TURN 5 的 `5a` 推翻**（主卡片是 ICE）。
- **TURN 3** — 銀灰底成立、字壓到 `#16191B`、琥珀降到 `#B4791C`。
- **TURN 2 / 1** — 近黑底探索，已否決，不得引用。

`_design-reference.html` 引用了一個不在 repo 內的 `support.js`。缺它不影響渲染（`<x-dc>` / `<helmet>` 是未知元素，內含的 `<style>` 與 `<link>` 照常生效）。

---

## 適用範圍與權限

**顏色、視覺、材質、UI、UX、頁面配置** — 已預先授權，直接施工。與 `TAKO_架構.md` 正文不一致時以基準與本檔為準。

**資料模型、義務／事件結構、記帳規則、狀態機行為** — 不在授權範圍。`data-store.js` 完全未動；`data-core.js` 只動過一個純顯示的格式函式 `formatMinutes()`；`app.js` 只動過四處純顯示邏輯（見第六節）。

---

## 一、設計前提

這套視覺解決三個已診斷的問題：

1. **值域太窄**：舊 `--ground #A4AAB0` → `--card #C6CBD0` 只差約 9 個明度單位，全部擠在中段。
2. **層級反了**：`.primary-number` 曾套 `--silver` 漸層 clip，最重要的數字看起來像被停用。
3. **可填與不可填長得一樣**：輸入框、設定值、按鈕都用「淡描邊 + 淺底」。

解法是**材質分層**：每一種表面只負責一種物理狀態，使用者靠「凹的／凸的／透的」判斷可操作性。

三條總則（與基準一致）：

- **光澤放在表面與邊緣，不放在文字上。** 任何漸層都不得填進字裡。
- **一個畫面最多三層**：GROUND → ICE → GLASS 或 DEBOSS。DEW 與 ACT 是元件，不算層。
  基準對此的實作方式是關鍵：**卡片內部的「列」沒有材質**，只用 `--line` 分隔。所以「ICE 卡片 → 列 → DEBOSS 輸入框」仍然只有三層。
- **色碼必須在合成後的實際背景上量過才可使用。**

### 變數命名

材質層 `INK` 在正式變數中改名為 `ACT`（`--m-act` / `.act`），因為 `--ink` 已經是既有的主要文字色。基準檔 TURN 5 仍寫 `05 · INK — 動作`，指的是同一層。

---

## 二、Token 表（現行 `:root` 實況）

### 2.1 底色與材質

| Token | 值 | 用途 | 材質層 |
|---|---|---|---|
| `--ground` | `linear-gradient(168deg,#AEB6BB 0%,#9CA5AC 46%,#8A939A 100%)` | 頁面底色 | 00 GROUND |
| `--ground-light` | `radial-gradient(125% 62% at 78% -8%,rgba(255,255,255,.6) 0%,rgba(255,255,255,.14) 44%,transparent 70%)` | 右上光源，疊在 `--ground` 上 | 00 GROUND |
| `--ground-solid` | `#9CA5AC` | 漸層中段實色。**只供不吃漸層的屬性使用**（圓餅圖中心孔的 SVG `fill`），不作為底色 | — |
| `--m-ice` | `rgba(240,247,251,.47)` | 主卡片、底部導覽列 | 01 ICE |
| `--m-glass` | `linear-gradient(163deg,rgba(255,255,255,.34) 0%,rgba(255,255,255,.12) 38%,rgba(255,255,255,.2) 100%)` | 次要按鈕、躺在銀底上的小格 | 02 GLASS |
| `--m-deboss` | `rgba(46,56,64,.07)` | 可填或可設定的東西 | 03 DEBOSS |
| `--dew` | `#B4791C` | 狀態珠、進度條填充、作用中分頁底線 | 04 DEW |
| `--dew-track` | `rgba(46,56,64,.16)` | 進度條軌道 | 04 DEW |
| `--m-act` | `linear-gradient(180deg,#3A4147 0%,#2A3036 100%)` | 主要動作按鈕 | 05 ACT |
| `--line` | `rgba(46,56,64,.11)` | 分隔線（卡片內的列） | — |
| `--shadow-card` | `0 2px 8px rgba(46,56,64,.1)` | ICE 的外投影 | — |

**`--silver` 已從 `:root` 移除。** 基準的頁首字標是純色 `#2E3439` 等寬字，不是金屬漸層填字；移除後全系統沒有任何漸層填進文字。

**`--card` / `--recess` / `--sub` / `--label` / `--alarm` 已廢止**，不在 `:root` 內。

### 2.2 文字色（依堆疊情境綁定）

每個值只在它標註的堆疊情境下達到 4.5:1；換情境必須換值。

| Token | 值 | 用途 | 綁定堆疊情境 |
|---|---|---|---|
| `--ink` | `#16191B` | 主要文字、主數字 | 任何情境（≥ 7:1） |
| `--t-ground-label` | `#2E353B` | 標籤、小字 | 裸銀底 |
| `--t-ground-body` | `#2A3036` | 正文 | 裸銀底 |
| `--t-ground-mono` | `#2E3439` | 銀底上的等寬字：頁首字標、三格小格的數值 | 裸銀底／GLASS |
| `--t-ice-label` | `#4A5259` | 區段標籤 | ICE 面上 |
| `--t-ice-sub` | `#454D53` | 次級文字、單位、狀態 | ICE 面上 |
| `--t-nav-idle` | `#3F464C` | 導覽列非作用分頁 | ICE 面上，銀底最暗端 |
| `--t-deboss-on-ice` | `#464E54` | placeholder、設定值 | ICE 之上的 DEBOSS |
| `--t-deboss-on-ground` | `#2E353B` | placeholder、設定值 | 裸銀底上的 DEBOSS |
| `--t-on-act` | `#F2F5F6` | ACT 按鈕上的字 | ACT 之上 |
| `--t-frozen` | `#5E666D` | 冷凍項目（唯一 3:1 例外） | ICE 面上 |

實測（headless Chrome 合成後取面色眾數，375px）：`--t-nav-idle` 6.77:1、`--t-ice-label` 5.29:1、`--t-ice-sub` 5.73:1、`--ink` on ICE 11.76:1、`--t-deboss-on-ice` 4.65:1、`--t-deboss-on-ground` 4.85:1、`--t-frozen` 3.89:1。

三條使用規則：

1. **畫面下半部不要讓文字直接躺在裸底上。** 銀底越往下越暗，同一個灰在上半部合格、下半部不合格。
2. **改任何材質的不透明度後，坐在它上面的所有文字色必須重新推導。**
3. **小標籤下限 10px。**

### 2.3 圓角（取自基準的實際值）

| Token | 值 | 用途 |
|---|---|---|
| `--radius` | `12px` | 卡片 |
| `--radius-sm` | `10px` | 小格、章魚 |
| `--radius-control` | `9px` | 按鈕、輸入框 |
| `--radius-chip` | `7px` | 28px 以下的 chip |
| `--radius-lg` | `20px` | 大容器（桌面外框、彈窗） |

### 2.4 字體

| 項目 | 值 |
|---|---|
| 介面文字（中文與句子） | `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif` |
| 數字與英文標籤 | `"IBM Plex Mono", ui-monospace, "SF Mono", monospace` |
| 字重上限 | `500` |
| 主數字 | 今天累計／本月支出等 hero 數字 `32px`；卡片級主數字 `26px`；一律 `letter-spacing: -.02em` |
| 小標籤 | `10px`，字距 `.12–.2em` |
| 數字對齊 | `font-variant-numeric: tabular-nums` |

**IBM Plex Mono 已自帶進 repo**：`fonts/ibm-plex-mono-400.woff2`（14,708 bytes）與 `fonts/ibm-plex-mono-500.woff2`（14,888 bytes），latin 子集，取自 Google Fonts 產生的 IBM Plex Mono v20，授權 SIL OFL 1.1（`fonts/LICENSE.txt`）。兩檔已列入 `sw.js` 的 `APP_SHELL`，`index.html` 對 500 字重下了 `<link rel="preload">`。**不依賴 CDN**，離線可用是產品邊界。

### 2.5 版面節奏

| Token | 值 | 用途 |
|---|---|---|
| `--block-gap` | `17px` | 頁面主要區塊之間 |
| `--card-gap` | `15px` | 卡片內部 |
| `--nav-height` | `84px` | 底部導覽列（8 + 50 + 26） |

`.app-shell` padding：`calc(16px + safe-area-top) 20px calc(84px + 28px + safe-area-bottom)`；≤389px 時左右縮到 14px。

---

## 三、材質層與元件對應

**這一節是 v1 缺的部分。** 基準只給了材質的 CSS，沒有給「哪個元件套哪一層」；下表是依 `5a` 的實際渲染整理出來的對應關係，也是現行 `style.css` 的實況。

### 3.1 判準

| 層 | 判準 | 基準 `5a` 裡的實例 |
|---|---|---|
| 01 ICE | 內容會從它下面滑過去、需要被糊掉 | 三張主卡片、底部導覽列 |
| 02 GLASS | 躺在底色上、不需要遮蔽任何東西的次級元件 | SCHEDULE 按鈕、時薪／本週／本月三格 |
| 03 DEBOSS | **可填或可設定的東西** | 章魚、「輸入金額」欄、「目標 60,000」chip |
| 04 DEW | 狀態珠、進度條、作用中底線 | 上班中的珠、營收進度條、導覽列底線 |
| 05 ACT | 主要動作按鈕 | 「下班」 |
| （無材質） | **卡片內部的列** | 今日工作段的兩列，只有 `border-top: 1px solid var(--line)` |

**收合列、列表列、展開後的細節區塊都不是 DEBOSS。** 基準的 DEBOSS 只給可填的東西；把收合列做成 DEBOSS 會在 ICE 卡內產生第二個凹面，且與內含的輸入框疊成四層。

### 3.2 現行元件對應

| 材質 | 現行選擇器 |
|---|---|
| ICE | `.ice, .card, .notice, .radar-list, .modal-panel, .frozen-section, .review-day, .metric` |
| GLASS | `.glass, .stat, .account-item, .transfer-summary, .statement-compare > div, .card .metric, .button-secondary, .button-quiet, .button-danger` |
| DEBOSS | `.deboss, .field input, .field select, .field textarea, .record-input, .date-control, .money-input, .target-field, .brand-icon` |
| DEW | `.dew-dot, .dew-bar, .dew-bar > i, .status-pill.is-running::before, .radar-item.is-soon strong::before, .nav-item.is-active::after, .book-item.is-current::before` |
| ACT | `.act, .button-primary, .shift-punch, .toast, .skip-link` |
| 無材質（分隔線） | `.record-row, .session-row, .manager-row, .book-item, .task-item.is-done, .project-summary, .task-summary, .project-details, .task-details, .recess-group, .radar-item, .transaction-row, .no-date-group, .mileage-fields, .obligation-form` |

`.metric` 在 GROUND 上是 ICE、在卡片內（`.card .metric`）是 GLASS — 同一個 class 依所在層改材質。

### 3.3 材質 CSS（現行實況）

```css
/* 01 ICE — 面 */
background: var(--m-ice);
border: 1px solid rgba(255,255,255,.5);
border-top-color: rgba(255,255,255,.92);
border-radius: var(--radius);
backdrop-filter: blur(22px) saturate(1.15);
box-shadow: inset 0 1px 0 rgba(255,255,255,.55),
            inset 0 -1px 0 rgba(46,56,64,.07),
            var(--shadow-card);

/* 02 GLASS — 片。基準沒有外投影，只有下緣切線 */
background: var(--m-glass);
border: 1px solid rgba(255,255,255,.34);
border-top: 1px solid #fff;
border-radius: var(--radius-sm);
backdrop-filter: blur(5px) saturate(1.2);
box-shadow: inset 0 -1px 0 rgba(38,48,56,.13);

/* 03 DEBOSS — 洞 */
background: var(--m-deboss);
border: 0;
border-radius: var(--radius-control);
box-shadow: inset 0 1px 2px rgba(38,48,56,.22),
            inset 0 -1px 0 rgba(255,255,255,.5);

/* 04 DEW — 珠。實色，禁止 radial 高光與 inset 陰影 */
.dew-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--dew); }
.dew-bar { height: 6px; border-radius: 3px; background: var(--dew-track);
           box-shadow: inset 0 1px 2px rgba(38,48,56,.18); overflow: hidden; }
.dew-bar > i { display: block; width: 0; height: 100%; border-radius: 3px; background: var(--dew); }

/* 05 ACT — 動作 */
background: var(--m-act);
border: 0;
border-radius: var(--radius-control);
color: var(--t-on-act);
font-weight: 500;
box-shadow: inset 0 1px 0 rgba(255,255,255,.16),
            0 2px 5px rgba(30,36,41,.26);
```

GLASS 的不透明度必須低於 ICE — 反過來的話「疊在內容上」時 GLASS 會遮得更死。
主要動作不得使用淡描邊或淡凹陷樣式，會與 DEBOSS 輸入框同貌。
材質不只有底色：每層還需要邊框、上緣高光與陰影才成立。

---

## 四、尺寸階層

四階。**尺寸與材質是兩個獨立維度**：材質由「角色」決定，尺寸由「密度」決定。

| 階 | 高度 | 常見材質 | 用途 |
|---|---|---|---|
| 主要動作 | `46px` | ACT | 表單送出、Export JSON 這類段落級主動作 |
| 次要動作 | `36px` | GLASS，**但主要動作縮到 36px 時仍是 ACT** | SCHEDULE、Mark done、Edit 等 |
| chip | `28px`（現行 26px） | GLASS（未選）／DEBOSS（已選或可設定） | 營收目標 |
| 輸入框 | `44px`（金額欄 46px） | DEBOSS | 金額、Item、設定值 |

**v1 曾把尺寸與材質綁死（46px = ACT、36px = GLASS），與基準不符，已取消。** 基準 `6a` 的打卡按鈕是 36px 的 ACT：把主要動作縮小是為了讓它旁邊的數字變成主角，不是把它降級成次要動作。判準是角色，不是高度。

### 觸控區規則

**觸控區用透明 padding 補到 44px，不是把按鈕畫大。** 視覺尺寸表達重要性，命中區表達可觸控。

```css
.button-secondary::before { position: absolute; inset: -4px 0; content: ""; }  /* 36 + 4 + 4 = 44 */
.target-field::before     { position: absolute; inset: -9px 0; content: ""; }  /* 26 + 9 + 9 = 44 */
```

### 狀態指示不是 chip

基準 `5a` 的「● 上班中」**沒有容器** — 只有一顆 9px 琥珀珠加 mono 10.5px 文字，直接坐在 ICE 卡上。`.status-pill` 現行即為此形式，class 名稱是歷史殘留，它已不是 pill。

---

## 五、中英文規則

**英文只有兩種用途**，其餘一律中文：

1. **分頁名**：`MONEY` `WORK` `PROJ` `REVIEW` `DATA`（基準的第三個分頁名是 `PROJ`，不是 `PROJECTS`）
2. **欄位標籤／刻度**：`01 · SHIFT`、`BANK`、`CASH`、`CARD`

判準：英文是**儀表上的刻字**（結構），中文是**內容**。任何給人讀的句子、按鈕、狀態、空狀態、提示都用中文。

### 已完成的字串

| 原文 | 現值 | 位置 |
|---|---|---|
| `Today's revenue` | 今日營收 | WORK |
| `Hours today` | 今天累計 | WORK |
| `THIS MONTH · SPENT` | 本月支出 | MONEY |
| `Manage accounts` | 管理帳戶 | DATA |
| `Add account` | 新增帳戶 | DATA |
| `Add`（三處） | 新增 | MONEY / PROJECTS |
| `01・工作` | `01 · SHIFT` | WORK |
| `PROJECTS`（分頁名） | `PROJ` | 導覽列 |
| `Schedule` | `SCHEDULE`（mono 刻字） | WORK |
| `上班打卡` / `下班打卡` | 上班 / 下班 | WORK（`app.js`） |

**未完成的字串盤點見第七節。** 完整清單仍需對線上版逐頁盤點。

---

## 六、`app.js` 的改動範圍

`data-store.js` **完全未動**。`data-core.js` 只動過 `formatMinutes()` 一個純顯示的格式函式：時長由「N 小時 M 分」改為基準的 `h:mm`（小時不補零、分鐘補兩位，零值 `0:00`）。它的八個呼叫點都是「分鐘數的時長」（今日工時、工作段時長、睡眠總時數、REVIEW 的平均睡眠／總工時／每日睡眠與工時），共用同一格式，未分出第二個函式。

`app.js` 只動過四處純顯示邏輯，沒有觸及資料模型、義務／事件結構、記帳規則或狀態機：

1. `renderTodaySummary()` — 依 `本月營收 ÷ 目標` 算出比例，寫入 `#work-revenue-percent` 的文字。
2. `renderTodaySummary()` — 同一個比例寫入 `#work-revenue-bar` 的 `style.width`。
3. `renderWorkSessions()` — 寫入 `#work-session-count` 的「N 段」。
4. `renderWorkSessions()` — 打卡按鈕文字由「上班打卡／下班打卡」改為「上班／下班」，空狀態句子同步。

另在 `queryElements()` 的 id 清單補上這三個新元素。比例只驅動顯示，不寫入任何資料。

---

## 七、基準有、現行仍未實作

| 項目 | 基準 | 現行 | 原因 |
|---|---|---|---|
| 工作段列 | 唯讀兩欄：`09:30 — 12:00` / `2:30` | 「工作段 N・時長」標題 + 兩個帶標籤的時間輸入 + 移除連結 | markup 在 `app.js` 的 `renderWorkSessions()`，超出本次授權的四項顯示邏輯 |
| 狀態文字 | `上班中` | `工作中・13:00` | `app.js` 字串，不在授權的四項內 |
| 日期格式 | `8/4 TUE` | `8/5（週三）` | `app.js` 的 `Intl.DateTimeFormat`，不在授權的四項內 |
| 時薪／本週／本月 | `$220` / `22.5h` / `96h` | 容器與版面已做，數值顯示 `—` | app 不計算這三項；依指示不編造計算邏輯 |
| 目標 chip | 靜態文字 `目標 60,000`（含千分位） | 可編輯的 `<input type="number">`，無千分位 | 這個值必須可調（架構.md 靈活原則）；number input 不支援千分位顯示 |
| 雷達「逾期 N 天」 | — | `Overdue · 2026-08-02` | 字串由 `app.js` 的 `renderRadar()` 產生，不在授權的四項內 |
| Auto-paid「自動」標記 | — | `.auto-tag` 的 CSS 已備好，無元素套用 | markup 在 `app.js` 的 `renderTransactions()`，不在授權的四項內 |
| chip 28px 階 | GLASS 未選／DEBOSS 已選 | 只有營收目標一個 26px DEBOSS chip；付款方式仍是 44px DEBOSS `<select>` | 基準沒有付款方式 chip 的對應物 |
| 完整中英文盤點 | — | 只做了第五節表列的項目 | 需逐頁盤點後由 Tako 裁決 |

---

## 八、基準未涵蓋、依材質對應推導的部分

基準只有 WORK 頁的完整模型。MONEY / PROJECTS / REVIEW / DATA 依第三節的判準推導，未新創作法：

- 所有主卡片、獨立區段（含 `.frozen-section`、`.notice`、雷達）→ ICE
- 躺在銀底上的小格（`.stat`）與卡片內不含輸入框的小格（`.card .metric`、`.statement-compare > div`）→ GLASS
- 卡片內含輸入框的列（`.manager-row`、`.book-item`、`.record-row`）→ 無材質 + `--line` 分隔
- 收合列與展開後的細節區塊（`.project-summary`、`.task-summary`、`.recess-group`、`.task-details`）→ 無材質 + `--line` 分隔
- 所有輸入框、`<select>`、日期控制、章魚 → DEBOSS
- 在讀的書（`.book-item.is-current`）→ 左側 9px 琥珀珠，不加框（沿用 DEW＝進行中的狀態）

**基準完全沒有對應物、因此停在原狀的元件**見第九節。

---

## 九、停下來回報的項目

1. **其他卡片的中文 h3。** 基準只顯示 SHIFT 卡，它的標題列只有 `01 · SHIFT` 一行 mono 刻字，沒有中文副標；`#work-card` 已照做。但 `#money-card`（`QUICK ADD` + `Add transaction`）、恢復卡（`03・恢復` + `什麼讓你恢復一點？`）等在基準裡沒有對應物 — 恢復卡的中文標題是提問，不是重複的標題。這些一律保持原狀，未自行刪除。
2. **`02・睡眠` / `03・恢復` 的分隔符與語言。** 基準只給了 `01 · SHIFT`。02、03 是否也改成英文刻字、`・` 是否統一為 ` · `，基準沒有依據。
3. **雷達的整體版面。** 基準沒有雷達的模型。現行沿用「一張 ICE 卡片 + `--line` 分隔列 + 排序表達強度」，未改動。
4. **一頁一顆 ACT。** 基準 `5a` 的 WORK 頁只有一顆 ACT。現行 DATA 頁的 Export JSON、WORK 開課表後的 Add schedule、PROJECTS 的多個表單送出鍵，都是段落級主動作。要收斂成一頁一顆需重排頁面結構，基準沒有這些頁面的模型。

---

## 十、已驗證的結論（不要重複試）

- 近黑底做不出玻璃感；近白底做不出金屬高光。
- 銀灰底可以，但字必須壓到 `#16191B`、琥珀降到 `#B4791C`。
- 「Q 版感」的來源＝700 字重 + 46px 主數字 + 16px 圓角三者疊加。
- GLASS 的透明度必須低於 ICE。
- 露水做成大面積的「面」會與 ICE 打架 → 只能降級成小元件（珠）。
- 按鈕不能用「淡描邊 + 淡凹陷」— 會與 DEBOSS 輸入框同貌。
- ICE / GROUND / ACT 三階明度無法等距：GROUND L\*67 → ICE L\*81 → ACT L\*20。
- `--ground` 改成漸層後，SVG 的 `fill` 不吃漸層。圓餅圖中心孔必須改用 `--ground-solid`，否則 fill 失效變成黑圓。
- 收合列做成 DEBOSS 會與內含的輸入框疊成四層。基準的解法是卡內列不給材質。

---

## 十一、尚未定案

1. **DEW 珠的尺寸** — 基準 `5a` 用 9px、`6a` 用 7px。現行取 9px。
2. **PROJECTS / REVIEW / DATA 三頁的資訊架構** — 材質已依第八節推導套用，但版面本身未經設計。
3. **完整的中英文字串盤點** — 第五節的表只涵蓋已完成的項目。
