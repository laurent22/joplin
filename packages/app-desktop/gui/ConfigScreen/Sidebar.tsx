import { AppType, MetadataBySection, SettingMetadataSection, SettingSectionSource } from '@joplin/lib/models/Setting';
import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { useCallback, useRef } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
import { highlightText } from './searchUtils';
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
	onSearchQueryChange: (query: string)=> void;
	sectionsWithMatches: Set<string>;
	searchFilterSection: string|null;
	onSearchFilterSectionChange: (sectionName: string|null)=> void;
}

export const StyledRoot = styled.div`
	display: flex;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor2};
	flex-direction: column;
	overflow-x: hidden;
	overflow-y: auto;
`;

export const StyledListItem = styled.a`
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	background: ${(props: StyleProps) => props.selected ? props.theme.selectedColor2 : 'none'};
	transition: 0.1s;
	text-decoration: none;
	cursor: ${(props: StyleProps) => props.dimmed ? 'default' : 'pointer'};
	opacity: ${(props: StyleProps) => props.dimmed ? 0.35 : (props.selected ? 1 : 0.8)};
	pointer-events: ${(props: StyleProps) => props.dimmed ? 'none' : 'auto'};
	padding-left: ${(props: StyleProps) => props.isSubSection ? '35' : props.theme.mainPadding}px;

	&:hover {
		background-color: ${(props: StyleProps) => props.dimmed ? 'none' : props.theme.backgroundColorHover2};
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
	const searchInputRef = useRef<HTMLInputElement>(null);

	const isSearchActive = props.searchQuery.trim().length > 0;

	const navigableSections = isSearchActive
		? props.sections.filter(s => props.sectionsWithMatches.has(s.name))
		: props.sections;

	const currentSectionName = isSearchActive ? props.searchFilterSection : props.selection;

	const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback((event) => {
		const selectedIndex = navigableSections.findIndex(section => section.name === currentSectionName);
		let newIndex = selectedIndex < 0 ? 0 : selectedIndex;

		if (event.code === 'ArrowUp') {
			newIndex--;
		} else if (event.code === 'ArrowDown') {
			newIndex++;
		} else if (event.code === 'Home') {
			newIndex = 0;
		} else if (event.code === 'End') {
			newIndex = navigableSections.length - 1;
		}

		if (newIndex < 0) newIndex += navigableSections.length;
		newIndex %= navigableSections.length;

		if (newIndex !== selectedIndex) {
			event.preventDefault();
			const targetSection = navigableSections[newIndex];
			if (isSearchActive) {
				props.onSearchFilterSectionChange(targetSection.name);
			} else {
				props.onSelectionChange({ section: targetSection });
			}

			const globalIndex = props.sections.findIndex(s => s.name === targetSection.name);
			const targetButton = buttonRefs.current[globalIndex];
			if (targetButton) focus('Sidebar', targetButton);
		}
	}, [navigableSections, currentSectionName, isSearchActive, props.sections, props.onSelectionChange, props.onSearchFilterSectionChange]);

	const buttons: React.ReactNode[] = [];

	function renderButton(section: SettingMetadataSection, index: number) {
		const hasMatch = !isSearchActive || props.sectionsWithMatches.has(section.name);
		const selected = isSearchActive
			? props.searchFilterSection === section.name
			: props.selection === section.name;

		const label = Setting.sectionNameToLabel(section.name);
		const labelNode = isSearchActive && hasMatch && props.searchQuery
			? highlightText(label, props.searchQuery)
			: label;

		const onClick = (e: React.MouseEvent) => {
			e.preventDefault();
			if (!hasMatch) return;
			if (isSearchActive) {
				props.onSearchFilterSectionChange(
					props.searchFilterSection === section.name ? null : section.name,
				);
			} else {
				props.onSelectionChange({ section });
			}
		};

		return (
			<StyledListItem
				key={section.name}
				href='#'
				role='tab'
				ref={(item: HTMLElement) => { buttonRefs.current[index] = item; }}

				id={`setting-tab-${section.name}`}
				aria-controls={`setting-section-${section.name}`}
				aria-selected={selected}
				aria-disabled={isSearchActive && !hasMatch}
				tabIndex={selected ? 0 : -1}

				isSubSection={Setting.isSubSection(section.name)}
				selected={selected}
				dimmed={isSearchActive && !hasMatch}
				onClick={onClick}
				onKeyDown={onKeyDown}
			>
				<StyledListItemIcon
					className={Setting.sectionNameToIcon(section.name, AppType.Desktop)}
					role='img'
					aria-hidden='true'
				/>
				<StyledListItemLabel>
					{labelNode}
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
	for (const section of props.sections) {
		if (section.source === SettingSectionSource.Plugin && !pluginDividerAdded) {
			buttons.push(renderDivider('divider-plugins'));
			pluginDividerAdded = true;
		}

		buttons.push(renderButton(section, index));
		index++;
	}

	return (
		<StyledRoot className='settings-sidebar _scrollbar2'>
			<div className='config-sidebar-search'>
				<span className='config-sidebar-search-icon fa fa-search' aria-hidden='true'/>
				<input
					ref={searchInputRef}
					className='config-sidebar-search-input'
					type='search'
					value={props.searchQuery}
					onChange={(e) => props.onSearchQueryChange(e.target.value)}
					placeholder={_('Search settings...')}
					aria-label={_('Search settings')}
				/>
				{isSearchActive && (
					<button
						type='button'
						className='config-sidebar-search-clear'
						title={_('Clear search')}
						aria-label={_('Clear search')}
						onClick={() => props.onSearchQueryChange('')}
					>
						<span className='fa fa-times' aria-hidden='true'/>
					</button>
				)}
			</div>
			<div role='tablist'>
				{buttons}
			</div>
		</StyledRoot>
	);
}
