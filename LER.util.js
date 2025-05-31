const LER = {

/**
 * @func $
 * @desc Shortcut to `querySelector`, but safe for methods such as `Array.prototype.map`.
 * @param {string|EventTarget} selector
 * @param {Element|Document} [base=document] the element to call `querySelector`, or `document` if without such method.
 * @returns {HTMLElement|null}
 */
$(selector, base) {
	if (selector instanceof EventTarget) return selector;
	if (!base?.querySelector) base = document;
	return base.querySelector(selector);
},


/**
 * @func $$
 * @desc Shortcut to `querySelectorAll`, but safe for `Array.prototype.map`.
 * @param {string} selector
 * @param {Element|Document} [base=document]
 * @returns {NodeList}
 */
$$(selector, base) {
	if (!base?.querySelectorAll) base = document;
	return base.querySelectorAll(selector);
},


/**
 * @func hide
 * @desc Hide an element by setting its class to `d-none` for Bootstrap
 * @param {string|Element} target The Element (or selector to it) to hide.
 */
hide(target) {
	this.$(target)?.classList.add("d-none");
},

/**
 * @func show
 * @desc Show an element which were hidden because of its `d-none` class.
 * @param {string|Element} target The Element (or selector to it) to show.
 */
show(target) {
	this.$(target)?.classList.remove("d-none");
},


/**
 * @func listen
 * @desc Shortcut to `document.querySelector().addEventListener()`
 * @param {string|EventTarget} target string as selector to match an Element to be the EventTarget
 * @param {string} eventType event type
 * @param {function} listener
 * @param {Object|boolean} [options]
 */
listen(target, eventType, listener, options) {
	this.$(target)?.addEventListener(eventType, listener, options);
},


/**
 * @func fetch
 * @desc Request the resource even with fresh cache, then resolve to specified `returnType` or reject if the response is not OK.
 * @param {string|URL|Request} resource same as `fetch()`
 * @param {string} [returnType='text'] method name of `Response`
 * @returns {Promise.<*>}
 */
async fetch(url, returnType = 'text') {
	if (!url.startsWith('https://') && !browser?.runtime?.getURL('')) url = 'https://cdn.jsdelivr.net/gh/g0v/laweasyread-front/' + url;
	const res = await globalThis.fetch(url, {
		catch: 'no-cache',
		referrerPolicy: 'no-referrer'
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
	return await res[returnType]();
},


/**
 * @func createElement
 * @desc Create an HTML element from a JSON Markup Language (JsonML) representation recrursively.
 * @param {Array|*} jsonML JSON Markup Language (JsonML) representation of an HTML element.
 * @returns {HTMLElement|Text}
 */
createElement(jsonML) {
	if (!jsonML) jsonML = '';
	if (typeof jsonML === 'string') return document.createTextNode(jsonML);
	if (jsonML instanceof Node) return jsonML.cloneNode(true);
	if (jsonML.constructor !== Array)
		throw new TypeError('Invalid JsonML constructor: ' + jsonML.constructor.name);

	const [tag, ...children] = jsonML;
	const attr = (children?.[0]?.constructor === Object) ? children.shift() : {};
	const elem = document.createElement(tag);
	for (const [origKey, value] of Object.entries(attr)) {
		const key = origKey.toLowerCase();
		if (key.startsWith('on')) elem.addEventListener(key.slice(2), value);
		else if (key === 'class') elem.className = value;
		else if (!value) elem.removeAttribute(key);
		else if (value === true) elem.setAttribute(key, '');
		else if (value.constructor !== Object) elem.setAttribute(key, value);
		else switch (key) {
			case 'style':
			case 'css':
				for (const [k, v] of Object.entries(value)) elem.style[k] = v;
				break;
			case 'data':
			case 'dataset':
				for (const [k, v] of Object.entries(value)) elem.dataset[k] = v;
				break;
			default:
				throw new TypeError(`Unsupported attribute: ${origKey}=${JSON.stringify(value)}`);
		}
	}
	elem.append(...children.map(LER.createElement));
	elem.normalize();
	return elem;
},


/**
 * @func isEventInElement
 * @desc Check wheather a mouse event happens inside an element, even its target is not the element.
 * @param {MouseEvent} event
 * @param {Element|string} elem the Element or the query selector to it
 * @returns {boolean}
 */
isEventInElement(event, elem) {
	const {clientX: x, clientY: y} = event;
	if (typeof elem === 'string') elem = $(elem);
	if (!elem) {
		console.warn('isEventInElement: Element not found for selector: ' + elem);
		return false;
	}
	return [...elem.getClientRects()].some(r =>
		x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
	);
},


/**
 * @func parseIntChinese
 * @desc Parse a Chinese numeral string into an integer.
 * @param {string} str
 * @returns {number|NaN}
 */
parseIntChinese(str) {
	if (!str) return NaN;

	let result = parseInt(str);
	if (!isNaN(result)) return result;

	result = 0;
	const digits = '零一二三四五六七八九';
	const match = str.match(/^([一二三四五六七八九]\s*千)?\s*([一二三四五六七八九]\s*百|零)?\s*([一二三四五六七八九]?\s*十|零)?\s*([一二三四五六七八九])?$/);
	if (!match) return NaN;
	const [_, thousands, hundreds, tens, ones] = match;
	if (thousands) {
		const digit = digits.indexOf(thousands.charAt(0));
		if (digit < 0) return NaN;
		result += digit * 1000;
	}
	if (hundreds && hundreds !== '零') {
		const digit = digits.indexOf(hundreds.charAt(0));
		if (digit < 0) return NaN;
		result += digit * 100;
	}
	if (tens && tens !== '零') {
		const digit = (tens === '十') ? 1 : digits.indexOf(tens.charAt(0));
		if (digit < 0) return NaN;
		result += digit * 10;
	}
	if (ones) {
		const digit = digits.indexOf(ones.charAt(0));
		if (digit < 0) return NaN;
		result += digit;
	}

	return result;
},


/**
 * @func initWebExtension
 * @desc
 *  Ensure `browser` is defined (for Chrome) and make methods in this file (except `fetch`) global.
 *  This works only in WebExtension mode; don't call it in embedding mode.
 */
initWebExtension() {
	globalThis.browser ??= globalThis.chrome;
	globalThis.storage ??= globalThis.browser.storage.local;
	['$', '$$', 'hide', 'show', 'listen', 'createElement', 'isEventInElement', 'parseIntChinese']
	.forEach(method => globalThis[method] = this[method]);
}

};
