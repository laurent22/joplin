document.addEventListener('joplin-noteDidUpdate', makeTodoViewActionable );

if (/WebKit/i.test(navigator.userAgent)) { // sniff
		var _timer_todotxt = setInterval(function() {
				if (/loaded|complete/.test(document.readyState)) {
						makeTodoViewActionable()
				}
		}, 10);
}

function makeTodoViewActionable() {
	if (_timer_todotxt) clearInterval(_timer_todotxt);

	const todoTxts = document.getElementsByClassName('todotxt');
	for (var i=0; i<todoTxts.length; i++){
		const todoTxt = todoTxts[i];
		const todos = todoTxt.getElementsByClassName('todo');
		for (var j=0; j<todos.length; j++){
			const todo    = todos[j];
			const lineIdx = todo.getAttribute("data-lineIdx");

			const checkbox   = todo.getElementsByClassName('todo-checkbox')[0].getElementsByTagName('input')[0];
			const priority   = todo.getElementsByClassName('todo-priority')[0].getElementsByTagName('select')[0];
			const selectButton = todo.getElementsByClassName('todo-select')[0];

			checkbox.onclick = function (){ 
				setTimeout(()=> {webviewApi.postMessage('todoTxtMd', `toggleStatus:${lineIdx}`)}, 170);
			}
			priority.onchange = function(option) {
				var value = option.target.value;
				webviewApi.postMessage('todoTxtMd', `changePriority:${lineIdx}:${value}`);
			}
			selectButton.onclick = function () {
				webviewApi.postMessage('todoTxtMd', `selectLine:${lineIdx}`);
			}
		}
	}
}