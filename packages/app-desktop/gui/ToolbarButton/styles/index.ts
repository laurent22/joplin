import { ThemeStyle } from '@joplin/lib/theme';

const styled = require('styled-components').default;
const { css } = require('styled-components');

interface IconProps {
	readonly theme: ThemeStyle;
	readonly hasTitle: boolean;
}

const iconStyle = css<IconProps>`
	font-size: ${(props: IconProps) => props.theme.toolbarIconSize}px;
	color: ${(props: IconProps) => props.theme.color3};
	margin-right: ${(props: IconProps) => props.hasTitle ? 5 : 0}px;
	pointer-events: none; /* Need this to get button tooltip to work */
`;

export const StyledIconI = styled.i`${iconStyle}`;
export const StyledIconSpan = styled.span`${iconStyle}`;
