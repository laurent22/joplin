import shim from '@joplin/lib/shim';
import Button from '../../Button/Button';
import { css } from 'styled-components';
const styled = require('styled-components').default;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type StyleProps = any;

export const StyledRoot = styled.div`
	background-color: ${(props: StyleProps) => props.theme.backgroundColor2};
	width: 100%;
	height: 100%;
	overflow-x: hidden;
	overflow-y: hidden;
	display: inline-flex;
	flex-direction: column;
`;

export const StyledHeader = styled.div`
	//height: ${(props: StyleProps) => props.theme.topRowHeight}px;
	//text-decoration: none;
	flex: 1;
	box-sizing: border-box;
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	padding-bottom: ${(props: StyleProps) => props.theme.mainPadding / 2}px;
	display: flex;
	align-items: center;
	user-select: none;
	text-transform: uppercase;
	//cursor: pointer;
`;

export const StyledHeaderIcon = styled.i`
	font-size: ${(props: StyleProps) => props.theme.toolbarIconSize}px;
	color: ${(props: StyleProps) => props.theme.color2};
	margin-right: 8px;
`;

export const StyledAllNotesIcon = styled(StyledHeaderIcon)`
	font-size: ${(props: StyleProps) => props.theme.toolbarIconSize * 0.8}px;
	color: ${(props: StyleProps) => props.theme.colorFaded2};
	margin-right: 8px;
`;

export const StyledHeaderLabel = styled.span`
	flex: 1;
	color: ${(props: StyleProps) => props.theme.color2};
	font-size: ${(props: StyleProps) => Math.round(props.theme.fontSize * 1.1)}px;
	font-weight: bold;
`;

function listItemTextColor(props: StyleProps) {
	if (props.isConflictFolder) return props.theme.colorError2;
	if (props.isSpecialItem) return props.theme.colorFaded2;
	if (props.shareId) return props.theme.colorWarn2;
	return props.theme.color2;
}

export const StyledListItemAnchor = styled.a`
	font-size: ${(props: StyleProps) => Math.round(props.theme.fontSize * 1.0833333)}px;
	text-decoration: none;
	color: ${(props: StyleProps) => listItemTextColor(props)};
	cursor: default;
	opacity: ${(props: StyleProps) => {
		// So that the conflicts folder and shared folders have sufficient contrast,
		// use an opacity of 1 even when unselected.
		const needsHigherContrast = props.isConflictFolder || props.isSpecialItem;
		return (props.selected || props.shareId || needsHigherContrast) ? 1 : 0.8;
	}};
	white-space: nowrap;
	display: flex;
	flex: 1;
	align-items: center;
	user-select: none;
	height: 100%;

	/* A different background color is already used to indicate focus for sidebar list items. */
	&:focus-visible {
		outline: none;
	}
`;

export const StyledShareIcon = styled.i`
	margin-left: 8px;
`;

export const StyledSynchronizeButton = styled(Button)`
	width: 100%;
`;

export const StyledAddButton = styled(Button)`
	border: none;
	padding-right: 15px;
	padding-top: 4px;
`;

export const StyledSyncReport = styled.div`
	font-size: ${(props: StyleProps) => Math.round(props.theme.fontSize * 0.9)}px;
	color: ${(props: StyleProps) => props.theme.color2};
	opacity: 0.5;
	display: flex;
	flex-direction: column;
	margin-left: 5px;
	margin-right: 5px;
	margin-bottom: 10px;
	word-wrap: break-word;
`;

export const StyledSyncReportText = styled.div`
	color: ${(props: StyleProps) => props.theme.color2};
	word-wrap: break-word;
	width: 100%;
`;

// Workaround sidebar rendering bug on Linux Intel GPU.
// https://github.com/laurent22/joplin/issues/7506
export const StyledSpanFix = styled.span`
	${shim.isLinux() && css`
		position: relative;
	`}
`;
