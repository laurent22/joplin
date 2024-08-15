import * as React from 'react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { blur, focus } from '@joplin/lib/utils/focusHandler';

type OnCancelListener = ()=> void;

interface Props {
	className?: string;
	onCancel?: OnCancelListener;
	contentStyle?: React.CSSProperties;
	children: ReactNode;
}

const Dialog: React.FC<Props> = props => {
	// For correct focus handling, the dialog element needs to be managed separately from React. In particular,
	// just after creating the dialog, we need to call .showModal() and just **before** closing the dialog, we
	// need to call .close(). This second requirement is particularly difficult, as this needs to happen even
	// if the dialog is closed by removing its parent from the React DOM.
	//
	// Because useEffect cleanup can happen after an element is removed from the HTML DOM, the dialog is managed
	// using native HTML APIs. This allows us to call .close() while the dialog is still attached to the DOM, which
	// allows the browser to restore the focus from before the dialog was opened.
	const dialogElement = useDialogElement(props.onCancel);
	useDialogClassNames(dialogElement, props.className);

	const [contentRendered, setContentRendered] = useState(false);

	useEffect(() => {
		if (!dialogElement || !contentRendered) return;

		if (!dialogElement.open) {
			dialogElement.showModal();
		}
	}, [dialogElement, contentRendered]);

	if (dialogElement && !contentRendered) {
		setContentRendered(true);
	}

	const content = (
		<div className='content' style={props.contentStyle}>
			{props.children}
		</div>
	);
	return <>
		{dialogElement && createPortal(content, dialogElement)}
	</>;
};

const useDialogElement = (onCancel: undefined|OnCancelListener) => {
	const [dialogElement, setDialogElement] = useState<HTMLDialogElement|null>(null);

	const onCancelRef = useRef(onCancel);
	onCancelRef.current = onCancel;

	useEffect(() => {
		const dialog = document.createElement('dialog');
		dialog.addEventListener('click', event => {
			const onCancel = onCancelRef.current;
			const isBackgroundClick = event.target === dialog;
			if (isBackgroundClick && onCancel) {
				onCancel();
			}
		});
		dialog.classList.add('dialog-modal-layer');
		dialog.addEventListener('cancel', event => {
			const canCancel = !!onCancelRef.current;
			if (!canCancel) {
				// Prevents [Escape] from closing the dialog. In many places, this is handled
				// by external logic.
				// See https://stackoverflow.com/a/61021326
				event.preventDefault();
			}
		});

		const removedReturnValue = 'removed-from-dom';
		dialog.addEventListener('close', () => {
			const closedByCancel = dialog.returnValue !== removedReturnValue;
			if (closedByCancel) {
				onCancelRef.current?.();
			}

			// Work around what seems to be an Electron bug -- if an input or contenteditable region is refocused after
			// dismissing a dialog, it won't be editable.
			// Note: While this addresses the issue in the note title input, it does not address the issue in the Rich Text Editor.
			if (document.activeElement?.tagName === 'INPUT') {
				const element = document.activeElement as HTMLElement;
				blur('Dialog', element);
				focus('Dialog', element);
			}
		});
		document.body.appendChild(dialog);

		setDialogElement(dialog);

		return () => {
			if (dialog.open) {
				// .close: Instructs the browser to restore keyboard focus to whatever was focused
				// before the dialog.
				dialog.close(removedReturnValue);
			}
			dialog.remove();
		};
	}, []);

	return dialogElement;
};

const useDialogClassNames = (dialogElement: HTMLElement|null, classNames: undefined|string) => {
	useEffect(() => {
		if (!dialogElement || !classNames) {
			return () => {};
		}

		// The React className prop can include multiple space-separated classes
		const newClassNames = classNames
			.split(/\s+/)
			.filter(name => name.length && !dialogElement.classList.contains(name));
		dialogElement.classList.add(...newClassNames);

		return () => {
			dialogElement.classList.remove(...newClassNames);
		};
	}, [dialogElement, classNames]);
};

export default Dialog;
