importScripts("./lib.js");

const LER = (() => {

/**
 * constants
 */
const remoteDocRoot = "https://cdn.jsdelivr.net/gh";
const rules = {
    static: [],
    dynamic: []
};

/**
 * 確認是否可更新法規列表
 * @returns 若有更新，則回傳該版本的日期字串
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
 * 更新法規
 */
async function update() {
    const remoteDate = await checkUpdate();
    if(!remoteDate) return;

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
 * 更新置換規則
 * 法規名稱與排除名單必須合併在一起，否則「國民法官法」和「國民法官法庭」至少其一會被錯判。
 */
async function loadStaticRules(laws) {
    if(!laws) laws = await getData("laws");
    const exTerms = (await fetchText("/data/exclude_terms.txt")).split(/\s+/).filter(s => s);
    rules.static = laws
    .reduce((acc, {pcode, name, aliases}) => {
        acc.push({pcode, name});
        aliases && aliases.forEach(a => acc.push({pcode, name: a}));
        return acc;
    }, [])
    .concat(exTerms.map(name => ({name})))
    .sort((a, b) => b.name.length - a.name.length);
}

function parseString({string, defaultLaw}) {
    let result = [string];
    rules.static.forEach(rule => {
        result = result.flatMap(elem => {
            if(typeof elem !== "string") return elem;
            const debris = elem.split(rule.name);
            for(let i = debris.length - 1; i; --i)
                debris.splice(i, 0, rule)
            return debris.filter(x => x);
        });
    });
    return result;
}

return {
    loadStaticRules,
    checkUpdate,
    update,
    parseString
};

})();
