# TAKO

TAKO 是手機優先、資料留在本機的人生主控 PWA，用來快速記帳、記錄工作與生活節奏、管理義務及專案，並做短期回顧；預設開啟 MONEY。

## 五個分頁

- **MONEY**：快速記錄支出、收入與帳戶移轉，管理帳戶餘額，並查看本月 Item 統計與最近交易。
- **WORK**：打卡，記錄今日工時、每日／每月營業額、可調營業額目標、睡眠、恢復與固定課表；營業額不會自動寫入 MONEY。
- **PROJECTS**：管理 ACTIVE／PAUSED 專案、重複義務、里程提醒、無日期待辦與書單／冷凍項目。
- **REVIEW**：查看最近七天資料、本月收入／支出／淨額及信用卡帳單差額。
- **DATA**：調整雷達提前天數，並匯出或匯入完整 JSON 備份、匯出 CSV 分析資料。

## 資料邊界

資料只存在目前瀏覽器與目前 origin 的 localStorage；不同網址、IP、通訊埠、瀏覽器或裝置不會自動同步。換環境、重裝 App 或清除網站資料前，先到 DATA 匯出 JSON。

- **JSON**：完整備份與還原格式，供搬移及復原資料。
- **CSV**：查閱與分析用匯出，不是完整還原格式。

## 開啟方式

- 正式使用：<https://sowhereisthebread.github.io/life-calibration-pwa/>
- Windows 本機：雙擊 `start.bat`，再開啟畫面顯示的 `http://localhost:8000`。
- macOS／Linux 本機：執行 `./start.sh`，再開啟畫面顯示的網址。
- 也可直接開啟 `index.html`，但它與正式網址、localhost 是不同 origin，資料彼此獨立。

正式版本與工程狀態見 [STATUS.md](STATUS.md)；部署、更新及 iPhone 安裝方式見 [DEPLOY.md](DEPLOY.md)；產品正典位於外層知識庫的 `TAKO/TAKO_架構.md`。
