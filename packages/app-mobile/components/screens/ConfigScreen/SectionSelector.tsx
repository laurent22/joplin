import * as React from 'react';

import Setting, { AppType, SettingMetadataSection } from '@joplin/lib/models/Setting';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { ConfigScreenStyles } from './configScreenStyles';
import { Button } from 'react-native-paper';
import { FlatList, Text, View } from 'react-native';
import { settingsSections } from '@joplin/lib/components/shared/config/config-shared';
import { _ } from '@joplin/lib/locale';

interface Props {
	styles: ConfigScreenStyles;

	minWidth: number|undefined;

	settings: any;
	selectedSectionName: string|null;
	openSection: (sectionName: string)=> void;
}

const SectionSelector: FunctionComponent<Props> = props => {
	const sections = useMemo(() => {
		return settingsSections({ device: AppType.Mobile, settings: props.settings });
	}, [props.settings]);

	const itemHeight = 50;

	const onRenderButton = ({ item }: { item: SettingMetadataSection }) => {
		const section = item;
		const selected = props.selectedSectionName === section.name;
		const icon = Setting.sectionNameToIcon(section.name, AppType.Mobile);
		const label = Setting.sectionNameToLabel(section.name);

		return (
			<Button
				key={section.name}
				accessibilityLabel={_('Selected: %s', label)}
				onPress={() => props.openSection(section.name)}
				contentStyle={{
					justifyContent: 'flex-start',
					alignItems: 'center',
					height: 50,
				}}
				buttonColor={selected ? props.styles.selectedSectionButtonColor : undefined}
				mode={selected ? 'contained-tonal' : 'text'}
				icon={icon}
			>
				<Text style={props.styles.styleSheet.headerTextStyle}>
					{label}
				</Text>
			</Button>
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
		<View style={{ minWidth: props.minWidth, flexShrink: 1, flexDirection: 'column' }}>
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
