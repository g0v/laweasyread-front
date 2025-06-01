console.debug('content_scripts/main.js');
LER.globalizeUtility();

/// 作為瀏覽器外掛時，前端 LER 物件還缺這些方法。以呼叫後端的方式實作。
['loadRules', 'parseString', 'preparePopup'].forEach(method =>
	LER[method] = options => browser.runtime.sendMessage({method, ...options})
);

addMessageListener('parseDocument', async () => {
	const {laws, ...options} = await storage.get();
	return LER.parseElement(document.body, options);
});

storage.get()
.then(({laws, autoParse, exclude_matches, ...options}) => {
	if (!autoParse) return;

});

storage.get(['autoParse', 'exclude_matches', 'articleNumberFormat', 'enablePopup'])
.then(({autoParse, exclude_matches, ...options}) => {
	if (!autoParse) return;
	const rules = exclude_matches.split('\n').filter(x => x);
	for (let i = 0; i < rules.length; ++i) {
		if (testExcludePattern(rules[i], location.href))
			return console.debug('match exclusion list:', rules[i]);
	}
	LER.parseElement(document.body, options);
});
