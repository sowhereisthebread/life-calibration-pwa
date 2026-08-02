# 人生主控表・校準版

目前本機版本為 v0.3：預設開啟 MONEY，底部固定為 MONEY／WORK／PROJECTS／REVIEW／DATA 五頁。v0.2 的瀏覽器資料與匯出 JSON 會自動升級為資料版本 2，儲存鍵仍為 `lifeCalibrationData`。

- MONEY：快速記帳、收入與帳戶移轉、帳戶餘額、自訂帳戶新增／改名／封存／解封、本月分類圖與最近交易；預設三帳戶可改名但永遠啟用。
- WORK：打卡、本月收入目標、睡眠、恢復、備註與固定課表。
- PROJECTS：專案、可編輯的重複義務與本期到期日、可直接更新的里程提醒、無日期待辦、書單與冷凍項目。
- REVIEW：最近七天資料與本月收入／支出／淨額、信用卡帳單差額。
- DATA：雷達提前天數與月收入目標設定、完整 JSON 備份還原及涵蓋全部資料型別的 CSV 匯出。
- 發布狀態：v0.3 僅完成本機提交，尚未推送或部署；正式網址目前仍是已發布的舊版，需核准後才更新。

- 正式網址：https://sowhereisthebread.github.io/life-calibration-pwa/
- GitHub repo：`sowhereisthebread/life-calibration-pwa`（public）
- 正式使用：部署完成後固定從上列 HTTPS 網址進入；第一次部署、後續更新與 iPhone 安裝步驟請依 [DEPLOY.md](DEPLOY.md)。
- 電腦：可直接雙擊 `index.html`；建議在已安裝 Python 的電腦雙擊 `start.bat`（Windows）或執行 `./start.sh`（macOS／Linux），再開啟畫面顯示的 `http://localhost:8000`。
- 手機：電腦與手機連同一個 Wi-Fi，保持啟動腳本視窗開著，再於手機輸入腳本顯示的區網網址；區網 HTTP 目前不能安裝或離線。
- iPhone：請務必用「加入主畫面」的版本記錄，不要用 Safari 分頁，否則資料較容易被系統清除。
- 資料：請固定使用同一台裝置、同一個網址與同一個瀏覽器。雙擊、localhost 與區網 IP 各自保存不同資料；從雙擊模式改成伺服器模式時，資料不會自動搬過去；電腦與手機不會同步。更換網址、IP、通訊埠、瀏覽器或裝置前，先到 DATA 頁匯出 JSON。
