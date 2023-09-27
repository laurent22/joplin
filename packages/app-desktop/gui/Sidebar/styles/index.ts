import Button from '../../Button/Button';
const styled = require('styled-components').default;

export const StyledRoot = styled.div`
	background-color: ${(props: any) => props.theme.backgroundColor2};
	width: 100%;
	height: 100%;
	overflow-x: hidden;
	overflow-y: hidden;
	display: inline-flex;
	flex-direction: column;
`;

export const StyledHeader = styled.div`
	//height: ${(props: any) => props.theme.topRowHeight}px;
	//text-decoration: none;
	flex: 1;
	box-sizing: border-box;
	padding: ${(props: any) => props.theme.mainPadding}px;
	padding-bottom: ${(props: any) => props.theme.mainPadding / 2}px;
	display: flex;
	align-items: center;
	user-select: none;
	text-transform: uppercase;
	//cursor: pointer;
`;

export const StyledHeaderIcon = styled.i`
	font-size: ${(props: any) => props.theme.toolbarIconSize}px;
	color: ${(props: any) => props.theme.color2};
	margin-right: 8px;
`;

export const StyledAllNotesIcon = styled(StyledHeaderIcon)`
	font-size: ${(props: any) => props.theme.toolbarIconSize * 0.8}px;
	color: ${(props: any) => props.theme.colorFaded2};
	margin-right: 8px;
`;

export const StyledHeaderLabel = styled.span`
	flex: 1;
	color: ${(props: any) => props.theme.color2};
	font-size: ${(props: any) => Math.round(props.theme.fontSize * 1.1)}px;
	font-weight: bold;
`;

export const StyledListItem = styled.div`
	box-sizing: border-box;
	height: 30px;
	display: flex;
	flex-direction: row;
	align-items: center;
	padding-left: ${(props: any) => props.theme.mainPadding + ('depth' in props ? props.depth : 0) * 16}px;
	background: ${(props: any) => props.selected ? props.theme.selectedColor2 : 'none'};
	/*text-transform: ${(props: any) => props.isSpecialItem ? 'uppercase' : 'none'};*/
	transition: 0.1s;

	&:hover {
		background-color: ${(props: any) => props.theme.backgroundColorHover2};
	}
`;

function listItemTextColor(props: any) {
	if (props.isConflictFolder) return props.theme.colorError2;
	if (props.isSpecialItem) return props.theme.colorFaded2;
	if (props.shareId) return props.theme.colorWarn2;
	return props.theme.color2;
}

export const StyledListItemAnchor = styled.a`
	font-size: ${(props: any) => Math.round(props.theme.fontSize * 1.0833333)}px;
	text-decoration: none;
	color: ${(props: any) => listItemTextColor(props)};
	cursor: default;
	opacity: ${(props: any) => props.selected || props.shareId ? 1 : 0.8};
	white-space: nowrap;
	display: flex;
	flex: 1;
	align-items: center;
	user-select: none;
	height: 100%;
`;

export const StyledShareIcon = styled.i`
	margin-left: 8px;
`;

export const StyledExpandLink = styled.a`
	color: ${(props: any) => props.theme.color2};
	cursor: default;
	opacity: 0.8;
	text-decoration: none;
	padding-right: 8px;
	display: flex;
	align-items: center;
	width: 16px;
	max-width: 16px;
	min-width: 16px;
	height: 100%;
`;

export const StyledNoteCount = styled.div`
	color: ${(props: any) => props.theme.colorFaded2};
	padding-left: 8px;
	user-select: none;
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
	font-size: ${(props: any) => Math.round(props.theme.fontSize * 0.9)}px;
	color: ${(props: any) => props.theme.color2};
	opacity: 0.5;
	display: flex;
	flex-direction: column;
	margin-left: 5px;
	margin-right: 5px;
	margin-bottom: 10px;
	word-wrap: break-word;
`;

export const StyledSyncReportText = styled.div`
	color: ${(props: any) => props.theme.color2};
	word-wrap: break-word;
	width: 100%;
`;
