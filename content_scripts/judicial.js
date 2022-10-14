const container = $("td.tab_content div.text-pre");

const lines =
    [...(container?.childNodes || [])]
    .reduce((lines, node) => {
        let debris = node.textContent.split("\n");
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
        lines.push(...debris.map(d => [d]));
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

let isHead = true;
const paras = lines.reduce((paras, leafNodes, lineIndex) => {
    const line =
        {span: {
            class: "LER-origin-line",
            data: {lineNumber: (lineIndex + 1).toString()},
            $: leafNodes
        }}
    ;
    // console.log(line);
    const plain = (leafNodes[0].textContent || leafNodes[0]).replaceAll(/\s/g, "");
    if(["主文", "事實", "理由"].includes(plain)) {
        isHead = false;
        paras.push(
            {div: {
                class: "he-h3",
                $: [line]
            }}
        );
    }
    else if(isHead) {
        paras.push({div: {$: [line]}});
    }
    else {
        if(line.span.$.some(text => /[\u2500-\u257F]/.test(text))) {
            paras.push(
                {div: {
                    class: "", // text-nowrap
                    $: [line]
                }}
            );
            return paras;
        }


        const startingSpaces = (leafNodes[0].textContent || leafNodes[0]).match(/^\s*/)[0];
        const padding = startingSpaces.split("").reduce((length, char) => length + (char === "\u3000" ? 1 : .5), 0);
        let indent = 0;
        for(let d of listMarkerDetectors) {
            const match = plain.match(d);
            if(match) {
                indent = match[0].split("").reduce((length, char) => {
                    return length + (/[\w\.\x20]/.test(char) ? .5 : 1);
                }, 0);
                break;
            }
        }
        if(indent) {
            paras.push(
                {div: {
                    style: `padding-left: ${padding+indent}em; text-indent: -${indent}em`,
                    $: [line]
                }}
            );
        }
        else {
            const inLastPara = paras[paras.length - 1].div.$;
            const inLastLine = inLastPara[inLastPara.length - 1].span.$;
            const lastNode = inLastLine[inLastLine.length - 1];
            if((padding || !(lastNode.textContent || lastNode).match(/[。：]$/))
                && (paras[paras.length - 1].div.class !== "pre")
            ) {
                inLastPara.push(line);
            }
            else {
                paras.push(
                    {div: {
                        style: `padding-left: ${padding}em`,
                        $: [line]
                    }}

                );
            }
        }
    }
    return paras;
}, []);
// logger()("paras", paras);


// if(container) {
//     container.textContent = "";
//     container.append(...paras.map(createElement));
// }


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
    {section: {
        class: "LER-judicial-section",
        title: "理由",
        $: [
            {header: {
                class: "LER-judicial-para",
                $: [
                    {span: {
                        class: "LER-origin-line",
                        data: {lineNumber: 9},
                        $: ["理由"]
                    }}
                ]
            }},
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
    }}
]
