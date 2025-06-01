globalThis.browser ??= globalThis.chrome;
globalThis.storage = browser.storage.local;
LER.globalizeUtility();

/**
 * @var {Tab}
 */
let currentTab = null;

// 顯示專案版本
$('#version').textContent = browser.runtime.getManifest().version;

// 讀資料並灌入對應元件
storage.get(['autoParse', 'localDate', 'remoteDate'])
.then(({autoParse, localDate, remoteDate}) => {
	const cbAutoParse = $('#autoParse');
	cbAutoParse.checked = autoParse;
	listen(cbAutoParse, 'click', () => {
		storage.set({autoParse: cbAutoParse.checked});
		if (cbAutoParse.checked) sendMessageToCurrentTab({method: 'parseDocument'});
	});

	if (remoteDate > localDate) {
		const btnUpdate = $('#update');
		show(btnUpdate);
		btnUpdate.title = `可更新至 ${remoteDate} 的法規清單`;
		listen(btnUpdate, 'click', () => {
			btnUpdate.lastChild.replaceWith('更新中…');
			btnUpdate.disabled = true;
			browser.runtime.sendMessage({method: 'update', remoteDate})
			.then(
				() => btnUpdate.remove(),
				() => btnUpdate.replaceWith('更新失敗')
			);
		});
	}
});

// 用網址檢查現在的頁面是否可以被轉換，並設定手動轉換的 button
browser.tabs.query({active: true, currentWindow: true})
.then(([tab]) => {
	console.debug(currentTab = tab);
	const url = tab.url;
	if (!url.startsWith('http') && !url.startsWith('file')) return

	const button = $('#parseCurrentTab');
	show(button);
	button.addEventListener('click', () => {
		button.disabled = true;
		sendMessageToCurrentTab({method: 'parseDocument'})
		.finally(() => button.disabled = false);
	});
});


/**
 * @func parseCurrentTab
 * @returns {Promise|false}
 */
function parseCurrentTab() {
	if (!currentTab) return false;
	const url = currentTab.url;
	if (!url.startsWith('http') && !url.startsWith('file')) return false;

	return storage.get(['articleNumberFormat', 'enablePopup'])
	.then(options =>
		browser.tabs.sendMessage(currentTab.id, {method: 'parseDocument', ...options})
	);
}


/**
 * @func sendMessageToCurrentTab
 * @desc 傳送訊息到當前的分頁，但避開瀏覽器自設頁面（如 `chrome://` 開頭）。
 * @param {Object} message
 * @returns {Promise|false} response from the tab
 */
function sendMessageToCurrentTab(message) {
	if (!currentTab) return false;
	const url = currentTab.url;
	if (!url.startsWith('http') && !url.startsWith('file')) return false;
	return browser.tabs.sendMessage(currentTab.id, message);
}
