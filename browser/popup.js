kongUtil.use("$", "listen");

// 顯示專案版本
$("#version").append(browser.runtime.getManifest().version);

getData(["autoParse", "localDate", "remoteDate"])
.then(({autoParse, localDate, remoteDate}) => {
    $("#autoParse").checked = autoParse;
    if(remoteDate > localDate) {
        const elem = $("#update");
        elem.style.display = "";
        elem.title = `可更新至 ${remoteDate} 的法規清單`;
    }
});

// 自動轉換的 checkbox
listen($("#autoParse"), "click", event => {
    const checked = event.target.checked;
    setData({autoParse: checked});
    if(checked) sendMessageToCurrentTab({command: "parseDocument"});
});

// 手動轉換的 button
listen($("#parseCurrentTab"), "click", event => {
    event.target.disabled = true;
    sendMessageToCurrentTab({command: "parseDocument"})
    .then(() => event.target.disabled = false);
});

// 「更新」的 span
listen($("#update"), "click", event => {
    const self = event.target;
    self.firstChild.replaceWith("更新中…");
    self.disabled = true;
    browser.runtime.sendMessage({command: "update"})
    .then(
        () => self.remove(),
        () => self.replaceWith("更新失敗")
    );
});

// 用網址檢查現在的頁面是否可以被轉換
browser.tabs.query({active: true, currentWindow: true})
.then(([tab]) => {
    if(tab.url.startsWith("http") || tab.url.startsWith("file")) return;
    $("#parseCurrentTab").remove();
});
