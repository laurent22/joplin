import * as React from 'react';
import { useCallback } from 'react';
import ToolbarButton from '../NoteToolbar/ToolbarButton';
import { _ } from '@joplin/lib/locale';

interface Props {
	onClick: () => void;
	disabled?: boolean;
}

const AiToolbarButton: React.FC<Props> = ({ onClick, disabled = false }) => {
	const handleClick = useCallback(() => {
		if (!disabled) {
			onClick();
		}
	}, [onClick, disabled]);

	return (
		<ToolbarButton
			title={_('AI Assistant')}
			iconName="fas fa-robot"
			onClick={handleClick}
			disabled={disabled}
		/>
	);
};

export default AiToolbarButton;
