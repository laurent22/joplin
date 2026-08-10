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

			if (!matchedSectionNames.has(props.sections[newIndex].name)) return;
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

		const classNames = ['item'];
		if (Setting.isSubSection(section.name)) classNames.push('sub');
		if (isActiveTab) classNames.push('selected');
		if (isDisabled) classNames.push('disabled');

		return (
			<button
				key={section.name}
				type='button'
				role='tab'
				ref={(item: HTMLElement | null) => {
					if (item) {
						buttonRefs.current[index] = item;
					}
				}}
				className={classNames.join(' ')}
				id={`setting-tab-${section.name}`}
				aria-controls={isSearching ? (isDisabled ? undefined : 'setting-section-search-results') : `setting-section-${section.name}`}
				aria-selected={isActiveTab}
				aria-disabled={isDisabled}
				tabIndex={isActiveTab ? 0 : -1}
				onClick={() => {
					if (isDisabled) return;
					props.onSelectionChange({ section: section });
				}}
				onKeyDown={!isDisabled ? onKeyDown : undefined}
			>
				<i
					className={`icon ${Setting.sectionNameToIcon(section.name, AppType.Desktop)}`}
					role='img'
					aria-hidden='true'
				/>
				<span className='label'>
					{highlightSearchText(Setting.sectionNameToLabel(section.name), props.searchQuery)}
				</span>
			</button>
		);
	}

	function renderDivider(key: string) {
		return (
			<div key={key} className='separator' role='presentation' aria-hidden='true'>
				{_('Plugins')}
			</div>
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
		<div className='settings-sidebar _scrollbar2'>
			<div className='searchbox'>
				<SearchInput
					inputRef={null}
					inputClassName='settings'
					value={props.searchQuery}
					onChange={props.onSearchQueryChange}
					onSearchButtonClick={props.onSearchButtonClick}
					searchStarted={isSearching}
					placeholder={_('Search settings...')}
					aria-controls={isSearching ? 'setting-section-search-results' : undefined}
					iconButtonTabIndex={-1}
				/>
			</div>
			<div role='tablist' className='tablist'>
				{buttons}
			</div>
		</div>
	);
}
