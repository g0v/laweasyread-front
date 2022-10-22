kongUtil.use("$", "$$", "createElement", "listen", "fetchJSON", "fetchDOM", "parseHTML", "isEventInElement");
kongUtil.use("logger");

/** @type {boolean} */
let enablePopup;

/** @type {Element} */
let popupTemplate;

/** @type {Object} */
let pageDefaultLaw;

/** @type {integer} */
let counter = 0;

browser.runtime.onMessage.addListener(({command}) => {
    switch(command) {
        case "parseDocument": // 來自 ./browser/popup.html
            return parseElement(document.body, pageDefaultLaw);
        default:
            console.error("unknown command");
    }
});

getData(["autoParse", "enablePopup"])
.then(storage => {
    if(storage.autoParse) parseElement(document.body, pageDefaultLaw);
    if(enablePopup = storage.enablePopup) {
        browser.runtime.sendMessage({
            command: "readFile",
            file: "content_scripts/popup.template.html",
            type: "text"
        }).then(text => {
            popupTemplate = parseHTML(text);
            /// 拿掉因排版而出現的空白文字節點
            getTextNodes(popupTemplate).forEach(tn => tn.remove());
        });
        listen(document, "mousemove", event => {
            $$(".LER-popup-container").forEach(popup => {
                if(popup.style.display
                    || $(".LER-popup-pin", popup).checked
                    || kongUtil.isEventInElement(event, popup)
                    || kongUtil.isEventInElement(event, popup.target)
                ) return;
                popup.style.display = "none";
            })
        });
    }
});

/**
 * 用 `pcode` 或名稱找法規。
 * @param {string} string
 * @returns {Promise}
 */
function searchLaw(string) {
    const key = /^[A-Z]\d{7}$/.test(string) ? "pcode" : "name";
    return getData("laws").then(laws => laws.find(law => law[key] === string));
}

/**
 * 轉換指定元素內的文字節點，但排除 class 名稱有 "LER-" 開頭的。
 * @param {Element} element
 * @param {string} [defaultLawPcode]
 * @returns {Promise}
 */
async function parseElement(element = document.body, defaultLaw) {
    console.time("LawEasyRead" + (++counter));
    const textNodes = getTextNodes(
        element,
        node => (
            (node.nodeType === Node.TEXT_NODE)
            ? /[\u4E00-\u9FFF]{2}/.test(node.textContent) // 有連續中日韓字元
            : !/(^|\x20)LER-/.test(node.className)
        ),
        "BUTTON,CODE,SCRIPT,SELECT,STYLE,TEMPLATE,TEXTAREA"
    );

    if(typeof defaultLaw === "string" && defaultLaw)
        defaultLaw = await searchLaw(defaultLaw);

    return new Promise(resolve => {
        const currentCounter = counter;
        function parseNextTextNode() {
            const node = textNodes.shift();
            if(!node) {
                document.dispatchEvent(new CustomEvent("lerParseEnd", {detail: {target: element}}));
                console.timeEnd("LawEasyRead" + currentCounter);
                return resolve(element);
            }
            browser.runtime.sendMessage({
                command: "parseString",
                string: node.textContent,
                allowLink: !node.parentNode?.closest?.("a"),
                defaultLaw
            }).then(objects => {
                requestIdleCallback(parseNextTextNode);
                objects = objects.flat();
                if(objects.length === 1 && objects[0] === node.textContent) return; // 沒變的話就不替換
                objects = objects.map(createElement);
                node.replaceWith(...objects);
                if(enablePopup) objects.forEach(bindPopup);
                if(!node.nextSibling) {
                    const parent = objects[0].parentNode;
                    const event = new CustomEvent("lerParseEnd");
                    parent.dispatchEvent(event);
                }
            });
        }
        requestIdleCallback(parseNextTextNode);
    });
}

/**
 * 綁定滑鼠移過時的彈出窗格。
 * @param {Element} elem
 * @returns {undefined} undefined
 *
 *  做四件事：
 *  1. 滑鼠首次移入目標時，同步建立彈出窗格，異步載入資料。載入資料後若窗格仍處於顯示狀態，則再次定位窗格。
 *  2. 滑鼠移入目標時，則設定稍後顯示並定位窗格。
 *  3. 滑鼠移出目標時，若窗格尚未顯示，則取消前項設定。
 *  4. 滑鼠移動時，若不在顯示中的窗格或其目標內，且窗格未被釘選，則隱藏窗格。（另處監聽 document 的 mousemove 事件）
 */
function bindPopup(elem) {
    if(!(elem instanceof Element)) return;
    const {jyi, pcode, word} = elem.dataset;
    if(!jyi && !pcode && !word) return;

    let popup;
    listen(elem, "mouseenter", event => {
        // 為同步建立空白窗格，就不從後端取得 JSML ，而是複製已載入的 DOM 。
        popup = popupTemplate.cloneNode(true);
        popup.target = elem;
        const body = $(".LER-popup-body", popup);
        body.textContent = "讀取中…";
        document.body.append(popup);

        // 異步載入資料。
        browser.runtime.sendMessage(Object.assign(
            {command: "createPopupJSML"},
            elem.dataset
        )).then(({headers, bodyParts, defaultLaw}) => {
            $("header", popup).append(...headers.map(createElement));
            body.textContent = "";
            body.append(...bodyParts.map(createElement));
            parseElement(body, defaultLaw);
            if(!popup.style.display) setPopupPosition(popup, event); ///< 載入內容後高度可能有變化，要重新定位，但是只能依賴舊的滑鼠事件位置。
        });
    }, {once: true});

    let timeoutID;
    listen(elem, "mouseenter", event => {
        if(!popup) throw new ReferenceError("popup does not exist.");
        if(!popup.style.display) return;
        timeoutID = setTimeout(setPopupPosition, 375, popup, event);
    });
    listen(elem, "mouseleave", () => {
        clearTimeout(timeoutID);
    });
}


/**
 * 設定彈出窗格位置。
 * @param {Element} popup
 * @param {MouseEvent} event
 * @returns {undefined}
 */
function setPopupPosition(popup, event) {
    let arrow; ///< 稍後判斷箭頭是上面還是下面
    const rect = event.target.getBoundingClientRect(); ///< 相對於當前可視範圍，而非相對於文件左上角

    /// 位置跟尺寸的資訊必須在元素顯示後才能取得，故先顯示其中一個箭頭再看高度。
    popup.firstChild.style.display = "none";
    popup.lastChild.style.display = "";
    popup.style.display = "";

    /// Y軸：預設為目標元素的下緣，但若會超出可視範圍（即使未超過文件範圍），則改在目標元素的上緣。
    let top = Math.floor(rect.bottom + window.scrollY);
    if(top + popup.offsetHeight > window.scrollY + window.innerHeight) {
        top = Math.ceil(rect.top + window.scrollY - popup.offsetHeight);
        arrow = popup.lastChild;
        arrow.style.display = "";
    }
    else {
        popup.lastChild.style.display = "none";
        arrow = popup.firstChild;
        arrow.style.display = "";
    }
    popup.style.top = top + "px";

    /// X軸：視滑鼠在目標元素的水平位置，依比例。但不能讓彈出窗格超過畫面寬度。
    let left = rect.left + window.scrollX; // 目標元素的左緣
    left += (event.clientX - rect.left)
        * Math.max(rect.width - popup.offsetWidth, 0) / rect.width
    ; // 如果目標元素比彈出窗格還要寬，那就依滑鼠在目標元素的相對位置來調整彈出窗格的X軸位置。
    if(left + popup.offsetWidth > document.body.clientWidth) // 不能讓彈出窗格超過畫面寬度
        left = document.body.clientWidth - popup.offsetWidth;
    popup.style.left = Math.max(left, 0) + "px";

    // 箭頭的位置：跟著滑鼠座標的X值，但不能超出彈出窗格本身。
    const arrowLeft = Math.min(
        event.pageX - left - arrow.offsetWidth / 2, // 理想位置
        popup.offsetWidth - arrow.offsetWidth - 8   // 彈出窗格右緣，再扣掉原角框的範圍
    );
    arrow.style.marginLeft = Math.max(arrowLeft, 8) + "px";
}
