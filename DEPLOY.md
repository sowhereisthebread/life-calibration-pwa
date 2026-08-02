# 人生主控表：GitHub Pages 部署步驟

本 App 已於 2026-08-01 完成發布並在 iPhone 加入主畫面；正式網址為 https://sowhereisthebread.github.io/life-calibration-pwa/，public repo 為 `sowhereisthebread/life-calibration-pwa`。本文件保留首次部署、重新安裝與後續更新指引。

## 發布範圍與資料安全

- 只發布這個獨立 repo：`C:\Users\user\OneDrive\文件\Claude\Projects\life-calibration`
- 不要選上一層 `C:\Users\user\OneDrive\文件\Claude\Projects`；那是整個知識庫工作區，不是本 App 的 repo。
- 這個 repo 只含 App 程式碼、圖示、測試與說明文件，不含任何日常記錄，因此可設為 **public**，GitHub Free 帳號即可使用 Pages，不需要付費或升級。
- 日常記錄只存在手機或電腦瀏覽器的本機空間，不會因發布程式碼而上傳到 GitHub。
- **永遠不要把 App 匯出的 JSON 備份或 CSV 提交到這個 repo。** 這些檔案含有個人記錄；repo 的 `.gitignore` 已加入防呆規則，但提交前仍要檢查檔案清單。
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
7. **取消勾選 Keep this code private**，讓 repo 成為 public，再按 **Publish repository**。這個 repo 不含日常記錄，不需要為 Pages 升級付費方案。
8. 在 GitHub Desktop 點 **View on GitHub**，進入剛建立的 repo 網頁。
9. 在 repo 上方點 **Settings**；左側選單點 **Pages**。
10. 在 **Build and deployment** 區塊：
    - Source 選 **Deploy from a branch**。
    - Branch 選 `master`。
    - Folder 選 `/(root)`。
    - 按 **Save**。
11. 設定成功後，GitHub Pages 通常會在幾分鐘內發布，先等最多 10 分鐘。回到 **Settings → Pages** 可看到正式網址。
12. 本 App 的正確網址會是：
    `https://<你的 GitHub 帳號>.github.io/<repo 名稱>/`
    例如 repo 名稱是 `life-calibration-pwa`，網址就是 `https://<帳號>.github.io/life-calibration-pwa/`。App 已位於 repo 根目錄，不要再加 `/life-calibration/`。
13. 用電腦瀏覽器開啟正式網址，確認能看到「人生主控表」，並確認 `README.md` 記載的是同一個網址。

若超過 10 分鐘仍未出現，先看 repo 上方的 **Actions** 是否有 Pages 建置失敗；若超過一小時仍未完成，再依失敗訊息排查。

## 安裝到 iPhone 主畫面

1. 在 iPhone 上用 **Safari** 開啟完整正式網址，確認網址以 repo 名稱與 `/` 結尾。
2. 點 Safari 下方的 **分享** 按鈕（方框向上箭頭）。
3. 在選單向下滑，點 **加入主畫面**。
4. 名稱保留「TAKO」，點右上角 **加入**。
5. 回到主畫面，從新出現的 App 圖示開啟。
6. 確認畫面沒有 Safari 網址列，並依序點過 MONEY、WORK、PROJECTS、REVIEW、DATA 五個分頁。
7. 之後務必從主畫面圖示記錄，不要從 Safari 分頁記錄。

## 之後更新版本

1. 在 GitHub Desktop 確認目前選取的 repo 是 `life-calibration`，不是上一層知識庫工作區。
2. 檢查變更清單沒有 JSON／CSV 備份或任何個人資料。
3. 填寫 Summary，按 **Commit to master**。
4. 按 **Push origin**。
5. GitHub Pages 通常在幾分鐘內更新，先等最多 10 分鐘。
6. iPhone 從主畫面重新開啟 App；若仍看到舊版，完全關閉 App 後再開一次。更新前先匯出 JSON，並把備份放在 repo 外。

## 本專案的部署設定說明

- `index.html` 位於獨立 repo 根目錄，因此 Pages 正式網址直接以 `/<repo 名稱>/` 結尾。
- `manifest.json` 的 `start_url` 是 `./index.html`、`scope` 是 `./`；圖示、樣式、程式與 Service Worker 也全部使用相對路徑，可在任意 repo 名稱下運作。
- 這是純靜態網站，且沒有 Jekyll 會忽略的檔名，因此目前不需要 `.nojekyll`。
