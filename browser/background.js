importScripts(
    "../node_modules/kong-util/dist/web.js",
    "../node_modules/kong-util/dist/string.js"
);
kongUtilWeb.use("fetchJSON", "fetchText");
kongUtilString.use("parseChineseNumber");

importScripts("./lib.js", "./LER.js");
Object.assign(LER, {
    /**
     * @func checkUpdate
     * @desc 確認是否可更新法規列表。
     * @returns {Promise.<(false | string)>} 若有更新，則回傳該版本的日期字串
     */
    async checkUpdate() {
        const [localDate = "", remoteDate] = await Promise.all([
            getData("localDate"),
            fetchText("https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/UpdateDate.txt", {cache: "no-cache"})
        ]);
        setData({
            remoteDate,
            lastCheck: Date.now()
        });
        return (localDate < remoteDate) ? remoteDate : false;
    },

    /**
     * @func update
     * @desc 更新法規列表。
     * @returns {Promise.<(false | string)>} 若有更新，則回傳該版本的日期字串。
     */
    async update() {
        const remoteDate = await this.checkUpdate();
        if(!remoteDate) return false;

        const laws = downloadLaws();
        setData({laws, localDate: remoteDate});
        this.loadRules(laws);
        return remoteDate;
    },

    /**
     * @public
     * @func loadLaws
     * @returns {Promise.<Law[]>}
     * @desc load laws data in `browser.storage`; comparing this to the same function in `LER` initialization.
     */
    loadLaws() {
        return getData("laws");
    }
});



browser.runtime.onInstalled.addListener(() => {
    // 若是初次安裝，則抓取法規資料。
    getData("version")
    .then(version => {
        if(version) LER.loadRules();
        else LER.update();
    });

    // 把 manifest.json 裡的版本資訊儲存到瀏覽器。
    setData({version: browser.runtime.getManifest().version});

    // 讀取資料庫的選項，補上預設的後就再存進去。
    fetchJSON("/data/options_default.json")
    .then(getData)
    .then(setData);

    // 每小時觸發鬧鐘
    browser.alarms.clearAll()
    .then(() => browser.alarms.create({periodInMinutes: 60}));
});

// 鬧鐘響時就檢查是否有更新
browser.alarms.onAlarm.addListener(async() => {
    const autoUpdate = await getData("autoUpdate");
    if(autoUpdate) LER.update();
    else LER.checkUpdate();
});

// 整個 LER 就是 listener
browser.runtime.onMessage.addListener((request, sender, callback) => {
    const result = LER[request.command]?.(request, sender);
    if(result instanceof Promise)
        return !!result.then(callback); // return true for callback to be called async
    callback(result);
});

LER.loadRules();
