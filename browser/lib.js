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


/**
 * @func sendMessageToCurrentTab
 * @desc 傳送訊息到當前的分頁，但避開瀏覽器自設頁面（如 `chrome://` 開頭）。
 * @param {Object} message
 * @returns {Promise} response from the tab
 */
const sendMessageToCurrentTab = message =>
    browser.tabs.query({active: true, currentWindow: true})
    .then(([tab]) => {
        if(tab.url.startsWith("http") || tab.url.startsWith("file"))
            return browser.tabs.sendMessage(tab.id, message);
    })
;


/**
 * @func getTextNodes
 * @desc 取得文字節點們。
 * @param {Node} [root = document.body]
 * @param {NodeTester} [filter = ()=>true] - test whether to traverse the text node
 * @param {string|string[]} [skipTags=script,style] - html tags to be skipped
 * @returns {Node[]} 符合條件的文字節點陣列。
 *
 * 可能會想避開的標籤：
 * * 非可視： title, script, style
 * * 表單元件： button, select, textarea
 * * 程式碼： code, pre, data, time, kbd, ruby, samp, var, ~~plaintext, xmp~~
 *
 */
function getTextNodes(
    root = document.body,
    filter = () => true,
    skipTags = "script,style"
) {
    if(typeof skipTags === "string") skipTags = skipTags.split(",");
    skipTags = skipTags.map(tag => tag.trim().toUpperCase());
    const textNodes = [];
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        node => {
            if(node.nodeType !== Node.TEXT_NODE) {
                return skipTags.includes(node.nodeName)
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_SKIP
                ;
            }
            return filter(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    );
    let node;
    while(node = walker.nextNode()) textNodes.push(node);
    return textNodes;
}


/**
 * @func parseChineseInt
 * @param {string} str
 * @returns {integer}
 *
 * @example /// 可用此測試
    ["十", "二十", "十二", "一百", "一百零七", "一百十", "一百十七", "一百一十七", "一百二十七", "一千", "一千零七", "一千零十", "一千零十七", "一千零二十", "一千一百"].map(parseChineseInt)
    ["伍", "五七六", "七零零二", "三四零"].map(parseChineseInt)
 */
const digits = ["０零〇", "一壹", "二貳", "三參", "四肆", "五伍", "六陸", "七柒", "八捌", "九玖"];
const exponents = {十: 10, 百: 100, 千: 1000};
function parseChineseInt(str) {
    str = str.replace(/\s/g, "");
    let result = 0, digit = null;
    if(!/[十百千]/g.test(str)) {
        for(let char of str)
            result = result * 10 + digits.findIndex(d => d.includes(char));
        return result;
    }
    for(let char of str) {
        if(exponents.hasOwnProperty(char)) {
            if(char === "十" && !digit) digit = 1; // 一百十三
            result += exponents[char] * digit;
            digit = null;
            continue;
        }
        digit = digits.findIndex(d => d.includes(char));
    }
    if(digit) result += digit; // 三十
    return result;
}


/**
 * @callback NodeTester
 * @param {Node} node
 * @returns {boolean}
 */
