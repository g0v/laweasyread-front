/**
 * Note: Don't use `importScript()` here; it is not supported in content scripts.
 */
if(typeof browser === "undefined") browser = chrome;

/**
 * @func getData
 * @desc 讀取資料。
 * @param {string | string[] | Object} keys   - 要讀取的資料鍵，如為物件，值即為預設值。
 * @param {string} [area]   - 資料來源。
 * @returns {Promise}
 *  若 `keys` 為字串，則回傳該鍵對應的值；
 *  若否，則以物件的方式回傳鍵值對。
 */
function getData(keys, area = "local") {
    let promise = browser.storage[area].get(keys);
    if(typeof keys === "string")
        promise = promise.then(s => s[keys]);
    return promise;
}


/**
 * @func setData
 * @desc 儲存資料。
 * @param {Object} items - 要儲存的鍵值對。
 * @param {string} [area]  - 要設定的資料媒介。
 * @returns {Promise}
 */
const setData = (items, area = "local") => browser.storage[area].set(items);
