import * as React from 'react';
import Dialog from '@joplin/lib/components/Dialog';
import { _ } from '@joplin/lib/locale';

interface Props {
	message: string;
	hasCloseButton: boolean;
	onClose: ()=> void;
}

const ModalMessageOverlay: React.FC<Props> = ({ message, hasCloseButton, onClose }) => {
	let brIndex = 1;
	const lines = message.split('\n').map((line: string) => {
		if (!line.trim()) return <br key={`${brIndex++}`}/>;
		return <div key={line} className="text">{line}</div>;
	});

	return <Dialog contentFillsScreen={true} onCancel={hasCloseButton ? onClose : undefined}>
		<div className={`modal-message ${hasCloseButton ? '-with-close-button' : ''}`}>
			{!hasCloseButton && <div className="loading-animation" />}
			<div className={`text ${hasCloseButton ? 'modal-message-scrollable-content' : ''}`} role="status">
				{lines}
			</div>
			{hasCloseButton && <div className="modal-message-actions">
				<button type="button" onClick={onClose}>{_('OK')}</button>
			</div>}
		</div>
	</Dialog>;
};

export default ModalMessageOverlay;
