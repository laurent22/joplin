import * as React from 'react';

import { AppType, SettingMetadataSection, SettingSectionSource } from '@joplin/lib/models/Setting';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import { FlatList, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { settingsSections } from '@joplin/lib/components/shared/config/config-shared';
import { _ } from '@joplin/lib/locale';
import SectionTab from './SectionTab';

interface Props {
	styles: ConfigScreenStyles;

	width: number|undefined;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	settings: Record<string, any>;
	selectedSectionName: string|null;
	openSection: (sectionName: string)=> void;
}
type SectionDivider = { divider: boolean; label: string; name: string; source?: string };

const SectionSelector: FunctionComponent<Props> = props => {
	type SectionListType = (SectionDivider|SettingMetadataSection)[];
	const sections = useMemo((): SectionListType => {
		const allSections = settingsSections({ device: AppType.Mobile, settings: props.settings });

		const builtInSections = [];
		const pluginSections = [];
		for (const section of allSections) {
			if (section.source === SettingSectionSource.Plugin) {
				pluginSections.push(section);
			} else {
				builtInSections.push(section);
			}
		}

		let result: SectionListType = builtInSections;
		if (pluginSections.length > 0) {
			result = result.concat([
				{ label: _('Plugins'), name: 'plugins-divider', divider: true },
				...pluginSections,
			]);
		}
		return result;
	}, [props.settings]);

	const styles = props.styles.styleSheet;
	const onRenderButton = ({ item }: { item: SettingMetadataSection|SectionDivider }) => {
		const section = item;
		const selected = props.selectedSectionName === section.name;

		if ('divider' in item && item.divider) {
			return (
				<View style={styles.sidebarHeader}>
					<Text variant='labelLarge' style={styles.sidebarHeaderText}>{item.label}</Text>
				</View>
			);
		} else {
			return (
				<SectionTab
					selected={selected}
					section={section as SettingMetadataSection}
					styles={props.styles}
					onPress={() => props.openSection(section.name)}
				/>
			);
		}
	};

	const [flatListRef, setFlatListRef] = useState<FlatList|null>(null);

	useEffect(() => {
		if (flatListRef && props.selectedSectionName) {
			let selectedIndex = 0;
			for (const section of sections) {
				if (section.name === props.selectedSectionName) {
					break;
				}
				selectedIndex ++;
			}

			flatListRef.scrollToIndex({
				index: selectedIndex,
				viewPosition: 0.5,
			});
		}
	}, [props.selectedSectionName, flatListRef, sections]);

	const containerStyle: ViewStyle = useMemo(() => ({
		width: props.width,
		maxWidth: props.width,
		minWidth: props.width,
		flex: 1,
	}), [props.width]);

	return (
		<View style={containerStyle}>
			<FlatList
				ref={setFlatListRef}
				data={sections}
				renderItem={onRenderButton}
				keyExtractor={item => item.name}
				onScrollToIndexFailed={({ index, averageItemLength }) => {
					// Scrolling to a particular index can fail if the item at that index hasn't been rendered yet.
					// This shouldn't happen often, so a guess should be sufficient.
					flatListRef.scrollToOffset({ offset: (index + 0.5) * averageItemLength });
				}}
			/>
		</View>
	);
};

export default SectionSelector;
