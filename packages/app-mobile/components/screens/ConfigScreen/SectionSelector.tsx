import * as React from 'react';

import Setting, { AppType } from '@joplin/lib/models/Setting';
import { FunctionComponent, ReactNode, useMemo } from 'react';
import { ConfigScreenStyles } from './configScreenStyles';
import { Button } from 'react-native-paper';
import { ScrollView, Text, View } from 'react-native';
import { settingsSections } from '@joplin/lib/components/shared/config-shared';

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

	const sectionButtons: ReactNode[] = [];

	for (const section of sections) {
		const selected = props.selectedSectionName === section.name;

		// TODO(personalizedrefrigerator): Accessibility: Mark which button is selected
		sectionButtons.push(
			<Button
				key={section.name}
				onPress={() => props.openSection(section.name)}
				contentStyle={{ flexDirection: 'row-reverse' }}
				buttonColor={selected ? props.styles.selectedSectionButtonColor : undefined}
				mode={selected ? 'elevated' : 'text'}
				icon='chevron-right'
			>
				<Text numberOfLines={0}>{Setting.sectionNameToLabel(section.name)}</Text>
			</Button>
		);
	}

	// Add an additional spacer at the end to ensure that the last item is visible
	sectionButtons.push(<View key='end-spacer' style={{ height: 15 }}></View>);

	return (
		<View style={{ minWidth: props.minWidth }}>
			<ScrollView>
				{sectionButtons}
			</ScrollView>
		</View>
	);
};

export default SectionSelector;
