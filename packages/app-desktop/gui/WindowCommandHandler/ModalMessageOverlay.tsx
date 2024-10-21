import * as React from 'react';
import Dialog from '../Dialog';

interface Props {
	message: string;
}

const ModalMessageOverlay: React.FC<Props> = ({ message }) => {
	let brIndex = 1;
	const lines = message.split('\n').map((line: string) => {
		if (!line.trim()) return <br key={`${brIndex++}`}/>;
		return <div key={line} className="text">{line}</div>;
	});

	return <Dialog contentFillsScreen={true}>
		<div className="modal-message">
			<div id="loading-animation" />
			<div className="text" role="status">
				{lines}
			</div>
		</div>
	</Dialog>;
};

export default ModalMessageOverlay;
