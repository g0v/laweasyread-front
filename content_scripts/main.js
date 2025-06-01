console.debug('content_scripts/main.js');
LER.globalizeUtility();

/// 作為瀏覽器外掛時，前端 LER 物件還缺這些方法。以呼叫後端的方式實作。
['loadRules', 'parseString', 'preparePopup'].forEach(method =>
	LER[method] = options => sendMessage({method, ...options})
);

addMessageListener('parseDocument', options =>
	LER.parseElement(document.body, options)
);

getOptions().then(({autoParse, excludeMatches, ...options}) => {
	if (!autoParse) return;
	const patterns = excludeMatches.split('\n').filter(x => x);
	const match = patterns.find(pattern => testExcludePattern(pattern, location.href));
	if (match) return console.debug('Excluded by pattern ' + match);
	LER.parseElement(document.body, options);
});
