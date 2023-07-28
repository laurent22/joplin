import * as React from 'react';

import Setting, { AppType } from '@joplin/lib/models/Setting';
import { FunctionComponent, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { ConfigScreenStyles } from './configScreenStyles';
import { Button } from 'react-native-paper';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from 'react-native';
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

	const [visibleRegion, setVisibleRegion] = useState<{ y: number; height: number }|null>(null);

	const scrollViewRef = useRef<ScrollView>();
	const onSelectedSectionLayout = React.useCallback((event: LayoutChangeEvent) => {
		const y = event.nativeEvent.layout.y;
		const buttonHeight = event.nativeEvent.layout.height;

		const scrollView = scrollViewRef.current;
		if (scrollView && visibleRegion) {
			const withinViewport = y >= visibleRegion.y && y + buttonHeight < visibleRegion.y + visibleRegion.height;

			if (!withinViewport) {
				scrollView.scrollTo({ y });
			}
		}
	}, [visibleRegion]);

	const sectionButtons: ReactNode[] = [];

	for (const section of sections) {
		const selected = props.selectedSectionName === section.name;

		// TODO(personalizedrefrigerator): Accessibility: Mark which button is selected
		sectionButtons.push(
			<Button
				key={section.name}
				onPress={() => props.openSection(section.name)}
				// style={selected ? props.styles.styleSheet.selectedHeaderWrapperStyle : props.styles.styleSheet.headerWrapperStyle}
				buttonColor={selected ? props.styles.selectedSectionButtonColor : undefined}
				mode={selected ? 'elevated' : 'text'}
				icon={'cog'}
				onLayout={selected ? onSelectedSectionLayout : undefined}
			>
				<Text style={props.styles.styleSheet.headerTextStyle}>
					{Setting.sectionNameToLabel(section.name)}
				</Text>
			</Button>
		);
	}

	// Add an additional spacer at the end to ensure that the last item is visible
	sectionButtons.push(<View key='end-spacer' style={{ height: 15 }}></View>);

	type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
	const updateScrollViewVisibileRegion = useCallback((event: ScrollEvent) => {
		setVisibleRegion({
			y: event.nativeEvent.contentOffset.y,
			height: event.nativeEvent.layoutMeasurement.height,
		});
	}, []);

	return (
		<View style={{ minWidth: props.minWidth }}>
			<ScrollView
				ref={scrollViewRef}
				onScroll={updateScrollViewVisibileRegion}
			>
				{sectionButtons}
			</ScrollView>
		</View>
	);
};

export default SectionSelector;
