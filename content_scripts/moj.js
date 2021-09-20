"use strict";
(() => {
const start = new Date();

/**
 * 設定預設法規。
 */
const params = new URLSearchParams(location.search);
const pcode = params.get("pcode");
if(pcode) LER.loadLaws.then(() =>
    LER.defaultLaw = LER.getLaw({PCode: pcode})
);

/**
 * 將編章節（及各自後接的條文們）重新調整為巢狀結構，並計算 sticky 的 top 值。
 */
const height = 36;
const depths = [];
document.querySelectorAll(".law-reg-content .h3").forEach((h3Elem, index, list) => {
    const section = document.createElement("section");
    while(h3Elem.nextElementSibling && h3Elem.nextElementSibling.className === "row")
        section.appendChild(h3Elem.nextElementSibling);
    h3Elem.parentNode.replaceChild(section, h3Elem);
    section.insertBefore(h3Elem, section.firstChild);

    const divDepth = section.dataset.lerDepth = h3Elem.className.substr(-1);
    for(let j = index - 1; j >= 0; --j) {
        const parentSection = list[j].parentNode;
        if(parentSection.dataset.lerDepth < divDepth) {
            parentSection.appendChild(section);
            break;
        }
    }
    if(depths.indexOf(divDepth) === -1) depths.push(divDepth);
});
const css = depths.map((depth, index) => {
    return `
        .char-${depth} { top: ${index*height}px; }
        .char-${depth} ~ .row > .col-no { top: ${(index+1)*height}px; }
    `;
}).join("\n");
document.head.appendChild(
    domCrawler.createElement("style", {type: "text/css"}, css)
);


console.log("`moj.js` ran " + ((new Date()) - start) + " ms.");
})();