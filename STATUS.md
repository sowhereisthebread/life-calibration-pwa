# TAKO v0.4.0＋視覺改版｜現行狀態

更新：2026-08-05

## 版本與 Git

- 正式版本：**v0.4.0**（產品功能）。其上疊加了一次**視覺改版**與其後的批次修正，資產查詢字串與 Service Worker 快取名已升到 `0.4.2`（`app.js?v=0.4.2`、`CACHE_NAME = "life-calibration-v0.4.2"`）。功能與資料層未變動，因此未升產品版號。兩個版本號的分工見 `DEPLOY.md`〈兩個版本號，各自跳各自的〉。
- 視覺改版尚未部署，也尚未經 iPhone 實機驗收。
- branch：`master`。
- v0.4.0 完成部署、電腦驗收與 iPhone 實機驗收時的 App 基線 commit：`5488954f427890d12013234904f243d3fad6b14e`。
- v0.4.0 程式發布 commit：`5488954f427890d12013234904f243d3fad6b14e`。
- v0.3.9 完成部署、電腦驗收與 iPhone 實機驗收時的 App 基線 commit：`84ec6183092bc02ae981e76392ba559f7f459ed3`。
- v0.3.9 程式發布 commit：`acb86f75674815851d3038624d54ff1ad5606650`。
- 正式網址：<https://sowhereisthebread.github.io/life-calibration-pwa/>
- GitHub Pages：public repo `sowhereisthebread/life-calibration-pwa`，由 `master` 的 `/(root)` 發布。

## 驗收結果

- v0.4.0（視覺改版前）已完成電腦瀏覽器驗收：`test.html` 72／72 通過；並於 2026-08-04 完成 iPhone 主畫面 PWA 實機驗收。
- v0.3.9 已完成電腦瀏覽器與 iPhone 主畫面 PWA 實機驗收，手機既有資料正常。

### 視覺改版（2026-08-05）的驗收狀態

- 電腦瀏覽器（headless Chrome 150）：MONEY／WORK／PROJ／REVIEW／DATA 五個分頁 × 320／375／820 三個寬度共 15 組，**console 無 error、無水平捲動、無殘留白底元素**。
- WORK 頁已與視覺基準 `_design-reference.html` 的 TURN 5 `5a` 做 390×844 並排比對。
- 合成後文字對比實測（375px，取面色眾數）：除刻意的冷凍例外 3.89:1 外，其餘全部 ≥ 4.5:1。
- **`test.html` 目前 69／72，三項未通過**，且三項都是測試在斷言「改版前」的值：
  1. `manifest 主題色為 #A4AAB0` — 主題色已依基準改為 `#9CA5AC`。
  2. `快速記帳 UI 僅保留 Item 並鎖定 viewport 縮放` — 斷言全站不得有任何 `[placeholder]`；基準的今日營收欄有 placeholder「輸入金額」。
  3. `v0.4.0 表單間距、欄位邊界與版本防護存在` — 斷言頁首必須含字串 `v0.4.0`（已改為 `0.4.0`），且 `app.js` 查詢字串必須是 `?v=0.4.0`（已改為 `?v=0.4.1`）。
- 這三項是**驗收規格與新視覺基準的衝突，不是程式缺陷**。`data-store.js` 與 `test.html` 本身未被改動；`data-core.js` 只改了 `formatMinutes()` 的輸出格式（時長改 `h:mm`），沒有任何測試斷言它，改前改後失敗項完全相同。資料層 69 項全數通過。要不要把 `test.html` 的這三條斷言改成新值，屬於驗收規格的變更，需由 Tako 裁決，施工者不自行放寬。
- 視覺改版**尚未做 iPhone 實機驗收**，也未驗證 `background-attachment: fixed` 疊多層 `backdrop-filter` 在真手機上的捲動效能。

### `#待補`

- `#待補` `test.html` 三條視覺斷言待裁決（見上）。
- `#待補` 視覺改版的 iPhone 實機驗收。

## 資料與相容性

- 現行資料版本為 **schema v3**，localStorage key 維持 `lifeCalibrationData`。
- 第 1、2 版的瀏覽器資料與匯出 JSON 可自動遷移到 v3；匯入接受 v1／v2／v3。
- v1／v2 各帳戶的非零期初餘額會各自轉成一次、有遷移標記且指定原帳戶的收入交易；零值不生成交易，轉換後帳戶不再保留期初餘額欄位。
- 舊資料或 JSON 中的 `category`／`categories` 僅為相容欄位，現行支出輸入沒有分類 UI。
- 資料只存在目前瀏覽器與目前 origin 的 localStorage；不同網址、IP、通訊埠、瀏覽器或裝置不會自動同步。這是現行產品邊界，不是待裁決項目。
- JSON 是完整備份與還原格式；CSV 只供分析，不能取代完整備份。

## 資產

- 等寬字 IBM Plex Mono 自帶於 `fonts/`（latin 子集 400／500，共 29,596 bytes，SIL OFL 1.1），已列入 `sw.js` 的 `APP_SHELL`，不依賴 CDN。
- `_design-reference.html` 是視覺基準，會引用一個不在 repo 內的 `support.js`；缺它不影響渲染。

產品簡介見 `README.md`；視覺基準 `_design-reference.html` 已移出工作目錄（取得方式見 `HANDOFF.md` 第 0 節），其文字條款併入 `TAKO/TAKO_架構.md` 第五章；工程現況與未處理項目見 `HANDOFF.md`；產品正典為上一層知識庫的 `TAKO/TAKO_架構.md`；原始碼與 `test.html` 是實作及驗收證據。本檔只記錄 App repo 的版本、驗收與工程狀態，普通版本演進與修復歷程由 Git history 保存，不作為現行入口或規則。
