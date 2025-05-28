// 顯示專案版本
$("#version").append(browser.runtime.getManifest().version);

storage.get(["autoParse", "localDate", "remoteDate"])
.then(({autoParse, localDate, remoteDate}) => {
    $("#autoParse").checked = autoParse;
    if(remoteDate > localDate) {
        const elem = $("#update");
        elem.style.display = "";
        elem.title = `可更新至 ${remoteDate} 的法規清單`;
    }
});

// 自動轉換的 checkbox
$('#autoParse').addEventListener('click', event => {
    const checked = event.target.checked;
    storage.set({autoParse: checked});
    if(checked) sendMessageToCurrentTab({method: 'parseDocument'});
});

// 手動轉換的 button
$('#parseCurrentTab').addEventListener('click', event => {
    event.target.disabled = true;
    sendMessageToCurrentTab({method: 'parseDocument'})
    .then(() => event.target.disabled = false);
});

// 「更新」的 span
$('#update').addEventListener('click', event => {
    const self = event.target;
    self.firstChild.replaceWith("更新中…");
    self.disabled = true;
    browser.runtime.sendMessage({method: 'update'})
    .then(
        () => self.remove(),
        () => self.replaceWith("更新失敗")
    );
});

// 用網址檢查現在的頁面是否可以被轉換
browser.tabs.query({active: true, currentWindow: true})
.then(([tab]) => {
    if(tab.url.startsWith("http") || tab.url.startsWith("file")) return;
    $("#parseCurrentTab").disabled = true;
});


/**
 * @func sendMessageToCurrentTab
 * @desc 傳送訊息到當前的分頁，但避開瀏覽器自設頁面（如 `chrome://` 開頭）。
 * @param {Object} message
 * @returns {Promise} response from the tab
 */
const sendMessageToCurrentTab = message =>
    browser.tabs.query({active: true, currentWindow: true})
    .then(([tab]) => {
        if(tab.url.startsWith("http") || tab.url.startsWith("file"))
            return browser.tabs.sendMessage(tab.id, message);
    })
;
