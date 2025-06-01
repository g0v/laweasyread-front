LER.initWebExtension();

/// 作為瀏覽器外掛時，前端 LER 物件還缺這些方法。以呼叫後端的方式實作。
['fetchText', 'loadRules', 'parseString', 'preparePopup'].forEach(method =>
	LER[method] = options => browser.runtime.sendMessage({method, ...options})
);

requestIdleCallback(() => {
	// browser.runtime.onMessage.addListener(LER.parseDocument.bind(LER));
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		console.debug('onMessage', request, sender);
		const {method, ...options} = message;
		let result;
		if (method === 'parseDocument') result = LER.parseDocument(options);
		else throw new Error('unknown method: ' + method);

		if (result instanceof Promise)
			return !!result.then(sendResponse);
		sendResponse(result);
		return false;
	});
	storage.get(['autoParse', 'exclude_matches', 'articleNumberFormat', 'enablePopup'])
	.then(({autoParse, exclude_matches, ...options}) => {
		if (!autoParse) return;
		const rules = exclude_matches.split('\n').filter(x => x);
		for (let i = 0; i < rules.length; ++i) {
			const regexp = rules[i].replace(/([.+?\\()\[\]{}])/g, '\\$1').replace(/\*/g, '.*');
			if ((new RegExp(regexp)).test(location.href))
				return console.debug('match exclusion list:', rules[i]);
		}
		LER.parseDocument(options);
	});
});
