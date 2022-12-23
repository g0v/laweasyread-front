kongUtil.use('$', '$$', 'fetchDOM');
const createElement = kongUtil.createElementFromJsonML;

/**
 * 排除首頁的「熱門法規瀏覽」（排版考量）
 */
$('.section-hot')?.classList.add('LER-skip');

/**
 * 設定預設法規。
 */
pageDefaultLaw = (new URLSearchParams(location.search)).get('pcode');

/**
 * 將編章節（及各自後接的條文們）重新調整為巢狀結構，並計算 sticky 的 top 值。
 */
const height = 36;
const depths = [];
$$('.law-reg-content .h3').forEach((h3, index, list) => {
    const section = createElement(['section']);
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
document.head.appendChild(createElement(['style', css]));


/**
 * 加上「提及條文」區塊。
 *
 * 利用 HTML 的 `details` 和 `summary` ，在展開時才呼叫 `embedArticles()` 載入內容。
 * 載入的是全國法規資料庫自己的網頁，這樣就不用擔心版本更新問題了。
 * 載入後要再次呼叫 `parseElement` 處理其內容，並且呼叫 `addDetails` 讓內嵌條文提及其他條文時能有巢狀結構。
 */
getData('mojAddReferringArticles').then(setting => {
    if(!setting) return;
    $$('div[class|=line]').forEach(addDetails);
});

/**
 * 監聽 `div.line-*` 轉換完成的事件，加上 `<details>` 。
 * @param {Element} line
 *
 * 以監聽方式執行，救不用等到 `createElement` 跑完整頁才觸發。
 */
function addDetails(line) {
    line.addEventListener('lerParseEnd', () => {
        if(!$('[data-norge][href]', line)) return;
        const details = createElement(
            ['details', {class: 'LER-article-groups'},
                ['summary']
            ]
        );
        line.append(details);
        details.addEventListener('toggle', embedArticles, {once: true});
    }, {once: true});
}

/**
 * 載入要嵌入的內容。
 * @param {MouseEvent} event
 */
function embedArticles(event) {
    const details = event.target;
    $$('[data-norge][href]', details.parentNode).forEach(anchor => {
        const loadingNode = createElement(['p', '讀取中…']);
        details.append(loadingNode);
        fetchDOM(anchor.href).then(doc => {
            const body = $(".law-reg", doc);
            if(!body) body = "找不到法條。";
            const section = createElement(
                ['section',
                    ['header', {class: 'table-title'},
                        ...$$(".table-title td > *:not(.law-vaildMemo)", doc)
                    ],
                    body
                ]
            );
            $$('div[class|=line]', section).forEach(addDetails);
            LER.parseElement(section.lastChild, anchor.dataset.pcode);

            $$('[id]', section).forEach(elem => elem.removeAttribute("id"));
            loadingNode.replaceWith(section);
        });
    });
}


/**
 * 將「（刪除）」加上 class 以便用 CSS 使之不明顯。
 */
$$('.line-0000').forEach(line => {
    if(line.lastChild.textContent !== "（刪除）") return;
    line.closest(".row").classList.add("LER-moj-deleted-article");
});
