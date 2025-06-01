console.debug('options_ui/exclusion.js');
/**
 * 初始區
 */
storage.get(['excludeMatches'])
.then(({excludeMatches: em}) => $('#excludeMatches').value = em);

$('#excludeMatches').disabled = true;
hide('#saveButton');


/**
 * 事件監聽
 */
listen('#editButton', 'click', () => {
	hide('#editButton');
	show('#saveButton');
	$('#saveButton').disabled = true;
	$('#excludeMatches').disabled = false;
});

listen('#sandbox', 'input', testPatterns);

listen('#excludeMatches', 'input', () => {
	$('#saveButtonContainer').style.visibility = '';
	$('#saveButton').disabled = false;
	testPatterns();
});

listen('#saveButton', 'click', event => {
	const self = event.target;
	const em = $('#excludeMatches');
	self.disabled = true;
	em.disabled = true;
	self.replaceChildren('儲存中');
	const value = em.value.trim().replace(/\n+/g, '\n');
	storage.set({excludeMatches: value})
	.then(() => {
		self.replaceChildren('儲存');
		hide(self);
		show('#editButton');
		$('#saveMessage').replaceChildren('已儲存於 ' + (new Date).toLocaleString());
		em.value = value;
	});
});


/**
 * 函數宣告
 */
function testPatterns() {
	const input = $('#sandbox').value.trim();
	const testResult = $('#testResult');
	testResult.replaceChildren();

	if (!input) return;
	try { new URL(input); }
	catch(err) { return testResult.append('測試網址的格式不正確'); }

	const list = $('#excludeMatches').value.split('\n').filter(x => x);
	const matchedPattern = list.find(pattern => testExcludePattern(pattern, input));
	testResult.append(matchedPattern
		? '這個網址符合路徑規則 ' + matchedPattern
		: '沒有比對到任何路徑規則，這個網址將套用「自動轉換」的設定。'
	);
};
