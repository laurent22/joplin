import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Icon, Surface, Text } from 'react-native-paper';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import AccessibleView from '../accessibility/AccessibleView';
import { RecorderState } from './types';

interface Props {
	recorderState: RecorderState;
	heading: string;
	content: React.ReactNode|string;
	preview: React.ReactNode;
	actions: React.ReactNode;
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 10,
		width: 680,
		flexShrink: 1,
		maxWidth: '100%',
		alignSelf: 'center',
	},
	contentWrapper: {
		flexDirection: 'row',
	},
	iconWrapper: {
		margin: 8,
		marginTop: 16,
	},
	content: {
		flexShrink: 1,
		marginTop: 16,
		marginHorizontal: 8,
	},
	actionContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 6,
		marginBottom: 6,
	},
});

const RecordingControls: React.FC<Props> = props => {
	const renderIcon = () => {
		const components: Record<RecorderState, IconSource> = {
			[RecorderState.Loading]: ({ size }: { size: number }) => <ActivityIndicator animating={true} style={{ width: size, height: size }} />,
			[RecorderState.Recording]: 'microphone',
			[RecorderState.Idle]: 'microphone',
			[RecorderState.Processing]: 'microphone',
			[RecorderState.Downloading]: ({ size }: { size: number }) => <ActivityIndicator animating={true} style={{ width: size, height: size }} />,
			[RecorderState.Error]: 'alert-circle-outline',
		};

		return components[props.recorderState];
	};

	return <Surface>
		<View style={styles.container}>
			<View style={styles.contentWrapper}>
				<View style={styles.iconWrapper}>
					<Icon source={renderIcon()} size={40}/>
				</View>
				<View style={styles.content}>
					<AccessibleView
						// Auto-focus
						refocusCounter={1}
						aria-live='polite'
						role='heading'
						testID='recording-controls-heading'
					>
						<Text variant='bodyMedium'>
							{props.heading}
						</Text>
					</AccessibleView>
					<Text
						variant='bodyMedium'
						// role="status" might fit better here. However, react-native
						// doesn't seem to support it.
						role='alert'
						// Although on web, role=alert should imply aria-live=polite,
						// this does not seem to be the case for React Native:
						accessibilityLiveRegion='polite'
					>{props.content}</Text>
					{props.preview}
				</View>
			</View>
			<View style={styles.actionContainer}>
				{props.actions}
			</View>
		</View>
	</Surface>;
};

export default RecordingControls;
