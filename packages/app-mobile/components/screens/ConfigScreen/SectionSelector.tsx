import * as React from 'react';

import Setting, { AppType } from '@joplin/lib/models/Setting';
import { FunctionComponent, ReactNode, useMemo } from 'react';
import { ConfigScreenStyles } from './configScreenStyles';
import { Button } from 'react-native-paper';
import { ScrollView, Text } from 'react-native';
import { settingsSections } from '@joplin/lib/components/shared/config-shared';

interface Props {
	styles: ConfigScreenStyles;

	settings: any;
	openSection: (sectionName: string)=> void;
}

const SectionSelector: FunctionComponent<Props> = props => {
	const sections = useMemo(() => {
		return settingsSections({ device: AppType.Mobile, settings: props.settings });
	}, [props.settings]);

	const sectionButtons: ReactNode[] = [];

	for (const section of sections) {
		sectionButtons.push(
			<Button
				key={section.name}
				onPress={() => props.openSection(section.name)}
				contentStyle={{ flexDirection: 'row-reverse' }}
				icon='chevron-right'
			>
				<Text>{Setting.sectionNameToLabel(section.name)}</Text>
			</Button>
		);
	}

	return (
		<ScrollView>
			{sectionButtons}
		</ScrollView>
	);
};

export default SectionSelector;
