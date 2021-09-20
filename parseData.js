"use strict";
/**
 * 生成資料的函式
 * 可用於瀏覽器外掛的更新資料，亦可用於開發階段生成 data/laws.json
 * @return 後依法規名稱長度，由長至短排序
 */
function parseData(mojData, aliases) {
    const ret = mojData.map(law => ({PCode: law.PCode, name: law.name}));

    /**
     * 把讀入的暱稱轉為一個暱稱一筆法規
     * TODO: 自動加入對應的施行細則（如果有的話）的簡稱
     */
    for(let PCode in aliases) {
        const fullName = mojData.find(law => law.PCode == PCode).name;
        aliases[PCode].forEach(name =>
            ret.push({PCode, name, fullName})
        );
    }

    /**
     * 找出法規名稱最後面有修訂日期的那些，塞入一筆最新版的對照。
     */
    const namesWithoutDates = ret.reduce((acc, cur) => {
        const match = /（新?\s?(\d+\.\d+\.\d+)\s?[訂制]定）$/.exec(cur.name);
        if(!match) return acc;
        const name = cur.name.substring(0, match.index);
        const newItem = {PCode: cur.PCode, name, fullName: cur.name};

        // 如果已經有同名的法規，那就看誰的 PCode 比較大（「應該」也就比較新）
        const existing = acc.findIndex(law => law.name == name);
        if(existing != -1) {
            const e = acc[existing];
            if(e.PCode < cur.PCode) acc[existing] = newItem;
        }
        else acc.push(newItem);

        return acc;
    }, []);

    return ret.concat(namesWithoutDates).sort((a, b) => b.name.length - a.name.length);
}

/**
 * 開發階段生成 data/laws.json 用
 * 由另一專案讀取所有法規資料
 * @see {@link https://github.com/kong0107/mojLawSplitJSON }
 */
if(typeof module !== 'undefined' && module.exports) {
    const fs = require("fs");
    const mojData = JSON.parse(fs.readFileSync("../mojLawSplit/json/index.json").toString());
    const aliases = JSON.parse(fs.readFileSync("./data/aliases.json").toString());
    fs.writeFileSync("./data/laws.json", JSON.stringify(
        parseData(mojData, aliases), null, 1
    ));
}
