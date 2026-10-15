import enableTextAreaTab, { TextAreaTabHandler } from './enableTextAreaTab';

describe('enableTextAreaTab', () => {
	let textArea: HTMLTextAreaElement;
	let handler: TextAreaTabHandler;

	const dispatchKey = (type: 'keydown' | 'keyup', init: KeyboardEventInit) => {
		textArea.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init }));
	};

	beforeEach(() => {
		textArea = document.createElement('textarea');
		document.body.appendChild(textArea);
		textArea.value = '  print("hi")';
		textArea.setSelectionRange(textArea.value.length, textArea.value.length);
		handler = enableTextAreaTab([textArea]);
	});

	afterEach(() => {
		handler.remove();
		textArea.remove();
	});

	test('ctrl+Enter does not insert a newline before the dialog submits', () => {
		dispatchKey('keydown', { key: 'Enter', keyCode: 13, ctrlKey: true });

		expect(textArea.value).toBe('  print("hi")');
	});

	test('enter inserts a newline that keeps the current indentation', () => {
		dispatchKey('keydown', { key: 'Enter', keyCode: 13 });

		expect(textArea.value).toBe('  print("hi")\n  ');
	});

	test('enter auto-indents again after ctrl+Enter is released', () => {
		dispatchKey('keydown', { key: 'Enter', keyCode: 13, ctrlKey: true });
		dispatchKey('keyup', { key: 'Enter', keyCode: 13 });
		dispatchKey('keydown', { key: 'Enter', keyCode: 13 });

		expect(textArea.value).toBe('  print("hi")\n  ');
	});
});
