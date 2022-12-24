importScripts(
    '../node_modules/kong-util/dist/all.js',
    '../lib.js',
    './LER.back.js'
);

Object.assign(LER, {
    /**
     * @func checkUpdate
     * @desc 確認是否可更新法規列表。
     * @returns {Promise.<(false | string)>} 若有更新，則回傳該版本的日期字串
     */
    async checkUpdate() {
        console.debug('LER.checkUpdate()');
        const [localDate, remoteDate] = await Promise.all([
            getData('localDate'),
            fetch('https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/UpdateDate.txt', {cache: 'no-cache'}).then(res => res.text())
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
        console.debug('LER.update()');
        const remoteDate = await this.checkUpdate();
        if(!remoteDate) return false;

        const laws = await this.downloadLaws();
        setData({laws, localDate: remoteDate});
        this.loadRules(laws);
        return remoteDate;
    },

    /**
     * @public
     * @func loadLaws
     * @returns {Promise.<Law[]>}
     * @desc
     *   overwrites the method defined in `browser/LER.back.js`.
     *   loads laws data in `browser.storage`; or downloads if no such data yet.
     */
    async loadLaws() {
        console.debug('LER.loadLaws() in `browser/background.js`');
        let laws = await getData('laws');
        if(!laws) {
            laws = await this.downloadLaws();
            await setData({laws});
        }
        return laws;
    }
});

LER.loadRules();


browser.runtime.onInstalled.addListener(() => {
    console.debug('browser.runtime.onInstalled');

    // 讀取資料庫的選項，補上預設的後就再存進去。
    fetch('/data/options_default.json')
    .then(res => res.json())
    .then(getData)
    .then(setData);

    // 每小時觸發鬧鐘
    browser.alarms.clearAll()
    .then(() => browser.alarms.create({periodInMinutes: 60}));
});

// 鬧鐘響時就檢查是否有更新
browser.alarms.onAlarm.addListener(async() => {
    const autoUpdate = await getData('autoUpdate');
    if(autoUpdate) LER.update();
    else LER.checkUpdate();
});

// 整個 LER 就是 listener
browser.runtime.onMessage.addListener((request, sender, callback) => {
    const {method, ...options} = request;
    const result = LER[method]?.(options, sender);
    if(result instanceof Promise)
        return !!result.then(callback); // return true for callback to be called async
    callback(result);
});
