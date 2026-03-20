import { AppType, MetadataBySection, SettingMetadataSection, SettingSectionSource } from '@joplin/lib/models/Setting';
import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { useCallback, useMemo, useRef } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
import SearchInput, { OnChangeEvent } from '../lib/SearchInput/SearchInput';
import { normalizeQuery } from '@joplin/lib/components/shared/config/config-search-text';
import { type SearchResultGroup } from './configSearch';
import highlightSearchText from './searchHighlight';
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
	searchResultGroups: SearchResultGroup[];
}

export const StyledRoot = styled.div`
	display: flex;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor2};
	flex-direction: column;
	overflow-x: hidden;
	overflow-y: auto;
`;

export const StyledTabList = styled.div``;

export const StyledSearchContainer = styled.div`
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	padding-bottom: ${(props: StyleProps) => props.theme.mainPadding / 2}px;
`;

export const StyledListItem = styled.button`
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	width: 100%;
	border: none;
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	background: ${(props: StyleProps) => props.selected ? props.theme.selectedColor2 : 'none'};
	transition: 0.1s;
	text-align: left;
	cursor: default;
	opacity: ${(props: StyleProps) => props.disabled ? 0.3 : props.selected ? 1 : 0.8};
	padding-left: ${(props: StyleProps) => props.isSubSection ? '35' : props.theme.mainPadding}px;

	&:hover {
		background-color: ${(props: StyleProps) => props.disabled ? 'none' : props.theme.backgroundColorHover2};
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

	mark {
		background-color: ${(props: StyleProps) => props.theme.searchMarkerBackgroundColor};
		color: ${(props: StyleProps) => props.theme.searchMarkerColor};
		padding: 0;
	}
`;

export const StyledListItemIcon = styled.i`
	font-size: ${(props: StyleProps) => Math.round(props.theme.fontSize * 1.4)}px;
	color: ${(props: StyleProps) => props.theme.color2};
	margin-right: ${(props: StyleProps) => props.theme.mainPadding / 1.5}px;
`;

export default function Sidebar(props: Props) {
	const buttonRefs = useRef<HTMLElement[]>([]);
	const isSearching = !!normalizeQuery(props.searchQuery);

	const matchedSectionNames = useMemo(() => {
		return new Set(props.searchResultGroups.map(group => group.sectionName));
	}, [props.searchResultGroups]);

	// Making a tabbed region accessible involves supporting keyboard interaction.
	// See https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ for details
	const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback((event) => {
		const selectedIndex = props.sections.findIndex(section => section.name === props.selection);
		let newIndex = selectedIndex;

		// Determine navigation direction
		let isMovingUp = false;
		if (event.code === 'ArrowUp') {
			newIndex --;
			isMovingUp = true;
		} else if (event.code === 'ArrowDown') {
			newIndex ++;
			isMovingUp = false;
		} else if (event.code === 'Home') {
			newIndex = 0;
			isMovingUp = false;
		} else if (event.code === 'End') {
			newIndex = props.sections.length - 1;
			isMovingUp = true;
		}

		if (newIndex < 0) newIndex += props.sections.length;
		newIndex %= props.sections.length;

		// Skip disabled (no-match) sections during search
		if (isSearching) {
			const initialIndex = newIndex;
			while (!matchedSectionNames.has(props.sections[newIndex].name)) {
				if (isMovingUp) {
					newIndex--;
					if (newIndex < 0) newIndex += props.sections.length;
				} else {
					newIndex++;
					newIndex %= props.sections.length;
				}
				// Prevent infinite loop if no matched sections
				if (newIndex === initialIndex) break;
			}
		}

		if (newIndex !== selectedIndex) {
			event.preventDefault();
			props.onSelectionChange({ section: props.sections[newIndex] });

			const targetButton = buttonRefs.current[newIndex];
			if (targetButton) {
				focus('Sidebar', targetButton);
			}
		}
	}, [props.sections, props.selection, props.onSelectionChange, matchedSectionNames, isSearching]);

	const buttons: React.ReactNode[] = [];

	function renderButton(section: SettingMetadataSection, index: number) {
		const selected = props.selection === section.name;
		const hasMatch = matchedSectionNames.has(section.name);
		const isDisabled = isSearching && !hasMatch;
		const isActiveTab = selected && !isDisabled;

		return (
			<StyledListItem
				key={section.name}
				type='button'
				role='tab'
				ref={(item: HTMLElement) => { buttonRefs.current[index] = item; }}

				id={`setting-tab-${section.name}`}
				aria-controls={`setting-section-${section.name}`}
				aria-selected={isActiveTab}
				aria-disabled={isDisabled}
				tabIndex={isActiveTab ? 0 : -1}

				isSubSection={Setting.isSubSection(section.name)}
				selected={isActiveTab}
				disabled={isDisabled}
				onClick={() => {
					if (isDisabled) return;
					props.onSelectionChange({ section: section });
				}}
				onKeyDown={!isDisabled ? onKeyDown : undefined}
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
		<StyledRoot className='settings-sidebar _scrollbar2'>
			<StyledSearchContainer>
				<SearchInput
					inputRef={null}
					value={props.searchQuery}
					onChange={props.onSearchQueryChange}
					onSearchButtonClick={props.onSearchButtonClick}
					searchStarted={isSearching}
					placeholder={_('Search settings...')}
				/>
			</StyledSearchContainer>
			<StyledTabList role='tablist'>
				{buttons}
			</StyledTabList>
		</StyledRoot>
	);
}
