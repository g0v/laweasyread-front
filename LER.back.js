/**
 * @module LER
 * @desc
 *  各公有方法會直接在 `background.js` 被當成監聽器。
 *  欲作為監聽器的，其參數列應為 `request`, `sender`。
 */
var LER = (() => {

const pcn = kongUtil.parseChineseNumber;

/**
 * @private
 * @member {Law[]} laws
 * @desc 所有法規，後續才讀取。
 */
let laws = [];

/**
 * @private
 * @member {ReplaceRule[]} replaceRules
 * @desc 置換規則們，動態建置。法規更新時會整個被替換掉，故用 let 宣告。
 */
let replaceRules = [];


/**
 * @public
 * @desc 支援 content scripts 載入其他本外掛的檔案。
 * @param {Object} request
 * @returns {string}
 */
async function fetchText({resource, ...options}) {
    try {
        new URL(resource);
    }
    catch(err) {
        let baseHref, browser = globalThis?.browser || globalThis?.chrome;
        if(browser) baseHref = browser?.runtime?.getURL('');
        else baseHref = 'https://cdn.jsdelivr.net/gh/g0v/laweasyread-front/';
        if(location.host.startsWith('localhost') || location.host.startsWith('127.')) baseHref = ''; // for debug
        resource = baseHref + resource;
    }
    const response = await fetch(resource, options);
    return await response.text();
}


/**
 * @public
 * @func downloadLaws
 * @returns {Promise.<Law[]>}
 */
async function downloadLaws() {
    // console.debug('LER.downloadLaws()');
    const [map, aliases] = await Promise.all([
        kongUtil.fetchJSON('https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/ch/index.json', { cache: 'no-cache' }),
        kongUtil.fetchJSON('https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/aliases.json', { cache: 'no-cache' })
    ]);
    return laws = Object.keys(map).map(pcode => {
        const law = {pcode, name: map[pcode]};
        if(aliases[pcode]) law.aliases = aliases[pcode];
        return law;
    });
}


/**
 * @public
 * @func loadLaws
 * @returns {Promise.<Law[]>}
 * @desc overwritten in `browser/background.js` for WebExtension to cooperate with version control
 */
function loadLaws() {
    // console.debug('LER.loadLaws() in `LER.back.js`');
    return downloadLaws();
}


/**
 * @func loadRules
 * @desc 讀取置換規則。
 * @param {Object[]} laws
 * @returns {Promise.<ReplaceRule[]>} 置換規則陣列。
 *
 * 法規名稱與排除名單必須混在一起排列，否則「國民法官法」和「國民法官法庭」至少其一會被錯判。
 */
async function loadRules(laws) {
    // console.debug('LER.loadRules()');
    if(replaceRules.length) return replaceRules;
    if(!(laws instanceof Array)) laws = await this.loadLaws();

    let exTerms = await fetchText({resource: 'data/exclude_terms.txt'});
    exTerms = exTerms.split(/\s+/).filter(s => s);

    replaceRules = laws
    .reduce((acc, {pcode, name, aliases}) => {
        acc.push({
            pattern: name,
            replacer: {type: "law", text: name, pcode}
        });
        aliases?.forEach(alias => acc.push({
            pattern: alias,
            replacer: {type: "law", text: alias, pcode, title: name}
        }));
        return acc;
    }, [])
    .concat(exTerms.map(text => ({
        pattern: text,
        replacer: {type: "exclude", text}
    })))
    .sort((a, b) => b.pattern.length - a.pattern.length)

    replaceRules =
        dynamicRules.filter(dr => dr.position === "before")
        .concat(replaceRules)
        .concat(dynamicRules.filter(dr => dr.position === "after"))
    ;
    return replaceRules;
}


/**
 * @func parseString
 * @desc 將字串轉換成可建立成 HTML 元素的物件列表。
 * @param {Object} request
 * @param {string} request.string
 * @param {boolean} [request.allowLink=true]
 * @param {Object} [defaultLaw]
 * @returns {JsonML[]}
 */
function parseString({string, allowLink = true, articleNumberFormat, defaultLaw}) {
    // console.debug('LER.parseString() in `LER.back.js`');
    const result = replaceRules.reduce((acc, rule) =>
        acc.flatMap(strOrObj => {
            if(typeof strOrObj !== "string") return strOrObj;
            if(strOrObj.length < rule.pattern.length ?? 3) return strOrObj;
            return applyReplaceRule(strOrObj, rule).filter(x => x);
        })
    , [string]);

    for(let index = 0; index < result.length; ++index) {
        const cur = result[index];
        if(typeof cur === "string") continue;
        switch(cur.type) {
            case "law": {
                const jsonml = ['span', {data: {pcode: cur.pcode}}, cur.text];
                if(allowLink) {
                    jsonml[0] = 'a';
                    jsonml[1].href = `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${cur.pcode}`;
                }
                if(cur.title) jsonml[1].title = cur.title;
                result[index] = jsonml;
                break;
            }
            case "articles": {
                const jsonml = ['span', {data: {norge: cur.norge}}, cur.text];

                // 確認所屬法規：若前一個元件是法規名，則使用之；若否，則看是否有預設法規。
                let pcode = result[index - 1]?.[1]?.data?.pcode;
                if(!pcode && defaultLaw) {
                    if(typeof defaultLaw === 'object') pcode = defaultLaw.pcode;
                    else if(/^[A-Z]/.test(defaultLaw)) pcode = defaultLaw;
                }

                if(pcode) jsonml[1].data.pcode = pcode;
                if(allowLink && pcode) {
                    jsonml[0] = 'a';
                    jsonml[1].href = `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=${pcode}&norge=${cur.norge}`;
                }

                // 條號格式
                if(articleNumberFormat !== 'unchanged') {
                    jsonml[1].data.originText = cur.text;
                    let formatted = cur.text.replace(/[零一二三四五六七八九十百千]+/g, m => ` ${pcn(m)} `);
                    if(articleNumberFormat === 'hyphen') formatted = formatted
                        .replace(/第\s*(\d+)\s*條之\s*(\d+)\x20*/g, (m, m1, m2) => `第 ${m1}-${m2} 條`)
                        .replace(/第\s*(\d+)\s*之\s*(\d+)\s*條*/g, (m, m1, m2) => `第 ${m1}-${m2} 條`)
                    ;
                    jsonml[2] = formatted;
                }

                result[index] = jsonml;
                break;
            }
            case "jyis": {
                if(cur.jyis.length === 1) { // 若只提到一個釋字，則整個字串（包含「釋字」二字）都是連結。
                    const jsonml = ['span', {data: {jyi: cur.jyis[0].jyi}}, cur.text];
                    if(allowLink) {
                        jsonml[0] = 'a';
                        jsonml[1].href = `http://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${cur.jyis[0].jyi}`;
                    }
                    result[index] = jsonml;
                    break;
                }
                // 若提到多個釋字，則「釋字」二字不宜有連結，而是數字有各自的連結。
                const nodes = cur.jyis.reduce((nodes, jyi, index) => {
                    const pretext = cur.text.substring(
                        index ? cur.jyis[index - 1].end : 0,
                        jyi.start
                    );
                    if(pretext) nodes.push(pretext);
                    const jsonml = ['span',
                        {data: {jyi: jyi.jyi}},
                        cur.text.substring(jyi.start, jyi.end)
                    ];
                    if(allowLink) {
                        jsonml[0] = 'a';
                        jsonml[1].href = `http://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${jyi.jyi}`;
                    }
                    nodes.push(jsonml);
                    return nodes;
                }, []);
                const posttext = cur.text.substring(cur.jyis.pop().end);
                if(posttext) nodes.push(posttext);
                result[index] = nodes;
                break;
            }
            case "consDecision": {
                const {year, word, number} = cur;
                const jsonml = ['span', {data: {year, word, number}}, cur.text];
                if(allowLink) {
                    jsonml[0] = 'a';
                    jsonml[1].href = `https://cons.judicial.gov.tw/docredirect.aspx?type=2&year=${year}&word=${word}&no=${number}`;
                }
                result[index] = jsonml;
                break;
            }
            case "exclude": {
                result[index] = cur.text;
                break;
            }
            default: throw TypeError("unknonw object", cur);
        }
    }

    return result;
}


/**
 * @private
 * @func applyReplaceRule
 * @desc 將字串依照規則拆開。
 * @param {string} string
 * @param {ReplaceRule} replaceRule
 * @returns {Fragment[]} 拆開後轉換成的物件們。
 *
 * 跟 `String#replaceAll` 的邏輯一樣，只是匹配到的子字串會被轉成物件。
 */
function applyReplaceRule(string, {pattern, replacer}) {
    // console.debug('LER.applyReplaceRule()');
    if(pattern instanceof RegExp && replacer instanceof Function) {
        console.assert(pattern.global);
        const debris = [], rei = string.matchAll(pattern);
        let match, pos = 0;
        while(match = rei.next().value) {
            debris.push(string.substring(pos, match.index));
            debris.push(replacer(match));
            pos = match.index + match[0].length;
        }
        debris.push(string.substring(pos));
        return debris;
    }
    console.assert(typeof pattern === "string" || typeof replacer !== "function");
    if(replacer instanceof Function) replacer = replacer(pattern);
    const debris = string.split(pattern);
    for(let i = debris.length - 1; i; --i)
        debris.splice(i, 0, replacer);
    return debris;
}


/**
 * @func preparePopup
 * @desc 讀取並整理資料，準備建立彈出窗格。
 * @param {DOMStringMap} dataset
 * @returns {Promise.<Object>} {headers, bodyParts, defaultLaw}
 */
async function preparePopup({jyi, pcode, norge, year, word, number}) {
    // console.debug('LER.preparePopup() in `LER.back.js`');
    let headers = [], bodyParts = [], defaultLaw;
    if(jyi) {
        jyi = await kongUtil.fetchJSON(`https://cdn.jsdelivr.net/gh/kong0107/jyi/json/${jyi}.json`);
        headers = [
            `釋字第 ${jyi.number} 號 `,
            ['time', jyi.date]
        ];

        if(jyi.title) bodyParts.push(['dd', jyi.title]);
        if(jyi.issue) bodyParts.push(
            ['dt', '爭點'],
            ['dd', ...jyi.issue.split('\n').map(para => ['p', para])]
        );
        bodyParts.push(
            ['dt', '解釋文'],
            ['dd',
                ['ol', {class: 'list-style-decimal'},
                    ...jyi.holding.split('\n').map(para => ['li', para.trim()])
                ]
            ]
        );
        if(jyi.reasoning) bodyParts.push(
            ['dt', '理由書'],
            ['dd',
                ['ol', {class: 'list-style-decimal'},
                    ...jyi.reasoning.split('\n').map(para => ['li', para.trim()])
                ]
            ]
        );
    }
    else if(pcode) {
        const law = await kongUtil.fetchJSON(`https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/ch/${pcode}.json`, {cache: "no-cache"});

        headers = [
            law.name + ' ',
            ['time', law.LawModifiedDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')]
        ];
        if(law.discarded) headers.splice(1, 0,
            ['span', {class: 'LER-badge-discard'}, '已廢止']
        );

        if(norge) {
            /// "3.1-5,7.1" => [[301, 500], [701]]
            const ranges = norge.split(",").map(range => {
                return range.split("-").map(articleNumber => {
                    const numbers = articleNumber.split(".").map(s => parseInt(s));
                    return numbers[0] * 100 + (numbers[1] || 0);
                });
            });
            const articles = law.articles.filter(({number}) =>
                ranges.some(([start, end]) => end
                    ? (number >= start && number <= end)
                    : (start === number)
                )
            );
            articles.forEach(({number, content}) => {
                const aug = number % 100;
                number = Math.floor(number / 100).toString() + (aug ? `-${aug}` : '');
                bodyParts.push(
                    ['dt', `第 ${number} 條`],
                    ['dd',
                        ['ol', {class: (content.length > 1) ? 'list-style-upper-roman' : 'list-style-circle'},
                            ...prepareArticleDivision(content)
                        ]
                    ]
                );
            });
        }
        else {
            const items = law.category.map(c =>
                ['li', {style: 'margin-right: 1em;'}, c]
            );
            bodyParts.push(
                ['dt', '類別'],
                ['dd',
                    ['ul', {class: 'list-style-none d-flex'}, ...items]
                ]
            );

            if(law.foreword) bodyParts.push(
                ['dt', '前言'],
                ['dd', law.foreword]
            );

            const lastNumber = law.articles[law.articles.length - 1].number / 100;
            const deletedAmount = law.articles.filter(a => a.content.length === 1 && a.content[0].text === "（刪除）").length;
            bodyParts.push(
                ['dt', '條文數'],
                ['dd', `共 ${law.articles.length.toString()} 條；其中 ${deletedAmount} 條被刪除；最末條為第 ${lastNumber} 條。`]
            );

            if(law.LawEffectiveNote) bodyParts.push(
                ['dt', '生效內容'],
                ['dd', ...law.LawEffectiveNote.split('\r\n').map(n => ['p', n])]
            );
            if(law.histories) bodyParts.push(
                ['dt', '沿革'],
                ['dd', ...law.histories.map(his => ['p', his])]
            );
        }

        defaultLaw = {pcode, name: law.name};
    }
    else if(year && word && number) {
        const decision = await kongUtil.fetchJSON(`https://cdn.jsdelivr.net/gh/kong0107/cons.judicial/docket/${year}/${word}/${number}.json`);
        headers = [
            `${year}年 ${word}字 第${number}號 ${decision['類型'].slice(-2)}`,
            ['time', decision['判決日期']]
        ];

        bodyParts.push(['dd', `原 ${decision['原分案號']}`]);
        if(decision['標題']) bodyParts.push(['dd', decision['標題']]);

        bodyParts.push(
            ['dt', '案由'],
            ['dd', decision['案由']],

            ['dt', '主文'],
            ['dd',
                ['ol', {class: 'list-style-decimal'},
                    ...decision['主文'].map(para => ['li', para])
                ]
            ],

            ['dt', '理由'],
            ['dd',
                ['ol', {class: 'list-style-decimal'},
                    ...decision['理由'].map(para => ['li', para])
                ]
            ]
        );
    }
    return {headers, bodyParts, defaultLaw};
}


/**
 * @private
 * @param {Array} divArr
 * @returns {Array}
 */
function prepareArticleDivision(divArr) {
    return divArr.map(div => {
        if(div.table) return [li, {class: 'pre'}, div.table];
        const item = ['li', {}, ...div.text.split('\n').map(line => ['p', line])];

        // 計算縮排： ASCII 的話就半格，其他的就一格。
        let match;
        for(let re of articleDivisionDetectors) {
            if(match = div.text.match(re)) break;
        }
        if(match) {
            let indent = 0;
            const ordinal = match[0];
            for(let i = 0; i < ordinal.length; ++i)
                indent += (ordinal.charCodeAt(i) > 0xff) ? 1 : .5;
            item[1].style = `margin-left: ${indent}em; text-indent: -${indent}em`;
        }

        if(div.children) {
            item.push(
                ['ol', {class: 'list-style-none'},
                    ...prepareArticleDivision(div.children)
                ]
            );
        }
        if(div.postText) item.push(['p', div.postText]);
        return item;
    });
}


/**
 * @private
 * @const {RegExp[]}
 * @desc 判斷條文段落結構的表達式。
 */
const articleDivisionDetectors = [
    /^第([一二三四五六七八九十]+)類：/,
    /^[一二三四五六七八九十]+[\u3000、]/,
    /^[(（][一二三四五六七八九十]+(）|\)\s?)/,
    /^\d+[\x20\x2e]/,
    /[\u2460-\u2473]/, // Cicled Digits 1~20
    /[\u2776-\u277f]/, // Dingbat Negative Circled Digits 1~10
];

/**
 * @private
 * @const {Object.<string, RegExp>}
 * @desc 動態規則的比對用表達式，需注意括號的順序。
 */
const regexps = {
    number: "([〇\\d零一二三四五六七八九０１２３４５６７８９十百千]+)",

    /// 「第5-3條」、「第5條之3」
    artMain: "第\\s*number(\\s*[之\-]\\s*number)?\\s*條(\\s*之\\s*number)?(\\s*[前後]段|\\s*但書)?",

    // 土地法第2條第1項、所得稅法第14條第1項有「類」。
    paraCat: "\\s*第\\s*number\\s*項(\\s*[前後]段|\\s*但書|\\s*第\\s*number\\s*類)?",

    // 所得稅法§17-3提到「第三目第三小目」，§17-4提到「第二目之一」
    // secItem: "\\s*第\\s*number\\s*款(\\s*[前後]段|\\s*但書)?(\\s*第\\s*number\\s*目)?",
    secItem: "\\s*第\\s*number\\s*款(\\s*[前後]段|\\s*但書)?(\\s*第\\s*number\\s*目(\\s*[前後]段|\\s*但書|\\s*之\\s*number|\\s*第\\s*number\\s*小目)?)?",

    // 有項才能有類，無項亦能有款，有款才能有目。
    article: "artMain(paraCat)?(secItem)?",
    articles: "article(\\s*[至到,、及或和與]\\s*(article|(第\\s*number\\s*[項款目])+))*",

    jyi: "第?number號?",
    jyis: "((司法院)?(大法官)?釋字)jyi([,、及]jyi)*",

    consDecision: "憲法法庭\\s*number\\s*(年度?)?\\s*([\\u4E00-\\u5b56\\u5b58-\\u9FFF]+)字?第?number號?(裁定|判決)?"
};
Object.keys(regexps).forEach((key, i, keys) => {
    for(let j = i - 1; j >= 0; --j)
        regexps[key] = regexps[key].replace(new RegExp(keys[j], "g"), regexps[keys[j]]);
});
for(let key in regexps) regexps[key] = new RegExp(regexps[key], "g");


/**
 * @private
 * @const {ReplaceRule[]}
 * @desc 動態（需要判斷並轉換數字）的置換規則們。
 */
const dynamicRules = [
    {
        pattern: regexps.jyis,
        position: "after",
        replacer: match => {
            const r = {type: "jyis", text: match[0]};
            r.jyis = [...match[0].matchAll(regexps.jyi)]
                .map(mJYI => ({
                    jyi: pcn(mJYI[1]),
                    start: mJYI.index,
                    end: mJYI.index + mJYI[0].length
                }))
            ;
            return r;
        }
    },
    {
        pattern: regexps.articles,
        position: "after",
        replacer: match => {
            const r = {
                type: "articles",
                text: match[0]
            }
            const andList = match[0].split(/[,、及或和與]/g);
            r.norge = andList.reduce((acc, and) => {
                const articles = [...and.matchAll(regexps.artMain)];
                switch(articles.length) {
                    case 0: return acc;
                    case 1: {
                        let number = pcn(articles[0][1]);
                        if(articles[0][2]) number += "." + pcn(articles[0][3]);
                        if(articles[0][4]) number += "." + pcn(articles[0][5]);
                        acc.push(number);
                        return acc;
                    }
                    case 2: {
                        const range = articles.map(a => {
                            let number = pcn(a[1]);
                            if(a[2]) number += "." + pcn(a[3]);
                            if(a[4]) number += "." + pcn(a[5]);
                            return number;
                        });
                        acc.push(range.join("-"));
                        return acc;
                    }
                    default:
                        console.error(articles); // too many articles
                }
            }, []).join(",");
            return r;
        }
    },
    {
        pattern: regexps.consDecision,
        position: "before",
        replacer: match => {
            return {
                type: "consDecision",
                text: match[0],
                year: match[1],
                word: match[3],
                number: match[4]
            };
        }
    }
];


return {
    fetchText,
    downloadLaws,
    loadLaws,
    loadRules,
    parseString,
    preparePopup
};

})();


/**
 * @typedef {Object} ReplaceRule
 * @property {string | RegExp} pattern
 * @property {string} position - wheather this rule shall apply before or after static rules.
 * @property {function | Object} replacer
 */

/**
 * @typedef {Object | string} Fragment
 * @property {string} [type = text]
 * @property {string} text - text to be shown to the user
 * @property {string} [*] - other values to be passed to next step.
 */

/**
 * 條：article
 * 項：paragraph
 * 類：category
 * 款：subparagraph, subsection, sub-section
 * 目：item
 *
 * 編：part
 * 章：chapter
 * 節：section
 * 款：sub-section
 * 目：item
 *
 */