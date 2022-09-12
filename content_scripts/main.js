kongUtil.use();

browser.runtime.onMessage.addListener(({command}) => {
    switch(command) {
        case "parseDocument":
            return parseElement(document.body);
        default:
            console.error("unknown command");
    }
});

getData("autoParse").then(autoParse => {
    if(autoParse) parseElement(document.body);
});


/**
 * @func parseElement
 * @desc 轉換指定的元素。
 * @param {Element} element
 * @returns {Promise}
 */
// const createElement = jsml => kongUtil.createElement(jsml);
function parseElement(element = document.body) {
    const textNodes = getTextNodes(
        element,
        node => /[\u4E00-\u9FFF]{2}/.test(node.textContent),
        "BUTTON,CODE,SCRIPT,SELECT,STYLE,TEMPLATE,TEXTAREA"
    );
    return new Promise(resolve => {
        const intervalID = setInterval(() => {
            const node = textNodes.shift();
            if(!node) {
                clearInterval(intervalID);
                return resolve(element);
            }

            browser.runtime.sendMessage({
                command: "parseString",
                string: node.textContent,
                allowLink: !node.parentNode?.closest?.("a")
            }).then(objects => {
                if(objects.length === 1 && objects[0] === node.textContent) return; // 沒變的話就不替換
                logger()(node.textContent, objects);
                node.replaceWith(...objects.map(jsml => createElement(jsml)));
            });
        }, 1);
    });
}
