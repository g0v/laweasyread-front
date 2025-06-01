console.debug('options_ui/tool.js');
listen('#toolInput', 'input', async() => {
	$('#toolResult').textContent = '';
	const {articleNumberFormat} = await storage.get(['articleNumberFormat'])
	const objects = (await sendMessage({
		method: 'parseString',
		string: $('#toolInput').value,
		articleNumberFormat
	})).map(createElement);
	objects.forEach(o => LER.bindPopup(o, articleNumberFormat));
	$('#toolResult').append(...objects);
});
