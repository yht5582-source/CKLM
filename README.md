# CKLM Clinical Navigator

心腎肝代謝（Cardiovascular–Kidney–Liver–Metabolic）整合評估之臨床決策輔助網頁。

線上版：https://yht5582-source.github.io/CKLM/

- CKLM 0–4 暫定分期（SHA 2026 共識）
- PREVENT 10 年 CVD／ASCVD 基本模型（已以 preventr 0.12.1 參考值核對）
- KDIGO G×A 風險矩陣、KFRE 4 變數（非北美校準）
- FIB-4、VCTE 分層、FAST score；血脂交叉驗證（Sampson/NIH、Friedewald）

- 教學分頁：示範病例 6 例（`#cases`）、考題 20 題（基礎、高階各 10，`#quiz`）、心智圖（`#map`）

測試：`node tests.cjs`，病例與考題的數值都由頁面引擎核對。

單一靜態 `index.html`，所有運算在瀏覽器本機完成，不上傳資料。僅供教育與決策輔助，不取代醫師判斷。
