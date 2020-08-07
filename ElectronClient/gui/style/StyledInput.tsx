const styled = require('styled-components').default;

const StyledInput = styled.input`
	border: 1px solid ${(props:any) => props.theme.color3};
	border-radius: 3px;
	font-size: ${(props:any) => props.theme.fontSize}px;
	color: ${(props:any) => props.theme.color};
	padding: 0 8px;
	height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	max-height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	box-sizing: border-box;
	background-color: ${(props:any) => props.theme.backgroundColor4};

	&::placeholder {
		color: ${(props:any) => props.theme.colorFaded};
	}

	&:focus {
		background-color: ${(props:any) => props.theme.backgroundColorActive4};
	}
`;

export default StyledInput;
