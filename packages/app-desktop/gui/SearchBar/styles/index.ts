import StyledInput from '../../style/StyledInput';
const styled = require('styled-components').default;

export const Root = styled.div`
	position: relative;
	display: flex;
	width: 100%;
`;

export const SearchButton = styled.button`
	position: absolute;
	right: 0;
	background: none;
	border: none;
	height: 100%;
	opacity: ${(props: any) => props.disabled ? 0.5 : 1};
`;

export const SearchButtonIcon = styled.span`
	font-size: ${(props: any) => props.theme.toolbarIconSize}px;
	color: ${(props: any) => props.theme.color4};
`;

export const SearchInput = styled(StyledInput)`
	padding-right: 20px;
	flex: 1;
	width: 10px;
`;
