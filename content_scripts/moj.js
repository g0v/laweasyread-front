kongUtil.use("$$", "fetchDOM", "createElement");

/**
 * 排除首頁的「熱門法規瀏覽」（排版考量）
 */
$(".section-hot")?.classList.add("LER-skip");

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
 * 載入後要再次呼叫 `parseElement` 處理其內容，並且讓其內容提及其他條文時也有巢狀結構。
 */
getData("mojAddReferringArticles").then(mojAddReferringArticles => {
    if(!mojAddReferringArticles) return;
    $$("div[class|=line]").forEach(line => listen(line, "lerParseEnd", () => {
        const details = createElement({
            tag: "details",
            class: "LER-article-groups",
            children: [{tag: "summary"}]
        });
        line.append(details);
        listen(details, "toggle", embedArticles, {once: true});
    }));
});


function embedArticles(event) {
    const details = event.target;
    $$("[data-norge]", details.parentNode).forEach(anchor => {
        const loadingNode = createElement({p: "讀取中…"});
        details.append(loadingNode);
        fetchDOM(anchor.href).then(doc => {
            const body = $(".law-reg", doc);
            if(!body) body = "找不到法條。";
            else parseElement(document.adoptNode(body));
            const section = createElement(
                {section: {$: [
                    {header: {
                        class: "table-title",
                        $: $$(".table-title td > *", doc)
                    }},
                    body
                ]}}
            );
            $$("[id]", section).forEach(elem => elem.removeAttribute("id"));
            loadingNode.replaceWith(section);
        });
    });
}
