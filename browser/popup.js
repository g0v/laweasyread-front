console.debug('browser/popup.js');
LER.globalizeUtility();

// 顯示專案版本
$('#version').textContent = browser.runtime.getManifest().version;


// 讀資料並灌入對應元件
storage.get(['options', 'localDate', 'remoteDate'])
.then(({options, localDate, remoteDate}) => {

	const cbAutoParse = $('#autoParse');
	cbAutoParse.checked = options.autoParse;
	listen(cbAutoParse, 'click', () => {
		setOptions({autoParse: cbAutoParse.checked});
		if (cbAutoParse.checked) sendMessageToTab({method: 'parseDocument', options});
	});

	if (remoteDate > localDate) {
		const btnUpdate = $('#update');
		show(btnUpdate);
		btnUpdate.title = `可更新至 ${remoteDate} 的法規清單`;
		listen(btnUpdate, 'click', () => {
			btnUpdate.replaceChildren('更新中…');
			btnUpdate.disabled = true;
			sendMessage({method: 'update', remoteDate})
			.then(() => btnUpdate.remove())
			.catch(() => btnUpdate.replaceChildren('更新失敗'));
		});
	}
});


// 用網址檢查現在的頁面是否可以被轉換，並設定手動轉換的 button
browser.tabs.query({active: true, currentWindow: true})
.then(([tab]) => {
	const url = tab.url;
	if (!url.startsWith('http') && !url.startsWith('file')) return;

	const btnParse = $('#parseCurrentTab');
	show(btnParse);
	btnParse.addEventListener('click', () => {
		btnParse.disabled = true;
		getOptions()
		.then(options => sendMessageToTab({method: 'parseDocument', ...options}, tab.id))
		.finally(() => btnParse.disabled = false);
	});
});
