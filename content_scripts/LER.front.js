/**
 * @module LER
 * @desc 各公有方法會直接在 `background.js` 被當成監聽器。欲作為監聽器的，其參數列應為 `request`, `sender`, `sendResponse` 。
 */
var LER = LER || {
    fetchText(request) {
        return (browser || chrome).runtime?.sendMessage(request);
    },
    loadRules() {
        return (browser || chrome).runtime?.sendMessage({command: 'loadRules'});
    },
    parseString(request) {
        // console.debug('LER.parseString() in `content_scripts/LER.front.js`');
        return (browser || chrome).runtime?.sendMessage(request);
    },
    preparePopup(request) {
        // console.debug('LER.preparePopup() in `content_scripts/LER.front.js`');
        return (browser || chrome).runtime?.sendMessage(request);
    }
};

Object.assign(LER, {

/** @type {boolean} */
enablePopup: true,

/** @type {Element} */
popupTemplate: kongUtil.createElementFromJsonML(
    ["div", {
        "class": "LER-popup-container",
        "style": "display: none;"
        },
        ["div", {"class": "LER-popup-before"}],
        ["div", {"class": "LER-popup"},
            ["input", {
                "class": "LER-popup-pin",
                "type": "checkbox",
                "title": "固定"
            }],
            ["header"],
            ["dl", {"class": "LER-popup-body"}]
        ],
        ["div", {"class": "LER-popup-after"}]
    ]
),

/** @type {Object} */
// pageDefaultLaw: null,

/** @type {integer} */
counter: 0,

/**
 * 用 `pcode` 或名稱找法規。
 * @param {string} string
 * @returns {Promise}
 */
searchLaw(string) {
    console.debug('LER.searchLaw()');
    const key = /^[A-Z]\d{7}$/.test(string) ? "pcode" : "name";
    return getData("laws").then(laws => laws.find(law => law[key] === string));
},

/**
 * 轉換指定元素內的文字節點，但排除 class 名稱有 "LER-" 開頭的。
 * @param {Element} [element]
 * @param {string} [defaultLawPcode]
 * @returns {Promise}
 */
async parseElement(element, defaultLaw) {
    // console.debug('LER.parseElement()');
    console.time("LawEasyRead" + (++this.counter));
    await this.loadRules();

    // 取得所有要處理的文字節點
    const textNodes = [];
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        node => {
            if(node.nodeType === Node.TEXT_NODE) {
                return /[\u4E00-\u9FFF]{2}/.test(node.textContent) // 有連續中日韓字元
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
            return node.matches('a,button,code,script,select,style,template,textarea')
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_SKIP
            ;
        }
    );
    let node;
    while(node = walker.nextNode()) textNodes.push(node);

    if(typeof defaultLaw === "string" && defaultLaw)
        defaultLaw = await this.searchLaw(defaultLaw);

    return new Promise(resolve => {
        const LER = this;
        const currentCounter = this.counter;
        async function parseNextTextNode() {
            const node = textNodes.shift();
            // console.debug('parseNextTextNode()');
            if(!node) {
                document.dispatchEvent(new CustomEvent("lerParseEnd", {detail: {target: element}}));
                console.timeEnd("LawEasyRead" + currentCounter);
                return resolve(element);
            }
            let objects = await LER.parseString({
                command: "parseString",
                string: node.textContent,
                allowLink: !node.parentNode?.closest?.("a"),
                defaultLaw
            });

            requestIdleCallback(parseNextTextNode);
            // objects = objects.flat();
            // console.debug(objects);
            if(objects.length === 1 && objects[0] === node.textContent) return; // 沒變的話就不替換
            objects = objects.map(kongUtil.createElementFromJsonML);
            node.replaceWith(...objects);
            if(LER.enablePopup) objects.forEach(LER.bindPopup.bind(LER));
            if(!node.nextSibling) {
                const parent = objects[0].parentNode;
                const event = new CustomEvent("lerParseEnd");
                parent.dispatchEvent(event);
            }
        }
        requestIdleCallback(parseNextTextNode);
    });
},

parseDocument(defaultLaw) {
    // console.debug('LER.parseDocument()');
    return this.parseElement(document.body, defaultLaw);
},

/**
 * 綁定滑鼠移過時的彈出窗格。
 * @param {Element} elem
 * @returns {void}
 *
 *  做四件事：
 *  1. 滑鼠首次移入目標時，同步建立彈出窗格，異步載入資料。載入資料後若窗格仍處於顯示狀態，則再次定位窗格。
 *  2. 滑鼠移入目標時，則設定稍後顯示並定位窗格。
 *  3. 滑鼠移出目標時，若窗格尚未顯示，則取消前項設定。
 *  4. 滑鼠移動時，若不在顯示中的窗格或其目標內，且窗格未被釘選，則隱藏窗格。（另處監聽 document 的 mousemove 事件）
 *
 *  備註：由於在 shadow tree 裡的 Event.target 在事件結束後會被清掉，所以先複製需要的資料出來。
 *  參考：
 *  * https://stackoverflow.com/questions/57963312/
 *  * https://stackoverflow.com/questions/62181537/
 */
bindPopup(elem) {
    // console.debug('LER.bindPopup()');
    if(!(elem instanceof Element)) return;
    const {jyi, pcode, word} = elem.dataset;
    if(!jyi && !pcode && !word) return;

    let popup;
    elem.addEventListener('mouseenter', event => {
        // console.debug('mouseenter', event);
        const fakeEvent = {target: event.target, clientX: event.clientX, pageX: event.pageX};
        // 為同步建立空白窗格，就不從後端取得 JSML ，而是複製已載入的 DOM 。
        popup = this.popupTemplate.cloneNode(true);
        popup.target = elem;
        popup.addEventListener('mouseleave', e => {
            if(kongUtil.isEventInElement(e, elem)) return;
            if(kongUtil.isEventInElement(e, popup)) return;
            if(popup.querySelector('[type=checkbox]').checked) return;
            popup.style.display = 'none';
        });
        const body = popup.querySelector('.LER-popup-body');
        body.textContent = "讀取中…";
        this.getShadowRoot().append(popup);

        // 異步載入資料。
        this.preparePopup(Object.assign(
            {command: "preparePopup"},
            elem.dataset
        )).then(({headers, bodyParts, defaultLaw}) => {
            popup.querySelector('header').append(...headers.map(kongUtil.createElementFromJsonML));
            body.textContent = '';
            body.append(...bodyParts.map(kongUtil.createElementFromJsonML));
            this.parseElement(body, defaultLaw);
            if(!popup.style.display) this.setPopupPosition(popup, fakeEvent); ///< 載入內容後高度可能有變化，要重新定位，但是只能依賴舊的滑鼠事件位置。
        });
    }, {once: true});

    let timeoutID;
    elem.addEventListener('mouseenter', event => {
        // console.debug('mouseenter', event);
        const fakeEvent = {target: event.target, clientX: event.clientX, pageX: event.pageX};
        if(!popup) throw new ReferenceError("popup does not exist.");
        if(!popup.style.display) return;
        timeoutID = setTimeout(this.setPopupPosition, 375, popup, fakeEvent);
    });
    elem.addEventListener('mouseleave', event => {
        // console.debug('mouseleave', elem);
        clearTimeout(timeoutID);

        if(kongUtil.isEventInElement(event, popup)) return;
        if(popup.querySelector('[type=checkbox]').checked) return;
        popup.style.display = 'none';
    });
},

/**
 * 設定彈出窗格位置。
 * @param {Element} popup
 * @param {MouseEvent} event
 * @returns {undefined}
 */
setPopupPosition(popup, event) {
    // console.debug('LER.setPopupPosition()', event);
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
},

getShadowRoot() {
    let host = kongUtil.$('#LER-shadow-host');
    if(!host) {
        host = kongUtil.createElementFromJsonML([
            'div', {
                id: 'LER-shadow-host',
                style: 'position: static; width: 0; height: 0;'
            }
        ]);
        document.body?.append(host);

        const root = host.attachShadow({mode: 'open'});
        this.fetchText({command: 'fetchText', resource: 'content_scripts/main.css'})
        .then(css => {
            root.append(kongUtil.createElementFromJsonML(
                ['style', css]
            ));
        });
    }
    return host.shadowRoot;
}

});
