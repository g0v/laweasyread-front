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
 * 官方原始頁面結構：
    <tr>
        <td class="tab_content">
            <div class="htmlcontent">一般 HTML 顯示的裁判書，較新的才會有。</div>
            <div class="text-pre text-pre-in">用換行字元進行排版的裁判書（較舊的才會有），以及 HTML 註解</div>
        </td>
        <td class="tab_linenu">
            <div class="text-pre text-pre-in">行號，較舊的才會有。</div>
        </td>
    </tr>

 * 處理邏輯：
 * 將 `div.text-pre` 裡的內容，每一行用一個 inline 容器包起來，再依序塞進 `div.htmlcontent` 裡頭。
 */

kongUtil.use('$');
const container = $('div.text-pre');

const lines =
    [...(container?.childNodes || [])]
    .reduce((lines, node) => {
        let debris = node.textContent.split('\n');
        if(node.nodeType === Node.ELEMENT_NODE) {
            debris = debris.map(d => {
                const elem = node.cloneNode(true);
                elem.removeAttribute("id");
                elem.textContent = d;
                return elem;
            });
        }
        else if(node.nodeType !== Node.TEXT_NODE) return lines;

        lines[lines.length - 1].push(debris.shift());
        lines.push(...debris.filter(d => d).map(d => [d]));
        return lines;
    }, [[]])
;
// logger()("lines", lines);

const listMarkerDetectors = [
    /^[壹貳參肆伍陸柒捌玖拾]+、/,
    /^[一二三四五六七八九十]+、/,
    /^[甲乙丙丁戊己庚辛壬癸]、/,
    /^[子丑寅卯辰巳午未申酉戌亥]、/,
    /^\d+\.\s*/,
    /^[A-Z]\.\s*/,
    /^[\u3220-\u3229]/,
    /^[\u3280-\u3289]/,
];

let isHead = true, isFoot = false;
const paras = lines.reduce((paras, leafNodes, lineIndex) => {
    if(!leafNodes.length) return paras;
    const line =
        ['span', {
                class: 'LER-origin-line',
                data: {lineNumber: (lineIndex + 1).toString()}
            },
            ...leafNodes
        ]
    ;

    // console.log(line);
    const plain = (leafNodes[0].textContent || leafNodes[0]).replaceAll(/\s/g, '');
    isFoot = isFoot ||
        /^中華民國\s*[一二三四五六七八九十百]+\s*年\s*[一二三四五六七八九十]+\s*月\s*[一二三四五六七八九十]+\s*日$/.test(plain)
    ;

    if(['主文', '事實', '理由', '事實及理由'].includes(plain)) {
        isHead = false;
        paras.push(['div', {class: 'he-h3'}, line]);
    }
    else if(isHead || isFoot) paras.push(['div', line]);
    else {
        if(leafNodes.some(text => /[\u2500-\u257F]/.test?.(text))) {
            paras.push(['div', line]);
            return paras;
        }

        const startingSpaces = (leafNodes[0].textContent || leafNodes[0]).match(/^\s*/)[0];
        const padding = startingSpaces.split('').reduce((length, char) => length + (char === '\u3000' ? 1 : .5), 0);
        let indent = 0;
        for(let d of listMarkerDetectors) {
            const match = plain.match(d);
            if(match) {
                indent = match[0].split('').reduce((length, char) => {
                    return length + (/[\w\.\x20]/.test(char) ? .5 : 1);
                }, 0);
                break;
            }
        }
        if(indent) paras.push(
            ['div',
                {style: `padding-left: ${padding+indent}em; text-indent: -${indent}em`},
                line
            ]
        );
        else {
            const lastPara = paras[paras.length - 1];
            const lastLine = lastPara[lastPara.length - 1];
            const lastNode = lastLine[lastLine.length - 1];
            if((padding || !lastNode.endsWith('。'))
                && (paras[paras.length - 1][1].class !== 'pre')
                && (lastPara.class !== 'he-h3')
            ) {
                // 加入前一段
                if(typeof leafNodes[0] === 'string') leafNodes[0] = leafNodes[0].trimStart();
                const lastLeaf = leafNodes[leafNodes.length - 1];
                if(typeof lastLeaf === "string") leafNodes[leafNodes.length - 1] = lastLeaf.trimEnd();
                lastPara.push(line);
            }
            else paras.push(
                ['div', {style: `padding-left: ${padding}em`}, line]
            );
        }
    }
    return paras;
}, []);
console.debug(paras);

if(container) {
    container.textContent = "";
    $('.tab_linenu').textContent = '';
    $('.htmlcontent').append(...paras.map(kongUtil.createElementFromJsonML));
    $('.htmlcontent').style.width = null;
    // $('.jud_content table').replaceWith($('.htmlcontent'));
}


/**
 * Structure example, not necesary to execute.
 */
/** @const lines */
[
    ["texttext"],
    ["texttext", HTMLElement, "texttext"]
]

/** @const paras */
[
    {div: {
        class: "LER-judicial-para",
        style: {
            paddingLeft: "-3em",
            textIndent: "3em"
        },
        $: [
            {span: {
                class: "LER-origin-line",
                data: {lineNumber: 10},
                $: [
                    "aaaa",
                    {abbr: "termmmm"}
                ]
            }},
            {span: {
                class: "LER-origin-line",
                data: {lineNumber: 11},
                $: [
                    {abbr: "termmmm"},
                    "bbb"
                ]
            }}
        ]
    }}
]

// 未來規劃
/** @const blocks */
{div: {$: [
    {header: {$: [
        {div: {
            class: "he-h1",
            "aria-label": "裁判標題"
        }},
        {div: {
            class: "",
            "aria-label": "裁判字號"
        }},
        {div: {
            class: "",
            "aria-label": "當事人列表"
        }},
        {div: {
            "aria-label": "foreword",
            // text: "上列當事人…"
        }},
    ]}},
    {div: {
        class: "LER-judicial-main",
        $: [
            {section: {
                "aria-label": "主文",
                $: [
                    {header: {
                        class: "he-h3"

                    }}
                ]
            }}
        ]
    }},
    {footer: {$: [
        {time: {
            class: "d-block",
            "aria-label": "裁判日期"
        }},
        {div: {
            "aria-label": "法官、司法事務官列表"
        }},
        {div: {
            "arial-label": "afterword",
            // text: "與原本無異。如不服…"
        }},
        {time: {
            class: "d-block",
            "aria-label": "裁判書作成日期"
        }},
        {div: {
            "aria-label": "書記官署名"
        }}
    ]}},
    {section: {
        class: "LER-judicial-appendix",
        "aria-label": "附錄"
    }}
]}}
