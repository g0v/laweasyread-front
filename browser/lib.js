/**
 * Note: Don't use `importScript()` here; it is not supported in content scripts.
 */
if(typeof browser === "undefined") browser = chrome;

/**
 * @func getData
 * @desc 讀取資料。
 * @param {string | string[] | Object} keys   - 要讀取的資料鍵，如為物件，值即為預設值。
 * @returns {Promise.<any>}
 *  若 `keys` 為字串，則回傳該鍵對應的值；
 *  若否，則以物件的方式回傳鍵值對。
 */
function getData(keys) {
    let promise = browser.storage.local.get(keys);
    if(typeof keys === "string")
        promise = promise.then(s => s[keys]);
    return promise;
}


/**
 * @func setData
 * @desc 儲存資料。
 * @param {Object} items - 要儲存的鍵值對。
 * @returns {Promise.<void>}
 */
function setData(items) {
    return browser.storage.local.set(items);
}
