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
 * @func parseElement
 * @desc 轉換指定的元素。
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

                if(enablePopup) objects.forEach(node => {
                    if(!(node instanceof Element)) return;
                    const ds = node.dataset;
                    if(ds.jyi) {
                        let popup;
                        listen(node, "mouseenter", event => {
                            popup = createJyiPopup(node.dataset.jyi, event);
                            document.body.append(popup);
                            listen(popup, "mouseleave", event => {
                                if(!isEventInElem(node, event)) popup.style.display = "none";
                            });
                        }, {once: true});
                        listen(node, "mouseenter", event => {
                            if(!popup) throw new ReferenceError("popup does not exist.");
                            setPopupPosition(popup, event);
                        });
                        listen(node, "mouseleave", event => {
                            if(!isEventInElem(popup, event)) popup.style.display = "none";
                        });
                        return;
                    }
                    if(ds.pcode && ds.norge) {
                        return;
                    }
                });

                const isLastChild = !node.nextSibling;
                node.replaceWith(...objects);
                if(isLastChild) {
                    const parent = objects[0].parentNode;
                    const event = new CustomEvent("lerParseEnd");
                    parent.dispatchEvent(event);
                }
            });
        }, 1);
    });
}

function createJyiPopup(jyiNumber, event) {
    const popup = popupTemplate.cloneNode(true);
    fetchJSON(`https://cdn.jsdelivr.net/gh/kong0107/jyi/json/${jyiNumber}.json`)
    .then(jyi => {
        const header = createElement(
            {header: {$: [
                {a: {
                    href: 'http://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=' + jyi.number,
                    $: [`釋字第 ${jyi.number} 號`, {time: jyi.date}]
                }}
            ]}}
        );
        if(jyi.title) header.append(createElement({div: jyi.title}));
        $("header", popup).replaceWith(header);

        let body = {dl: {class: "LER-popup-body", $: []}};
        if(jyi.issue) body.dl.$.push({dt: "爭點"}, {dd: jyi.issue});
        body.dl.$.push({dt: "解釋文"}, {dd: {$:
            jyi.holding.split("\n").map(para => ({li: para}))
        }});
        if(jyi.reasoning)
            body.dl.$.push({dt: "理由書"}, {dd: {$:
                jyi.reasoning.split("\n").map(para => ({li: para}))
            }});
        body = createElement(body);
        parseElement(body);
        $(".LER-popup-body", popup).replaceWith(body);
        setPopupPosition(popup, event);
    });
    return popup;
}


/**
 * 判斷事件座標是不是發生在某元件內部
 */
function isEventInElem(elem, event) {
    const rect = elem.getBoundingClientRect(); ///< 相對於當前可視範圍，而非相對於文件左上角
    const x = event.pageX - window.scrollX;
    const y = event.pageY - window.scrollY;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
};


/**
 * 設定浮動窗位置
 * * Y軸：預設為目標元素的下緣，但若會超出可視範圍（即使未超過文件範圍），則改在目標元素的上緣。
 * * X軸：視滑鼠在目標元素的水平位置，依比例。但不能讓浮動窗超過畫面寬度。
 */
function setPopupPosition(popup, event) {
    let arrow; ///< 稍後判斷箭頭是上面還是下面
    const rect = event.target.getBoundingClientRect(); ///< 相對於當前可視範圍，而非相對於文件左上角

    /// 位置跟尺寸的資訊必須在元素顯示後才能取得，故先顯示其中一個箭頭再看高度。
    popup.firstChild.style.display = "none";
    popup.lastChild.style.display = "";
    popup.style.display = "";

    let top = rect.bottom + window.scrollY;
    if(top + popup.offsetHeight > window.scrollY + window.innerHeight) {
        top = rect.top + window.scrollY - popup.offsetHeight;
        arrow = popup.lastChild;
        arrow.style.display = "";
    }
    else {
        popup.lastChild.style.display = "none";
        arrow = popup.firstChild;
        arrow.style.display = "";
    }
    popup.style.top = top + "px";

    let left = rect.left + window.scrollX; // 目標元素的左緣
    left += (event.clientX - rect.left)
        * Math.max(rect.width - popup.offsetWidth, 0) / rect.width
    ; // 如果目標元素比浮動窗還要寬，那就依滑鼠在目標元素的相對位置來調整浮動窗的X軸位置。
    if(left + popup.offsetWidth > document.body.clientWidth) // 不能讓浮動窗超過畫面寬度
        left = document.body.clientWidth - popup.offsetWidth;
    popup.style.left = left + "px";

    // 箭頭的位置：跟著滑鼠座標的X值，但不能超出浮動窗本身。
    const arrowLeft = Math.min(
        event.pageX - left - arrow.offsetWidth / 2, // 理想位置
        popup.offsetWidth - arrow.offsetWidth - 8   // 浮動窗右緣，再扣掉原角框的範圍
    );
    arrow.style.marginLeft = Math.max(arrowLeft, 8) + "px";
}
