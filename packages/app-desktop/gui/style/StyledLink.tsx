import styled from 'styled-components';

const StyledLink = styled.a`
	font-size: ${props => props.theme.fontSize}px;
	color: ${props => props.theme.urlColor};
	font-family: ${props => props.theme.fontFamily};
`;

export default StyledLink;
