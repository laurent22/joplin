import * as React from 'react';
import { ReactEventHandler, ReactNode, useCallback, useEffect, useRef, useState } from 'react';

interface Props {
	className?: string;
	onClose?: ()=> void;
	contentStyle?: React.CSSProperties;
	children: ReactNode;
}

export default function Dialog(props: Props) {
	const [dialogElement, setDialogRef] = useState<HTMLDialogElement>();

	useEffect(() => {
		if (!dialogElement) return;

		// Use .showModal instead of the open attribute: .showModal correctly
		// traps the keyboard focus in the dialog
		dialogElement.showModal();
	}, [dialogElement]);

	const onCloseRef = useRef(props.onClose);
	onCloseRef.current = props.onClose;

	const onCancel: ReactEventHandler<HTMLDialogElement> = useCallback((event) => {
		const canCancel = !!onCloseRef.current;
		if (canCancel) {
			// Prevents [Escape] from closing the dialog. In many places, this is handled
			// elsewhere.
			// See https://stackoverflow.com/a/61021326
			event.preventDefault();
		}
	}, []);

	return (
		<dialog
			ref={setDialogRef}
			className={`dialog-modal-layer ${props.className}`}
			onClose={props.onClose}
			onCancel={onCancel}
		>
			<div className='content' style={props.contentStyle}>
				{props.children}
			</div>
		</dialog>
	);
}
