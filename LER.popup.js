"use strict";
/**
 * 建立浮動視窗的程式碼太繁瑣，所以集中到這個檔案來。
 */
{
// 語法糖
const e = domCrawler.createElement;

// 樣板，用於複製
const modalTemplate = e("div", {className: "LER-modal-container"},
    e("div", {className: "LER-modal-before"}),
    e("div", {className: "LER-modal"}),
    e("div", {className: "LER-modal-after"})
);
const modalPinTemplate = e("div", {className: "LER-modal-pin"},
    e("label", null,
        e("input", {
            type: "checkbox",
            onchange: event => {
                const pin = event.target.value;
                console.log(pin);
            }
        }),
        "固定"
    )
);

// 判斷事件座標是不是發生在某元件內部
const isEventInElem = (event, elem) => {
    const rect = elem.getBoundingClientRect();
    return (
        event.pageX >= rect.left + window.scrollX &&
        event.pageX <= rect.right + window.scrollX &&
        event.pageY >= rect.top + window.scrollY &&
        event.pageY <= rect.bottom + window.scrollY
    );
};

/**
 * 設定浮動窗位置
 * * Y軸：預設為目標元素的下緣，但若會超出可視範圍（即使未超過文件範圍），則應該改在目標元素的上端。
 * * X軸：看視滑鼠在目標元素的水平位置，依比例。但不能讓浮動窗超過畫面寬度。
 *
 * 注意：
 * * 位置跟尺寸的資訊必須在元素顯示後才能取得
 * * `Element.getBoundingClientRect` 取得的位置是相對於顯示畫面，而非相對於文件左上角。
 *   不過如果只是算比例，到是仍可以用之跟 MouseEvent.clientX 相加減。
 *
 * TODO: 全國法規資料庫的搜尋結果是用 IFrame 實作，其內的「浮動窗要在目標的上面還是下面」的判斷會失準。
 */
const setPopupPosition = (event, popup) => {
    const rect = event.target.getBoundingClientRect();
    let arrow;

    let top = rect.bottom + window.scrollY;
    if(top + popup.offsetHeight > window.scrollY + window.innerHeight) {
        arrow = popup.lastChild;
        popup.firstChild.style.display = "none";
        popup.lastChild.style.display = "";
        top -= rect.height + popup.offsetHeight;
    }
    else {
        arrow = popup.firstChild;
        popup.firstChild.style.display = "";
        popup.lastChild.style.display = "none";
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
    let arrowLeft = Math.min(
        event.pageX - left - arrow.offsetWidth / 2, // 理想位置
        popup.offsetWidth - arrow.offsetWidth       // 浮動窗右緣
    );
    arrow.style.marginLeft = Math.max(arrowLeft, 0) + "px";
};

/**
 * 本檔案主程式：建立浮動窗，並在資料讀取函式抓到資料後放進去。
 * 只在第一次要顯示時才建立元件與讀取資料
 */
const popupWrapper = (docLoader, ...args) => {
    let popup;
    return event => {
        const elem = event.target;
        if(!LER.enablePopup) return;
        if(!popup) {
            popup = document.body.appendChild(modalTemplate.cloneNode(true));

            const body = popup.childNodes[1];
            body.append("讀取中");
            docLoader(...args).then(docs => {
                if(docs instanceof Node || typeof docs === "string") docs = [docs];
                body.lastChild.replaceWith(...docs);
                setPopupPosition(event, popup);
            });
            setPopupPosition(event, popup);

            /**
             * 滑鼠離開某元件時，如果也已不再另一元件的話才隱藏浮動窗
             * 不宜用 `MouseEvent.relatedTarget` ，因為那會抓到預期的對象的子元件。
             * （類似 mouseleave 和 mouseout 差異的問題）
             *
             * 在「浮動窗的浮動窗」的情形，因為在 DOM 中浮動窗彼此並不隸屬，所以會觸發 mouseleave ，
             * 幸好滑鼠剛移到新的浮動窗內時，座標仍會在母浮動窗的範圍內，所以只要如下判斷。
             * 如果想要改讓浮動窗之間有母子關係，就要煩惱子浮動窗要如何定位。
             */
            elem.addEventListener("mouseleave", event => {
                if(!isEventInElem(event, popup) && !isEventInElem(event, elem)) popup.style.display = "none";
            });
            popup.addEventListener("mouseleave", event => {
                if(!isEventInElem(event, popup) && !isEventInElem(event, elem)) popup.style.display = "none";
            });
        }
        if(popup.style.display === "none") {
            // 滑鼠從浮動窗回來時也會觸發 onmouseenter ，不避開的話浮動窗會被重新定位。
            popup.style.display = "";
            setPopupPosition(event, popup);
        }
    };
};


/****************
 * 用浮動窗顯示條文內容
 */
LER.popupArticles = (pcode, ranges) => popupWrapper(loadArticles, pcode, ranges);

/**
 * 非同步抓取法條們的內文，建立成 HTML Element 。
 */
const loadArticles = async(pcode, compRanges) => {
    // 先把範圍轉成較簡單的格式，才方便比對哪幾條在這些範圍中。
    const ranges = compRanges
        .filter(r => r["from"][0].stratum == "條")
        .map(r => {
            const f = r["from"][0];
            const start = f.number * 100 + (f.append || 0);
            if(!r.to || r.to.stratum !== "條") return start;
            const end = r.to.number * 100 + (r.to.append || 0);
            return [start, end];
        })
    ;

    const law = await fetchJSON(
        `https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@gh-pages/FalVMingLing/${pcode}.json`
    ).catch(errorHandler);

    const header = e("header", {className: "LER-modal-header"},
        e("div", null,
            e("div", {className: "LER-modal-title"}, law["法規名稱"]),
            e("div", {className: "LER-modal-date"},
                "最新異動",
                e("time", null, law["最新異動日期"])
            )
        ),
        modalPinTemplate.cloneNode(true)
    );

    const articles = law["法規內容"].filter(article => {
        if(!article["條號"]) return false;
        const am = /(\d+)(-(\d+))?/.exec(article["條號"]);
        const artNum = parseInt(am[1]) * 100 + parseInt(am[2] ? am[3] : 0);
        for(let i = 0; i < ranges.length; ++i) {
            const r = ranges[i];
            if(typeof r === "number") {
                if(r === artNum) return true;
                else continue;
            }
            if(r[0] <= artNum && artNum <= r[1]) return true;
        }
        return false;
    }).map(article => e("dl", null,
        e("dt", {className: "LER-skip"}, article["條號"]),
        e("dd", null, createList(lawtext2obj(article["條文內容"])))
    ));
    const body = e("div", {className: "LER-modal-body"}, ...articles);
    LER.parse(body, {PCode: pcode});

    return [header, body];
};


/****************
 * 用浮動窗顯示大法官解釋
 */
LER.popupJYI = jyi => popupWrapper(loadJYI, jyi);
const loadJYI = async(jyiNum) => {
    const jyi = await fetchJSON(
        `https://cdn.jsdelivr.net/gh/kong0107/jyi@gh-pages/json/${jyiNum}.json`
    ).catch(errorHandler);

    if(!jyi) return e("div", null,
        "遠端資料庫還沒更新到這，建議手動",
        e("a", {
            target: "_blank",
            href: `https://www.judicial.gov.tw/constitutionalcourt/p03_01.asp?expno=${jyiNum}`
        }, "到司法院網站確認")
    );

    const header = e("header", {className: "LER-modal-header"},
        e("div", null,
            e("div", {className: "LER-modal-title"},
                e("div", {className: "LER-skip"}, `釋字第${jyiNum}號`),
                e("div", null, jyi.title || "")
            ),
            e("div", {className: "LER-modal-date"},
                "公布日期",
                e("time", null, jyi.date)
            )
        ),
        modalPinTemplate.cloneNode(true)
    );

    const body = e("dl", null);
    if(jyi.issue) body.append(
        e("dt", null, "爭點"),
        e("dd", null, jyi.issue)
    );
    body.append(
        e("dt", null, "解釋文"),
        e("dd", null, ...jyi.holding.split("\n").map(para => e("p", null, para)))
    );
    if(jyi.reasoning) body.append(
        e("dt", null, "理由書"),
        e("dd", null,
            e("ul", {className: "LER-jyi-reasoning-list"},
                ...jyi.reasoning.split("\n").map(para => e("li", null, e("p", null, para)))
            )
        )
    );
    LER.parse(body);

    return [header, body];
};


}
