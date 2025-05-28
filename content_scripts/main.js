requestIdleCallback(() => {
    browser.runtime.onMessage.addListener(LER.parseDocument.bind(LER));
    storage.get(['autoParse', 'exclude_matches', 'articleNumberFormat', 'enablePopup'])
    .then(({autoParse, exclude_matches, ...options}) => {
        if(!autoParse) return;
        const rules = exclude_matches.split('\n').filter(x => x);
        for(let i = 0; i < rules.length; ++i) {
            const regexp = rules[i].replace(/([.+?\\()\[\]{}])/g, '\\$1').replace(/\*/g, '.*');
            if((new RegExp(regexp)).test(location.href))
                return console.debug('match exclusion list:', rules[i]);
        }
        LER.parseDocument(options);
    });
});
