const styled = require('styled-components').default;
const Color = require('color');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type StyleProps = any;

const StyledInput = styled.input`
	border: 1px solid ${(props: StyleProps) => Color(props.theme.color3).alpha(0.6)};
	border-radius: 3px;
	font-size: ${(props: StyleProps) => props.theme.fontSize}px;
	color: ${(props: StyleProps) => props.theme.color};
	padding: 0 8px;
	height: ${(props: StyleProps) => `${props.theme.toolbarHeight}px`};
	max-height: ${(props: StyleProps) => `${props.theme.toolbarHeight}px`};
	box-sizing: border-box;
	background-color: ${(props: StyleProps) => Color(props.theme.backgroundColor4).alpha(0.5)};

	&::placeholder {
		color: ${(props: StyleProps) => props.theme.colorFaded};
	}

	&:focus {
		background-color: ${(props: StyleProps) => props.theme.backgroundColor4};
		border: 1px solid ${(props: StyleProps) => props.theme.color3};
	}
`;

export default StyledInput;
