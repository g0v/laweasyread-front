/**
 * @module LER
 * @desc 各公有方法會直接在 `background.js` 被當成監聽器。欲作為監聽器的，其參數列應為 `request`, `sender`, `sendResponse` 。
 */
importScripts(
    "../node_modules/kong-util/dist/debug.js",
    "../node_modules/kong-util/dist/web.js",
    "../node_modules/kong-util/dist/string.js",
    "./lib.js"
);
kongUtilDebug.use("logger");
kongUtilWeb.use("fetchJSON", "fetchText");
// kongUtilString.use("parseChineseNumber");

const LER = (() => {

/**
 * @private
 * @const {string}
 * @desc 資料存放在 jsDelivr
 */
const remoteDocRoot = "https://cdn.jsdelivr.net/gh";

/**
 * @private
 * @func pcn
 * @desc alias of `kongUtilString.parseChineseNumber()`
 */
const pcn = kongUtilString.parseChineseNumber;

/**
 * @private
 * @func articleNumberToMojFormat
 * @desc 把數字條號換成全國法規資料庫的格式
 *
 * @example 602 => "6.2" /// 第六條之二
 */
// const articleNumberToMojFormat = number => {
//     const r = number % 100;
//     const n = (number - r) / 100;
//     return r ? `${n}.${r}` : n;
// };

/**
 * @private
 * @member {ReplaceRule[]}
 * @desc 置換規則們，動態建置。法規更新時會整個被替換掉，故用 let 宣告。
 */
let replaceRules = [];

/**
 * @func checkUpdate
 * @desc 確認是否可更新法規列表。
 * @returns {Promise.<(false | string)>} 若有更新，則回傳該版本的日期字串
 */
async function checkUpdate() {
    const [localDate = "", remoteDate] = await Promise.all([
        getData("localDate"),
        fetchText(remoteDocRoot + "/kong0107/mojLawSplitJSON@arranged/UpdateDate.txt", {cache: "no-cache"})
    ]);
    setData({
        remoteDate,
        lastCheck: Date.now()
    });
    return (localDate < remoteDate) ? remoteDate : false;
}

/**
 * @func update
 * @desc 更新法規列表。
 * @returns {Promise.<(false | string)>} 若有更新，則回傳該版本的日期字串。
 */
async function update() {
    const remoteDate = await checkUpdate();
    if(!remoteDate) return false;

    const [laws, aliases] = await Promise.all([
        fetchJSON(remoteDocRoot + "/kong0107/mojLawSplitJSON@arranged/index.json", { cache: "no-cache" }),
        fetchJSON("/data/aliases.json")
    ]);
    laws.forEach(law => {
        if(aliases[law.pcode]) law.aliases = aliases[law.pcode];
        delete law.lastUpdate;
        delete law.english;
    });
    setData({laws, localDate: remoteDate});
    loadStaticRules(laws);
    return remoteDate;
}

/**
 * @func loadStaticRules
 * @desc 讀取置換規則。
 * @returns {Promise.<ReplaceRule[]>} 置換規則陣列。
 *
 * 法規名稱與排除名單必須合併在一起，否則「國民法官法」和「國民法官法庭」至少其一會被錯判。
 */
async function loadStaticRules(laws) {
    if(!laws) laws = await getData("laws");
    const exTerms = (await fetchText("/data/exclude_terms.txt")).split(/\s+/).filter(s => s);

    return replaceRules = laws
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
    .concat(dynamicRules);
}

/**
 * @func parseString
 * @desc 將字串轉換成可建立成 HTML 元素的物件列表。
 * @param {string} param0.string
 * @returns {JsonElement[]}
 */
function parseString({string, allowLink = true, defaultLaw}, {url}) {
    // const pcode = (new URL(url)).searchParams.get("pcode");
    // if(pcode) {
    //     // 判斷「本法」（常見於被授權的細則、辦法）
    // }

    const result = replaceRules.reduce((acc, rule) =>
        acc.flatMap(strOrObj => {
            if(typeof strOrObj !== "string") return strOrObj;
            return applyReplaceRule(strOrObj, rule).filter(x => x);
        })
    , [string]);
    if(result.length > 1 || result[0].type) logger()(string, result);

    for(let index = 0; index < result.length; ++index) {
        const cur = result[index];
        if(typeof cur === "string") continue;
        switch(cur.type) {
            case "law": {
                const jsml = {
                    text: cur.text,
                    data: {pcode: cur.pcode}
                };
                if(allowLink) Object.assign(jsml, {
                    tag: "a",
                    href: `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${cur.pcode}`
                });
                else jsml.tag = "span";
                if(cur.title) jsml.title = cur.title;
                result[index] = jsml;
                break;
            }
            case "articles": {
                const jsml = {
                    text: cur.text,
                    data: {norge: cur.norge}
                };
                /**
                 * 可能的情形：
                 * - [x] 前面有法規名稱。
                 * - [ ] 前面有「本法」，但現在的文章是施行細則，「本法」指的是別人。
                 * - [x] 前面沒東西，或前面提到的「本法」就是自己。
                 *
                 * 注意前面也可能是「基本法」。
                 */
                let pcode = defaultLaw?.pcode;
                const prev = result[index - 1];
                if(prev) {
                    if(prev.data?.pcode) pcode = prev.data.pcode;
                    if(prev.endsWith?.("本法") || prev.endsWith?.("本條例")) {
                        // todo: 判斷「本法」（常見於被授權的細則、辦法）
                    }
                }
                if(pcode) jsml.data.pcode = pcode;
                if(allowLink && pcode) Object.assign(jsml, {
                    tag: "a",
                    href: `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=${pcode}&norge=${cur.norge}`
                });
                else jsml.tag = "span";
                result[index] = jsml;
                break;
            }
            case "jyis": {
                if(cur.jyis.length === 1) { // 若只提到一個釋字，則整個字串（包含「釋字」二字）都是連結。
                    const jsml = {text: cur.text};
                    if(allowLink) Object.assign(jsml, {
                        tag: "a",
                        href: `http://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${cur.jyis[0].jyi}`
                    });
                    else jsml.tag = "span";
                    result[index] = jsml;
                }
                // 若提到多個釋字，則「釋字」二字不宜有連結，而是數字有各自的連結。
                const nodes = cur.jyis.reduce((nodes, jyi, index) => {
                    const pretext = cur.text.substring(
                        index ? cur.jyis[index - 1].end : 0,
                        jyi.start
                    );
                    if(pretext) nodes.push(pretext);
                    const jsml = {
                        text: cur.text.substring(jyi.start, jyi.end),
                        data: {jyi: jyi.jyi}
                    };
                    if(allowLink) Object.assign(jsml, {
                        tag: "a",
                        href: `http://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${jyi.jyi}`
                    });
                    else jsml.tag = "span";
                    nodes.push(jsml);
                    return nodes;
                }, []);
                const posttext = cur.text.substring(cur.jyis.pop().end);
                if(posttext) nodes.push(posttext);
                console.log(nodes);
                result[index] = nodes;
                break;
            }
            default: throw TypeError("unknonw object", cur);
        }
    }

    return result;
}

/**
 * @func applyReplaceRule
 * @desc 將字串依照規則拆開。
 * @param {string} string
 * @param {ReplaceRule} replaceRule
 * @returns {Fragment[]} 拆開後轉換成的物件們。
 *
 * 跟 `String#replaceAll` 的邏輯一樣，只是匹配到的子字串會被轉成物件。
 */
function applyReplaceRule(string, {pattern, replacer}) {
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


/******** 動態規則們 ********/

/**
 * @private
 * @const {Object.<string, RegExp>}
 * @desc 要注意括號的順序。
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
    jyis: "((司法院)?(大法官)?釋字)jyi([,、及]jyi)*"
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
                        console.debug(articles);
                        throw new RangeError("too many articles");
                }
            }, []).join(",");
            return r;
        }
    }
];



return {
    applyReplaceRule, // debug only

    loadStaticRules,
    checkUpdate,
    update,
    parseString
};

})();


/**
 * @typedef {Object} ReplaceRule
 * @property {string | RegExp} pattern
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