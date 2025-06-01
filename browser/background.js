/**
 * @func getMain
 * @returns {Promise.<Object>}
 * @desc
 *  Overrides the method defined in `LER.back.js`.
 * 	Keep check until there's data in storage.
 */
LER.getMain = async function() {
	let data;
	do {
		if (!data) await new Promise(r => setTimeout(r, 100));
		data = await storage.get();
	} while (!data.localDate);
	return data;
};


/**
 * @func onInstalledListener
 * @desc Fired
 * 	when the extension is first installed,
 * 	when the extension is updated to a new version, and
 * 	when the browser is updated to a new version.
 * @param {Object} details
 * @param {string} [details.id] - The ID of the imported shared module extension that updated. This is present only if the `reason` value is `shared_module_update`.
 * @param {string} [details.previousVersion] - The previous version of the extension just updated. This is only present if the `reason` value is `update`.
 * @param {string} details.reason - `install`, `update`, `browser_update` (or `chrome_update`), or `shared_module_update`
 * @param {boolean} details.temporary - True if the add-on was installed temporarily.
 */
browser.runtime.onInstalled.addListener(details => {
	console.debug('onInstalled', details);

	// 讀取資料庫的選項，補上預設的後就再存進去。
	LER.fetch('/data/options_default.json', 'json')
	.then(storage.get)
	.then(storage.set);

	// 若無 localDate ，直接下載全部並存起來
	storage.get(['localDate'])
	.then(({localDate}) => localDate || update());

	// 每小時觸發鬧鐘
	browser.alarms.clearAll()
	.then(() => browser.alarms.create({periodInMinutes: 60}));
});

/**
 * @async
 * @func onAlarmListener
 * @desc Periodically check whether there's newer version, and update if allowed.
 * @param {Object} alarm
 */
browser.alarms.onAlarm.addListener(async (alarm) => {
	console.debug('onAlarm', alarm);
	checkUpdate();
});


/**
 * @func update
 * @desc Save downloaded data into storage.
 * @param {string} [knownDate] - Used to skip checking `remoteDate` when already known.
 * @returns {Promise.<string>}
 */
async function update(knownDate) {
	const data = await LER.downloadMain(knownDate);
	data.localDate = data.remoteDate;
	if (!knownDate)  data.lastCheck = Date.now();
	await storage.set(data);
	console.debug(`Updated to ${data.remoteDate}`);
	return data.remoteDate;
}

Object.assign(messageListeners, {
	update: options => update(options.remoteDate),
	parseString: LER.parseString,
	loadRules: LER.loadRules
});
