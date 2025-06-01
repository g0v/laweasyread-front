globalThis.browser ??= globalThis.chrome;
globalThis.storage = browser.storage.local;

/**
 * @type {Object.<string,function>}
 */
const messageListeners = {};

/**
 * @func listenMessage
 * @param {Object} message
 * @param {string} message.method
 * @param {runtime.MessageSender} sender
 * @param {function} sendResponse - 回呼函數
 * @returns {boolean} Firefox 可接受 Promise，但 Chrome 只接受 boolean。
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.debug('onMessage', message, sender);
	const {method, ...options} = message;
    if (!messageListeners[method]) {
        const error = 'no listener for method ' + method;
        console.error(error);
        sendResponse(new Error(error));
        return false;
    }
    const result = messageListeners[method](options);
	if (result instanceof Promise)
		return !!result.then(sendResponse); // return true for sendResponse to be called async
	sendResponse(result);
	return false;
});


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
