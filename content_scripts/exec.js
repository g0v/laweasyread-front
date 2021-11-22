/**
 * 處理、判斷是否需要運作 LER.parse
 *
 * 需要排除 LER.parse 運作的情形：
 * 1. 未宣告 LER 。起因於不想在 `manifest.json` 宣告重複的 `exclude_matches`
 * 2. 頁面沒有 body 元素。例如臉書相簿上傳檔案後的跳轉頁面。
 * 3. 使用者設定為不用轉換。
 *
 */
"use strict";

if(typeof LER == "object" && document.body && window.innerWidth && window.innerHeight) {
    Promise.all([
        getData(["autoParse", "artNumberParserMethod", "enablePopup"]),
        isExcluded(location.href)
    ]).then(([storage, matched_pattern]) => {
        LER.artNumberParserMethod = storage.artNumberParserMethod;
        LER.enablePopup = storage.enablePopup;
        if(matched_pattern) console.debug(`LER skipped auto-parse because location ${location.href} is matched by the pattern ${matched_pattern}`);
        else if(storage.autoParse) LER.parse(document.body);
    });

    browser.runtime.onMessage.addListener(message => {
        switch(message.command) {
            case "parseDocument":
                LER.parse(document.body);
                break;
            case "parseText":
                if(window != window.top) break;
                let text = message.selection;
                if(typeof text !== "string") {
                    const bodyClone = document.body.cloneNode(true);

                    // 把所有 iframe 裡的東西也複製進來，如果有存取權限的話
                    document.querySelectorAll("iframe").forEach(ie => {
                        const d = ie.contentDocument;
                        if(!d) return;
                        bodyClone.append(...d.body.cloneNode(true).childNodes);
                    });

                    bodyClone.querySelectorAll("script, style, .LER-modal-container").forEach(con => con.remove());
                    text = bodyClone.textContent;
                }
                // 把所有空格都抽掉，以避開法規名稱中間換行之類的情形；把頭尾的半形字元都去掉，以略去網站最前面最後面的那些雜物。
                text = text.replace(/\s+/g, "").replace(/^[\x20-\xff]+/g, "").replace(/[\x20-\xff]+$/g, "");
                LER.parseText(text).then(LER.popupComplex);
                break;
            default:
                console.warn("uncaught message in `exec.js`");
        }
    });
}
