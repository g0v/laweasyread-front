"use strict";
// 參考 https://github.com/g0v/laweasyread-front/blob/master/ly.js

/**
 * 這邊跟 lawtext2obj 很像，但其實空格排版的機制不同。
 */
const stratumRE = [
    /^(?! )/,
    /^第[一二三四五六七八九十]+類：/,          // 所得稅法第14條第1項
    /^[一二三四五六七八九十]+(、|　|  )/,  // 憲法裡的「款」有些是全形空格，有些是兩個半形空格
    /^[\(（][一二三四五六七八九十]+[\)）]/, // 有些括號是全形，有些是半形
    /^\d+\./,
    /^[\(（]\d+[\)）]/
];
const getStratum = text => {
    for(let i = stratumRE.length - 1; i >= 0; --i)
        if(stratumRE[i].test(text)) return i;
    return -1;
};

const start = new Date;
document.querySelectorAll("td").forEach(td => {
    if(!td.hasChildNodes() || !td.firstChild.textContent.startsWith("\n　　")) return;

    let warning = false;
    let paras = []; // 每一行文字，即各項款目
    let others = []; // 原本頁面中有、不打算處理但仍要保留的元件

    td.childNodes.forEach(child => {
        /**
         * 如果是文字，那就是法條的一個項/款/目，先集中起來再做分層；
         * 如果是其他，那就集中起來最後一起挪到最後。（已知的其實只有「相關條文」的圖鈕）
         */
        if(child.nodeType == 3) {
            const text = child.textContent.trim();
            if(!text) return;
            const stratum = getStratum(text);
            if(stratum == 1) warning = true; // 標示所得稅法第14條
            paras.push({
                text: text,
                stratum: stratum,
                children: []
            });
            return;
        }
        if(child.nodeName == "BR") return;
        others.push(child);
    });

    if(warning) return; // 如果是所得稅法第14條，就先不處理…

    td.replaceWith(domCrawler.createElement("td", null,
        LER.createList(lawtext2obj.arr2nested(paras)),
        ...others
    ));
});
console.log("Parse lines to ULs: " + ((new Date) - start) + " ms.");