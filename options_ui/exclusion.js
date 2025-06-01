console.debug('options_ui/exclusion.js');
/**
 * 初始區
 */
storage.get(['exclude_matches'])
.then(({exclude_matches: em}) => $('#exclude_matches').value = em);

$('#exclude_matches').disabled = true;
hide('#saveButton');


/**
 * 事件監聽
 */
listen('#editButton', 'click', () => {
	hide('#editButton');
	show('#saveButton');
	$('#saveButton').disabled = true;
	$('#exclude_matches').disabled = false;
});

listen('#sandbox', 'input', testPatterns);

listen('#exclude_matches', 'input', () => {
	$('#saveButtonContainer').style.visibility = '';
	$('#saveButton').disabled = false;
	testPatterns();
});

listen('#saveButton', 'click', event => {
	const self = event.target;
	const em = $('#exclude_matches');
	self.disabled = true;
	em.disabled = true;
	self.replaceChildren('儲存中');
	const value = em.value.trim().replace(/\n+/g, '\n');
	storage.set({exclude_matches: value})
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

	const list = $('#exclude_matches').value.split('\n').filter(x => x);
	const matchedPattern = list.find(pattern => testExcludePattern(pattern, input));
	testResult.append(matchedPattern
		? '這個網址符合路徑規則 ' + matchedPattern
		: '沒有比對到任何路徑規則，這個網址將套用「自動轉換」的設定。'
	);
};
