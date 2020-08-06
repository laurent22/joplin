const styled = require('styled-components').default;

const StyledInput = styled.input`
	border: 1px solid ${(props:any) => props.theme.color3};
	border-radius: 3px;
	font-size: ${(props:any) => props.theme.fontSize}px;
	color: ${(props:any) => props.theme.color};
	padding: 4px 8px;

	&::placeholder {
		color: ${(props:any) => props.theme.colorFaded};
	}
`;

export default StyledInput;
