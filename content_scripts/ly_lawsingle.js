/**
 * 適用於 `https://lis.ly.gov.tw/lglawc/lawsingle?*`
 * 目前僅發現四種頁面：
 * * 僅列出條文的頁面：搜尋後點選法律名稱時跳出的那個。可能再分「全文」和「命中條文」，不過排版看來一樣。
 * * 「法條沿革」頁面
 * * 「異動條文及理由」頁面
 * * 「相關條文」頁面
 */
kongUtil.use('$', '$$', 'createElementFromJsonML');

/**
 * 跟 lawtext2obj 像，但排版機制不太一樣，這邊要連同空格一起考量。
 */
const stratumRE = [
    /^\n?　　/, // 第一種頁面的條文內容會先有一個換行字元
    /^\n?　+第[一二三四五六七八九十]+類：/,          // 所得稅法第14條第1項
    /^\n?　+[一二三四五六七八九十]+(、|　|  )/,  // 憲法裡的「款」有些是全形空格，有些是兩個半形空格
    /^\n?　+[\(（][一二三四五六七八九十]+[\)）]/, // 有些括號是全形，有些是半形。修正理由欄位的這種會有三個前置空格
    /^\n?　+\d+\./,
    /^\n?　+[\(（]\d+[\)）]/,
    /^\n?　+[甲乙丙丁戊己庚辛壬癸]、/, // 早年的所得稅法。其實應該跟地支還有括號的版本（國際公約會有）都考量進來，並跟前面重新排序，但那會影響 CSS 命名，就先算了。
    /^\n?　+[子丑寅卯辰巳午未申酉戌亥]、/
];
const getStratum = text => {
    for(let i = stratumRE.length - 1; i >= 0; --i)
        if(stratumRE[i].test(text)) return i;
    return -1;
};


/**
 * 主程式
 * 會先把包住關鍵字的 `<font />` 當成純文字來分析，最後再用 `domCrawler` 的功能替換回來。
 */
$$('td').forEach(td => {
    if(!td.hasChildNodes() || !/^\n?　　/.test(td.firstChild.textContent)) return;

    const paras = []; // 每一行文字，即各項款目，未分層
    const others = []; // 原本頁面中有、不打算處理但仍要保留的元件，如「相關條文」圖鈕

    let specimen = td;
    let keyword = '';

    if(keyword = $('font', td)) {
        keyword = keyword.textContent;
        specimen = td.cloneNode(true);
        $$('font', specimen).forEach(fe => fe.replaceWith(keyword));
        specimen.normalize();
    }

    specimen.childNodes.forEach(child => {
        switch(child.nodeName) {
            case "#text": {
                const text = child.textContent.trim();
                if(!text) break;
                const stratum = getStratum(child.textContent);
                if(stratum < 0) {
                    paras[paras.length - 1].text += "\n" + text;
                    break;
                }
                paras.push({
                    stratum: stratum,
                    text: text,
                    children: []
                });
                break;
            }
            case "BR":
                break;
            default:
                others.push(child);
        }
    });

    const nested = [];
    for(let i = paras.length - 1; i >= 0; --i) {
        const item = ['li', {data: {stratum: paras[i].stratum}}, paras[i].text];
        if(paras[i].children.length) item.push(
            ['ol', ...paras[i].children]
        );

        if(paras[i].stratum) {
            let j = -1;
            for(j = i - 1; j >= 0; --j) {
                if(paras[j].stratum < paras[i].stratum) {
                    paras[j].children.unshift(item);
                    break;
                }
            }
            if(j < 0) nested.unshift(item);
        }
        else nested.unshift(item);
    }

    const newTd = createElementFromJsonML(
        ['td', {class: td.className},
            ['ol', ...nested],
            ...others
        ]
    );
    if(keyword) {
        // domCrawler.replaceTexts({
        //     pattern: keyword,
        //     replacer: domCrawler.createElement("FONT", {className: "red"}, keyword),
        //     minLength: keyword.length
        // }, newTd);
    }

    td.replaceWith(newTd);
});


/**
 * 設定預設法規
 */
LER.pageDefaultLaw = $('td.law_NA, td.law_n')?.firstChild.textContent;
