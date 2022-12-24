browser.runtime.onMessage.addListener(LER.parseDocument.bind(LER));

getData(['autoParse', 'articleNumberFormat', 'enablePopup'])
.then(({autoParse, ...options}) => {
    if(autoParse) LER.parseDocument(options);
});
