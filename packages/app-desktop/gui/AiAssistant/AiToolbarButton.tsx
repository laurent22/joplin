import * as React from 'react';
import { useCallback } from 'react';
import styled from 'styled-components';
import { _ } from '@joplin/lib/locale';

const Button = styled.button`
	padding: 8px 12px;
	background: ${props => props.theme.backgroundColor3};
	color: ${props => props.theme.color};
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 4px;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	transition: all 0.2s;

	&:hover:not(:disabled) {
		background: ${props => props.theme.backgroundColorHover3};
		border-color: ${props => props.theme.aiAccent};
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	i {
		color: ${props => props.theme.aiAccent};
	}
`;

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
		<Button
			title={_('AI Assistant')}
			onClick={handleClick}
			disabled={disabled}
		>
			<i className="fas fa-robot" />
			{_('AI Assistant')}
		</Button>
	);
};

export default AiToolbarButton;
