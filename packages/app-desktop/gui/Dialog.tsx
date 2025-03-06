import * as React from 'react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { blur, focus } from '@joplin/lib/utils/focusHandler';
import useDocument from './hooks/useDocument';

type OnCancelListener = ()=> void;

interface Props {
	className?: string;
	onCancel?: OnCancelListener;
	contentStyle?: React.CSSProperties;
	contentFillsScreen?: boolean;
	children: ReactNode;
}

const Dialog: React.FC<Props> = props => {
	const [containerElement, setContainerElement] = useState<HTMLDivElement|null>(null);
	const containerDocument = useDocument(containerElement);

	// For correct focus handling, the dialog element needs to be managed separately from React. In particular,
	// just after creating the dialog, we need to call .showModal() and just **before** closing the dialog, we
	// need to call .close(). This second requirement is particularly difficult, as this needs to happen even
	// if the dialog is closed by removing its parent from the React DOM.
	//
	// Because useEffect cleanup can happen after an element is removed from the HTML DOM, the dialog is managed
	// using native HTML APIs. This allows us to call .close() while the dialog is still attached to the DOM, which
	// allows the browser to restore the focus from before the dialog was opened.
	const dialogElement = useDialogElement(containerDocument, props.onCancel);
	useDialogClassNames(dialogElement, props.className);

	const [contentRendered, setContentRendered] = useState(false);

	useEffect(() => {
		if (!dialogElement || !contentRendered) return;

		if (!dialogElement.open) {
			dialogElement.showModal();
		}
	}, [dialogElement, contentRendered]);

	useEffect(() => {
		if (!dialogElement) return;

		if (props.contentFillsScreen) {
			dialogElement.classList.add('-fullscreen');
		} else {
			dialogElement.classList.remove('-fullscreen');
		}
	}, [props.contentFillsScreen, dialogElement]);

	if (dialogElement && !contentRendered) {
		setContentRendered(true);
	}

	const content = (
		<div className='content' style={props.contentStyle}>
			{props.children}
		</div>
	);
	return <div ref={setContainerElement} className='dialog-anchor-node'>
		{dialogElement && createPortal(content, dialogElement) as ReactNode}
	</div>;
};

// We keep track of the mouse events to allow the action to be cancellable on the mouseup
// If dialogElement is the source of the mouse event it means
// that the user clicked in the dimmed background and not in the content of the dialog
const useClickedOutsideContent = (dialogElement: HTMLDialogElement|null) => {
	const mouseDownOutsideContent = useRef(false);
	mouseDownOutsideContent.current	= false;
	const [clickedOutsideContent, setClickedOutsideContent] = useState(false);

	useEffect(() => {
		if (!dialogElement) return () => {};

		const mouseDownListener = (event: MouseEvent) => {
			if (event.target === dialogElement) {
				mouseDownOutsideContent.current = true;
			} else {
				mouseDownOutsideContent.current = false;
			}
		};
		const mouseUpListener = (event: MouseEvent) => {
			if (!mouseDownOutsideContent.current) return;
			if (mouseDownOutsideContent.current && event.target === dialogElement) {
				setClickedOutsideContent(true);
				mouseDownOutsideContent.current = false;
			} else {
				setClickedOutsideContent(false);
				mouseDownOutsideContent.current = false;
			}
		};

		dialogElement.addEventListener('mousedown', mouseDownListener);
		dialogElement.addEventListener('mouseup', mouseUpListener);

		return () => {
			dialogElement.removeEventListener('mousedown', mouseDownListener);
			dialogElement.removeEventListener('mouseup', mouseUpListener);
		};
	}, [dialogElement]);

	return [clickedOutsideContent, setClickedOutsideContent] as const;
};

const useDialogElement = (containerDocument: Document, onCancel: undefined|OnCancelListener) => {
	const [dialogElement, setDialogElement] = useState<HTMLDialogElement|null>(null);

	const onCancelRef = useRef(onCancel);
	onCancelRef.current = onCancel;

	const [clickedOutsideContent, setClickedOutsideContent] = useClickedOutsideContent(dialogElement);

	useEffect(() => {
		if (clickedOutsideContent) {
			const onCancel = onCancelRef.current;
			if (onCancel) {
				onCancel();
			} else {
				setClickedOutsideContent(false);
			}
		}
	}, [clickedOutsideContent, setClickedOutsideContent]);

	useEffect(() => {
		if (!containerDocument) return () => {};

		const dialog = containerDocument.createElement('dialog');
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
			if (containerDocument.activeElement?.tagName === 'INPUT') {
				const element = containerDocument.activeElement as HTMLElement;
				blur('Dialog', element);
				focus('Dialog', element);
			}
		});
		containerDocument.body.appendChild(dialog);

		setDialogElement(dialog);

		return () => {
			if (dialog.open) {
				// .close: Instructs the browser to restore keyboard focus to whatever was focused
				// before the dialog.
				dialog.close(removedReturnValue);
			}
			dialog.remove();
		};
	}, [containerDocument]);

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
