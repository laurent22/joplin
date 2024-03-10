'use strict';

declare global {
	interface Window {
		Promise: PromiseConstructorLike;
	}
}
window.Promise = window.Promise || require('es6-promise');
const remove = bind(removeEl, '.smalltalk');
const BUTTON_OK_CANCEL: string[] = ['OK', 'Cancel'];

export function prompt(title: string, msg: string, value = '', options?: any): Promise<any> {
	const type = getType(options);
	const val = String(value).replace(/"/g, '&quot;');
	const valueStr = `<input type="${type}" value="${val}" data-name="js-input">`;
	return showDialog(title, msg, valueStr, BUTTON_OK_CANCEL);
}

function getType(options: any = {}): string {
	const { type } = options;
	if (type === 'password') return 'password';
	return 'text';
}

function getTemplate(title: string, msg: string, value: string, buttons: string[]): string {
	const encodedMsg = msg.replace(/\n/g, '<br>');
	return `<div class="page">
        <div data-name="js-close" class="close-button"></div>
        <header>${title}</header>
        <div class="content-area">${encodedMsg}${value}</div>
        <div class="action-area">
            <div class="button-strip"> ${buttons.map((name, i) => `<button tabindex="${i}" data-name="js-${name.toLowerCase()}">${name}</button>`).join('')}
            </div>
        </div>
    </div>`;
}

function showDialog(title: string, msg: string, value: string, buttons: string[]): Promise<any> {
	const ok = createStore();
	const cancel = createStore();
	const dialog = document.createElement('div');
	const closeButtons = ['cancel', 'close', 'ok'];
	const promise = new Promise<any>((resolve) => {
		ok(resolve);
		cancel(resolve);
	});
	const tmpl = getTemplate(title, msg, value, buttons);
	dialog.innerHTML = tmpl;
	dialog.className = 'smalltalk';
	document.body.appendChild(dialog);
	const elementsToFocus = find(dialog, ['ok', 'input']);
	for (const el of elementsToFocus) {
		el.focus();
	}

	const inputElements = find(dialog, ['input'])
		.filter((el: HTMLElement): el is HTMLInputElement => el instanceof HTMLInputElement);
	for (const el of inputElements) {
		el.setSelectionRange(0, value.length);
	}

	addListenerAll('click', dialog, closeButtons, event => closeDialog(event.target as HTMLElement, dialog, ok(), cancel()));
	for (const event of ['click', 'contextmenu']) {
		dialog.addEventListener(event, () => {
			const elements = find(dialog, ['ok', 'input']);
			for (const el of elements) {
				el.focus();
			}
		});
	}
	dialog.addEventListener('keydown', (event: KeyboardEvent) => keyDown(dialog, ok, cancel, event));
	return promise;
}

export function keyDown(dialog: HTMLElement, ok: ()=> any, cancel: ()=> any, event: KeyboardEvent): void {
	const KEY = {
		ENTER: 13,
		ESC: 27,
		TAB: 9,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
	};

	const keyCode = event.keyCode;
	const el = event.target as HTMLElement;
	const namesAll = ['ok', 'cancel', 'input'];
	const names = find(dialog, namesAll).map(getDataName);
	const directions = ['left', 'right', 'up', 'down']
		.filter(name => keyCode === (KEY as any)[name.toUpperCase()]);

	switch (keyCode) {
	case KEY.ENTER:
		closeDialog(dialog.querySelector('[data-name="js-ok"]') as HTMLElement, dialog, ok(), cancel());
		event.preventDefault();
		break;

	case KEY.ESC:
		closeDialog(el, dialog, ok(), cancel());
		event.preventDefault();
		break;

	case KEY.TAB:
		if (event.shiftKey) tab(dialog, names);
		tab(dialog, names);
		event.preventDefault();
		break;

	default:
		for (let i = 0; i < directions.length; i++) {
			changeButtonFocus(dialog, names);
		}
		break;
	}
	event.stopPropagation();
}

function getDataName(el: HTMLElement): string {
	return el.getAttribute('data-name')!.replace('js-', '');
}

function changeButtonFocus(dialog: HTMLElement, names: string[]): void {
	const active = document.activeElement as HTMLElement;
	const activeName = getDataName(active);
	const isButton = /ok|cancel/.test(activeName);
	const count = names.length - 1;
	const getName = (activeName: string): string => (activeName === 'cancel' ? 'ok' : 'cancel');
	if (activeName === 'input' || !count || !isButton) return;
	const name = getName(activeName);
	const elements = find(dialog, [name]);
	for (const el of elements) {
		el.focus();
	}
}

const getIndex = (count: number, index: number): number => (index === count ? 0 : index + 1);

function tab(dialog: HTMLElement, names: string[]): void {
	const active = document.activeElement as HTMLElement;
	const activeName = getDataName(active);
	const count = names.length - 1;
	const activeIndex = names.indexOf(activeName);
	const index = getIndex(count, activeIndex);
	const name = names[index];
	const elements = find(dialog, [name]);
	for (const el of elements) {
		el.focus();
	}
}

function closeDialog(el: HTMLElement, dialog: HTMLElement, ok: (result: string | null)=> any, cancel: ()=> any): void {
	const name = el.getAttribute('data-name')!.replace('js-', '');
	const keyCode = ('key' in event) ? (event as KeyboardEvent).key : String.fromCharCode((event as KeyboardEvent).keyCode);
	if (/close|cancel/.test(name) || keyCode === 'Escape') {
		// ESC case
		cancel();
		remove();
		return;
	}

	let result: string | null = null;
	if (name === 'ok') {
		result = find(dialog, ['input']).reduce((prevValue: string | null, el: HTMLElement) => {
			if (prevValue !== null) return prevValue;
			if (el instanceof HTMLInputElement) return el.value;
			return prevValue;
		}, null);
	}
	ok(result);
	remove();
}

function find(element: HTMLElement, names: string[]): HTMLElement[] {
	const notEmpty = (a: any) => a;
	const elements = names.map(name => element.querySelector(`[data-name="js-${name}"]`) as HTMLElement).filter(notEmpty);
	return elements;
}

function addListenerAll(event: string, parent: HTMLElement, elements: string[], fn: (event: Event)=> void): void {
	const foundElements = find(parent, elements);
	for (const el of foundElements) {
		el.addEventListener(event, fn);
	}
}

function removeEl(name: string): void {
	const el = document.querySelector(name) as HTMLElement;
	el.parentElement!.removeChild(el);
}

function bind(fn: (...args: any[])=> any, ...args: any[]): ()=> any {
	return () => fn(...args);
}

function createStore(value?: any) {
	const data = {
		value: value,
	};

	return function(newValue?: any) {
		if (arguments.length === 0) return data.value;
		data.value = newValue;
		return newValue;
	};
}
