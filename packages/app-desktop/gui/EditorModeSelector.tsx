import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import styled from 'styled-components';

export type EditorMode = 'markdown' | 'richText';

interface Props {
	value: EditorMode;
	onChange: (value: EditorMode)=> void;
}

interface Option {
	value: EditorMode;
	label: string;
	iconClassName: string;
}

const options: Option[] = [
	{
		value: 'richText',
		label: _('Rich Text'),
		iconClassName: 'fas fa-edit',
	},
	{
		value: 'markdown',
		label: _('Markdown'),
		iconClassName: 'fab fa-markdown',
	},
];

export default function EditorModeSelector(props: Props) {
	return (
		<Root>
			<CardRow role='radiogroup' aria-label={_('Editor mode')}>
				{options.map(option => {
					const checked = option.value === props.value;
					return (
						<CardButton
							key={option.value}
							type='button'
							role='radio'
							aria-checked={checked}
							tabIndex={checked ? 0 : -1}
							onClick={() => props.onChange(option.value)}
							$selected={checked}
						>
							<ModeIcon className={option.iconClassName} aria-hidden={true} />
							<ModeLabel>{option.label}</ModeLabel>
						</CardButton>
					);
				})}
			</CardRow>
		</Root>
	);
}

const Root = styled.div`
	padding-bottom: 10px;
`;

const CardRow = styled.div`
	display: flex;
	gap: 12px;
`;

const CardButton = styled.button<{ $selected: boolean }>`
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 18px;
	border-radius: 6px;
	cursor: pointer;
	font: inherit;
	color: ${props => props.theme.color};
	border: 1px solid ${props => props.$selected ? props.theme.color : props.theme.dividerColor};
	background-color: ${props => props.theme.backgroundColor3};
	outline: ${props => props.$selected ? `2px solid ${props.theme.color}` : 'none'};
	outline-offset: 1px;

	&:hover {
		background-color: ${props => props.theme.backgroundColorHover3 || props.theme.backgroundColor3};
	}

	&:active {
		background-color: ${props => props.theme.backgroundColorActive3 || props.theme.backgroundColor3};
	}
`;

const ModeIcon = styled.i`
	font-size: 28px;
	pointer-events: none;
`;

const ModeLabel = styled.span`
	font-family: ${props => props.theme.fontFamily};
`;
