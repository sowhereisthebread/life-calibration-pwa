# 人生主控表・校準版 v0.3.1 狀態

## 目的與邊界
- 目的：提供手機優先、60 秒內可完成基本記錄，並整合記帳、義務、專案與月結的本機人生主控表。
- 回答三件事：錢去了哪裡、下一步做什麼、最近作息與工作狀況如何。
- 本輪不做通知、帳號、雲端同步或後端服務；個人金額、醫療項目與書名不進 repo。
- TAKO v0.3.1 已於 2026-08-02 推送並部署至既有 GitHub Pages；正式網址與 PWA 安裝身分不變。

## 現行依據
- 現行正典：`TAKO_架構.md`；v0.3 交辦稿與事故規則均已退役。
- 技術：純 HTML、CSS、JavaScript；不使用框架、打包工具、CDN 或外部素材。
- 資料：schema v2 的單一版本化 JSON 存於目前瀏覽器的 localStorage，儲存鍵維持 `lifeCalibrationData`；v1 會自動無損升級，由獨立資料模組統一存取，不上傳。
- 頁面：MONEY／WORK／PROJECTS／REVIEW／DATA；預設 MONEY。
- 開啟：可雙擊 index.html，或用 start.bat／start.sh 啟動本機伺服器。
- 資料邊界：不同網址、IP、通訊埠、瀏覽器或裝置的資料不互通。
- 部署：正式網址為 https://sowhereisthebread.github.io/life-calibration-pwa/；GitHub repo 為 `sowhereisthebread/life-calibration-pwa`（public），從 `master` 的 `/(root)` 發布。
- 正式版本：v0.3.1，部署基線為 `fe667748fca359f9c3740ea62367673d1311883f`；線上五分頁、manifest、Service Worker、離線 App shell 與 390×844 版面均已驗證。
- Git 範圍：`life-calibration/` 是獨立 repo；上一層知識庫 repo 已忽略此目錄，不對外發布。

## 待裁決
- #待補 跨裝置同步：建議先跑七天，再依實際摩擦決定是否承擔帳號與雲端複雜度。
- #待補 私人初始資料：由 Tako 在正式 iPhone App 本機建立；內容不得寫入公開 repo，完成後以私人 JSON 備份留存。

## 進行中
- v0.3.1 已部署並完成 iPhone 實機驗收；跨裝置同步待七天實測後裁決。
