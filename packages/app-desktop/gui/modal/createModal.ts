import { ReactElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

type CallbackType = {
    (): void;
    (value: any): void;
};

interface OnCallback {
    onSubmit: CallbackType;
    onDismiss: CallbackType;
}

export interface RenderFunctionProps extends OnCallback {
    show: boolean;
}

type RenderFunction = (props: RenderFunctionProps)=> ReactElement;

interface Options {
    destructionDelay?: number;
}

const DEFAULT_DESTRUCTION_DELAY = 300;
const DEFAULT_OPTIONS = {
	destructionDelay: DEFAULT_DESTRUCTION_DELAY,
};

const noop = () => {};

export default function createModal(renderModal: RenderFunction, options: Options = {}): Promise<unknown> {
	const { destructionDelay } = { ...DEFAULT_OPTIONS, ...options };
	const container = document.createElement('div');
	let handleKeyDownRef: any;
	document.body.appendChild(container);
	function onKeyDown(onDismiss: CallbackType) {
		return function handleKeyDown(e: KeyboardEvent) {
			const defaultBehaviourInputs = ['select', 'button', 'textarea'];
			const focusable = container.querySelectorAll('button, input, select, textarea');
			const firstFocusable = focusable[0];
			const lastFocusable = focusable[focusable.length - 1];
			const okButton = container.querySelector('#modal-ok');
			const activeElement = document.activeElement;
			const keyCode = e.keyCode;
			const KEY = {
				ENTER: 13,
				ESC: 27,
				TAB: 9,
			};

			if (e.ctrlKey || e.altKey) {
				return;
			}

			switch (keyCode) {
			case KEY.TAB:
				if (e.shiftKey && e.target === firstFocusable) {
					(lastFocusable as HTMLElement).focus();
					e.preventDefault();
				} else if (e.target === lastFocusable) {
					(firstFocusable as HTMLElement).focus();
					e.preventDefault();
				}
				break;
			case KEY.ESC:
				onDismiss();
				break;
			case KEY.ENTER:
				if (activeElement && defaultBehaviourInputs.indexOf(activeElement.tagName.toLowerCase()) !== -1) {
					return;
				}
				(okButton as HTMLButtonElement).click();
				e.preventDefault();
				break;
			}
		};
	}


	function addListeners({ onDismiss }: OnCallback) {
		handleKeyDownRef = onKeyDown(onDismiss);
		document.addEventListener('keydown', handleKeyDownRef, true);
	}

	function removeListeners() {
		document.removeEventListener('keydown', handleKeyDownRef, true);
	}

	function displayModal({ onSubmit, onDismiss }: OnCallback) {
		render(renderModal({ onSubmit, onDismiss, show: true }), container);
		addListeners({ onSubmit, onDismiss });
	}

	function hideModal({ onSubmit, onDismiss }: OnCallback, callback: ()=> void) {
		removeListeners();
		render(renderModal({ onSubmit, onDismiss, show: false }), container, callback);
	}

	function destroyModal() {
		unmountComponentAtNode(container);
		document.body.removeChild(container);
	}

	const confirmation = new Promise((resolve,reject) => {
		const onSubmit = (value = true) => resolve(value);
		const onDismiss = (value = false) => reject(value);
		displayModal({ onSubmit, onDismiss });
	});

	return confirmation.finally(() => {
		const onSubmit = noop;
		const onDismiss = noop;
		hideModal({ onSubmit, onDismiss }, () => {
			setTimeout(destroyModal, destructionDelay);
		});
	});
}
