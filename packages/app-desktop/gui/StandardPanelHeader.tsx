import * as React from 'react';
import styled from 'styled-components';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';

const StyledHeader = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	height: 30px;
	background-color: ${props => props.theme.backgroundColor};
	border-bottom: 1px solid ${props => props.theme.dividerColor};
	padding: 0 10px;
	user-select: none;
`;

const StyledTitle = styled.div`
	flex: 1;
	font-size: 11px;
	font-weight: bold;
	color: ${props => props.theme.color2};
	text-transform: uppercase;
	letter-spacing: 0.05em;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	min-width: 0;
`;

const StyledButton = styled.button`
	background: none;
	border: none;
	color: ${props => props.theme.color2};
	opacity: 0.7;
	cursor: pointer;
	padding: 4px;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		opacity: 1;
		background-color: ${props => props.theme.backgroundColorHover3};
	}
`;

interface Props {
	title: string;
	themeId: number;
	onClose: () => void;
}

const StandardPanelHeader: React.FC<Props> = (props) => {
	const theme = themeStyle(props.themeId);

	return (
		<StyledHeader theme={theme}>
			<StyledTitle theme={theme}>{props.title}</StyledTitle>
			<StyledButton theme={theme} onClick={props.onClose} title={_('Close')}>
				<i className="fas fa-times" />
			</StyledButton>
		</StyledHeader>
	);
};

export default StandardPanelHeader;
