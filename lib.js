globalThis.browser ??= globalThis.chrome;
globalThis.storage = globalThis.browser?.storage?.local;

/**
 * @func $
 * @desc Shortcut to `querySelector`, but safe for methods such as `Array.prototype.map`.
 * @param {string|HTMLElement} selector
 * @param {Element} [base=document] the element to call `querySelector`, or `document` if without such method.
 * @returns {HTMLElement|null}
 */
function $(selector, base) {
	if (selector instanceof HTMLElement) return selector;
	if (!base?.querySelector) base = document;
	return base.querySelector(selector);
}


/**
 * @func fetchJSON
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
	return await res.json();
}


/**
 * @func createElement
 * @desc Create an HTML element from a JSON Markup Language (JsonML) representation recrursively.
 * @param {Array|*} jsonML JSON Markup Language (JsonML) representation of an HTML element.
 * @returns {HTMLElement|Text}
 */
function createElement(jsonML) {
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
	elem.append(...children.map(createElement));
	elem.normalize();
	return elem;
}


/**
 * @func isEventInElement
 * @desc Check wheather a mouse event happens inside an element, even its target is not the element.
 * @param {MouseEvent} event
 * @param {Element|string} elem the Element or the query selector to it
 * @returns {boolean}
 */
function isEventInElement(event, elem) {
    const {clientX: x, clientY: y} = event;
    if (typeof elem === 'string') elem = $(elem);
    if (!elem) {
        console.warn('isEventInElement: Element not found for selector: ' + elem);
        return false;
    }
    return [...elem.getClientRects()].some(r =>
        x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    );
}


/**
 * @func parseIntChinese
 * @desc Parse a Chinese numeral string into an integer.
 * @param {string} str
 * @returns {number|NaN}
 */
function parseIntChinese(str) {
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
}
