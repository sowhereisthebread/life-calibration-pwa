# 人生主控表・校準版

目前版本為 v0.3.7：預設開啟 MONEY，底部固定為 MONEY／WORK／PROJECTS／REVIEW／DATA 五頁。第 1、2 版瀏覽器資料與匯出 JSON 會自動升級為資料版本 3，儲存鍵仍為 `lifeCalibrationData`。

- MONEY：支出以單一 Item 快速記帳，相同 Item 文字直接合併統計；另含收入、帳戶移轉、帳戶餘額、自訂帳戶新增／改名／封存／解封、本月 Item 圖與最近交易。帳戶不保存期初餘額；要帶入初始金額時，新增收入交易並指定帳戶。預設三帳戶可改名但永遠啟用。
- WORK：打卡、每日／每月營業額與可調營業額目標、睡眠、恢復（內含一句話備註）與固定課表；營業額不會自動寫入 MONEY。390 px 手機寬度下，Schedule 的 Start／End 維持左右並排且不再溢出卡片。
- PROJECTS：專案只保留 ACTIVE／PAUSED，完成或不再需要時經確認後刪除；另含可編輯的重複義務與本期到期日、可直接更新的里程提醒、無日期待辦、只保留 THIS MONTH／QUEUED／FROZEN 的書單與冷凍項目，書籍可經確認後直接刪除。
- REVIEW：最近七天資料與本月收入／支出／淨額、信用卡帳單差額。
- DATA：雷達提前天數設定、完整 JSON 備份還原及涵蓋全部資料型別的 CSV 匯出。
- 發布狀態：v0.3.7 已於 2026-08-03 由 release commit `27715721b90c3978140aa9915f6f72fd05c4b659` 推送；GitHub Pages 的 `pages-build-deployment #14` 已成功完成 build、report-build-status 與 deploy。
- 電腦端驗收：正式網址顯示 v0.3.7 並載入 `app.js?v=0.3.7`；首頁、樣式、資料核心、資料存取、Service Worker 與 manifest 均回應 200，五分頁可切換且 console 無啟動錯誤。本機 67 項自動測試與 390 × 844 響應式驗證亦通過。
- 實機驗收：v0.3.7 尚待 Tako 在 iPhone 主畫面版本覆驗，不在本機施工階段自行宣告通過。
- 發布歷史：v0.3.6 已於 2026-08-03 由 commit `11dd75e2f2190a6ccc10818ff675fda6300211a7` 部署至既有 GitHub Pages；build、deploy、report-build-status 均成功，iPhone 已確認顯示且 Amount／Item 輸入不再自動縮放。v0.3.5 亦已於 2026-08-03 部署至同一正式網址。

- 正式網址：https://sowhereisthebread.github.io/life-calibration-pwa/
- GitHub repo：`sowhereisthebread/life-calibration-pwa`（public）
- 正式使用：固定從上列 HTTPS 網址進入；後續更新與 iPhone 安裝步驟請依 [DEPLOY.md](DEPLOY.md)。
- 電腦：可直接雙擊 `index.html`；建議在已安裝 Python 的電腦雙擊 `start.bat`（Windows）或執行 `./start.sh`（macOS／Linux），再開啟畫面顯示的 `http://localhost:8000`。
- 手機：電腦與手機連同一個 Wi-Fi，保持啟動腳本視窗開著，再於手機輸入腳本顯示的區網網址；區網 HTTP 目前不能安裝或離線。
- iPhone：請務必用「加入主畫面」的版本記錄，不要用 Safari 分頁，否則資料較容易被系統清除。
- 資料：請固定使用同一台裝置、同一個網址與同一個瀏覽器。雙擊、localhost 與區網 IP 各自保存不同資料；從雙擊模式改成伺服器模式時，資料不會自動搬過去；電腦與手機不會同步。更換網址、IP、通訊埠、瀏覽器或裝置前，先到 DATA 頁匯出 JSON。
