"use strict";
{
const e = domCrawler.createElement;

/**
 * 設定預設法規。
 */
const params = new URLSearchParams(location.search);
const pcode = params.get("pcode");
if(pcode) LER.loadLaws.then(() =>
    LER.defaultLaw = LER.getLaw({PCode: pcode})
);

/**
 * 將編章節（及各自後接的條文們）重新調整為巢狀結構，並計算 sticky 的 top 值。
 */
const height = 36;
const depths = [];
document.querySelectorAll(".law-reg-content .h3").forEach((h3Elem, index, list) => {
    const section = e("section");
    while(h3Elem.nextElementSibling && h3Elem.nextElementSibling.className === "row")
        section.appendChild(h3Elem.nextElementSibling);
    h3Elem.replaceWith(section);
    section.insertBefore(h3Elem, section.firstChild);

    const divDepth = section.dataset.lerDepth = h3Elem.className.substr(-1);
    for(let j = index - 1; j >= 0; --j) {
        const parentSection = list[j].parentNode;
        if(parentSection.dataset.lerDepth < divDepth) {
            parentSection.appendChild(section);
            break;
        }
    }
    if(depths.indexOf(divDepth) === -1) depths.push(divDepth);
});
const css = depths.map((depth, index) => {
    return `
        .char-${depth} { top: ${index*height}px; }
        .char-${depth} ~ .row > .col-no { top: ${(index+1)*height}px; }
    `;
}).join("\n");
document.head.appendChild(e("style", {type: "text/css"}, css));

/**
 * 加上「提及條文」區塊。
 *
 * 利用 HTML 的 `details` 和 `summary` ，在展開時才載入內容。
 * 載入的是全國法規資料庫自己的網頁，這樣就不用擔心版本更新問題了。
 * 載入後要再次呼叫 LER.parse 處理其內容，並且讓其內容提及其他條文時也有巢狀結構。
 */
getData("mojAddReferringArticles").then(mojAddReferringArticles => {
    if(!mojAddReferringArticles) return;
    LER.addEventListener("parseend", event => {
        console.debug("parseend", event.detail.target);
        const targets = event.detail.target.querySelectorAll("[class^=line-]");
        if(
            !targets.length || //< 浮動視窗非本區須處理的事情
            targets[0].firstChild.tagName === "P" //< 表示本頁已處理過了
        ) return;

        targets.forEach(line => {
            // 先將 `div.line-*` 的內容再用一個 `p` 包起來，以利跟後續要增加的東西區隔。
            line.appendChild(e("p", null, ...line.childNodes));

            let articleGroups = line.querySelectorAll("a[data-range-text]");
            if(!articleGroups.length) return; // 若沒有提到其他條文，那就不需要處理，也不用加上連結

            const container = e(
                "details",
                {className: "LER-article-groups"},
                e("summary") // 提示文字改用 CSS 寫在 summary::before ，以免使用者複製條文時會有多餘文字。
            );
            let onceToggled = false;
            container.addEventListener("toggle", () => {
                if(onceToggled) return;
                onceToggled = true;
                articleGroups.forEach(a => {
                    const pcode = a.dataset.pcode;
                    const loadingText = e("p", null, "讀取中…");
                    container.appendChild(loadingText);
                    fetchDOM(a.href).then(doc => {
                        const body = doc.querySelector(".law-reg");
                        if(!body || !body.querySelector(".row")) {
                            console.info("找不到法條", a); // TODO
                            loadingText.remove();
                            return;
                        }
                        LER.parse(body, pcode);
                        const section = e(
                            "section",
                            {data: {pcode}},
                            doc.querySelector(".table-title"),
                            body
                        );
                        section.querySelectorAll("[id]").forEach(elem => elem.removeAttribute("id")); // 非必要，就養成習慣要避免重複的 ID 。
                        section.querySelectorAll(".btnZone, .text-danger > div").forEach(elem => elem.remove()); // 拿掉不需要的元件（也可以用 CSS 藏起來啦）

                        loadingText.replaceWith(section);
                    });
                });
            });
            line.appendChild(container);
        });
    });
});

}
