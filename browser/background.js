"use strict";

const remoteDocRoot = "https://cdn.jsdelivr.net/gh";

/**
 * 安裝時要做的事
 * TODO: 改善預設例外清單的格式
 */
browser.runtime.onInstalled.addListener(() => {
    // 讀取法規資料
    Promise.all([
        fetch("/data/laws.json").then(res => res.json()),
        fetch("/data/aliases.json").then(res => res.json())
    ]).then(([mojData, aliases]) =>
        setData({laws: parseData(mojData, aliases)})
    ).then(() => console.log("Laws loaded."));

    // 讀取資料庫的選項，補上預設的後就再存進去。
    fetch("/data/options_default.json")
    .then(res => res.json())
    .then(getData)
    .then(setData);

    // 例外清單比較麻煩，是要「新增」進去，而且要去掉重複的…
    // @see {@link https://stackoverflow.com/questions/1960473/get-all-unique-values-in-a-javascript-array-remove-duplicates#answer-14438954 }
    Promise.all([
        fetch("/data/exclude_matches_default.txt").then(res => res.text()),
        getData("exclude_matches")
    ]).then(([defaultList, currentList]) => {
        if(!currentList) return setData({exclude_matches: defaultList});
        const newList = (defaultList + "\n" + currentList).split("\n")
            .filter((value, index, self) => value && self.indexOf(value) === index) //< 篩選掉重複的
            .join("\n")
        ;
        setData({exclude_matches: newList});
    });

    // 設定計時器，用於檢查更新
    browser.alarms.create("perHour", {
        //when: Date.now(),
        periodInMinutes: 60
    });
});


/**
 * 訊息處理
 */
browser.runtime.onMessage.addListener(message => {
    console.log("runtime.onMessage", message);
    switch(message.command) {
        case "checkUpdate":
            return checkUpdate();
        case "update":
            return update();
        default:
            return Promise.reject("Error: uncaught message.");
    }
});


/**
 * 檢查有無更新，並將已知最新的版本日期存起來。
 * @return {Promise} 有較新的資料就回傳新資料的日期字串，若無則回傳 false 。
 */
const checkUpdate = async() => {
    const [vLocal = "", vRemote] = await Promise.all([
        getData("updateDate"),
        fetch(remoteDocRoot + "/kong0107/mojLawSplitJSON@gh-pages/UpdateDate.txt", {cache: "no-cache"}).then(res => res.text())
    ]);
    if(vLocal > vRemote || !/^\d{8}$/.test(vRemote)) throw new SyntaxError("UpdateDate format error");
    await setData({
        remoteDate: vRemote,
        lastCheckUpdate: Date.now()
    });
    console.log("checkUpdate: " + vRemote);
    if(vLocal == vRemote) return false;
    return vRemote;
};
browser.alarms.onAlarm.addListener(checkUpdate);

/**
 * 更新資料
 * @return {Promise}
 */
const update = async() => {
    const vRemote = await checkUpdate();
    if(!vRemote) return;

    const [mojData, aliases] = await Promise.all([
        fetch(remoteDocRoot + "/kong0107/mojLawSplitJSON@gh-pages/index.json", {cache: "no-cache"}).then(res => res.json()),
        fetch(remoteDocRoot + "/g0v/laweasyread-front@v1.x/data/aliases.json", {cache: "no-cache"}).then(res => res.json())
    ]);
    await setData({
        updateDate: vRemote,
        laws: parseData(mojData, aliases)
    });
    console.log("laws updated");
    return vRemote;
};
