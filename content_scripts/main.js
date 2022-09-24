kongUtil.use("createElement");
kongUtil.use("logger");

browser.runtime.onMessage.addListener(({command}) => {
    switch(command) {
        case "parseDocument":
            return parseElement(document.body);
        default:
            console.error("unknown command");
    }
});

let enablePopup;
getData(["autoParse", "enablePopup"]).
then(storage => {
    if(storage.autoParse) parseElement(document.body);
    enablePopup = storage.enablePopup;
});


/**
 * @func parseElement
 * @desc 轉換指定的元素。
 * @param {Element} element
 * @returns {Promise}
 */
function parseElement(element = document.body) {
    const textNodes = getTextNodes(
        element,
        node => /[\u4E00-\u9FFF]{2}/.test(node.textContent), // 有連續中日韓字元
        "BUTTON,CODE,SCRIPT,SELECT,STYLE,TEMPLATE,TEXTAREA"
    );
    console.time("LawEasyRead");
    return new Promise(resolve => {
        const intervalID = setInterval(() => {
            const node = textNodes.shift();
            if(!node) {
                clearInterval(intervalID);
                const event = new CustomEvent("lerParseEnd", {detail: {target: element}});
                document.dispatchEvent(event);
                console.timeEnd("LawEasyRead");
                return resolve(element);
            }

            browser.runtime.sendMessage({
                command: "parseString",
                string: node.textContent,
                allowLink: !node.parentNode?.closest?.("a")
            }).then(objects => {
                objects = objects.flat();
                if(objects.length === 1 && objects[0] === node.textContent) return; // 沒變的話就不替換
                objects = objects.map(createElement);

                if(enablePopup) objects
                    .filter(elem => elem instanceof Element && elem.dataset.pcode && elem.dataset.norge)
                    .forEach(elem => {
                        listen(elem, "mouseenter", logger("mouseenter"));
                    })
                ;

                const isLastChild = !node.nextSibling;
                node.replaceWith(...objects);
                if(isLastChild) {
                    const parent = objects[0].parentNode;
                    const event = new CustomEvent("lerParseEnd");
                    parent.dispatchEvent(event);
                }
            });
        }, 1);
    });
}
