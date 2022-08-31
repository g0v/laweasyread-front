getData("autoParse").then(autoParse => {
    if(autoParse) parseElement(document.body);
});

browser.runtime.onMessage.addListener(({command}) => {
    switch(command) {
        case "parseDocument":
            return parseElement(document.body);
        default:
            console.error("unknown command");
    }
});


/******** Functions ********/

function parseElement(element = document.body) {
    const textNodes = getTextNodes(element, node => /[\u4E00-\u9FFF]{2}/.test(node.textContent));
    return new Promise(resolve => {
        const intervalID = setInterval(() => {
            const node = textNodes.shift();
            if(!node) {
                clearInterval(intervalID);
                return resolve(element);
            }

            browser.runtime.sendMessage({
                command: "parseString",
                string: node.textContent
            }).then(objects => {
                if(objects.length === 1 && objects[0] === node.textContent) return; // 沒變的話就不替換
                const isInA = node.parentElement?.closest("a");
                const nodeList = objects.map(obj => {
                    if(typeof obj === "string") return obj;
                    if(!obj.pcode) return obj.name;
                    return createElement(isInA ? "span" : "a", {title: obj.pcode}, [obj.name]);
                })
                node.replaceWith(...nodeList);
            });
        }, 1);
    });
}
