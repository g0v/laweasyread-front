LER.initWebExtension();

/**
 * @func getLaws
 * @returns {Promise.<Law[]>}
 * @desc
 *  Overrides the method defined in `LER.back.js`.
 * 	Keep check until there's data in storage.
 */
LER.getLaws = async function() {
	for (let data; !data.localDate; ) {
		data = await storage.get();
		await new Promise(r => setTimeout(r, 100));
	}
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
 * @param {string} alarm.name - the name that was passed into the `alarms.create()` call that created this alarm.
 * @param {double} alarm.scheduledTime - Time at which the alarm is scheduled to fire next, in milliseconds since the epoch.
 * @param {double|null} [alarm.periodInMinutes] - If this is not null, then the alarm is periodic, and this represents its period in minutes.
 */
browser.alarms.onAlarm.addListener(async (alarm) => {
	console.debug('onAlarm', alarm);
	const {autoUpdate, localDate} = await storage.get(['autoUpdate', 'localDate']);
	const remoteDate = await LER.fetch('https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/UpdateDate.txt', 'text');
	storage.set({
		remoteDate,
		lastCheck: Date.now()
	});

	if (autoUpdate && (localDate !== remoteDate)) update(remoteDate);
});


/**
 * @func onMessageListener
 * @desc 整個後台 LER 物件就是監聽對象
 * @param {Object} request
 * @param {string} request.method - 後台 LER 物件的成員方法名
 * @param {runtime.MessageSender} sender
 * @param {function} sendResponse - 回呼函數
 * @returns {boolean} Firefox 可接受 Promise，但 Chrome 只接受 boolean。
 */
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.debug('onMessage', request, sender)
	const {method, ...options} = request;
	const result = LER[method]?.(options, sender);
	if (result instanceof Promise)
		return !!result.then(sendResponse); // return true for sendResponse to be called async
	sendResponse(result);
	return false;
});


/**
 * @func update
 * @desc Save downloaded data into storage.
 * @param {string} [knownDate] - Used to skip checking `remoteDate` when already known.
 * @returns {Promise.<Law[]>}
 */
async function update(knownDate) {
	const data = await LER.downloadMain(knownDate);
	data.localDate = data.remoteDate;
	if (!knownDate)  data.lastCheck = Date.now();
	await storage.set(data);
	console.debug(`Updated to ${data.remoteDate}`);
}
