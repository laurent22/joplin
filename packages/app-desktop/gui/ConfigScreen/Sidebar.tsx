import { AppType, MetadataBySection, SettingMetadataSection, SettingSectionSource } from '@joplin/lib/models/Setting';
import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { useCallback, useEffect, useRef, useState } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
const styled = require('styled-components').default;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied;
type StyleProps = any;

interface SectionChangeEvent {
	section: SettingMetadataSection;
	settingKey?: string;
}

interface Props {
	selection: string;
	onSelectionChange: (event: SectionChangeEvent)=> void;
	sections: MetadataBySection;
	topContent?: React.ReactNode;
	searchQuery?: string;
}

export const StyledRoot = styled.div`
	display: flex;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor2};
	flex-direction: column;
	overflow-x: hidden;
	overflow-y: auto;
`;

export const StyledTopContent = styled.div`
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	padding-bottom: ${(props: StyleProps) => props.theme.mainPadding / 2}px;
`;

export const StyledTabList = styled.div`
	display: flex;
	flex-direction: column;
`;

export const StyledListItem = styled.a`
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	background: ${(props: StyleProps) => props.selected ? props.theme.selectedColor2 : 'none'};
	transition: 0.1s;
	text-decoration: none;
	cursor: default;
	opacity: ${(props: StyleProps) => props.selected ? 1 : 0.8};
	padding-left: ${(props: StyleProps) => props.isSubSection ? '35' : props.theme.mainPadding}px;

	&:hover {
		background-color: ${(props: StyleProps) => props.theme.backgroundColorHover2};
	}
`;

export const StyledDivider = styled.div`
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	color: ${(props: StyleProps) => props.theme.color2};
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	padding-top: ${(props: StyleProps) => props.theme.mainPadding * .8}px;
	padding-bottom: ${(props: StyleProps) => props.theme.mainPadding * .8}px;
	border-top: 1px solid ${(props: StyleProps) => props.theme.dividerColor};
	border-bottom: 1px solid ${(props: StyleProps) => props.theme.dividerColor};
	background-color: ${(props: StyleProps) => props.theme.selectedColor2};
	font-size: ${(props: StyleProps) => Math.round(props.theme.fontSize)}px;
	opacity: 0.58;
`;

export const StyledListItemLabel = styled.span`
	font-size: ${(props: StyleProps) => Math.round(props.theme.fontSize * 1.2)}px;
	font-weight: 500;
	color: ${(props: StyleProps) => props.theme.color2};
	white-space: normal;
	overflow-wrap: anywhere;
	word-break: break-word;
	display: flex;
	flex: 1;
	align-items: center;
	user-select: none;
`;

export const StyledListItemIcon = styled.i`
	font-size: ${(props: StyleProps) => Math.round(props.theme.fontSize * 1.4)}px;
	color: ${(props: StyleProps) => props.theme.color2};
	margin-right: ${(props: StyleProps) => props.theme.mainPadding / 1.5}px;
`;

export const StyledSearchResultList = styled.div`
	display: flex;
	flex-direction: column;
	padding-bottom: ${(props: StyleProps) => props.theme.mainPadding * .5}px;
`;

export const StyledSearchResultItem = styled.button`
	padding: ${(props: StyleProps) => props.theme.mainPadding * .5}px;
	padding-left: ${(props: StyleProps) => props.theme.mainPadding * 2.3}px;
	border: none;
	background: transparent;
	color: ${(props: StyleProps) => props.theme.color};
	text-align: left;
	font-size: ${(props: StyleProps) => Math.round(props.theme.fontSize)}px;
	opacity: .9;
	white-space: normal;
	overflow-wrap: anywhere;
	word-break: break-word;

	&:hover {
		background-color: ${(props: StyleProps) => props.theme.backgroundColorHover2};
	}
`;

export const StyledNoResults = styled.div`
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	color: ${(props: StyleProps) => props.theme.color2};
	opacity: 0.8;
`;

export default function Sidebar(props: Props) {
	const buttonRefs = useRef<HTMLElement[]>([]);
	const rootRef = useRef<HTMLDivElement>(null);
	const [fixedWidth, setFixedWidth] = useState<number|null>(null);
	const searchQuery = (props.searchQuery || '').toLocaleLowerCase().trim();
	const searching = !!searchQuery.length;

	useEffect(() => {
		if (fixedWidth !== null) return;
		if (!rootRef.current) return;

		setFixedWidth(Math.round(rootRef.current.getBoundingClientRect().width));
	}, [fixedWidth]);

	type SearchResultGroup = {
		section: SettingMetadataSection;
		matchingSettingKeys: string[];
	};

	const searchResultGroups: SearchResultGroup[] = [];

	for (const section of props.sections) {
		const matchingSettingKeys: string[] = [];

		for (const md of section.metadatas) {
			const relatedText = [
				Setting.sectionNameToLabel(section.name),
				md.label ? md.label() : '',
				md.description ? md.description(AppType.Desktop) : '',
			].join('\n').toLocaleLowerCase();

			if (relatedText.includes(searchQuery)) {
				matchingSettingKeys.push(md.key);
			}
		}

		if (!searching || matchingSettingKeys.length || Setting.sectionNameToLabel(section.name).toLocaleLowerCase().includes(searchQuery)) {
			searchResultGroups.push({ section, matchingSettingKeys });
		}
	}

	const sectionsForNav = searching ? searchResultGroups.map(g => g.section) : props.sections;

	// Making a tabbed region accessible involves supporting keyboard interaction.
	// See https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ for details
	const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback((event) => {
		const selectedIndex = sectionsForNav.findIndex(section => section.name === props.selection);
		let newIndex = selectedIndex;

		if (event.code === 'ArrowUp') {
			newIndex --;
		} else if (event.code === 'ArrowDown') {
			newIndex ++;
		} else if (event.code === 'Home') {
			newIndex = 0;
		} else if (event.code === 'End') {
			newIndex = sectionsForNav.length - 1;
		}

		if (newIndex < 0) newIndex += sectionsForNav.length;
		newIndex %= sectionsForNav.length;

		if (newIndex !== selectedIndex) {
			event.preventDefault();
			props.onSelectionChange({ section: sectionsForNav[newIndex] });

			const targetButton = buttonRefs.current[newIndex];
			if (targetButton) {
				focus('Sidebar', targetButton);
			}
		}
	}, [sectionsForNav, props.selection, props.onSelectionChange]);

	const buttons: React.ReactNode[] = [];

	function renderButton(section: SettingMetadataSection, index: number) {
		const selected = props.selection === section.name;
		return (
			<StyledListItem
				key={section.name}
				href='#'
				role='tab'
				ref={(item: HTMLElement) => { buttonRefs.current[index] = item; }}

				id={`setting-tab-${section.name}`}
				aria-controls={`setting-section-${section.name}`}
				aria-selected={selected}
				tabIndex={selected ? 0 : -1}

				isSubSection={Setting.isSubSection(section.name)}
				selected={selected}
				onClick={() => { props.onSelectionChange({ section: section }); }}
				onKeyDown={onKeyDown}
			>
				<StyledListItemIcon
					className={Setting.sectionNameToIcon(section.name, AppType.Desktop)}
					role='img'
					aria-hidden='true'
				/>
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

	let index = 0;
	for (const group of searchResultGroups) {
		const section = group.section;
		if (section.source === SettingSectionSource.Plugin && !pluginDividerAdded) {
			buttons.push(renderDivider('divider-plugins'));
			pluginDividerAdded = true;
		}

		buttons.push(renderButton(section, index));

		if (searching && group.matchingSettingKeys.length) {
			buttons.push(
				<StyledSearchResultList key={`search-results-${section.name}`}>
					{group.matchingSettingKeys.map(settingKey => {
						const md = section.metadatas.find(item => item.key === settingKey);
						if (!md?.label) return null;

						return (
							<StyledSearchResultItem
								key={settingKey}
								onClick={() => props.onSelectionChange({ section, settingKey })}
							>
								{md.label()}
							</StyledSearchResultItem>
						);
					})}
				</StyledSearchResultList>,
			);
		}

		index ++;
	}

	return (
		<StyledRoot
			className='settings-sidebar _scrollbar2'
			ref={rootRef}
			style={fixedWidth === null ? undefined : { width: fixedWidth, minWidth: fixedWidth, maxWidth: fixedWidth }}
		>
			{props.topContent ? <StyledTopContent>{props.topContent}</StyledTopContent> : null}
			{searching && !searchResultGroups.length ? <StyledNoResults>{_('No results')}</StyledNoResults> : null}
			<StyledTabList role='tablist'>
				{buttons}
			</StyledTabList>
		</StyledRoot>
	);
}
