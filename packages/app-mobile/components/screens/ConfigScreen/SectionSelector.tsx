import * as React from 'react';

import Setting, { AppType, SettingMetadataSection, SettingSectionSource } from '@joplin/lib/models/Setting';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { ConfigScreenStyles } from './configScreenStyles';
import { FlatList, Text, View, ViewStyle } from 'react-native';
import { settingsSections } from '@joplin/lib/components/shared/config/config-shared';
import Icon from '../../Icon';
import { _ } from '@joplin/lib/locale';
import { TouchableRipple } from 'react-native-paper';
import BetaChip from '../../BetaChip';

interface Props {
	styles: ConfigScreenStyles;

	width: number|undefined;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
		const isPlugin = item.source === SettingSectionSource.Plugin;

		const titleStyle = selected ? styles.sidebarSelectedButtonText : styles.sidebarButtonMainText;

		const sourceIcon = isPlugin ? (
			<Icon
				name='fas fa-puzzle-piece'
				accessibilityLabel={_('From a plugin')}
				style={titleStyle}
			/>
		) : null;

		const isBeta = item.name === 'plugins';
		const betaChip = isBeta ? <BetaChip size={10}/> : null;

		return (
			<TouchableRipple
				key={section.name}
				role='tab'
				aria-selected={selected}
				onPress={() => props.openSection(section.name)}
			>
				<View
					style={selected ? styles.selectedSidebarButton : styles.sidebarButton}
				>
					<Icon
						name={icon}
						accessibilityLabel={null}
						style={styles.sidebarIcon}
					/>
					<View style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
						<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
							<Text
								numberOfLines={1}
								style={titleStyle}
							>
								{label}
							</Text>

							{betaChip}
						</View>
						<Text
							style={styles.sidebarButtonDescriptionText}
							numberOfLines={1}
							ellipsizeMode='tail'
						>
							{shortDescription ?? ''}
						</Text>
					</View>
					{sourceIcon}
				</View>
			</TouchableRipple>
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

	const containerStyle: ViewStyle = useMemo(() => ({
		width: props.width,
		maxWidth: props.width,
		minWidth: props.width,
		flex: 1,
	}), [props.width]);

	return (
		<View style={containerStyle}>
			<FlatList
				role='tablist'
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
