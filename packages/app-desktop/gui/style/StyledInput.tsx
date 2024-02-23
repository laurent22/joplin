const styled = require('styled-components').default;
const Color = require('color');

const StyledInput = styled.input`
	border: 1px solid ${(props: any) => Color(props.theme.color3).alpha(0.6)};
	border-radius: 3px;
	font-size: ${(props: any) => props.theme.fontSize}px;
	color: ${(props: any) => props.theme.color};
	padding: 0 8px;
	height: ${(props: any) => `${props.theme.toolbarHeight}px`};
	max-height: ${(props: any) => `${props.theme.toolbarHeight}px`};
	box-sizing: border-box;
	background-color: ${(props: any) => Color(props.theme.backgroundColor4).alpha(0.5)};

	&::placeholder {
		color: ${(props: any) => props.theme.colorFaded};
	}

	&:focus {
		background-color: ${(props: any) => props.theme.backgroundColor4};
		border: 1px solid ${(props: any) => props.theme.color3};
	}
`;

export default StyledInput;
