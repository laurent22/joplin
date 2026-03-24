import { AppType, MetadataBySection, SettingMetadataSection, SettingSectionSource } from '@joplin/lib/models/Setting';
import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { useCallback, useRef } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
import SearchInput, { OnChangeEvent } from '../lib/SearchInput/SearchInput';
import { highlightSearchText } from './configScreenUtils';
const styled = require('styled-components').default;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied;
type StyleProps = any;

interface SectionChangeEvent {
	section: SettingMetadataSection;
}

interface Props {
	selection: string;
	onSelectionChange: (event: SectionChangeEvent)=> void;
	sections: MetadataBySection;
	searchQuery: string;
	onSearchQueryChange: (event: OnChangeEvent)=> void;
	onSearchButtonClick: ()=> void;
	searchStarted: boolean;
	isSectionMatch: (sectionName: string)=> boolean;
}

export const StyledRoot = styled.div`
	display: flex;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor2};
	flex-direction: column;
	overflow: hidden;
`;

export const StyledTabList = styled.div`
	display: flex;
	flex-direction: column;
	overflow-x: hidden;
	overflow-y: auto;
	flex: 1;
`;

export const StyledListItem = styled.a`
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	background: ${(props: StyleProps) => props.selected ? props.theme.selectedColor2 : 'none'};
	transition: 0.1s;
	text-decoration: none;
	cursor: ${(props: StyleProps) => props.disabled ? 'not-allowed' : 'default'};
	opacity: ${(props: StyleProps) => props.disabled ? 0.35 : props.selected ? 1 : 0.8};
	padding-left: ${(props: StyleProps) => props.isSubSection ? '35' : props.theme.mainPadding}px;

	&:hover {
		background-color: ${(props: StyleProps) => props.disabled ? 'transparent' : props.theme.backgroundColorHover2};
	}
`;

export const StyledSearchContainer = styled.div`
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	padding-bottom: ${(props: StyleProps) => props.theme.mainPadding / 2}px;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor2};
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
	white-space: nowrap;
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

export default function Sidebar(props: Props) {
	const buttonRefs = useRef<HTMLElement[]>([]);
	const enabledSectionIndices = props.sections
		.map((section, index) => props.isSectionMatch(section.name) ? index : -1)
		.filter(index => index >= 0);

	// Making a tabbed region accessible involves supporting keyboard interaction.
	// See https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ for details
	const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback((event) => {
		const isArrowKey = ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key);
		if (!isArrowKey) return;
		if (!enabledSectionIndices.length) return;

		event.preventDefault();
		event.stopPropagation();

		const selectedIndex = props.sections.findIndex(section => section.name === props.selection);
		const selectedEnabledIndex = enabledSectionIndices.includes(selectedIndex) ? enabledSectionIndices.indexOf(selectedIndex) : 0;
		let newEnabledIndex = selectedEnabledIndex;

		if (event.key === 'ArrowUp') {
			newEnabledIndex--;
		} else if (event.key === 'ArrowDown') {
			newEnabledIndex++;
		} else if (event.key === 'Home') {
			newEnabledIndex = 0;
		} else if (event.key === 'End') {
			newEnabledIndex = enabledSectionIndices.length - 1;
		}

		if (newEnabledIndex < 0) newEnabledIndex += enabledSectionIndices.length;
		newEnabledIndex %= enabledSectionIndices.length;
		const newIndex = enabledSectionIndices[newEnabledIndex];
		const targetButton = buttonRefs.current[newIndex];

		if (newIndex !== selectedIndex) {
			props.onSelectionChange({ section: props.sections[newIndex] });
		}

		if (targetButton) {
			focus('Sidebar', targetButton);
		}
	}, [enabledSectionIndices, props.sections, props.selection, props.onSelectionChange]);

	const onTabListFocus: React.FocusEventHandler<HTMLDivElement> = useCallback((event) => {
		if (event.target !== event.currentTarget) return;

		const selectedIndex = props.sections.findIndex(section => section.name === props.selection);
		const enabledSelectedIndex = enabledSectionIndices.includes(selectedIndex) ? selectedIndex : enabledSectionIndices[0];
		const targetButton = buttonRefs.current[enabledSelectedIndex];
		if (targetButton) {
			focus('Sidebar', targetButton);
		}
	}, [enabledSectionIndices, props.sections, props.selection]);

	const buttons: React.ReactNode[] = [];

	function renderButton(section: SettingMetadataSection, index: number) {
		const selected = props.selection === section.name;
		const disabled = !props.isSectionMatch(section.name);
		return (
			<StyledListItem
				key={section.name}
				href='#'
				role='tab'
				ref={(item: HTMLElement) => { buttonRefs.current[index] = item; }}

				id={`setting-tab-${section.name}`}
				aria-controls={`setting-section-${section.name}`}
				aria-selected={selected}
				aria-disabled={disabled}
				tabIndex={!disabled && selected ? 0 : -1}

				isSubSection={Setting.isSubSection(section.name)}
				selected={selected}
				disabled={disabled}
				onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
					event.preventDefault();
					if (disabled) return;
					props.onSelectionChange({ section });
				}}
				onKeyDown={(e: React.KeyboardEvent<HTMLAnchorElement>) => {
					if ([' ', 'Enter'].includes(e.key)) {
						e.preventDefault();
						if (!disabled) {
							props.onSelectionChange({ section: section });
						}
					}
				}}
			>
				<StyledListItemIcon
					className={Setting.sectionNameToIcon(section.name, AppType.Desktop)}
					role='img'
					aria-hidden='true'
				/>
				<StyledListItemLabel>
					{highlightSearchText(Setting.sectionNameToLabel(section.name), props.searchQuery)}
				</StyledListItemLabel>
			</StyledListItem>
		);
	}

	function renderDivider(key: string) {
		return (
			<StyledDivider key={key} role='presentation' aria-hidden='true'>
				{_('Plugins')}
			</StyledDivider>
		);
	}

	let pluginDividerAdded = false;

	let index = 0;
	for (const section of props.sections) {
		if (section.source === SettingSectionSource.Plugin && !pluginDividerAdded) {
			buttons.push(renderDivider('divider-plugins'));
			pluginDividerAdded = true;
		}

		buttons.push(renderButton(section, index));
		index ++;
	}

	return (
		<StyledRoot className='settings-sidebar'>
			<StyledSearchContainer>
				<SearchInput
					value={props.searchQuery}
					onChange={props.onSearchQueryChange}
					onSearchButtonClick={props.onSearchButtonClick}
					searchStarted={props.searchStarted}
					inputRef={null}
					placeholder={_('Search settings...')}
				/>
			</StyledSearchContainer>
			<StyledTabList
				className='_scrollbar2'
				role='tablist'
				aria-orientation='vertical'
				tabIndex={0}
				onKeyDown={onKeyDown}
				onFocus={onTabListFocus}
			>
				{buttons}
			</StyledTabList>
		</StyledRoot>
	);
}
