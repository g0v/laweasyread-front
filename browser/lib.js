if(typeof browser === "undefined") browser = chrome;
if(typeof document !== "undefined") $ = document.querySelector.bind(document);

/**
 * console
 */
const errorHandler = console.error.bind(console);
const debug = console.debug.bind(console);
const assert = console.assert.bind(console);


/**
 * 將 HTML 轉換成 DOM 。
 * 某些有指定其父層元素類型的（例如 `<tr>` ）若單獨傳入的話會被消失；
 * 但非標準 HTML 標籤（例如 `<aaaa>` ）不會消失。
 * @returns {HTMLDocument}
 */
const parseHTML = (() => {
    if(typeof DOMParser === "undefined") return;
    const domParser = new DOMParser();
    return html => domParser.parseFromString(html, "text/html");
})();


/**
 * 改寫 fetch() ，使 HTTP 錯誤的情形（例如404）也會 reject
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch }
 */
const fetch2 = (...args) => fetch(...args).then(response => {
    if(response.ok) return response;
    throw new ReferenceError(response.statusText);
});
const fetchJSON = (...args) => fetch2(...args).then(res => res.json());
const fetchText = (...args) => fetch2(...args).then(res => res.text());
const fetchDOM = (...args) => fetchText(...args).then(parseHTML);


/**
 * 抓 browser.storage 裡的資料
 * 在 keys 為字串時，改成直接傳回該筆資料，而不是 {key: value} 。
 */
function getData(keys, area = "local") {
    let promise = browser.storage[area].get(keys);
    if(typeof keys === "string")
        promise = promise.then(s => s[keys]);
    return promise;
}
const setData = (items, area = "local") => browser.storage[area].set(items);


/**
 * 傳送訊息到當前的分頁，但不要傳到瀏覽器設定頁面。
 * MDN and Google both say `Tab.url` is present only if permission `tabs` is granted, but it seems that I got it by permission `activeTab`?
 */
const sendMessageToCurrentTab = message =>
    browser.tabs.query({active: true, currentWindow: true})
    .then(([tab]) => {
        if(tab.url.startsWith("http") || tab.url.startsWith("file"))
            return browser.tabs.sendMessage(tab.id, message);
    })
;


/**
 * 取得文字節點。
 * @param {Node} root
 * @param {function} filter - test whether to traverse the text node
 * @param {string|string[]} skipTags - html tags (in upper case) to be skipped
 * @returns {Node[]}
 */
function getTextNodes(
    root = document.body,
    filter = () => true,
    skipTags = "BUTTON,CODE,SCRIPT,SELECT,STYLE,TEMPLATE,TEXTAREA"
) {
    if(typeof skipTags === "string") skipTags = skipTags.split(",");
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
 * Create HTML Element from serializable object.
 *
 * Different from `React.createElement`.
 * For dynamically assign tag name, consider [computed property name]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#computed_property_names}.
 *
 * @param {Object} object - The only key is the tag name to be created, and the value is an object describing its properties and children.
 * @param {string} [object[].text] - appended as the last child of the element. convenient if no other children.
 * @param {Object} [object[].listeners] - listeners to be added, with key as the event type (without prefix `on`).
 * @param {Object} [object[].onclick] - another way to assign event listeners.
 * @returns {Element}
 *
 * @example anchor link
 *  createElement({a: {href: "#", text: "link"}});
 *
 * @example table row with multiple cells
 *  createElement(
 *      {tr: {children: [
 *          {td: {text: "A"}},
 *          {td: {text: "B"}},
 *          {td: {text: "C"}},
 *      ]}}
 *  );
 *
 * @example line break
 *  createElement({br: {}});
 *
 * @example span with 2 click listeners
 *  createElement(
 *      {span: {
 *          listeners: [click: () => alert("foo")],
 *          onclick: () => alert("bar"),
 *          text: "foobar"
 *      }}
 *  );
 *
 * @example label with a checkbox and a text inside
 *  createElement(
 *      {label: {
 *          children: [
 *              {input: {type: "checkbox"}},
 *              "clicking this also triggers click event of the checkbox"
 *          ]
 *      }}
 *  );
 */
function createElement(object) {
    if(typeof object === "string") return document.createTextNode(object);
    const tag = Object.keys(object)[0];
    const props = object[tag];
    const elem = document.createElement(tag);
    for(let prop in props) {
        const value = props[prop];
        prop = prop.toLowerCase();
        if(prop.startsWith("on")) elem.addEventListener(prop.substring(2), value);
        else switch(prop) { // lowercased alphabetic order
            case "children": // value: Object[]
                elem.append(...value.map(createElement));
                break;
            case "class":
            case "classname": // value: string | string[]
                elem.className = (typeof value === "string") ? value : value.join(" ");
                break;
            case "data":
            case "dataset": // value: Object whose values are strings
                for(let ds in value) elem.dataset[ds] = value[ds];
                break;
            case "listeners": // value: Object whose values are functions
                for(let eventType in value) elem.addEventListener(eventType, value[eventType]);
                break;
            case "style": // value: string | Object
                if(typeof value == "string") elem.style.cssText = value;
                else for(let sp in value) elem.style[sp] = value[sp];
                break;
            case "text": // value: string
                elem.append(value);
                break;
            default: // value: string
                assert(typeof value === "string");
                elem.setAttribute(prop, value);
        }
    }
    return elem;
};


/******** Definitions ********/
/**
 * 給 createElement() 用的 JSON 物件，只有一個「鍵」代表要建立的 HTML 標籤，其「值」即為該元素的屬性。
 * @typedef {Object} JSONElement
 * @property {ElementProperties} [*]
 */
/**
 * 代表 HTML 元素的屬性，以下為例示。
 * @typedef {Object} ElementProperties
 * @property {string} [id] - 指定元素的 id 。
 * @property {string} [src] - 指定元素要引用的路徑。
 * @property {(string|string[])} [class] - 指定元素的 CSS 類別。
 * @property {Object.<string, function>} [listeners] - 指定元素要監聽的事件類型及監聽器。
 * @property {function} [onclick] - 指定監聽元素的滑鼠單擊事件的函式。
 */
