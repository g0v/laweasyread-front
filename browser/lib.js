if(typeof browser === "undefined") globalThis.browser = chrome;
if(typeof window !== "undefined")
    $ = (s, n = document) => (s instanceof Node) ? s : n.querySelector(s);

/**
 * console
 */
const errorHandler = console.error.bind(console);
const debug = console.debug.bind(console);


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
const fetchDOM = (...args) => fetchText(...args).then(html => (new DOMParser()).parseFromString(html, "text/html"));


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
 * 取得文字節點
 */
function getTextNodes(root = document.body, filter = () => true) {
    const textNodes = [];
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        node => {
            if(node.nodeType !== Node.TEXT_NODE) {
                return ["SCRIPT", "NOSCRIPT", "STYLE", "CODE"].includes(node.nodeName)
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
 * 用可序列化的物件建構 HTML 元素
 */
// function createElement(tagName, props, children = []) {
function createElement() {
    const tagName = arguments[0]?.tagName ?? arguments[0]?.tag ?? arguments[0];
    const props = arguments[0]?.props ?? arguments[1] ?? null;
    const children = [arguments[0]?.children ?? [].slice.call(arguments, 2)].flat();

    const elem = document.createElement(tagName);
    for(let attr in props) {
        const value = props[attr];
        attr = attr.toLowerCase();
        if(attr.startsWith("on")) {
            const eventType = attr.substring(2);
            elem.addEventListener(eventType, value);
            continue;
        }
        switch(attr) {
            case "class":
            case "classname":
                elem.className = (typeof value === "string") ? value : value.join(" ");
                break;
            case "data":
            case "dataset":
                for(let ds in value) elem.dataset[ds] = value[ds];
                break;
            case "style":
                if(typeof props.style == "string") elem.style.cssText = props.style;
                else for(let sp in props.style) elem.style[sp] = props.style[sp];
                break;
            default:
                elem.setAttribute(attr, value);
        }
    }
    children.forEach(child => {
        if(typeof child === "string" || child instanceof Node) elem.append(child);
        else elem.append(createElement(child));
    });
    return elem;
};
