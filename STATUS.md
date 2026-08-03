# TAKO v0.4.0｜現行狀態

更新：2026-08-04

## 版本與 Git

- 正式版本：**v0.4.0**。
- branch：`master`。
- v0.4.0 程式發布 commit：`#待補`（push 後補記；iPhone 實機驗收完成時一併記錄該版基線 commit）。
- v0.3.9 完成部署、電腦驗收與 iPhone 實機驗收時的 App 基線 commit：`84ec6183092bc02ae981e76392ba559f7f459ed3`。
- v0.3.9 程式發布 commit：`acb86f75674815851d3038624d54ff1ad5606650`。
- 正式網址：<https://sowhereisthebread.github.io/life-calibration-pwa/>
- GitHub Pages：public repo `sowhereisthebread/life-calibration-pwa`，由 `master` 的 `/(root)` 發布。

## 驗收結果

- v0.4.0 已完成電腦瀏覽器驗收：`test.html` 72／72 通過，App 與測試頁 console 無 warning／error，390×844 與 320px 版面無水平溢出。
- v0.4.0 的 iPhone 主畫面 PWA 實機驗收 `#待補`，待 Tako 執行。
- v0.3.9 已完成電腦瀏覽器與 iPhone 主畫面 PWA 實機驗收，手機既有資料正常。
- `test.html` 保存現行驗收規格。
- 除上述 iPhone 實機驗收外，App 程式、測試、資料模型及資產沒有待處理變動。

## 資料與相容性

- 現行資料版本為 **schema v3**，localStorage key 維持 `lifeCalibrationData`。
- 第 1、2 版的瀏覽器資料與匯出 JSON 可自動遷移到 v3；匯入接受 v1／v2／v3。
- v1／v2 各帳戶的非零期初餘額會各自轉成一次、有遷移標記且指定原帳戶的收入交易；零值不生成交易，轉換後帳戶不再保留期初餘額欄位。
- 舊資料或 JSON 中的 `category`／`categories` 僅為相容欄位，現行支出輸入沒有分類 UI。
- 資料只存在目前瀏覽器與目前 origin 的 localStorage；不同網址、IP、通訊埠、瀏覽器或裝置不會自動同步。這是現行產品邊界，不是待裁決項目。
- JSON 是完整備份與還原格式；CSV 只供分析，不能取代完整備份。

產品簡介見 `README.md`；產品正典為上一層知識庫的 `TAKO/TAKO_架構.md`；原始碼與 `test.html` 是實作及驗收證據。本檔只記錄 App repo 的版本、驗收與工程狀態，普通版本演進與修復歷程由 Git history 保存，不作為現行入口或規則。
