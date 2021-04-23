import styled from 'styled-components';

const StyledMessage = styled.div`
	border-radius: 3px;
	background-color: ${props => props.type === 'error' ? props.theme.warningBackgroundColor : 'transparent'};
	font-size: ${props => props.theme.fontSize}px;
	color: ${props => props.theme.color};
	font-family: ${props => props.theme.fontFamily};
	padding: ${props => props.theme.mainPadding}px;
`;

export default StyledMessage;
