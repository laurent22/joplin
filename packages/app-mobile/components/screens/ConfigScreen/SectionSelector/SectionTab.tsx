import * as React from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import Icon from '../../../Icon';
import BetaChip from '../../../BetaChip';
import { TouchableRipple, Text } from 'react-native-paper';
import { View } from 'react-native';
import Setting, { AppType, SettingMetadataSection } from '@joplin/lib/models/Setting';

interface Props {
	selected: boolean;
	section: SettingMetadataSection;
	styles: ConfigScreenStyles;
	onPress: ()=> void;
}

const SectionTab: React.FC<Props> = ({ styles, onPress, selected, section }) => {
	const icon = Setting.sectionNameToIcon(section.name, AppType.Mobile);
	const label = Setting.sectionNameToLabel(section.name);
	const shortDescription = Setting.sectionMetadataToSummary(section);

	const styleSheet = styles.styleSheet;
	const titleStyle = selected ? styleSheet.sidebarSelectedButtonText : styleSheet.sidebarButtonMainText;

	const isBeta = section.name === 'plugins';
	const betaChip = isBeta ? <BetaChip size={10}/> : null;

	return (
		<TouchableRipple
			key={section.name}
			role='tab'
			aria-selected={selected}
			onPress={onPress}
		>
			<View
				style={selected ? styleSheet.selectedSidebarButton : styleSheet.sidebarButton}
			>
				<Icon
					name={icon}
					accessibilityLabel={null}
					style={styleSheet.sidebarIcon}
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
						style={styleSheet.sidebarButtonDescriptionText}
						numberOfLines={1}
						ellipsizeMode='tail'
					>
						{shortDescription ?? ''}
					</Text>
				</View>
			</View>
		</TouchableRipple>
	);
};

export default SectionTab;
