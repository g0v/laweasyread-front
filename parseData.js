"use strict";
/**
 * 生成資料的函式
 * 可用於瀏覽器外掛的更新資料，亦可用於開發階段生成 data/laws.json
 * @return 後依法規名稱長度，由長至短排序
 */
function parseData(mojData, aliases, nameLengthLimit = Infinity) {
    const map = new Map();

    const result = mojData
    .filter(law => {
        if(law.name.endsWith("定）")) {
            const name = law.name.substring(0, law.name.lastIndexOf("（"));
            if(!map.has(name)) map.set(name, []);
            map.get(name).push(law);
            return false;
        }
        if(/([^辦]法|律|條例|通則)$/.test(law.name)) return true;
        if(law.name.length > nameLengthLimit) return false;

        return true;
    })
    .map(law => ({PCode: law.PCode, name: law.name}));

    /**
     * 把名字後面有括號的同名法規只留下最新的
     */
    map.forEach((versions, name) => {
        if(name.length > nameLengthLimit) return false;
        versions.forEach(law => {
            const match = /(\d+\.\d+\.\d+)\s*[訂制]定）$/.exec(law.name);
            const date = match[1].padStart(9, "0");
            law.lastUpdate = date;
        });
        versions.sort((a, b) => a.lastUpdate < b.lastUpdate ? 1 : -1);
        result.push({PCode: versions[0].PCode, name});
    });

    /**
     * 把讀入的暱稱轉為一個暱稱一筆法規
     * TODO: 自動加入對應的施行細則（如果有的話）的簡稱
     */
    for(let PCode in aliases) {
        const fullName = mojData.find(law => law.PCode == PCode).name;
        aliases[PCode].forEach(name =>
            result.push({PCode, name, fullName})
        );
    }

    return result.sort((a, b) => b.name.length - a.name.length);
}

/**
 * 開發階段生成 data/laws.json 用
 * 從另一專案讀取所有法規資料
 * @see {@link https://github.com/kong0107/mojLawSplitJSON }
 */
if(typeof module !== 'undefined' && module.exports) {
    const fs = require("fs");
    const mojData = JSON.parse(fs.readFileSync("../mojLawSplit/json/index.json").toString());
    const aliases = JSON.parse(fs.readFileSync("./data/aliases.json").toString());

    const json = JSON.stringify(parseData(mojData, aliases, 10)).replace(/{/g, "\n{");
    fs.writeFileSync("./data/laws.json", json);
}
