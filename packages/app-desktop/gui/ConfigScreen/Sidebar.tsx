import { AppType, MetadataBySection, SettingMetadataSection, SettingSectionSource } from '@joplin/lib/models/Setting';
import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { useCallback, useMemo, useRef } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
import { highlightSearchMatches } from './configScreenUtils';
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
	topContent?: React.ReactNode;
	disabledSectionNames?: string[];
	searchMode?: boolean;
	searchQuery?: string;
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
	cursor: default;
	opacity: ${(props: StyleProps) => {
		if (props.disabled) return 0.45;
		return props.selected ? 1 : 0.8;
	}};
	padding-left: ${(props: StyleProps) => props.isSubSection ? '35' : props.theme.mainPadding}px;
	pointer-events: ${(props: StyleProps) => props.disabled ? 'none' : 'auto'};

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
	const disabledSectionNames = useMemo(() => props.disabledSectionNames ?? [], [props.disabledSectionNames]);
	const isSectionDisabled = useCallback((sectionName: string) => {
		return disabledSectionNames.includes(sectionName);
	}, [disabledSectionNames]);
	const selectedIndex = useMemo(() => {
		return props.sections.findIndex(section => section.name === props.selection);
	}, [props.sections, props.selection]);
	const enabledIndexes = useMemo(() => {
		return props.sections
			.map((section, index) => isSectionDisabled(section.name) ? -1 : index)
			.filter(index => index >= 0);
	}, [props.sections, isSectionDisabled]);
	const tabbableIndex = useMemo(() => {
		if (!enabledIndexes.length) return -1;
		if (selectedIndex >= 0 && enabledIndexes.includes(selectedIndex)) return selectedIndex;
		return enabledIndexes[0];
	}, [enabledIndexes, selectedIndex]);

	// Making a tabbed region accessible involves supporting keyboard interaction.
	// See https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ for details
	const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback((event) => {
		if (!enabledIndexes.length) return;

		if (event.code === 'ArrowUp') {
			event.preventDefault();
			const focusedIndex = buttonRefs.current.findIndex(item => item === event.currentTarget);
			let currentEnabledIndex = enabledIndexes.indexOf(focusedIndex);
			if (currentEnabledIndex < 0) currentEnabledIndex = enabledIndexes.indexOf(tabbableIndex);
			if (currentEnabledIndex < 0) currentEnabledIndex = 0;
			currentEnabledIndex --;
			if (currentEnabledIndex < 0) currentEnabledIndex += enabledIndexes.length;
			const targetIndex = enabledIndexes[currentEnabledIndex];
			if (targetIndex !== selectedIndex) {
				props.onSelectionChange({ section: props.sections[targetIndex] });
			}
			const targetButton = buttonRefs.current[targetIndex];
			if (targetButton) focus('Sidebar', targetButton);
			return;
		} else if (event.code === 'ArrowDown') {
			event.preventDefault();
			const focusedIndex = buttonRefs.current.findIndex(item => item === event.currentTarget);
			let currentEnabledIndex = enabledIndexes.indexOf(focusedIndex);
			if (currentEnabledIndex < 0) currentEnabledIndex = enabledIndexes.indexOf(tabbableIndex);
			if (currentEnabledIndex < 0) currentEnabledIndex = 0;
			currentEnabledIndex ++;
			currentEnabledIndex %= enabledIndexes.length;
			const targetIndex = enabledIndexes[currentEnabledIndex];
			if (targetIndex !== selectedIndex) {
				props.onSelectionChange({ section: props.sections[targetIndex] });
			}
			const targetButton = buttonRefs.current[targetIndex];
			if (targetButton) focus('Sidebar', targetButton);
			return;
		} else if (event.code === 'Home') {
			const targetButton = buttonRefs.current[enabledIndexes[0]];
			if (targetButton) {
				event.preventDefault();
				focus('Sidebar', targetButton);
			}
			return;
		} else if (event.code === 'End') {
			const targetButton = buttonRefs.current[enabledIndexes[enabledIndexes.length - 1]];
			if (targetButton) {
				event.preventDefault();
				focus('Sidebar', targetButton);
			}
			return;
		} else if (event.code === 'Enter' || event.code === 'Space' || event.key === ' ' || event.key === 'Enter') {
			const focusedIndex = buttonRefs.current.findIndex(item => item === event.currentTarget);
			const targetIndex = focusedIndex >= 0 ? focusedIndex : selectedIndex;
			const selectedSection = targetIndex >= 0 ? props.sections[targetIndex] : null;
			if (selectedSection && !isSectionDisabled(selectedSection.name)) {
				event.preventDefault();
				props.onSelectionChange({ section: selectedSection });
			}
			return;
		}
	}, [enabledIndexes, tabbableIndex, props.sections, props.onSelectionChange, isSectionDisabled, selectedIndex]);

	const buttons: React.ReactNode[] = [];

	function renderButton(section: SettingMetadataSection, index: number) {
		const selected = props.selection === section.name;
		const disabled = isSectionDisabled(section.name);
		const sectionLabel = Setting.sectionNameToLabel(section.name);
		const sectionIconName = Setting.sectionNameToIcon(section.name, AppType.Desktop);
		const hasQuery = !!(props.searchQuery && props.searchQuery.trim().length);
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
				tabIndex={index === tabbableIndex ? 0 : -1}

				isSubSection={Setting.isSubSection(section.name)}
				selected={selected}
				disabled={disabled}
				onClick={() => { props.onSelectionChange({ section: section }); }}
				onKeyDown={onKeyDown}
			>
				<StyledListItemIcon
					className={sectionIconName}
					role='img'
					aria-hidden='true'
				/>
				<StyledListItemLabel>
					{hasQuery ? highlightSearchMatches(sectionLabel, props.searchQuery || '') : sectionLabel}
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
		index ++;
	}

	return (
		<StyledRoot className='settings-sidebar _scrollbar2'>
			{props.topContent}
			<div role='tablist'>
				{buttons}
			</div>
		</StyledRoot>
	);
}
