import { AppType, MetadataBySection, SettingMetadataSection, SettingSectionSource } from '@joplin/lib/models/Setting';
import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { useCallback, useMemo, useRef } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
import HighlightedSearchText from './HighlightedSearchText';
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
	header?: React.ReactNode;
	searching: boolean;
	searchQuery: string;
	disabledSectionNames: string[];
}

export const StyledRoot = styled.div`
	display: flex;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor2};
	flex-direction: column;
	overflow-x: hidden;
	overflow-y: auto;
`;

export const StyledHeader = styled.div`
	box-sizing: border-box;
	padding: ${(props: StyleProps) => props.theme.mainPadding}px;
	padding-bottom: ${(props: StyleProps) => props.theme.mainPadding * .75}px;
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
	opacity: ${(props: StyleProps) => props.disabled ? 0.4 : props.selected ? 1 : 0.8};
	padding-left: ${(props: StyleProps) => props.isSubSection ? '35' : props.theme.mainPadding}px;
	pointer-events: ${(props: StyleProps) => props.disabled ? 'none' : 'auto'};

	&:hover {
		background-color: ${(props: StyleProps) => props.disabled ? 'transparent' : props.theme.backgroundColorHover2};
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
	const disabledSectionSet = useMemo(() => {
		return new Set(props.disabledSectionNames);
	}, [props.disabledSectionNames]);

	const isSectionDisabled = useCallback((sectionName: string) => {
		return disabledSectionSet.has(sectionName);
	}, [disabledSectionSet]);

	const nextEnabledIndex = useCallback((startIndex: number, step: number) => {
		if (!props.sections.length) return -1;

		let attempts = 0;
		let index = startIndex;

		while (attempts < props.sections.length) {
			if (!isSectionDisabled(props.sections[index].name)) {
				return index;
			}

			index += step;
			if (index < 0) index = props.sections.length - 1;
			if (index >= props.sections.length) index = 0;
			attempts ++;
		}

		return -1;
	}, [props.sections, isSectionDisabled]);

	// Making a tabbed region accessible involves supporting keyboard interaction.
	// See https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ for details
	const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback((event) => {
		const currentSectionName = event.currentTarget.getAttribute('data-section-name') ?? '';
		if (isSectionDisabled(currentSectionName)) return;
		const currentIndex = props.sections.findIndex(section => section.name === currentSectionName);
		if (currentIndex < 0) return;

		if (event.key === 'Tab' && !event.shiftKey) {
			const controlledPanelId = event.currentTarget.getAttribute('aria-controls');
			if (controlledPanelId) {
				const controlledPanel = document.getElementById(controlledPanelId);
				if (controlledPanel) {
					event.preventDefault();
					focus('Sidebar::tabpanel', controlledPanel as HTMLElement);
					return;
				}
			}
		}

		let newIndex = currentIndex;
		let step = 1;

		if (event.code === 'ArrowUp') {
			newIndex --;
			step = -1;
		} else if (event.code === 'ArrowDown') {
			newIndex ++;
			step = 1;
		} else if (event.code === 'Home') {
			newIndex = nextEnabledIndex(0, 1);
			if (newIndex < 0) return;
		} else if (event.code === 'End') {
			newIndex = nextEnabledIndex(props.sections.length - 1, -1);
			if (newIndex < 0) return;
		}

		if (newIndex < 0) newIndex += props.sections.length;
		newIndex %= props.sections.length;

		if (newIndex !== currentIndex && event.code !== 'Home' && event.code !== 'End') {
			newIndex = nextEnabledIndex(newIndex, step);
		}

		if (newIndex < 0) return;

		if (newIndex !== currentIndex) {
			event.preventDefault();
			props.onSelectionChange({ section: props.sections[newIndex] });

			const targetButton = buttonRefs.current[newIndex];
			if (targetButton) {
				focus('Sidebar', targetButton);
			}
		}
	}, [props.sections, props.onSelectionChange, isSectionDisabled, nextEnabledIndex]);

	const buttons: React.ReactNode[] = [];

	function renderButton(section: SettingMetadataSection, index: number) {
		const selected = props.selection === section.name;
		const disabled = isSectionDisabled(section.name);
		const label = Setting.sectionNameToLabel(section.name);
		return (
			<StyledListItem
				key={section.name}
				href='#'
				role='tab'
				ref={(item: HTMLElement) => { buttonRefs.current[index] = item; }}

				id={`setting-tab-${section.name}`}
				data-section-name={section.name}
				aria-controls={props.searching ? 'setting-section-search-results' : `setting-section-${section.name}`}
				aria-disabled={disabled}
				aria-selected={selected}
				tabIndex={selected && !disabled ? 0 : -1}

				isSubSection={Setting.isSubSection(section.name)}
				selected={selected}
				disabled={disabled}
				onClick={() => { if (!disabled) props.onSelectionChange({ section: section }); }}
				onKeyDown={onKeyDown}
			>
				<StyledListItemIcon
					className={Setting.sectionNameToIcon(section.name, AppType.Desktop)}
					role='img'
					aria-hidden='true'
				/>
				<StyledListItemLabel>
					{props.searchQuery ? <HighlightedSearchText text={label} searchQuery={props.searchQuery} /> : label}
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
		<StyledRoot className='settings-sidebar _scrollbar2' role='tablist'>
			{props.header ? <StyledHeader>{props.header}</StyledHeader> : null}
			{buttons}
		</StyledRoot>
	);
}
