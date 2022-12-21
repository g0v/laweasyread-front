/**
 * 初始區
 */
getData("exclude_matches")
.then(em => $("#exclude_matches").value = em);

$("#exclude_matches").disabled = true;
hide($("#saveButton"));


/**
 * 事件監聽
 */
listen($("#editButton"), "click", () => {
    hide($("#editButton"));
    show($("#saveButton"));
    $("#saveButton").disabled = true;
    $("#exclude_matches").disabled = false;
});

const testRules = () => {
    const sb = $("#sandbox");
    if(!sb.value) return setContent($("#testResult"), "");
    if(!/^https?:\/\//.test(sb.value)) return setContent($("#testResult"), "網址格式不正確");
    isExcluded(sb.value, $("#exclude_matches").value)
    .then(rule => setContent($("#testResult"), rule
        ? ("這個網址符合規則 " + rule)
        : "沒有比對到任何規則，這個網址將套用「自動轉換」的設定。"
    ));
};
listen($("#sandbox"), "input", testRules);

listen($("#exclude_matches"), "input", () => {
    $("#saveButtonContainer").style.visibility = "";
    $("#saveButton").disabled = false;
    testRules();
});

listen($("#saveButton"), "click", event => {
    const self = event.target;
    const em = $("#exclude_matches");
    self.disabled = true;
    em.disabled = true;
    setContent(self, "儲存中");
    const value = em.value.trim().replace(/\n+/g, "\n");
    setData({exclude_matches: value})
    .then(() => {
        setContent(self, "儲存");
        hide(self);
        show($("#editButton"));
        setContent($("#saveMessage"), "已儲存於" + (new Date).toLocaleString());
        em.value = value;
    });
});
