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

let parse = () => {};

if(typeof LER == "object" && document.body) {
    parse = () => LER.parse(document.body);
    Promise.all([
        getData(["autoParse", "artNumberParserMethod", "enablePopup"]),
        isExcluded(location.href)
    ]).then(([storage, matched_pattern]) => {
        LER.artNumberParserMethod = storage.artNumberParserMethod;
        LER.enablePopup = storage.enablePopup;
        if(matched_pattern) console.log(`LER skipped auto-parse because location ${location.href} is matched by the pattern ${matched_pattern}`);
        else if(storage.autoParse) parse();
    });
}

if(browser) browser.runtime.onMessage.addListener(message => {
    switch(message.command) {
        case "parse":
            parse();
            break;
        default:
            console.log("Error: uncaught message.");
    }
});
