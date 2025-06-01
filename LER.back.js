console.debug('LER.back.js');
globalThis.LER ||= {};
Object.assign(LER, (() => {

/**
 * @private
 * @member {Law[]} laws
 * @desc 所有法規，後續才讀取。
 */
let laws = [];

/**
 * @private
 * @member {string[]} excludeTerms
 * @desc 要跳脫匹配的詞彙們，如「大學法律系」
 */
let excludeTerms = [];

/**
 * @private
 * @member {ReplaceRule[]} replaceRules
 * @desc 置換規則們，動態建置。法規更新時會整個被替換掉，故用 let 宣告。
 */
let replaceRules = [];


/**
 * @func pcn
 * @desc Parse a Chinese numeral string into an integer.
 * @param {string} str
 * @returns {number|NaN}
 */
function pcn(str) {
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


/**
 * @private
 * @func applyReplaceRule
 * @desc 將字串依照規則拆開。
 * @param {string} string
 * @param {ReplaceRule} replaceRule
 * @returns {Fragment[]} 拆開後轉換成的物件們。
 *
 * 跟 `String#replaceAll` 的邏輯一樣，只是匹配到的子字串會被轉成物件。
 */
function applyReplaceRule(string, {pattern, replacer}) {
	// console.debug('LER.applyReplaceRule()');
	if (pattern instanceof RegExp && replacer instanceof Function) {
		console.assert(pattern.global);
		const debris = [], rei = string.matchAll(pattern);
		let match, pos = 0;
		while (match = rei.next().value) {
			debris.push(string.substring(pos, match.index));
			debris.push(replacer(match));
			pos = match.index + match[0].length;
		}
		debris.push(string.substring(pos));
		return debris;
	}
	console.assert(typeof pattern === "string" || typeof replacer !== "function");
	if (replacer instanceof Function) replacer = replacer(pattern);
	const debris = string.split(pattern);
	for (let i = debris.length - 1; i; --i)
		debris.splice(i, 0, replacer);
	return debris;
}


/**
 * @private
 * @param {Array} divArr
 * @returns {Array}
 */
function prepareArticleDivision(divArr) {
	return divArr.map(div => {
		if (div.table) return [li, {class: 'pre'}, div.table];
		const item = ['li', {}, ...div.text.split('\n').map(line => ['p', line])];

		// 計算縮排： ASCII 的話就半格，其他的就一格。
		let match;
		for (let re of articleDivisionDetectors) {
			if (match = div.text.match(re)) break;
		}
		if (match) {
			let indent = 0;
			const ordinal = match[0];
			for (let i = 0; i < ordinal.length; ++i)
				indent += (ordinal.charCodeAt(i) > 0xff) ? 1 : .5;
			item[1].style = `margin-left: ${indent}em; text-indent: -${indent}em`;
		}

		if (div.children) {
			item.push(
				['ol', {class: 'list-style-none'},
					...prepareArticleDivision(div.children)
				]
			);
		}
		if (div.postText) item.push(['p', div.postText]);
		return item;
	});
}


/**
 * @private
 * @const {RegExp[]}
 * @desc 判斷條文段落結構的表達式。
 */
const articleDivisionDetectors = [
	/^第([一二三四五六七八九十]+)類：/,
	/^[一二三四五六七八九十]+[\u3000、]/,
	/^[(（][一二三四五六七八九十]+(）|\)\s?)/,
	/^\d+[\x20\x2e]/,
	/[\u2460-\u2473]/, // Cicled Digits 1~20
	/[\u2776-\u277f]/, // Dingbat Negative Circled Digits 1~10
];

/**
 * @private
 * @const {Object.<string, RegExp>}
 * @desc 動態規則的比對用表達式，需注意括號的順序。
 */
const regexps = {
	number: "([〇\\d零一二三四五六七八九０１２３４５６７８９十百千]+)",

	/// 「第5-3條」、「第5條之3」
	artMain: "第\\s*number(\\s*[之\-]\\s*number)?\\s*條(\\s*之\\s*number)?(\\s*[前後]段|\\s*但書)?",

	// 土地法第2條第1項、所得稅法第14條第1項有「類」。
	paraCat: "\\s*第\\s*number\\s*項(\\s*[前後]段|\\s*但書|\\s*第\\s*number\\s*類)?",

	// 所得稅法§17-3提到「第三目第三小目」，§17-4提到「第二目之一」
	// secItem: "\\s*第\\s*number\\s*款(\\s*[前後]段|\\s*但書)?(\\s*第\\s*number\\s*目)?",
	secItem: "\\s*第\\s*number\\s*款(\\s*[前後]段|\\s*但書)?(\\s*第\\s*number\\s*目(\\s*[前後]段|\\s*但書|\\s*之\\s*number|\\s*第\\s*number\\s*小目)?)?",

	// 有項才能有類，無項亦能有款，有款才能有目。
	article: "artMain(paraCat)?(secItem)?",
	articles: "article(\\s*[至到,、及或和與]\\s*(article|(第\\s*number\\s*[項款目])+))*",

	jyi: "第?number號?",
	jyis: "((司法院)?(大法官)?釋字)jyi([,、及]jyi)*",

	consDecision: "憲法法庭\\s*number\\s*(年度?)?\\s*([\\u4E00-\\u5b56\\u5b58-\\u9FFF]+)字?第?number號?(裁定|判決)?"
};
Object.keys(regexps).forEach((key, i, keys) => {
	for (let j = i - 1; j >= 0; --j)
		regexps[key] = regexps[key].replace(new RegExp(keys[j], "g"), regexps[keys[j]]);
});
for (let key in regexps) regexps[key] = new RegExp(regexps[key], "g");


/**
 * @private
 * @const {ReplaceRule[]}
 * @desc 動態（需要判斷並轉換數字）的置換規則們。
 */
const dynamicRules = [
	{
		pattern: regexps.jyis,
		position: "after",
		replacer: match => {
			const r = {type: "jyis", text: match[0]};
			r.jyis = [...match[0].matchAll(regexps.jyi)]
				.map(mJYI => ({
					number: pcn(mJYI[1]),
					start: mJYI.index,
					end: mJYI.index + mJYI[0].length
				}))
			;
			return r;
		}
	},
	{
		pattern: regexps.articles,
		position: "after",
		replacer: match => {
			const r = {
				type: "articles",
				text: match[0]
			}
			const andList = match[0].split(/[,、及或和與]/g);
			r.norge = andList.reduce((acc, and) => {
				const articles = [...and.matchAll(regexps.artMain)];
				switch (articles.length) {
					case 0: return acc;
					case 1: {
						let number = pcn(articles[0][1]);
						if (articles[0][2]) number += "." + pcn(articles[0][3]);
						if (articles[0][4]) number += "." + pcn(articles[0][5]);
						acc.push(number);
						return acc;
					}
					case 2: {
						const range = articles.map(a => {
							let number = pcn(a[1]);
							if (a[2]) number += "." + pcn(a[3]);
							if (a[4]) number += "." + pcn(a[5]);
							return number;
						});
						acc.push(range.join("-"));
						return acc;
					}
					default:
						console.error(articles); // too many articles
				}
			}, []).join(",");
			return r;
		}
	},
	{
		pattern: regexps.consDecision,
		position: "before",
		replacer: match => {
			return {
				type: "consDecision",
				text: match[0],
				year: match[1],
				word: match[3],
				number: match[4]
			};
		}
	}
];


return { /// todo: 「更新規則」是 LER.back.js 的事，跟下載全部綁在一起好了。這邊完全不用管 storage

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
	 * @public
	 * @func downloadMain
	 * @desc Download law index, aliases, and exclude terms; then parse them into private members and return them.
	 * @param {string} [knownDate] - Used to skip checking `remoteDate` when already known.
	 * @returns {Object}
	 */
	async downloadMain(knownDate) {
		const [remoteDate, lawDict, aliases, terms] = await Promise.all([
			knownDate || LER.fetch('https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/UpdateDate.txt', 'text'),
			LER.fetch('https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/ch/index.json', 'json'),
			LER.fetch('https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/aliases.json', 'json'),
			LER.fetch('https://cdn.jsdelivr.net/gh/g0v/laweasyread-front/data/exclude_terms.txt', 'text')
		]);
		laws = [];
		for (const [pcode, name] of Object.entries(lawDict)) {
			const law = {pcode, name};
			if (aliases[pcode]) law.aliases = aliases[pcode];
			laws.push(law);
		}
		excludeTerms = terms.split('\n').filter(x => x);
		return {remoteDate, laws, excludeTerms};
	},


	/**
	 * @public
	 * @func getMain
	 * @returns {Promise.<Object>}
	 * @desc overwritten in `browser/background.js` for WebExtension to cooperate with version control
	 */
	async getMain() {
		if (laws.length) return {laws, excludeTerms};
		return LER.downloadMain();
	},


	/**
	 * @func loadRules
	 * @desc 讀取置換規則。法規名稱與排除名單必須混在一起排列，否則「國民法官法」和「國民法官法庭」至少其一會被錯判。
	 * @param {Object[]} laws
	 * @returns {Promise.<ReplaceRule[]>} 置換規則陣列。
	 */
	async loadRules(laws) {
		if (replaceRules.length) return replaceRules;

		replaceRules = laws
		.reduce((acc, {pcode, name, aliases}) => {
			acc.push({
				pattern: name,
				replacer: {type: "law", text: name, pcode}
			});
			aliases?.forEach(alias => acc.push({
				pattern: alias,
				replacer: {type: "law", text: alias, pcode, title: name}
			}));
			return acc;
		}, [])
		.concat(exTerms.map(text => ({
			pattern: text,
			replacer: {type: "exclude", text}
		})))
		.sort((a, b) => b.pattern.length - a.pattern.length)

		replaceRules =
			dynamicRules.filter(dr => dr.position === "before")
			.concat(replaceRules)
			.concat(dynamicRules.filter(dr => dr.position === "after"))
		;
		return replaceRules;
	},

	/**
	 * @func parseString
	 * @desc 將字串轉換成可建立成 HTML 元素的物件列表。
	 * @param {Object} request
	 * @param {string} request.string
	 * @param {boolean} [request.allowLink=true]
	 * @param {Object} [defaultLaw]
	 * @returns {JsonML[]}
	 */
	parseString({string, allowLink = true, articleNumberFormat, defaultLaw}) {
		let arr = [string];
		for (let rule of replaceRules) {
			arr = arr.flatMap(item => {
				if (typeof item === 'string' && item.length >= (rule.pattern.length ?? 3))
					return applyReplaceRule(item, rule).filter(x => x);
				return item;
			});
		}

		return arr.map((item, index) => {
			if (typeof item === 'string') return item;
			switch (item.type) {
				case 'law': {
					const jsml = ['span', {data: {pcode: item.pcode}}, item.text];
					if (allowLink) {
						jsml[0] = 'a';
						jsml[1].href = `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${item.pcode}`;
					}
					if (item.title) jsml[1].title = item.title;
					return jsml;
				}
				case 'articles': {
					const jsml = ['span', {data: {norge: item.norge}}, item.text];
					// 確認所屬法規：若前一個元件是法規名，則使用之；若否，則看是否有預設法規。 //todo: 本法、本條例、母法
					let pcode = arr[index - 1]?.[1]?.data?.pcode;
					if (!pcode && defaultLaw) {
						pcode = defaultLaw.pcode ??
							(/^[A-Z]\d{7}$/.test(defaultLaw) ? defaultLaw : laws.find(law => law.name === defaultLaw)?.pcode)
						;
					}
					if (pcode) {
						jsml[1].data.pcode = pcode;
						if (allowLink) {
							jsml[0] = 'a';
							jsml[1].href = `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=${pcode}&norge=${item.norge}`;
						}
					}
					// 條號格式
					if (articleNumberFormat !== 'unchanged') {
						jsml[1].data.originText = cur.text;
						let formatted = cur.text.replace(/[０零一二三四五六七八九十百千]+/g, m => ` ${pcn(m)} `);
						if (articleNumberFormat === 'hyphen') formatted = formatted
							.replace(/第\s*(\d+)\s*條之\s*(\d+)\x20*/g, (m, m1, m2) => `第 ${m1}-${m2} 條`)
							.replace(/第\s*(\d+)\s*之\s*(\d+)\s*條/g, (m, m1, m2) => `第 ${m1}-${m2} 條`)
						;
						jsml[2] = formatted;
					}
					return jsml;
				}
				case 'jyis': {
					/**
					 * 若只提到一個釋字，則整個字串（包含「釋字」二字）都是連結；
					 * 若提到多個釋字，則「釋字」二字不宜有連結，而是數字有各自的連結。
					 */
					const jsml = ['span', {data: {}}];
					if (item.jyis.length === 1) {
						const jyino = jsml[1].data.jyi = item.jyis[0].number;
						if (articleNumberFormat !== 'unchanged') {
							jsml[1].data.originText = item.text;
							jsml[2] = item.text.replace(/\s*[０零一二三四五六七八九十百千]+\s*/g, m => ` ${pcn(m)} `);
						}
						if (allowLink) {
							jsml[0] = 'a';
							jsml[1].href = `http://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${jyino}`;
						}
					}
					else {
						item.jyis.forEach((jyi, index) => {
							const pretext = item.text.substring(
								item.jyis[index - 1]?.end ?? 0,
								jyi.start
							);
							if (pretext) jsml.push(pretext);
							const child = ['span', {data: {jyi: jyi.number}}, cur.text.substring(jyi.start, jyi.end)];
							if (articleNumberFormat !== 'unchanged') {
								child[1].data.originText = child[2];
								child[2] = child[2].replace(/\s*[０零一二三四五六七八九十百千]+\s*/g, m => ` ${pcn(m)} `);
							}
							if (allowLink) {
								child[0] = 'a';
								child[1].href = `http://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${jyi.number}`;
							}
							jsml.push(child);
						});
						const posttext = item.text.substring(item.jyis.pop().end);
						if (posttext) jsml.push(posttext);
					}
					return jsml;
				}
				case 'consDecision': {
					const {year, word, number, text} = item;
					const jsml = ['span', {data: {year, word, number}}, text];
					if (allowLink) {
						jsml[0] = 'a';
						jsml[1].href = `https://cons.judicial.gov.tw/docredirect.aspx?type=2&year=${year}&word=${word}&no=${number}`;
					}
					return jsml;
				}
				case 'exclude': {
					return item.text;
				}
				default: throw new TypeError('Unknown type: ' + JSON.stringify(value));
			}
		});
	},


	/**
	 * @func preparePopup
	 * @desc 讀取並整理資料，準備建立彈出式視窗。
	 * @param {DOMStringMap} dataset
	 * @returns {Promise.<Object>} {headers, bodyParts, defaultLaw}
	 */
	async preparePopup({jyi, pcode, norge, year, word, number}) {
		let headers = [], bodyParts = [], defaultLaw;
		if (jyi) {
			jyi = await fetchJSON(`https://cdn.jsdelivr.net/gh/kong0107/jyi/json/${jyi}.json`);
			headers = [
				`釋字第 ${jyi.number} 號 `,
				['time', jyi.date]
			];

			if (jyi.title) bodyParts.push(['dd', jyi.title]);
			if (jyi.issue) bodyParts.push(
				['dt', '爭點'],
				['dd', ...jyi.issue.split('\n').map(para => ['p', para])]
			);
			bodyParts.push(
				['dt', '解釋文'],
				['dd',
					['ol', {class: 'list-style-decimal'},
						...jyi.holding.split('\n').map(para => ['li', para.trim()])
					]
				]
			);
			if (jyi.reasoning) bodyParts.push(
				['dt', '理由書'],
				['dd',
					['ol', {class: 'list-style-decimal'},
						...jyi.reasoning.split('\n').map(para => ['li', para.trim()])
					]
				]
			);
		}
		else if (pcode) {
			const law = await fetchJSON(`https://cdn.jsdelivr.net/gh/kong0107/mojLawSplitJSON@arranged/ch/${pcode}.json`, {cache: "no-cache"});

			headers = [
				law.name + ' ',
				['time', law.LawModifiedDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')]
			];
			if (law.discarded) headers.splice(1, 0,
				['span', {class: 'LER-badge-discard'}, '已廢止']
			);

			if (norge) {
				/// "3.1-5,7.1" => [[301, 500], [701]]
				const ranges = norge.split(",").map(range => {
					return range.split("-").map(articleNumber => {
						const numbers = articleNumber.split(".").map(s => parseInt(s));
						return numbers[0] * 100 + (numbers[1] || 0);
					});
				});
				const articles = law.articles.filter(({number}) =>
					ranges.some(([start, end]) => end
						? (number >= start && number <= end)
						: (start === number)
					)
				);
				articles.forEach(({number, content}) => {
					const aug = number % 100;
					number = Math.floor(number / 100).toString() + (aug ? `-${aug}` : '');
					bodyParts.push(
						['dt', `第 ${number} 條`],
						['dd',
							['ol', {class: (content.length > 1) ? 'list-style-upper-roman' : 'list-style-circle'},
								...prepareArticleDivision(content)
							]
						]
					);
				});
			}
			else {
				const items = law.category.map(c =>
					['li', {style: 'margin-right: 1em;'}, c]
				);
				bodyParts.push(
					['dt', '類別'],
					['dd',
						['ul', {class: 'list-style-none d-flex'}, ...items]
					]
				);

				if (law.foreword) bodyParts.push(
					['dt', '前言'],
					['dd', law.foreword]
				);

				const lastNumber = law.articles[law.articles.length - 1].number / 100;
				const deletedAmount = law.articles.filter(a => a.content.length === 1 && a.content[0].text === "（刪除）").length;
				bodyParts.push(
					['dt', '條文數'],
					['dd', `共 ${law.articles.length.toString()} 條；其中 ${deletedAmount} 條被刪除；最末條為第 ${lastNumber} 條。`]
				);

				if (law.LawEffectiveNote) bodyParts.push(
					['dt', '生效內容'],
					['dd', ...law.LawEffectiveNote.split('\r\n').map(n => ['p', n])]
				);
				if (law.histories) bodyParts.push(
					['dt', '沿革'],
					['dd', ...law.histories.map(his => ['p', his])]
				);
			}

			defaultLaw = {pcode, name: law.name};
		}
		else if (year && word && number) {
			const decision = await fetchJSON(`https://cdn.jsdelivr.net/gh/kong0107/cons.judicial/docket/${year}/${word}/${number}.json`);
			headers = [
				`${year}年 ${word}字 第${number}號 ${decision['類型'].slice(-2)}`,
				['time', decision['判決日期']]
			];

			bodyParts.push(['dd', `原 ${decision['原分案號']}`]);
			if (decision['標題']) bodyParts.push(['dd', decision['標題']]);

			bodyParts.push(
				['dt', '案由'],
				['dd', decision['案由']],

				['dt', '主文'],
				['dd',
					['ol', {class: 'list-style-decimal'},
						...decision['主文'].map(para => ['li', para])
					]
				],

				['dt', '理由'],
				['dd',
					['ol', {class: 'list-style-decimal'},
						...decision['理由'].map(para => ['li', para])
					]
				]
			);
		}
		return {headers, bodyParts, defaultLaw};
	}

};

})());

