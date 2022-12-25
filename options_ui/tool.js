document.head.append(createElementFromJsonML(
    ['script', {src: '../LER.front.js'}]
));

listen($('#toolInput'), 'input', async() => {
    $('#toolResult').textContent = '';
    const articleNumberFormat = await getData('articleNumberFormat')
    const objects = (await browser.runtime.sendMessage({
        method: 'parseString',
        string: $('#toolInput').value,
        articleNumberFormat
    })).map(createElementFromJsonML);
    objects.forEach(o => LER.bindPopup(o, articleNumberFormat));
    $('#toolResult').append(...objects);
});
