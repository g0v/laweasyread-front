kongUtil.use("$", "createElement", "listen", "fetchJSON", "fetchDOM", "parseHTML");
kongUtil.use("logger");

browser.runtime.onMessage.addListener(({command}) => {
    switch(command) {
        case "parseDocument":
            return parseElement(document.body);
        default:
            console.error("unknown command");
    }
});

let enablePopup, popupTemplate;
getData(["autoParse", "enablePopup"])
.then(storage => {
    if(storage.autoParse) parseElement(document.body);
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
    }
});

/**
 * 轉換指定的元素。
 * @param {Element} element
 * @returns {Promise}
 */
function parseElement(element = document.body) {
    const textNodes = getTextNodes(
        element,
        node => /[\u4E00-\u9FFF]{2}/.test(node.textContent), // 有連續中日韓字元
        "BUTTON,CODE,SCRIPT,SELECT,STYLE,TEMPLATE,TEXTAREA"
    );
    console.time("LawEasyRead");
    return new Promise(resolve => {
        const intervalID = setInterval(() => {
            const node = textNodes.shift();
            if(!node) {
                clearInterval(intervalID);
                const event = new CustomEvent("lerParseEnd", {detail: {target: element}});
                document.dispatchEvent(event);
                console.timeEnd("LawEasyRead");
                return resolve(element);
            }

            browser.runtime.sendMessage({
                command: "parseString",
                string: node.textContent,
                allowLink: !node.parentNode?.closest?.("a")
            }).then(objects => {
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
        }, 1);
    });
}

/**
 * 綁定滑鼠移過時的彈出窗格。
 * @param {Element} elem
 * @returns {undefined} undefined
 *
 *  做四件事：
 *  1. 滑鼠首次移入目標時，同步建立彈出窗格，異步載入資料，載入資料後再次定位窗格；
 *  2. 滑鼠移入目標時，顯示並定位窗格；
 *  3. 滑鼠移出目標時，若也不在窗格內，則隱藏窗格；
 *  4. 滑鼠移出窗格時，若也不在目標內，則隱藏窗格。
 */
function bindPopup(elem) {
    if(!(elem instanceof Element)) return;
    const {jyi, pcode, norge} = elem.dataset;
    if(!(jyi || pcode && norge)) return;

    let popup;
    const onMouseLeave = event => {
        if(isEventInElem(elem, event) || isEventInElem(popup, event)) return;
        if($(".LER-popup-pin", popup).checked) return;
        popup.style.display = "none";
    };

    listen(elem, "mouseenter", event => {
        // 為同步建立空白窗格，就不從後端取得 JSML ，而是複製已載入的 DOM 。
        popup = popupTemplate.cloneNode(true);
        const body = $(".LER-popup-body", popup);
        body.textContent = "讀取中…";
        document.body.append(popup);
        listen(popup, "mouseleave", onMouseLeave);

        // 異步載入資料。
        browser.runtime.sendMessage(Object.assign(
            {command: "createPopupJSML"},
            elem.dataset
        )).then(({headers, bodyParts}) => {
            $("header", popup).append(...headers.map(createElement));
            body.textContent = "";
            body.append(...bodyParts.map(createElement));
            parseElement(body);
            setPopupPosition(popup, event); ///< 載入內容後高度可能有變化，要重新定位，但是只能依賴舊的滑鼠事件位置。
        });
    }, {once: true});

    listen(elem, "mouseenter", event => {
        if(!popup) throw new ReferenceError("popup does not exist.");
        setPopupPosition(popup, event);
    });

    listen(elem, "mouseleave", onMouseLeave);
}


/**
 * 判斷事件座標是否在指定元件內部。
 * @param {Element} elem
 * @param {MouseEvent} event
 * @returns {boolean}
 */
function isEventInElem(elem, event) {
    const rect = elem.getBoundingClientRect(); ///< 相對於當前可視範圍，而非相對於文件左上角
    const x = event.pageX - window.scrollX;
    const y = event.pageY - window.scrollY;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
};


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
    popup.style.left = left + "px";

    // 箭頭的位置：跟著滑鼠座標的X值，但不能超出彈出窗格本身。
    const arrowLeft = Math.min(
        event.pageX - left - arrow.offsetWidth / 2, // 理想位置
        popup.offsetWidth - arrow.offsetWidth - 8   // 彈出窗格右緣，再扣掉原角框的範圍
    );
    arrow.style.marginLeft = Math.max(arrowLeft, 8) + "px";
}
