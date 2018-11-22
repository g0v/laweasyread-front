/**
 * 一些專用於 Chrome 瀏覽器外掛的函式。
 */
"use strict";

/**
 * 抓 chrome.storage 裡的資料
 * 把 StorageArea#get 改寫成回傳 promise
 * 在 key 為字串時，改成直接傳回該筆資料，而不是 {key: value} 。
 */
const getData = (key, area = "local") =>
    new Promise(resolve => chrome.storage[area].get(key,
        (typeof key == "string") ? (s => resolve(s[key])) : resolve
    ))
;
/**
 * 設定資料
 * 把 StorageArea#set 改寫成回傳 promise
 */
const setData = (items, area = "local") =>
    new Promise(resolve => chrome.storage[area].set(items, resolve))
;
