storage.get(["localDate", "remoteDate", "lastCheck"])
.then(({localDate, remoteDate, lastCheck}) => {
    if(localDate) $("#localDate").replaceChildren(localDate);
    else hide($("#localDateContainer"));

    const ub = $("#updateButton");
    if(remoteDate > localDate) {
        ub.replaceChildren(`更新到 ${remoteDate}`);
        ub.classList.add("btn-info");
    }
    else ub.classList.add("btn-primary");

    if(lastCheck) $("#lastCheck")
        .replaceChildren((new Date(lastCheck)).toLocaleString());
    else hide($("#lastCheckContainer"));
});


/**
 * 設定「檢查更新」鈕
 * 結果分為「安裝更新」和「不用更新」。
 */
listen($("#updateButton"), "click", event => {
    const self = event.target;
    const cl = self.classList;
    self.disabled = true;
    self.replaceChildren("檢查更新中…");
    cl.remove("btn-primary", "btn-info");
    cl.add("btn-warning");
    hide($("#lastCheckContainer"));
    browser.runtime.sendMessage({method: "update"})
    .then(newDate => {
        if(newDate) { // 有更新且已安裝
            $("#localDate").replaceChildren(newDate);
            self.replaceChildren("已更新");
            cl.add("btn-success");
        }
        else {
            self.replaceChildren("無可更新");
            cl.add("btn-secondary");
        }
        $("#lastCheck").replaceChildren((new Date).toLocaleString());
        cl.remove("btn-warning");
        show($("#localDateContainer"));
        show($("#lastCheckContainer"));
    });
});
