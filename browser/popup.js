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
$("#autoParse").addEventListener("click", event => {
    const checked = event.target.checked;
    setData({autoParse: checked});
    if(checked) sendMessageToCurrentTab({command: "parseDocument"});
});

// 手動轉換的 button
$("#parseCurrentTab").addEventListener("click", () =>
    sendMessageToCurrentTab({command: "parseDocument"})
);

// 「更新」的 span
$("#update").addEventListener("click", event => {
    const self = event.target;
    self.firstChild.replaceWith("更新中…");
    self.disabled = true;
    browser.runtime.sendMessage({command: "update"})
    .then(
        () => self.remove(),
        () => self.replaceWith("更新失敗")
    );
});

// 如果是 Firefox ，就隱藏立法院的搜尋表單（因為不知道怎麼讓他運作）
if(navigator.userAgent.includes("Firefox")) $("#formLy").remove();

// 用網址檢查現在的頁面是否可以被轉換
browser.tabs.query({active: true, currentWindow: true})
.then(([tab]) => {
    if(tab.url.startsWith("http") || tab.url.startsWith("file")) return;
    $("#parseCurrentTab").remove();
});
