# TAKO v0.4.0＋視覺改版｜現行狀態

更新：2026-08-06

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

### 視覺改版與其後批次（2026-08-05 起）的驗收狀態

- **`test.html` 73／73 全數通過**（2026-08-06 批次 C 以 headless Chrome 走 CDP 實跑確認）。
  改版當時的 69／72 已解除：三項失敗都是測試在斷言改版前的值，`2aea300` 已依實況更新五條視覺斷言。
  資產版本的三處一致性改為互相比對、不寫死數值（`test.html:698-709`），跳號不會再弄壞測試。
- 電腦瀏覽器掃描（headless Chrome）：五個分頁 × 多寬度，**console 無 error、無水平捲動、無殘留白底元素**。
  批次 A-補 起，寬度掃描一律納入 390 與 393（iPhone 14／15／16 的實際寬度）。
- WORK 頁已與視覺基準的 TURN 5 `5a` 做 390×844 並排比對。
- 合成後文字對比：實測值以 `style.css` 的 `:root` 註解為準（`--t-ice-label` 4.67:1、`--t-frozen` 3.38:1、圖表最淺一階 3.09:1）。
  取值位置一律是該 token 可能出現的**最暗合成背景**，不是卡片頂端 —— 舊的 3.89:1 是單點量測，已作廢。
- **尚未做 iPhone 實機驗收**，也未驗證 `background-attachment: fixed` 疊多層 `backdrop-filter` 在真手機上的捲動效能。

### `#待補`

- `#待補` 視覺改版與批次 A／A-補／B／C 的 iPhone 實機驗收。
- `#待補` 離線斷網的字型快取實測、PWA 換快取路徑實測。
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
