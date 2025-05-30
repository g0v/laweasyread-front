LER.initWebExtension();


/**
 * @public
 * @func loadLaws
 * @returns {Promise.<Law[] | undefined>}
 * @desc
 *   overwrites the method defined in `LER.back.js`.
 *   loads laws data in `browser.storage`; or downloads if no such data yet.
 */
LER.loadLaws = async function(returnLaws = true) {
	console.debug('LER.loadLaws() in `browser/background.js`');
	let {laws} = await storage.get(['laws']);
	if (laws instanceof Array) return returnLaws ? laws : undefined;

	await update();
	return returnLaws ? storage.get(['laws']).then(s => s.laws) : undefined;
}


LER.loadRules();

browser.runtime.onInstalled.addListener(() => {
	console.debug('browser.runtime.onInstalled');

	// 讀取資料庫的選項，補上預設的後就再存進去。
	LER.fetch('/data/options_default.json', 'json')
	.then(storage.get)
	.then(storage.set);

	// 每小時觸發鬧鐘
	browser.alarms.clearAll()
	.then(() => browser.alarms.create({periodInMinutes: 60}));
});

// 鬧鐘響時就檢查是否有更新
browser.alarms.onAlarm.addListener(async() => {
	const {autoUpdate} = await storage.get(['autoUpdate']);
	if (autoUpdate) LER.update();
	else LER.checkUpdate();
});

// 整個 LER 就是 listener
browser.runtime.onMessage.addListener((request, sender, callback) => {
	const {method, ...options} = request;
	const result = LER[method]?.(options, sender);
	if (result instanceof Promise)
		return !!result.then(callback); // return true for callback to be called async
	callback(result);
});



/**
 * @func checkUpdate
 * @desc 確認是否可更新法規列表。
 * @returns {Promise.<(false | string)>} 若有更新，則回傳該版本的日期字串
 */
async function checkUpdate() {
	console.debug('checkUpdate()');
	const [localDate, remoteDate] = await Promise.all([
		storage.get(['localDate']).then(s => s.localDate),
		LER.fetch('https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/UpdateDate.txt', 'text')
	]);
	storage.set({
		remoteDate,
		lastCheck: Date.now()
	});
	return (localDate === remoteDate) ? false : remoteDate;
}

/**
 * @func update
 * @desc 更新法規列表。
 * @returns {Promise.<(false | string)>} 若有更新，則回傳該版本的日期字串。
 */
async function update() {
	console.debug('update()');
	const remoteDate = await checkUpdate();
	if (! remoteDate) return false;

	const laws = await LER.downloadLaws();
	storage.set({laws, localDate: remoteDate});
	LER.loadRules(laws);
	return remoteDate;
}
