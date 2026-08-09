# 人生主控表：GitHub Pages 部署步驟

正式網址為 https://sowhereisthebread.github.io/life-calibration-pwa/；public repo 為 `sowhereisthebread/life-calibration-pwa`，由 `master` 的 `/(root)` 發布。本文件只保留首次部署、重新安裝與後續更新指引。

## 發布範圍與資料安全

- 只發布這個獨立 repo：`C:\Users\user\OneDrive\文件\Claude\Projects\life-calibration`
- 不要選上一層 `C:\Users\user\OneDrive\文件\Claude\Projects`；那是整個知識庫工作區，不是本 App 的 repo。
- 這個 repo 只含 App 程式碼、圖示、測試與說明文件，不含任何日常記錄，因此可設為 **public**。
- 日常記錄只存在手機或電腦瀏覽器的本機空間，不會因發布程式碼而上傳到 GitHub。
- **永遠不要把 App 匯出的 JSON 備份或 CSV 提交到這個 repo。** 這些檔案含有個人記錄；repo 的 `.gitignore` 已加入防呆規則，但提交前仍要檢查檔案清單。
- 外層工作區的 `_backups/` 不屬於 App repo，不得複製進來或發布。
- 更換網址、重裝 App 或清除網站資料前，先在「資料」頁匯出 JSON，並將備份存放在 repo 以外的位置。

## 第一次部署

以下以 GitHub Desktop 搭配 GitHub 網頁為例，repo 名稱可自行更換。

1. 開啟 GitHub Desktop，登入你的 GitHub 帳號。
2. 點左上角 **File → Add local repository…**。
3. 在 Local path 只選擇：
   `C:\Users\user\OneDrive\文件\Claude\Projects\life-calibration`
4. 按 **Add repository**。確認 GitHub Desktop 顯示的 repo 是 `life-calibration`，且檔案清單沒有交易系統、產業鏈或其他知識庫目錄。
   - 若 GitHub Desktop 顯示 `unsafe repository` 或 `dubious ownership`，先停止並回到 Codex 處理精確的 App repo 信任設定；不要信任上一層工作區，也不要使用涵蓋所有 repo 的萬用設定。
5. 點上方 **Publish repository**。
6. Name 可填 `life-calibration-pwa`。
7. **取消勾選 Keep this code private**，讓 repo 成為 public，再按 **Publish repository**。
8. 在 GitHub Desktop 點 **View on GitHub**，進入剛建立的 repo 網頁。
9. 在 repo 上方點 **Settings**；左側選單點 **Pages**。
10. 在 **Build and deployment** 區塊：
    - Source 選 **Deploy from a branch**。
    - Branch 選 `master`。
    - Folder 選 `/(root)`。
    - 按 **Save**。
11. 儲存設定後等待 GitHub Pages workflow 完成；在 **Settings → Pages** 或 **Actions** 確認實際狀態。
12. 本 App 的正確網址會是：
    `https://<你的 GitHub 帳號>.github.io/<repo 名稱>/`
    例如 repo 名稱是 `life-calibration-pwa`，網址就是 `https://<帳號>.github.io/life-calibration-pwa/`。App 已位於 repo 根目錄，不要再加 `/life-calibration/`。
13. 用電腦瀏覽器開啟正式網址，確認能看到「人生主控表」，並確認 `README.md` 記載的是同一個網址。

若頁面尚未出現或未更新，先查看 **Actions** 狀態；workflow 失敗時先閱讀實際錯誤再排查，不以等待固定分鐘數代替狀態確認。

## 安裝到 iPhone 主畫面

1. 在 iPhone 上用 **Safari** 開啟完整正式網址，確認網址以 repo 名稱與 `/` 結尾。
2. 點 Safari 下方的 **分享** 按鈕（方框向上箭頭）。
3. 在選單向下滑，點 **加入主畫面**。
4. 名稱保留「TAKO」，點右上角 **加入**。
5. 回到主畫面，從新出現的 App 圖示開啟。
6. 確認畫面沒有 Safari 網址列，並依序點過 MONEY、WORK、TASKS、REVIEW、DATA 五個分頁（導覽列第三格顯示 `TASKS`）；另確認 WORK 的 `02 · PROJECTS` 位於 SESSIONS 後、`03 · SLEEP` 前。
7. 確認頁面上的數字與英文標籤是等寬字（IBM Plex Mono，自帶於 `fonts/`）。若顯示成系統預設字，代表字型檔沒被 Service Worker 快取到，重新整理一次再看。
8. 之後務必從主畫面圖示記錄，不要從 Safari 分頁記錄。

## 兩個版本號，各自跳各自的

這個 repo 有兩個版本號，**用途不同、跳號時機不同，不要同步**。

### 功能版本號（現為 `0.6.0`）

- 位置：`index.html` 頁首的 `.brand-copy .eyebrow`，只有這一處。
- 時機：**功能變更時才跳**。新增或改變使用者做得到的事、資料 schema 變動、產品行為改變。
- 這是有意義的事件，看得到跳號就代表 App 本身不一樣了。純視覺、純重構、純文件不跳。
- `test.html` 對它做**字面比對**（斷言頁首必須是 `0.6.0`），跳號時要一併改測試 —— 那正是「這是一件大事」的提醒。
- **跳號與否不由執行者裁決**，由 Tako 決定。`0.4.0 → 0.5.0` 是 2026-08-06 的裁決：該輪新增了時薪／本週／本月三格統計、進行中工作段累計、圓餅圖 OTHER 規則，並把介面語言整體改為英文 —— 都落在「使用者做得到的事」與「產品行為」上。

### 資產版本號（現為 `0.4.9`）

五處必須**完全相等**：

| # | 檔案 | 位置 |
|---|---|---|
| 1 | `sw.js` | `CACHE_NAME = "life-calibration-v0.4.9"` 的尾碼 |
| 2 | `index.html` | `<link href="./style.css?v=0.4.9">` |
| 3 | `index.html` | `<script src="./app.js?v=0.4.9">` |
| 4 | `sw.js` | `APP_SHELL` 內的 `"./style.css?v=0.4.9"` |
| 5 | `sw.js` | `APP_SHELL` 內的 `"./app.js?v=0.4.9"` |

- 時機：**每次改動 `style.css`／任何 `.js`／`fonts/` 就跳**，不論改動多小。
- 理由：Service Worker 靠 `CACHE_NAME` 決定要不要重建快取；CSS 與 App 入口另用同一版本 query，避免 HTTP cache 或舊 worker 以相同 URL 提供上一版材質。少跳或漏改任何一處，已安裝的 PWA 都可能混用新舊資產。
- `test.html` 只斷言五者**互相一致**，不寫死數值 —— 跳號不會弄壞測試，寫錯一處才會。斷言原文：

  ```js
  if (indexStyleVersion !== cacheVersion
    || indexAppVersion !== cacheVersion
    || workerStyleVersion !== cacheVersion
    || workerAppVersion !== cacheVersion) {
    throw new Error("資產版本不一致");
  }
  ```

- 改完跑一次 `test.html` 就能確認五處沒有漏改。

兩個號碼可以長期不一致（現在是功能 `0.6.0` 對資產 `0.4.9`），那不是錯誤，是設計。兩者各自遞增，誰大誰小沒有意義 —— 資產號跳得比功能號勤，因為純視覺改動也要跳它。

## 之後更新版本

1. 在 GitHub Desktop 確認目前選取的 repo 是 `life-calibration`，不是上一層知識庫工作區。
2. 檢查變更清單沒有 JSON／CSV 備份或任何個人資料。
3. 依上一節跳版本號：改過 CSS／JS／字型就跳資產版本號五處，改過功能才跳頁首的功能版本號。跑一次 `test.html` 確認五處一致。
4. 填寫 Summary，按 **Commit to master**。
5. 按 **Push origin**。
6. 等待 GitHub Pages workflow 完成，並在 **Actions** 確認成功；若失敗，先依實際錯誤排查。
7. iPhone 從主畫面重新開啟 App；若仍看到舊版，完全關閉 App 後再開一次。更新前先匯出 JSON，並把備份放在 repo 外。

## 本專案的部署設定說明

- `index.html` 位於獨立 repo 根目錄，因此 Pages 正式網址直接以 `/<repo 名稱>/` 結尾。
- `manifest.json` 的 `start_url` 是 `./index.html`、`scope` 是 `./`；圖示、樣式、程式與 Service Worker 也全部使用相對路徑，可在任意 repo 名稱下運作。
