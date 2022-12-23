browser.runtime.onMessage.addListener(LER.parseDocument.bind(LER));

getData('autoParse').then(autoParse => {
    if(autoParse) LER.parseDocument();
});

// getData(["autoParse", "enablePopup"])
// .then(storage => {
//     if(storage.autoParse) parseElement(document.body, pageDefaultLaw);
//     if(enablePopup = storage.enablePopup) {
//         browser.runtime.sendMessage({
//             command: "readFile",
//             file: "content_scripts/popup.template.html",
//             type: "text"
//         }).then(text => {
//             popupTemplate = parseHTML(text);
//             /// 拿掉因排版而出現的空白文字節點
//             getTextNodes(popupTemplate).forEach(tn => tn.remove());
//         });
//         listen(document, "mousemove", event => {
//             $$(".LER-popup-container").forEach(popup => {
//                 if(popup.style.display
//                     || $(".LER-popup-pin", popup).checked
//                     || kongUtil.isEventInElement(event, popup)
//                     || kongUtil.isEventInElement(event, popup.target)
//                 ) return;
//                 popup.style.display = "none";
//             })
//         });
//     }
// });