listen('#toolInput', 'input', async() => {
	$('#toolResult').textContent = '';
	const {articleNumberFormat} = await storage.get(['articleNumberFormat'])
	const objects = (await browser.runtime.sendMessage({
		method: 'parseString',
		string: $('#toolInput').value,
		articleNumberFormat
	})).map(createElement);
	objects.forEach(o => LER.bindPopup(o, articleNumberFormat));
	$('#toolResult').append(...objects);
});
