# TAKO

TAKO 是手機優先、資料留在本機的人生主控 PWA，用來快速記帳、記錄工作與生活節奏、管理義務及專案，並做短期回顧；預設開啟 MONEY。

## 五個分頁

- **MONEY**：快速記錄支出、收入與帳戶移轉，查看唯讀的帳戶餘額格、本月 Item 統計與最近交易；AUTO PAYMENTS 在 SPENT 與 RECENT 之間，預設收合，是設定一次就自動運作的扣款規則。
- **WORK**：打卡與今日工時、今日營收、本月營收與可調目標（附達成率與進度條）、今日工作段、精簡 PROJECTS 摘要、睡眠、恢復與固定課表；PROJECTS 固定在 SESSIONS 後、SLEEP 前，營收不會自動寫入 MONEY。
- **TASKS**：只回答「現在有什麼事情需要親自處理」。TO-DO 是主清單，點一下就展開成可編輯狀態；未進提醒窗口的在 SLEEPING、主動暫停的在 FROZEN，另有 BOOKS。Project 表單與自動扣款都不在此頁。
- **REVIEW**：查看最近七天資料、本月收入／支出／淨額及信用卡帳單差額。
- **DATA**：調整提醒提前天數（同時決定 SLEEPING 的界線）、管理帳戶（新增／改名／封存），並匯出或匯入完整 JSON 備份、匯出 CSV 分析資料。

## 資料邊界

資料只存在目前瀏覽器與目前 origin 的 localStorage；不同網址、IP、通訊埠、瀏覽器或裝置不會自動同步。換環境、重裝 App 或清除網站資料前，先到 DATA 匯出 JSON。

- **JSON**：完整備份與還原格式，供搬移及復原資料。
- **CSV**：查閱與分析用匯出，不是完整還原格式。

## 開啟方式

- 正式使用：<https://sowhereisthebread.github.io/life-calibration-pwa/>
- Windows 本機：雙擊 `start.bat`，再開啟畫面顯示的 `http://localhost:8000`。
- macOS／Linux 本機：執行 `./start.sh`，再開啟畫面顯示的網址。
- 也可直接開啟 `index.html`，但它與正式網址、localhost 是不同 origin，資料彼此獨立。

正式版本與工程狀態見 [STATUS.md](STATUS.md)；部署、更新及 iPhone 安裝方式見 [DEPLOY.md](DEPLOY.md)；產品正典位於外層 TAKO 目錄的 `../TAKO_架構.md`。

## 視覺層

唯一視覺基準是 `_design-reference.html`（Design 端的實際渲染成品，TURN 6 最新、TURN 5 的 `5a` 是唯一完整頁面模型）。**它已移出本工作目錄**，取得方式見 [HANDOFF.md](HANDOFF.md) 第 0 節。
文字條款在外層 TAKO 目錄的 `../TAKO_架構.md` 第五章：色彩 token、六層材質、尺寸階層、字體、語言規則。

動 `style.css` 或版面前先讀這兩份。兩者衝突時的順位：**`_design-reference.html` ＞ `TAKO_架構.md` 第五章**。基準勝出時要回寫架構檔，不是讓兩邊各自為政。

等寬字 IBM Plex Mono 已自帶於 [fonts/](fonts/)（latin 子集 400／500，SIL OFL 1.1），列入 `sw.js` 快取，不依賴 CDN。

本次視覺改版的交接紀錄見 [HANDOFF.md](HANDOFF.md)。
