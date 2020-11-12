import * as React from 'react';
const styled = require('styled-components').default;
const Setting = require('@joplin/lib/models/Setting').default;

interface Props {
	selection: string,
	onSelectionChange: Function,
	sections: any[],
}

export const StyledRoot = styled.div`
	display: flex;
	background-color: ${(props: any) => props.theme.backgroundColor2};
	flex-direction: column;
`;

export const StyledListItem = styled.a`
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	padding: ${(props: any) => props.theme.mainPadding}px;
	background: ${(props: any) => props.selected ? props.theme.selectedColor2 : 'none'};
	transition: 0.1s;
	text-decoration: none;
	cursor: default;
	opacity: ${(props: any) => props.selected ? 1 : 0.8};

	&:hover {
		background-color: ${(props: any) =>  props.theme.backgroundColorHover2};
	}
`;

export const StyledListItemLabel = styled.span`
	font-size: ${(props: any) => Math.round(props.theme.fontSize * 1.2)}px;
	font-weight: 500;
	color: ${(props: any) => props.theme.color2};
	white-space: nowrap;
	display: flex;
	flex: 1;
	align-items: center;
	user-select: none;
`;

export const StyledListItemIcon = styled.i`
	font-size: ${(props: any) => Math.round(props.theme.fontSize * 1.4)}px;
	color: ${(props: any) => props.theme.color2};
	margin-right: ${(props: any) => props.theme.mainPadding / 1.5}px;
`;

export default function SideBar(props: Props) {
	const buttons: any[] = [];

	function renderButton(section: any) {
		const selected = props.selection === section.name;
		return (
			<StyledListItem key={section.name} selected={selected} onClick={() => { props.onSelectionChange({ section: section }); }}>
				<StyledListItemIcon className={Setting.sectionNameToIcon(section.name)} />
				<StyledListItemLabel>
					{Setting.sectionNameToLabel(section.name)}
				</StyledListItemLabel>
			</StyledListItem>
		);
	}

	for (const section of props.sections) {
		buttons.push(renderButton(section));
	}

	return (
		<StyledRoot>
			{buttons}
		</StyledRoot>
	);
}
