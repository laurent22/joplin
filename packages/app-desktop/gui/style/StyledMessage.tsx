import styled from 'styled-components';

const StyledMessage = styled.div<{type: string}>`
	border-radius: 3px;
	background-color: ${props => props.type === 'error' ? props.theme.warningBackgroundColor : 'transparent'};
	font-size: ${props => props.theme.fontSize}px;
	color: ${props => props.theme.color};
	font-family: ${props => props.theme.fontFamily};
	padding: ${props => props.type === 'error' ? props.theme.mainPadding : '0'}px;
	word-break: break-all;
`;

export default StyledMessage;
