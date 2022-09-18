kongUtil.use("$", "$$", "listen", "fetchDOM");

/**
 * 設定預設法規。
 */
const pcode = (new URLSearchParams(location.search)).get("pcode");
// if(pcode) LER.loadLaws.then(() =>
//     LER.defaultLaw = LER.getLaw({PCode: pcode})
// );


/**
 * 將編章節（及各自後接的條文們）重新調整為巢狀結構，並計算 sticky 的 top 值。
 */
const height = 36;
const depths = [];
$$(".law-reg-content .h3").forEach((h3, index, list) => {
    const section = createElement({tag: "section"});
    while(h3.nextElementSibling?.className === "row")
        section.append(h3.nextElementSibling);
    h3.replaceWith(section);
    section.insertBefore(h3, section.firstChild);

    const divDepth = section.dataset.lerDepth = h3.className.slice(-1);
    for(let j = index - 1; j >= 0; --j) {
        const parentSection = list[j].parentNode;
        if(parentSection.dataset.lerDepth < divDepth) {
            parentSection.append(section);
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
document.head.appendChild(createElement({style: css}));


/**
 * 加上「提及條文」區塊。
 *
 * 利用 HTML 的 `details` 和 `summary` ，在展開時才載入內容。
 * 載入的是全國法規資料庫自己的網頁，這樣就不用擔心版本更新問題了。
 * 載入後要再次呼叫 LER.parse 處理其內容，並且讓其內容提及其他條文時也有巢狀結構。
 */
getData("mojAddReferringArticles").then(mojAddReferringArticles => {
    if(!mojAddReferringArticles) return;
    listen(document, "lerParseEnd", ({detail: {target}}) => {
        console.assert(target instanceof Element);
        $$("div[class|=line]:has(>[data-norge]", target).forEach(line => {
            const details = createElement({
                details: {
                    class: "LER-article-groups",
                    $: [{tag: "summary"}]
                }
            });
            listen(details, "toggle", () => {
                $$("[data-norge]", line).forEach(elem => {
                    const loadingNode = createElement({p: "讀取中…"});
                    details.append(loadingNode);
                    fetchDOM(elem.href).then(doc => {
                        const body = $(".law-reg", doc);
                        if(!body || !$(".row", body)) {
                            console.warn("找不到法條", elem.href);
                            return loadingNode.remove();
                        }
                        parseElement(body);

                        const head = createElement({
                            tag: "div",
                            class: "table-title"
                        });
                        head.append($(".table-title td", doc));

                        const section = createElement({tag: "section"});
                        section.append(head, body);
                        $$("[id]", section).forEach(elem => elem.removeAttribute("id"));
                        // $$(".btnZone, .text-danger > div", section).forEach(elem => elem.remove());
                        loadingNode.replaceWith(section);
                    });
                });

            }, {once: true});
            line.append(details);
        });
    });
});
