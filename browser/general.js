console.debug('browser/general.js');
globalThis.browser ??= globalThis.chrome;
globalThis.storage = browser.storage.local;


/**
 * @func addMessageListener
 * @param {string} methodName
 * @param {function} callback
 * @returns {undefined}
 */
function addMessageListener(methodName, callback) {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const {method, ...options} = message;
        if (method !== methodName) return false;
        const result = callback(options);
        if (result instanceof Promise) return !!result.then(sendResponse);
        return false || sendResponse(result);
    });
}


/**
 * @func checkUpdate
 * @param {boolean} [forceUpdate=false]
 * @returns {Promise.<false|string>}
 */
async function checkUpdate(forceUpdate = false) {
	const {autoUpdate, localDate} = await storage.get(['autoUpdate', 'localDate']);
    const resource = 'https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/UpdateDate.txt';
	const remoteDate = await fetch(resource, {cache: 'no-cache'}).then(res => res.text());
	storage.set({
		remoteDate,
		lastCheck: Date.now()
	});

    if (localDate === remoteDate) return false;
	if (autoUpdate || forceUpdate) {
        if (typeof update === 'function') await update(remoteDate);
        else await browser.runtime.sendMessage({method: 'update', remoteDate});
    }
    return remoteDate;
}


/**
 * @func testExcludePattern
 * @param {string} pattern
 * @param {string} url
 * @returns {boolean}
 */
function testExcludePattern(pattern, url) {
    const regexp = pattern.replace(/([.+?\\()\[\]{}])/g, '\\$1').replace(/\*/g, '.*');
    return new RegExp(regexp).test(url);
}
