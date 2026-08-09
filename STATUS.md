# TAKO v0.6.0｜現行狀態

更新：2026-08-10

## 版本與 Git

- 功能版本：**`0.6.0`**；本輪只修正視覺資產快取，未自行升功能版本。
- 資產版本：**`0.4.9`**；`CACHE_NAME`、`index.html` 與 `sw.js` 內的 `style.css?v=`／`app.js?v=` 五處一致。
- 施工分支：`codex/fix-design-material-rendering`；基線為當下最新 `master`：`3a1260a172957a0c998f3f26b34c347e635d9225`。
- 頂層導覽已改為 `MONEY / WORK / TASKS / REVIEW / DATA`；PROJECTS 已搬到 WORK 的 SESSIONS 後、SLEEP 前，TASKS 只保留 RADAR／TO-DO／AUTO PAYMENT／FROZEN／BOOKS。
- PR #6 已合併；本分支尚未 merge，正式網址仍由 `master` 的 `/(root)` 發布資產 `0.4.8`：<https://sowhereisthebread.github.io/life-calibration-pwa/>。
- PR #5 已完成的弱網啟動、Safe Delete、Card payment／Auto payment 規則、獨立 AUTO PAYMENT 區與 linked MONEY title 均保留，本輪未改資料模型或功能規則。

## 驗收結果

- **`test.html`：95／95 全數通過**；資產一致性斷言已涵蓋 `style.css` 與 `app.js` 的 index／worker 五處版本鍵。
- `node --check sw.js` 通過；`app.js`、`data-core.js`、`data-store.js` 本輪保持不動。
- Browser 掃描 320／375／390／393／820 px，共 25 組「五頁 × 五寬度」：無白屏、非預期水平 overflow 為 0、bottom nav 五格完整、console error 為 0。
- PROJECTS 實際操作：新增、展開、修改、切 PAUSED、兩階段 Delete 全部可用；TASKS 的 RADAR、TO-DO、Mark done／Undo、AUTO PAYMENT 分流、FROZEN、BOOKS 均已操作驗證。
- 390×844 的 PROJECTS 外層為單一 ICE；project form 無 `.card`，expanded details 為透明、無 border、無 shadow，不形成 ICE → ICE。
- 390×844 的 Design 5a 與 PWA 實際材質像素已比對；GROUND 四點相同或只差 1 RGB，ICE／ACT 相同或只差 0–2 RGB。偏暖根因是未版本化 `style.css` 可被舊 Service Worker／HTTP cache 沿用，不是 token 或 compositing。
- Service Worker 已實測從同 origin 的 `0.4.8` 更新到 `0.4.9`；伺服器停止後，既有頁 reload 與新分頁啟動都能由 warm cache 完整載入，IBM Plex Mono 亦可用。
- schema 維持 v3、localStorage key 維持 `lifeCalibrationData`；project、manual task、auto payment、frozen task、book 的 v3 JSON round trip 後 ID 與內容皆保留，沒有 migration。
- **尚未做 iPhone 實機驗收**；原生控制項、PWA 狀態列與真機捲動效能仍不得以桌面 Browser 代為宣告通過。

### `#待補`

- `#待補` Draft PR merge／部署後的 iPhone 主畫面 PWA 實機驗收。
- 其餘未處理項目集中在 `HANDOFF.md` 第 4 節，本檔不重複列。

## 資料與相容性

- 現行資料版本為 **schema v3**，localStorage key 維持 `lifeCalibrationData`。
- 第 1、2 版的瀏覽器資料與匯出 JSON 可自動遷移到 v3；匯入接受 v1／v2／v3。
- v1／v2 各帳戶的非零期初餘額會各自轉成一次、有遷移標記且指定原帳戶的收入交易；零值不生成交易，轉換後帳戶不再保留期初餘額欄位。
- 舊資料或 JSON 中的 `category`／`categories` 僅為相容欄位，現行支出輸入沒有分類 UI。
- 資料只存在目前瀏覽器與目前 origin 的 localStorage；不同網址、IP、通訊埠、瀏覽器或裝置不會自動同步。這是現行產品邊界，不是待裁決項目。
- JSON 是完整備份與還原格式；CSV 只供分析，不能取代完整備份。

## 資產

- 等寬字 IBM Plex Mono 自帶於 `fonts/`（latin 子集 400／500，共 29,596 bytes，SIL OFL 1.1），已列入 `sw.js` 的 `APP_SHELL`，不依賴 CDN。
- 視覺基準 `_design-reference.html` **已於 2026-08-06 移出本 repo 的工作目錄**，現位於兄弟目錄 `../_backups/`（109,645 bytes，SHA-256 `6044936…`）。它不在版控內，也沒有版控備援；取得方式與注意事項見 `HANDOFF.md` 第 0.1 節。

產品簡介見 `README.md`；視覺基準 `_design-reference.html` 已移出工作目錄（取得方式見 `HANDOFF.md` 第 0 節），其文字條款併入 `TAKO/TAKO_架構.md` 第五章；工程現況與未處理項目見 `HANDOFF.md`；產品正典為上一層知識庫的 `TAKO/TAKO_架構.md`；原始碼與 `test.html` 是實作及驗收證據。本檔只記錄 App repo 的版本、驗收與工程狀態，普通版本演進與修復歷程由 Git history 保存，不作為現行入口或規則。
