/**
 * 一些延伸 WebExtension API 的函式。
 */
"use strict";

const errorHandler = console.error.bind(console);

/**
 * 擷取 JSON 檔案並解析
 * 在 HTTP 錯誤的情形也會 reject
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch }
 */
const fetchJSON = (...args) =>
    fetch(...args).then(response =>
        new Promise((resolve, reject) => response.ok
            ? response.json().then(resolve, reject)
            : reject(new ReferenceError(response.statusText))
        )
    )
;


/**
 * 抓 browser.storage 裡的資料
 * 把 StorageArea#get 改寫成回傳 promise
 * 在 keys 為字串時，改成直接傳回該筆資料，而不是 {keys: value} 。
 */
const getData = (keys, area = "local") => {
    let promise = browser.storage[area].get(keys);
    if(typeof keys === "string")
        promise = promise.then(s => s[keys]);
    return promise;
};


/**
 * 設定資料
 * 把 StorageArea#set 改寫成回傳 promise
 */
const setData = (items, area = "local") =>
    browser.storage[area].set(items)
;


/**
 * 傳送訊息到當前的分頁
 */
const sendMessageToCurrentTab = message =>
    browser.tabs.query({active: true, currentWindow: true})
    .then(tabs => browser.tabs.sendMessage(tabs[0].id, message))
;


/**
 * 回傳網址是在「需要排除的列表」中的哪一個規則。
 * @param {string} 網址。若無指派則為當前網頁。
 * @param {string} 規則們，由換行字元結合成單一字串。若無指派則從資料庫抓。注意有可能是空字串。
 * @return {Promise} 符合的規則。
 */
const isExcluded = async(href = location.href, exclude_matches) => {
    if(exclude_matches === "") return;
    if(typeof exclude_matches === "undefined")
        exclude_matches = await getData("exclude_matches");
    return exclude_matches.split("\n").find(rule => {
        if(rule.indexOf("\\") >= 0) return RegExp(rule).test(href);
        /**
         * 接下來是允許星號的規則
         * 要對正規表達式的特殊字元做跳脫，但星號本身除外。
         * 星號最終不會比對到斜線。
         */
        rule = rule.replace(/([\(\)\[\]\{\}\^\$\?\+])/g, "\\$1");
        return RegExp(rule.replace(/\*/g, "[^:/.]*")).test(href);
    });
};
