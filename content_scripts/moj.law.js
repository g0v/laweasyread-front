console.debug('content_scripts/moj.law.js');

/**
 * 排除首頁的「熱門法規瀏覽」（排版考量）
 */
$('.section-hot')?.classList.add('LER-skip');


/**
 * 設定預設法規。
 */
LER.pageDefaultLaw = (new URLSearchParams(location.search)).get('pcode');


/**
 * 有啟用「調整全國法規資料庫的排版」時才執行。
 */
storage.get(['typesetMoj']).then(({typesetMoj}) => {
	if (!typesetMoj) return;
	const isEng = !! $('html[lang=en]');

	/**
	 * 加上「提及條文」區塊。
	 *
	 * 利用 HTML 的 `details` 和 `summary` ，在展開時才呼叫 `embedArticles()` 載入內容。
	 * 載入的是全國法規資料庫自己的網頁，這樣就不用擔心版本更新問題了。
	 * 載入後要再次呼叫 `parseElement` 處理其內容，並且呼叫 `addDetails` 讓內嵌條文提及其他條文時能有巢狀結構。
	 */
	$$('div[class|=line]').forEach(addDetails);


	/**
	 * 將「（刪除）」加上 class 以便用 CSS 使之不明顯。
	 */
	$$('.line-0000').forEach(line => {
		if (line.lastChild.textContent !== '（刪除）') return;
		line.closest('.row').classList.add('LER-moj-deleted-article');
	});


	/**
	 * 將編章節（及各自包含的章節與條文們）重新調整為巢狀結構，以利使編章節標題置頂。
	 *
	 * 原本的結構為單層：
		div.law-reg-content
		div.h3.char-1 {第 一 編 總則}
		div.h3.char-2 {第 一 章 法例}
		div.row
		div.row
		...
		div.h3.char-2 {第 二 章 人}
		div.h3.char-3 {第 一 節 自然人}
		div.row
		...

	*
	* 調整結構為巢狀：
		div.law-reg-content
		section[data-ler-depth=1]
			header > div.h3.char-1 {第 一 編 總則}
			div.LER-moj-div-body
			section[data-ler-depth=2]
				header > div.h3.char-2 {第 一 章 法例}
				div.LER-moj-div-body
				div.row
				div.row
				...
			section[data-ler-depth=2]
				header > div.h3.char-2 {第 二 章 人}
				div.LER-moj-div-body
				section[data-ler-depth=3]
					header > div.h3.char-3 {第 一 節 自然人}
					div.LER-moj-div-body
					div.row
					...
	*
	*/
	const height = 36; // 置頂元件的高度
	const depths = []; // 本頁最多有幾層
	$$('.law-reg-content .h3').forEach((h3, index, list) => {
		const section = createElement(['section', ['div', {class: 'LER-moj-div-body'}]]);
		while (h3.nextElementSibling?.classList.contains('row'))
			section.lastChild.append(h3.nextElementSibling);
		h3.replaceWith(section);

		if (!isEng) {
			const debris = h3.textContent.trim().split(' ');
			const title = (debris.length === 1) ? debris[0] : (debris.slice(0, -1).join('') + '\u3000' + debris.slice(-1)[0]); // 拿掉多餘的空白，中間補為全形空白。
			h3.replaceChildren(createElement(['span', title]));
		}
		section.insertBefore(h3, section.firstChild);

		const divDepth = section.dataset.lerDepth = h3.className.slice(-1);
		for (let j = index - 1; j >= 0; --j) {
			const parentSection = list[j].parentNode;
			if (parentSection.dataset.lerDepth < divDepth) {
				parentSection.lastChild.append(section);
				break;
			}
		}
		if (!depths.includes(divDepth)) depths.push(divDepth);
	});
	const css = depths.map((depth, index) => {
		return `
			@media screen and (width < 992px) {
				.char-${depth} { top: ${index * height}px; }
				.char-${depth} ~ .LER-moj-div-body > .row > .col-no { top: ${(index + 1) * height}px; }
			}
			@media screen and (width >= 992px) {
				.char-${depth} { left: ${(index - depths.length) * 1.2}em; }
			}
		`;
	}).join('\n');
	document.head.appendChild(createElement(['style', css]));
});


/**** 函數 ****/

/**
 * 監聽 `div.line-*` 轉換完成的事件，加上 `<details>` 。
 * @param {Element} line
 *
 * 以監聽方式執行，就不用等到 `createElement` 跑完整頁才觸發。
 */
function addDetails(line) {
	line.addEventListener('lerParseEnd', () => {
		if (!$('[data-norge][href]', line)) return;
		const details = createElement(
			['details', {class: 'LER-article-groups'},
				['summary']
			]
		);
		line.append(details);
		details.addEventListener('toggle', embedArticles, {once: true});
	}, {once: true});
}

/**
 * 載入要嵌入的內容。
 * @param {MouseEvent} event
 */
function embedArticles(event) {
	const details = event.target;
	$$('[data-norge][href]', details.parentNode).forEach(anchor => {
		const loadingNode = createElement(['p', '讀取中…']);
		details.append(loadingNode);
		fetchDOM(anchor.href).then(doc => {
			const body = $('.law-reg', doc);
			if (!body) body = '找不到法條。';
			const section = createElement(
				['section',
					['header', {class: 'table-title'},
						...$$('.table-title td > *:not(.law-vaildMemo)', doc)
					],
					body
				]
			);
			$$('div[class|=line]', section).forEach(addDetails);
			LER.parseElement(section.lastChild, {defaultLaw: anchor.dataset.pcode});

			$$('[id]', section).forEach(elem => elem.removeAttribute('id'));
			loadingNode.replaceWith(section);
		});
	});
}
