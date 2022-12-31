/**
 * 處理「以換行排版的裁判書」
 *
 * 由於官方有對法律用語關鍵字加上連結，故關於「換行」的判斷會比較麻煩：
 * 原本的 DOM 裡，換行只是個字元， `div.text-pre` 是由文字節點和 <abbr> 穿插而成的。
 * 而換行字元可能出現在每一個文字節點（包含 <abbr> 內部）裡頭。
 *
 * 先把每一行（'\n' 為界）裡頭原有的東西建成一個陣列。
 * * 多數情形下，是一個陣列（代表一行）裡面只有一個元素，該元素為字串。
 * * 若是那一行中間有關鍵詞 <abbr /> ，則那一行轉換成的陣列至少會有二個元素。
 * * 若剛好在關鍵詞裡換行，則必須在兩個陣列創建各別的 <abbr /> 。
 *
 * 官方原始頁面結構（元素都會在，但未必有內容）：
    <tr>
        <td class="tab_content">
            <div class="htmlcontent">一般 HTML 顯示的裁判書，較新的才會有內容。</div>
            <div class="text-pre text-pre-in">用換行字元進行排版的裁判書（較舊的才會有），以及 HTML 註解</div>
        </td>
        <td class="tab_linenu">
            <div class="text-pre text-pre-in">行號，較新的才可能有內容。</div>
        </td>
    </tr>

 *
 * 裁判書內容可分為三大區：
 * 1. 頭：
 *    1.1. 標題
 *    1.2. 案號（可能有多個）
 *    1.3. 當事人及關係人列表（可能有地址）
 *    1.4. 前言（上／左列當事人間XXXXXX事件…）
 * 2. 身：
 *    2.1. 主文。未必會出現「主文」二字，例如支付命令即直接分一二三
 *    2.2. 事實、理由、事實及理由
 * 3. 尾：
 *    3.1. 宣判日
 *    3.2. 庭別、法官列表；或司法事務官署名
 *    3.4. 書記官註記
 *         3.4.1. 「以上正本證明與原本無異。」
 *         3.4.2. 救濟說明
 *         3.4.3. 書記官署名
 *    3.5. 裁判正本做成日
 *    3.6. 附錄
 *         3.6.1. 刑事案件論罪條文
 *         3.6.2. 各附表；可能是文字排版，也可能是 <table>
 *
 * 本專案原則上只處理「身」，不管頭尾。但還是需要一些方法去判斷哪裡是頭／尾。
 *
 * 處理邏輯：
 * 1. 若 .tab_content .text-pre 沒東西，就不處理。
 * 2. 將 `div.text-pre` 裡的內容，每一行用一個 inline 容器包起來。
 * 3. 把整個 <table> 拿掉，換成
 *    <div class="htmlcontent">
 *      <header></header>
 *      <main></main>
 *      <footer></footer>
 *    </div>
 *
 */

kongUtil.use('$');

const source = $('div.text-pre');
const target = $('.htmlcontent');
const [header, main, footer] = ['header', 'main', 'footer'].map(tag => [tag, {}]);

const lines =
    [...(source?.childNodes || [])]
    .reduce((lines, node) => {
        // 每個 node 以換行字元切開後，第一個碎片（包含空字串）塞進前一行的結尾，其他的碎片各成一行（包含最後一份）。
        let debris = node.textContent.split('\n');
        switch(node.nodeType) {
            case Node.ELEMENT_NODE: {
                // 若是 element 且裡面有換行，那就要做兩個該元件，塞進不同行裡；否則就用原本的元件。
                if(debris.length === 1) debris = [node];
                else debris = debris.map(d => {
                    const elem = node.cloneNode(true);
                    elem.removeAttribute("id");
                    elem.textContent = d.trim();
                    return elem;
                });
                break;
            }
            case Node.TEXT_NODE: break;
            default: return lines; // 例如 Node.COMMENT_NODE
        }

        lines[lines.length - 1].push(debris.shift());
        lines.push(...debris.map(d => [d]));
        return lines;
    }, [[]])
;
while(lines.length && !lines[lines.length - 1].some(x => x)) lines.pop(); // 拿掉最後面的多個空白行
// console.debug(lines);

const listMarkerDetectors = [
    /^[壹貳參肆伍陸柒捌玖拾]+、/,
    /^[一二三四五六七八九十]+、/,
    /^[甲乙丙丁戊己庚辛壬癸]、/,
    /^[子丑寅卯辰巳午未申酉戌亥]、/,
    /^\d+\.\s?/,
    /^[A-Z]\.\s?/,
    /^[(（][一二三四五六七八九十]+[）)]/,
    /^\(\d+\.\)\s?/,
    /^\([A-Z]\.\)\s?/,
    /^[\u3220-\u3229]/,
    /^[\u3280-\u3289]/,
    /^[\u2488-\u249B]/,
];

let isHead = true, isFoot = false;
lines.forEach((line, lineIndex) => {
    const span = ['span', {'data-line-number': lineIndex + 1}, ...line];
    if(typeof line[0] === 'string') span[2] = line[0].trimStart();

    if(isHead) {
        header.push(['div', {}, span]);
        const lastLeaf = line[line.length - 1];
        if(typeof lastLeaf === 'string' && /如[左下]：$/.test(lastLeaf)) {
            isHead = false;
        }
        else if(lineIndex && line.length === 1) {
            const prev = lines[lineIndex - 1];
            const lastNode = prev[prev.length - 1];
            if(typeof lastNode === 'string')
                isHead = !/如[左下]：$/.test(lastNode + line[0]);
        }
        return;
    }

    const plain = line.map(n => n?.textContent ?? n).join('').replaceAll(/\s/g, '');
    isFoot = isFoot || /^中華民國[\d一二三四五六七八九十百]+年[\d一二三四五六七八九十]+月[\d一二三四五六七八九十]+日$/.test(plain);
    if(isFoot) return footer.push(['div', {}, span]);

    if(['主文', '事實', '理由', '事實及理由'].includes(plain))
        return main.push(['div', {class: 'he-h3'}, span]);

    // 用於後續各判斷
    const lastPara = main[main.length - 1];

    // 判斷是否為新段落
    let isNewPara = true;
    if(lineIndex && lastPara[1].class !== 'he-h3') {
        const prev = lines[lineIndex - 1];
        const lastNode = prev[prev.length - 1];
        isNewPara = (typeof lastNode === 'string') && /[。：]$/.test(lastNode);
    }

    // 偵測縮排
    let padding = 0, indent = 0;
    if(isNewPara) {
        for(let i = 0; i < line[0].length; ++i) {
            const c = line[0].charCodeAt(i);
            if(c === 0x20) padding += .5;
            else if(c === 0x3000) padding += 1;
            else break;
        }

        for(let d of listMarkerDetectors) {
            const match = plain.match(d);
            if(match) {
                for(let i = 0; i < match[0].length; ++i) {
                    const c = match[0].charCodeAt(i);
                    indent += (c < 0x100) ? .5 : 1;
                }
                break;
            }
        }
    }

    // 某些情形下，推測為其實並非新段落。
    if(padding && !indent && lastPara
        && lastPara[1].style?.includes(`padding-left: ${padding}em`)
    ) isNewPara = false;

    if(isNewPara) main.push(
        ['div',
            {style: `padding-left: ${padding+indent}em; text-indent: -${indent}em;`},
            span
        ]
    );
    else lastPara.push(span);
});
console.debug(header, main, footer);


if(target) target.style.cssText = ''; // 緣由參閱 CSS 檔內註解
if(lines.length) {
    target.replaceChildren(
        ...[header, main, footer].map(kongUtil.createElementFromJsonML)
    );
    $('div.col-td.jud_content').replaceChildren(target);
}


/**
 * 針對搜尋結果的內嵌判決書，要重新設定調整 iframe 的高度。
 */
if($('iframe')) $('iframe').style.height =
    $('iframe').contentDocument.body.offsetHeight + 'px';



/**
 * Structure example, not necesary to execute.
 */
/** @const lines */
[
    ["texttext"],
    ["texttext", HTMLElement, "texttext"]
]

/** @const main */
["main", {},
    ["div", {"class": "he-h3"},
        ["span", {"data-line-number": 10}, "事實及理由"]
    ],
    ["div", {"style": "padding-left: 2em; text-indent: -2em;"},
        ["span", {"data-line-number": 11}, "一、第十一行第十一行第十一行"],
        ["span", {"data-line-number": 12}, "第十二行第十二行第十二行"],
        ["span", {"data-line-number": 13}, "第十三行第十三行第十三行"]
    ],
    ["div", {"style": "padding-left: 2em; text-indent: -2em;"},
        ["span", {"data-line-number": 14}, "二、第十四行第十四行第十四行"],
        ["span", {"data-line-number": 15}, "第十五行第十五行第十五行"],
        ["span", {"data-line-number": 16}, "第十六行第十六行第十六行"]
    ]
]
