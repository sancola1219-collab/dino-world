# 恐龍世界 — AGENTS.md(給 Codex / 其他 agent)

> **接手前先讀 `docs/HANDOFF.md`(唯一完整交接入口)。** 本檔與 `CLAUDE.md` 同內容,只是精簡指引。

## 一句話
純前端(零依賴、零建置)的寫實恐龍生態教學模擬器。Three.js r160 已 vendor,所有貼圖程序化生成,無任何圖片檔。

## 執行
```
node tools/serve.mjs 8124   # 開 http://localhost:8124/
```

## 三條必守的鐵律
1. **狀態與動畫分離**:`main.js` 的 `state` 是唯一事實來源;使用者操作同步改狀態,相機飛行只是裝飾。不要把邏輯綁進動畫回呼。
2. **hidden browser 對策不可退化**:渲染迴圈的驅動器在 start 當下依 `document.hidden` 選(setInterval vs rAF+看門狗);驗證用 `window.__DW` 同步模擬 + `sample()` 像素取樣,**截圖在這台機器必逾時**。
3. **Pointer Lock 冷卻**:Esc 後 ~1.25s 內請求必失敗;`pointerlockerror` 要連續失敗計數才降級,resume 請求要 `.catch`。

## 改東西去哪
- 教學文案/數據/物種 → `js/data.js`
- 恐龍造型 → `js/dino.js`(每科一個 builder)
- 地形/植被/天空/光照 → `js/world.js`
- 介面 → `js/ui.js`(只反映狀態)
- 狀態/迴圈/相機/互動/測試 API → `js/main.js`

## 美學
高級質感:深色底、單一琥珀金點綴、serif 標題、髮絲線、寬字距。**不要可愛風。**

## 驗證
改完貼 `docs/VERIFICATION.md` 的一鍵腳本到 console,全綠且無 error 才算完成,並更新該檔紀錄。

## 發佈
GitHub Pages,帳號 `sancola1219-collab`,PAT 在 Windows 認證管理員(`git push` 免登入);`gh`/python 不可用,需 API 時用 Git Bash + `git credential fill`(見 HANDOFF §5)。
