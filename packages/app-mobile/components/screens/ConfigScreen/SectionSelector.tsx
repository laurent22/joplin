import * as React from 'react';

import Setting, { AppType, SettingMetadataSection } from '@joplin/lib/models/Setting';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { ConfigScreenStyles } from './configScreenStyles';
import { FlatList, Text, Pressable, View } from 'react-native';
import { settingsSections } from '@joplin/lib/components/shared/config/config-shared';
const Icon = require('react-native-vector-icons/MaterialCommunityIcons').default;
import { _ } from '@joplin/lib/locale';

interface Props {
	styles: ConfigScreenStyles;

	width: number|undefined;

	settings: any;
	selectedSectionName: string|null;
	openSection: (sectionName: string)=> void;
}

const SectionSelector: FunctionComponent<Props> = props => {
	const sections = useMemo(() => {
		return settingsSections({ device: AppType.Mobile, settings: props.settings });
	}, [props.settings]);
	const styles = props.styles.styleSheet;

	const itemHeight = styles.sidebarButton.height;

	const onRenderButton = ({ item }: { item: SettingMetadataSection }) => {
		const section = item;
		const selected = props.selectedSectionName === section.name;
		const icon = Setting.sectionNameToIcon(section.name, AppType.Mobile);
		const label = Setting.sectionNameToLabel(section.name);
		const shortDescription = Setting.sectionMetadataToSummary(section);

		return (
			<Pressable
				key={section.name}
				accessibilityLabel={ selected ? _('Selected: %s', label) : undefined }
				onPress={() => props.openSection(section.name)}
				style={selected ? styles.selectedSidebarButton : styles.sidebarButton}
			>
				<Icon
					name={icon}
					style={styles.sidebarIcon}
				/>
				<View style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
					<Text
						style={selected ? styles.sidebarSelectedButtonText : styles.sidebarButtonMainText}
					>
						{label}
					</Text>
					<Text
						style={styles.sidebarButtonDescriptionText}
						numberOfLines={2}
						ellipsizeMode='tail'
					>
						{shortDescription ?? ''}
					</Text>
				</View>
			</Pressable>
		);
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

	return (
		<View style={{ width: props.width, flexDirection: 'column' }}>
			<FlatList
				ref={setFlatListRef}
				data={sections}
				renderItem={onRenderButton}
				keyExtractor={item => item.name}
				getItemLayout={(_data, index) => ({
					length: itemHeight, offset: itemHeight * index, index,
				})}
			/>
		</View>
	);
};

export default SectionSelector;
