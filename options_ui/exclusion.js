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


/**
 * 函數宣告
 */
function testRules() {
    const input = $('#sandbox').value.trim();
    const testResult = $('#testResult');
    clearElement(testResult);

    if(!input) return;
    try { new URL(input); }
    catch(err) { return setContent(testResult, '測試網址的格式不正確'); }

    const list = $('#exclude_matches').value.split('\n').filter(x => x);
    const matchedRule = list.find(rule => {
        const regexp = rule.replace(/([.+?\\()\[\]{}])/g, '\\$1').replace(/\*/g, '.*');
        return (new RegExp(`^${regexp}$`)).test(input);
    });
    setContent(testResult, matchedRule
        ? '這個網址符合路徑規則 ' + matchedRule
        : '沒有比對到任何路徑規則，這個網址將套用「自動轉換」的設定。'
    );
};
