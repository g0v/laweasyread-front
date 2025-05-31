Object.assign(LER, {

/**
 * @func parseDocument
 * @desc 轉換整個頁面
 * @param {Object} options
 * @returns {Promise.<HTMLBodyElement>}
 */
parseDocument(options) {
	console.debug('LER.parseDocument()');
	this.articleNumberFormat = options.articleNumberFormat || 'unchanged';
	return this.parseElement(
		document.body,
		Object.assign({defaultLaw: this.pageDefaultLaw}, options)
	);
},

/**
 * @func parseElement
 * @desc 轉換指定元素內的文字節點。
 * @param {Element} element
 * @param {Object} [options]
 * @returns {Promise.<Element>}
 */
async parseElement(
	element, {
		defaultLaw,
		articleNumberFormat = this.articleNumberFormat,
		enablePopup = true
	}
) {
	console.debug('LER.parseElement()');
	console.time("LawEasyRead" + (++this.counter));
	await this.loadRules();

	// 取得所有要處理的文字節點
	const textNodes = [];
	const walker = document.createTreeWalker(
		element,
		NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
		node => {
			if (node.nodeType === Node.TEXT_NODE) {
				return /[\u4E00-\u9FFF]{2}/.test(node.textContent) // 有連續中日韓字元
					? NodeFilter.FILTER_ACCEPT
					: NodeFilter.FILTER_REJECT;
			}
			if ('A,BUTTON,CODE,SCRIPT,SELECT,STYLE,TEMPLATE,TEXTAREA'.split(',').includes(node.tagName)) return NodeFilter.FILTER_REJECT;
			return node.classList.contains('LER-skip') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
		}
	);
	let node;
	while (node = walker.nextNode()) textNodes.push(node);

	return new Promise(resolve => {
		const currentCounter = this.counter;
		async function parseNextTextNode() {
			const node = textNodes.shift();
			if (!node) {
				console.timeEnd("LawEasyRead" + currentCounter);
				return resolve(element);
			}
			let objects = await LER.parseString({
				string: node.textContent,
				allowLink: !node.parentNode?.closest?.("a"),
				articleNumberFormat,
				defaultLaw
			});

			requestIdleCallback(parseNextTextNode);
			if (objects.length === 1 && objects[0] === node.textContent) return; // 沒變的話就不替換
			// 扁平化。但由於 JsonML 自身結構已是陣列，故不方便使用 `Array.flat()` 。
			// objects = objects.reduce((acc, cur) => {
			// 	if (typeof cur === 'string'
			// 		|| /[a-z]+/.test(cur[0]) && !(cur[1] instanceof Array) // JsonML
			// 	) acc.push(cur);
			// 	else acc.push(...cur);
			// 	return acc;
			// }, []);
			objects = objects.map(createElement);

			const next = node.nextSibling;
			node.replaceWith(...objects);
			if (enablePopup) objects.forEach(o => LER.bindPopup(o, articleNumberFormat));
			if (!next) {
				const parent = objects[0].parentNode;
				const event = new CustomEvent("lerParseEnd");
				parent.dispatchEvent(event);
			}
		}
		requestIdleCallback(parseNextTextNode);
	});
},

/** @type {JsonML} */
popupTemplate:
	["div", {
		"class": "LER-popup-container",
		"style": "display: none;"
		},
		["div", {"class": "LER-popup-before"}],
		["div", {"class": "LER-popup"},
			["label", {
					"class": "LER-popup-pin",
					"title": "固定"
				},
				["input", {"type": "checkbox"}], // checkbox 不能用 pseudo-element
				["i"],
			],
			["header"],
			["dl", {"class": "LER-popup-body"}]
		],
		["div", {"class": "LER-popup-after"}]
	]
,

/** @type {Object} */
pageDefaultLaw: null,

/** @type {integer} */
counter: 0,


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
	elem.append(...children.map(createElement));
	elem.normalize();
	return elem;
},



/**
 * 綁定滑鼠移過時的彈出式視窗。
 * @param {Element} elem
 * @returns {void}
 *
 *  做四件事：
 *  1. 滑鼠首次移入目標時，同步建立彈出式視窗，異步載入資料。載入資料後若視窗仍處於顯示狀態，則再次定位視窗。
 *  2. 滑鼠移入目標時，則設定稍後顯示並定位視窗。
 *  3. 滑鼠移出目標時，若視窗尚未顯示，則取消前項設定。
 *  4. 滑鼠移動時，若不在顯示中的視窗或其目標內，且視窗未被釘選，則隱藏視窗。（另處監聽 document 的 mousemove 事件）
 *
 *  備註：由於在 shadow tree 裡的 Event.target 在事件結束後會被清掉，所以先複製需要的資料出來。
 *  參考：
 *  * https://stackoverflow.com/questions/57963312/
 *  * https://stackoverflow.com/questions/62181537/
 */
bindPopup(elem, articleNumberFormat) {
	if(!(elem instanceof Element)) return;
	const {jyi, pcode, word} = elem.dataset;
	if(!jyi && !pcode && !word) return;

	let popup;
	elem.addEventListener('mouseenter', event => {
		// console.debug('mouseenter', event);
		const fakeEvent = {target: event.target, clientX: event.clientX, pageX: event.pageX};
		// 為同步建立元件，就不從後端取得 JsonML ，而是複製已載入的 DOM 。
		popup = this.popupTemplate.cloneNode(true);
		popup.target = elem;
		popup.addEventListener('mouseleave', e => {
			if(isEventInElement(e, elem)) return;
			if(isEventInElement(e, popup)) return;
			if(popup.querySelector('[type=checkbox]').checked) return;
			popup.style.display = 'none';
		});
		const body = popup.querySelector('.LER-popup-body');
		body.textContent = '讀取中…';
		this.getShadowRoot().append(popup);

		// 異步載入資料。
		this.preparePopup(elem.dataset)
		.then(({headers, bodyParts, defaultLaw}) => {
			popup.querySelector('header').append(...headers.map(createElement));
			body.textContent = '';
			body.append(...bodyParts.map(createElement));
			this.parseElement(body, {defaultLaw, articleNumberFormat});
			if(!popup.style.display) this.setPopupPosition(popup, fakeEvent); ///< 載入內容後高度可能有變化，要重新定位，但是只能依賴舊的滑鼠事件位置。
		});
	}, {once: true});

	let timeoutID;
	elem.addEventListener('mouseenter', event => {
		// console.debug('mouseenter', event);
		const fakeEvent = {target: event.target, clientX: event.clientX, pageX: event.pageX};
		if(!popup) throw new ReferenceError("popup does not exist.");
		if(!popup.style.display) return;
		timeoutID = setTimeout(this.setPopupPosition, 375, popup, fakeEvent);
	});
	elem.addEventListener('mouseleave', event => {
		// console.debug('mouseleave', elem);
		clearTimeout(timeoutID);

		if(isEventInElement(event, popup)) return;
		if(popup.querySelector('[type=checkbox]').checked) return;
		popup.style.display = 'none';
	});
},

/**
 * 設定彈出式視窗位置。
 * @param {Element} popup
 * @param {MouseEvent} event
 * @returns {undefined}
 */
setPopupPosition(popup, event) {
	// console.debug('LER.setPopupPosition()', event);
	let arrow; ///< 稍後判斷箭頭是上面還是下面
	const rect = event.target.getBoundingClientRect(); ///< 相對於當前可視範圍，而非相對於文件左上角

	/// 位置跟尺寸的資訊必須在元素顯示後才能取得，故先顯示其中一個箭頭再看高度。
	popup.firstChild.style.display = "none";
	popup.lastChild.style.display = "";
	popup.style.display = "";

	/// Y軸：預設為目標元素的下緣，但若會超出可視範圍（即使未超過文件範圍），則改在目標元素的上緣。
	let top = Math.floor(rect.bottom + window.scrollY);
	if(top + popup.offsetHeight > window.scrollY + window.innerHeight) {
		top = Math.ceil(rect.top + window.scrollY - popup.offsetHeight);
		arrow = popup.lastChild;
		arrow.style.display = "";
	}
	else {
		popup.lastChild.style.display = "none";
		arrow = popup.firstChild;
		arrow.style.display = "";
	}
	popup.style.top = top + "px";

	/// X軸：視滑鼠在目標元素的水平位置，依比例。但不能讓彈出式視窗超過畫面寬度。
	let left = rect.left + window.scrollX; // 目標元素的左緣
	left += (event.clientX - rect.left)
		* Math.max(rect.width - popup.offsetWidth, 0) / rect.width
	; // 如果目標元素比彈出式視窗還要寬，那就依滑鼠在目標元素的相對位置來調整彈出式視窗的X軸位置。
	if(left + popup.offsetWidth > document.body.clientWidth) // 不能讓彈出式視窗超過畫面寬度
		left = document.body.clientWidth - popup.offsetWidth;
	popup.style.left = Math.max(left, 0) + "px";

	// 箭頭的位置：跟著滑鼠座標的X值，但不能超出彈出式視窗本身。
	const arrowLeft = Math.min(
		event.pageX - left - arrow.offsetWidth / 2, // 理想位置
		popup.offsetWidth - arrow.offsetWidth - 8   // 彈出式視窗右緣，再扣掉原角框的範圍
	);
	arrow.style.marginLeft = Math.max(arrowLeft, 8) + "px";
},

getShadowRoot() {
	let host = $('#LER-shadow-host');
	if(!host) {
		host = createElement([
			'div', {
				id: 'LER-shadow-host',
				style: 'position: static; width: 0; height: 0;'
			}
		]);
		document.body.append(host);

		const root = host.attachShadow({mode: 'open'});
		this.fetchText({resource: 'content_scripts/main.css'})
		.then(css => {
			root.append(createElement(
				['style', css]
			));
		});
	}
	return host.shadowRoot;
}

});
