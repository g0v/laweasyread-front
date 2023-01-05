/**
 * 瀏覽器後台進入點
 *
 * 原本想用 module 模式，但因 content scripts 不能用 module ，為了盡量簡化，只好 background 也不用。亦注意：
 * * `module.exports` 只有 Node.js 能用，瀏覽器不行。
 * * `importScripts()` 只有 Chrome 系列的支援，且仍不能用在模組模式和 content scripts 中。
 *   但由於 Manifest V3 的 `service_worker` 只允許一個進入點，而又不方便用 module （如前述），故在 Chrome 系列仍是使用 `importScripts()` 。
 */
if(typeof importScripts === 'function') importScripts(
    '../lib/kong-util.js',
    '../lib/storage.js',
    '../LER.back.js'
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
            kongUtil.fetchText('https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/UpdateDate.txt', {cache: 'no-cache'})
        ]);
        setData({
            remoteDate,
            lastCheck: Date.now()
        });
        if(localDate === remoteDate) return false;
        return remoteDate;
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
     *   overwrites the method defined in `LER.back.js`.
     *   loads laws data in `browser.storage`; or downloads if no such data yet.
     */
    async loadLaws() {
        console.debug('LER.loadLaws() in `browser/background.js`');
        let laws = await getData('laws');
        if(laws instanceof Array) return laws;

        await this.update();
        return await getData('laws');
    }
});

LER.loadRules();


browser.runtime.onInstalled.addListener(() => {
    console.debug('browser.runtime.onInstalled');

    // 讀取資料庫的選項，補上預設的後就再存進去。
    kongUtil.fetchJSON('/data/options_default.json')
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
