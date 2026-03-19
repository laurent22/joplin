import { AppType, MetadataBySection, SettingMetadataSection, SettingSectionSource } from '@joplin/lib/models/Setting';
import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { useCallback, useMemo, useRef } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
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

	// Making a tabbed region accessible involves supporting keyboard interaction.
	// See https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ for details
	const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback((event) => {
		const selectedIndex = props.sections.findIndex(section => section.name === props.selection);
		const enabledIndexes = props.sections
			.map((section, index) => isSectionDisabled(section.name) ? -1 : index)
			.filter(index => index >= 0);
		if (!enabledIndexes.length) return;

		let newEnabledIndex = enabledIndexes.indexOf(selectedIndex);
		if (newEnabledIndex < 0) newEnabledIndex = 0;

		if (event.code === 'ArrowUp') {
			newEnabledIndex --;
		} else if (event.code === 'ArrowDown') {
			newEnabledIndex ++;
		} else if (event.code === 'Home') {
			newEnabledIndex = 0;
		} else if (event.code === 'End') {
			newEnabledIndex = enabledIndexes.length - 1;
		} else if (event.code === 'Enter' || event.code === 'Space' || event.key === ' ' || event.key === 'Enter') {
			const selectedSection = props.sections[selectedIndex];
			if (selectedSection && !isSectionDisabled(selectedSection.name)) {
				event.preventDefault();
				props.onSelectionChange({ section: selectedSection });
			}
			return;
		}

		if (newEnabledIndex < 0) newEnabledIndex += enabledIndexes.length;
		newEnabledIndex %= enabledIndexes.length;
		const newIndex = enabledIndexes[newEnabledIndex];

		if (newIndex !== selectedIndex) {
			event.preventDefault();
			props.onSelectionChange({ section: props.sections[newIndex] });

			const targetButton = buttonRefs.current[newIndex];
			if (targetButton) {
				focus('Sidebar', targetButton);
			}
		}
	}, [props.sections, props.selection, props.onSelectionChange, isSectionDisabled]);

	const buttons: React.ReactNode[] = [];

	function renderButton(section: SettingMetadataSection, index: number) {
		const selected = props.selection === section.name;
		const disabled = isSectionDisabled(section.name);
		const sectionLabel = section.name === 'all' ? _('All') : Setting.sectionNameToLabel(section.name);
		const sectionIconName = section.name === 'all' ? 'fas fa-list' : Setting.sectionNameToIcon(section.name, AppType.Desktop);
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
				tabIndex={selected && !disabled ? 0 : -1}

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
					{sectionLabel}
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
		if (section.source === SettingSectionSource.Plugin && !pluginDividerAdded && section.name !== 'all') {
			buttons.push(renderDivider('divider-plugins'));
			pluginDividerAdded = true;
		}

		buttons.push(renderButton(section, index));
		index ++;
	}

	return (
		<StyledRoot className='settings-sidebar _scrollbar2' role='tablist'>
			{props.topContent}
			{buttons}
		</StyledRoot>
	);
}
