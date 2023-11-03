import { SettingSectionSource } from '@joplin/lib/models/Setting';
import * as React from 'react';
import { useMemo } from 'react';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
const styled = require('styled-components').default;

interface Props {
	selection: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onSelectionChange: Function;
	sections: any[];
}

export const StyledRoot = styled.div`
	display: flex;
	background-color: ${(props: any) => props.theme.backgroundColor2};
	flex-direction: column;
	overflow-x: hidden;
	overflow-y: auto;
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
	padding-left: ${(props: any) => props.isSubSection ? '35' : props.theme.mainPadding}px;

	&:hover {
		background-color: ${(props: any) => props.theme.backgroundColorHover2};
	}
`;

export const StyledDivider = styled.div`
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	color: ${(props: any) => props.theme.color2};
	padding: ${(props: any) => props.theme.mainPadding}px;
	padding-top: ${(props: any) => props.theme.mainPadding * .8}px;
	padding-bottom: ${(props: any) => props.theme.mainPadding * .8}px;
	border-top: 1px solid ${(props: any) => props.theme.dividerColor};
	border-bottom: 1px solid ${(props: any) => props.theme.dividerColor};
	background-color: ${(props: any) => props.theme.selectedColor2};
	font-size: ${(props: any) => Math.round(props.theme.fontSize)}px;
	opacity: 0.5;
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

export default function Sidebar(props: Props) {
	const buttons: any[] = [];

	const sortedSections = useMemo(() => {
		const output = props.sections.slice();
		output.sort((a: any, b: any) => {
			const s1 = a.source || SettingSectionSource.Default;
			const s2 = b.source || SettingSectionSource.Default;
			if (s1 === SettingSectionSource.Default && s2 === SettingSectionSource.Default) return props.sections.indexOf(s1) - props.sections.indexOf(s2);
			if (s1 === SettingSectionSource.Default && s2 === SettingSectionSource.Plugin) return -1;
			if (s1 === SettingSectionSource.Plugin && s2 === SettingSectionSource.Default) return +1;

			const l1 = Setting.sectionNameToLabel(a.name);
			const l2 = Setting.sectionNameToLabel(b.name);
			if (s1 === SettingSectionSource.Plugin && s2 === SettingSectionSource.Plugin) return l1.toLowerCase() < l2.toLowerCase() ? -1 : +1;
			return 0;
		});
		return output;
	}, [props.sections]);

	function renderButton(section: any) {
		const selected = props.selection === section.name;
		return (
			<StyledListItem key={section.name} isSubSection={Setting.isSubSection(section.name)} selected={selected} onClick={() => { props.onSelectionChange({ section: section }); }}>
				<StyledListItemIcon className={Setting.sectionNameToIcon(section.name)} />
				<StyledListItemLabel>
					{Setting.sectionNameToLabel(section.name)}
				</StyledListItemLabel>
			</StyledListItem>
		);
	}

	function renderDivider(key: string) {
		return (
			<StyledDivider key={key}>
				{_('Plugins')}
			</StyledDivider>
		);
	}

	let pluginDividerAdded = false;

	for (const section of sortedSections) {
		if (section.source === SettingSectionSource.Plugin && !pluginDividerAdded) {
			buttons.push(renderDivider('divider-plugins'));
			pluginDividerAdded = true;
		}

		buttons.push(renderButton(section));
	}

	return (
		<StyledRoot>
			{buttons}
		</StyledRoot>
	);
}
