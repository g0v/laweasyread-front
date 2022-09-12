/**
 * @module LER
 * @desc 各公有方法會直接在 `background.js` 被當成監聽器。欲作為監聽器的，其參數列應為 `request`, `sender`, `sendResponse` 。
 *
 */
importScripts(
    "../node_modules/kong-util/dist/debug.js",
    "../node_modules/kong-util/dist/web.js",
    "./lib.js"
);
kongUtilDebug.use("logger");
kongUtilWeb.use("fetchJSON", "fetchText");

const LER = (() => {

/**
 * @const {string}
 * @desc 資料存放在 jsDelivr
 */
const remoteDocRoot = "https://cdn.jsdelivr.net/gh";

/**
 * @member {ReplaceRule[]}
 * @desc 置換規則們，動態建置。法規更新時會整個被替換掉，故用 let 宣告。
 */
let replaceRules = [];

/**
 * @const {ReplaceRule[]}
 * @desc 動態（需要判斷並轉換數字）的置換規則們
 */
const dynamicRules = [
    // {   pattern: /(司法院)?(大法官)?釋字第\d+號/g,
    //     replacer: m => m

    // },
    // {   pattern: /第[一二三四五六七八九十百千]+條/g,
    //     replacer: m => ({type: "article", text: m[0]})
    // }
];

/**
 * @const {Object.<string, RegExp>}
 * @desc 要注意括號的順序。
 */
const regexps = {
    number: "([\\d〇零０一二三四五六七八九十百千]+)",
    article: "第\\s*number\\s*([條項類款目])(\\s*之number)?(但書)?",
    articleRange: "((article)+)([前後]段|([至到])(article))?",
    articleList: "(articleRange)(([,、及或和與])(articleRange))*",
    jyi: "第?number號?",
    jyis: "((司法院)?(大法官)?釋字)jyi([,、及]jyi)*"
};
Object.keys(regexps).forEach((key, i, keys) => {
    for(let j = i - 1; j >= 0; --j)
        regexps[key] = regexps[key].replace(new RegExp(keys[j], "g"), regexps[keys[j]]);
});
for(let key in regexps) regexps[key] = new RegExp(regexps[key], "g");

dynamicRules.push({
    pattern: regexps.jyis,
    replacer: match => {
        const r = {type: "jyis", text: match[0]};
        r.jyis = [...match[0].matchAll(regexps.jyi)]
            .map(mJYI => ({
                jyi: parseChineseInt(mJYI[1]),
                index: mJYI.index,
                length: mJYI[0].length
            }))
        ;
        return r;
    }
})




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
function parseString({string, allowLink}) {
    const result = replaceRules.reduce((acc, rule) =>
        acc.flatMap(strOrObj => {
            if(typeof strOrObj !== "string") return strOrObj;
            return applyReplaceRule(strOrObj, rule).filter(x => x);
        })
    , [string]);
    if(result.length > 1 || result[0].type) logger()(string, result);

    return result.map(obj => {
        if(typeof obj === "string") return obj;
        switch(obj.type) {
            case "law": {
                const jsml = {text: obj.text};
                if(allowLink) {
                    jsml.tag = "a";
                    jsml.href = `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${obj.pcode}`;
                }
                else jsml.tag = "span";
                if(obj.title) jsml.title = obj.title;
                return jsml;
            }
            case "article": {
                return {span: {
                    title: "abc",
                    text: obj.text
                }};
            }
            default: throw TypeError("unknonw object", obj);
        }
    });
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
