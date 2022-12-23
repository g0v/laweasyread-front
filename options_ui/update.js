getData(["localDate", "remoteDate", "lastCheck"])
.then(({localDate, remoteDate, lastCheck}) => {
    if(localDate) setContent($("#localDate"), localDate);
    else hide($("#localDateContainer"));

    const ub = $("#updateButton");
    if(remoteDate > localDate) {
        setContent(ub, `更新到 ${remoteDate}`);
        ub.classList.add("btn-info");
    }
    else ub.classList.add("btn-primary");

    if(lastCheck)
        setContent(
            $("#lastCheck"),
            (new Date(lastCheck)).toLocaleString()
        );
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
    setContent(self, "檢查更新中…");
    cl.remove("btn-primary", "btn-info");
    cl.add("btn-warning");
    hide($("#lastCheckContainer"));
    browser.runtime.sendMessage({method: "update"})
    .then(newDate => {
        if(newDate) { // 有更新且已安裝
            setContent($("#localDate"), newDate);
            setContent(self, "已更新");
            cl.add("btn-success");
        }
        else {
            setContent(self, "無可更新");
            cl.add("btn-secondary");
        }
        setContent($("#lastCheck"), (new Date).toLocaleString());
        cl.remove("btn-warning");
        show($("#localDateContainer"));
        show($("#lastCheckContainer"));
    });
});
