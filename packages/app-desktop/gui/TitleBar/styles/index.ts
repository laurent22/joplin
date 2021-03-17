const styled = require('styled-components').default;

interface IconProps {
	readonly theme: any;
	readonly title: string;
}

interface RootProps {
	readonly theme: any;
	readonly disabled: boolean;
	readonly hasTitle: boolean;
}

export const StyledCloseHolder = styled.span<RootProps>`
	padding: 16px;
	cursor: pointer;

	&:hover {
		background-color: red;
	}

	&:hover i {
		color: white;
	}
`;

export const StyledDragBar = styled.div<RootProps>`
	color: ${(props: RootProps) => props.theme.color};
	display: flex;
	justify-content: center;
	align-items: center;
	flex: 1;
	align-self: stretch;
	font-weight: bold;
	font-size: large;
	user-select: none;
	app-region: drag;
	-webkit-user-select: none;
	-webkit-app-region: drag;
`;

export const StyledIconHolder = styled.span<RootProps>`
	padding: 16px;
	cursor: pointer;

	&:hover {
		background-color: ${(props: RootProps) => props.theme.backgroundColor2};
	}

	&:hover i {
		color: white;
	}
`;

export const StyledIconI = styled.i`
	font-size: ${(props: IconProps) => props.theme.toolbarIconSize}px;
	color: ${(props: IconProps) => props.theme.color3};
	margin-right: ${(props: IconProps) => (props.title ? 5 : 0)}px;
`;

export const StyledRoot = styled.div<RootProps>`
	height: max-content;
	width: 100vw;
	box-sizing: border-box;
	background-color: ${(props: RootProps) => props.theme.backgroundColor3};
	overflow: hidden;
`;

export const StyledWindowControlsHolder = styled.span<RootProps>`
	padding: 10px 0;
	display: inline-block;
`;

export const StyledWindowTitleBar = styled.div<RootProps>`
	display: flex;
	align-items: center;
`;
