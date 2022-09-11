/**
 * @module LER
 */
importScripts("./lib.js");

const LER = (() => {

/** @constant {string} */
const remoteDocRoot = "https://cdn.jsdelivr.net/gh";

/** @const {ReplaceRule[]} */
const dynamicRules = [
    {   pattern: /第[一二三四五六七八九十百千]+條/g,
        replacer: m => ({type: "article", text: m[0]})
    }
];

/**
 * @member {ReplaceRule[]}
 * @desc 置換規則們，動態建置。
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
 * @param {string} string
 * @returns {JsonElement[]}
 */
function parseString(string) {
    let result = [string];
    replaceRules.forEach(replaceRule => {
        result = result.flatMap(elem => {
            if(typeof elem !== "string") return elem;
            return applyReplaceRule(elem, replaceRule).filter(x => x);
        });
    });
    const temp = result.map(elem => (typeof elem === "string") ? elem : ({span: elem}));
    return temp;
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
        assert(pattern.global);
        const debris = [], rei = string.matchAll(pattern);
        let match, pos = 0;
        while(match = rei.next().value) {
            debug(match);
            debris.push(string.substring(pos, match.index));
            debris.push(replacer(match));
            pos = match.index + match[0].length;
        }
        debris.push(string.substring(pos));
        return debris;
    }
    assert(typeof pattern === "string" || typeof replacer !== "function");
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
