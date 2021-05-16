import styled from 'styled-components';

const StyledFormLabel = styled.div`
	font-size: ${props => props.theme.fontSize * 1.083333}px;
	color: ${props => props.theme.color};
	font-family: ${props => props.theme.fontFamily};
	font-weight: 500;
	margin-bottom: ${props => props.theme.mainPadding / 2}px;
`;

export default StyledFormLabel;
