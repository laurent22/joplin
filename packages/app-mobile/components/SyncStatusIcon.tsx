import * as React from 'react';
import { Alert, Animated, Easing, StyleSheet, View } from 'react-native';
import { ReactElement, useCallback, useEffect, useMemo, useRef } from 'react';
const Ionicon = require('react-native-vector-icons/Ionicons').default;
const FontAwesomeIcon = require('react-native-vector-icons/FontAwesome5').default;

import { connect } from 'react-redux';
import { AnyAction } from 'redux';

import { State } from '@joplin/lib/reducer';
import { SyncReport } from '@joplin/lib/Synchronizer';
import CustomButton from './CustomButton';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import synchronizeButtonPress from '@joplin/lib/components/shared/synchronizeButtonPress';
import { Theme } from '@joplin/lib/themes/type';

type DispatchEventCallback = (eventName: AnyAction)=> void;

interface Props {
	syncStarted: boolean;
	syncReport: SyncReport;
	isOnMobileData: boolean;
	syncOnlyOverWifi: boolean;
	syncTarget: number;

	themeId: number;
	noteLastModifiedTimestamp: number|null;
	dispatch: DispatchEventCallback;
}

const SyncStatusIconComponent = (props: Props) => {
	const styles = useStyles(props.themeId);
	const syncAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (props.syncStarted) {
			const animation = Animated.loop(Animated.timing(syncAnim, {
				toValue: 360,
				duration: 5000,
				easing: Easing.linear,
				useNativeDriver: true,
			}));

			animation.start();
			return () => {
				animation.stop();
			};
		} else {
			syncAnim.stopAnimation(_endValue => {
				syncAnim.setValue(0);
			});

			return () => { };
		}
	}, [syncAnim, props.syncStarted]);


	const hasErrors = useMemo(() => {
		return props.syncReport.errors && props.syncReport.errors.length > 0;
	}, [props.syncReport?.errors]);

	const onSyncButtonPress = useCallback(async () => {
		const hadErrors = hasErrors;
		const status = await synchronizeButtonPress(props.syncStarted, props.dispatch);

		if (hadErrors && status === 'error') {
			const errorsListCopy = props.syncReport.errors.slice();
			const errorMessage = errorsListCopy.reverse().map(error => error.toString()).join('\n');
			Alert.alert(
				_('Sync error'),
				_('Error syncing:\n%s', errorMessage)
			);
		}
	}, [props.syncStarted, props.syncReport, props.dispatch, hasErrors]);

	const syncingIcon = useMemo(() =>
		<Animated.View
			style={{
				transform: [{
					rotate: syncAnim.interpolate({
						inputRange: [0, 360],
						outputRange: ['0deg', '360deg'],
					}),
				}],
			}}
		>
			<FontAwesomeIcon
				style={styles.innerIcon}
				name="sync-alt"
			/>
		</Animated.View>
	, [syncAnim, styles.innerIcon]);

	const syncErrorIcon = useMemo(() =>
		<FontAwesomeIcon
			style={styles.innerIcon}
			name="exclamation-circle"
		/>
	, [styles.innerIcon]);

	const syncSuccessIcon = useMemo(() =>
		<FontAwesomeIcon
			style={styles.innerIcon}
			name="check"
		/>
	, [styles.innerIcon]);

	// Determine the inner/outer icons
	const defaultOuterIconName = 'cloud-outline';
	const [innerIcon, outerIconName, changesPublished] = useMemo((): [ReactElement|null, string, boolean] => {
		let innerIcon: ReactElement|null = null;
		let outerIconName: string = defaultOuterIconName;
		let changesPublished = false;

		const haveNewSyncTarget = (props.syncReport.syncTarget ?? props.syncTarget) !== props.syncTarget;

		if (props.isOnMobileData && props.syncOnlyOverWifi) {
			outerIconName = 'cloud-offline-outline';
		} else if (props.syncStarted && !props.syncReport.cancelling) {
			innerIcon = syncingIcon;
			outerIconName = defaultOuterIconName;
		} else if (haveNewSyncTarget) {
			// Don't show information from the previous sync target.
			outerIconName = 'cloud-upload-outline';
		} else if (hasErrors) {
			innerIcon = syncErrorIcon;
			outerIconName = defaultOuterIconName;
		} else {
			changesPublished = (props.syncReport.startTime ?? 0) > (props.noteLastModifiedTimestamp ?? 0);

			if (changesPublished) {
				changesPublished = true;
				innerIcon = syncSuccessIcon;
			} else {
				outerIconName = 'cloud-upload-outline';
			}
		}

		return [innerIcon, outerIconName, changesPublished];
	}, [
		props.isOnMobileData, props.syncOnlyOverWifi, props.syncStarted, props.syncReport, props.syncTarget,
		props.noteLastModifiedTimestamp, hasErrors,

		syncErrorIcon, syncSuccessIcon, syncingIcon,
	]);

	if (!props.syncTarget || changesPublished) {
		return null;
	}

	return (
		<CustomButton
			themeId={props.themeId}
			description={props.syncStarted ? _('Cancel sync') : _('Sync')}
			onPress={onSyncButtonPress}
		>
			<Ionicon
				style={{
					...styles.icon,
					zIndex: 0,
				}}
				name={outerIconName}
			/>
			<View
				style={{
					position: 'absolute',
				}}
			>
				{innerIcon}
			</View>
		</CustomButton>
	);
};

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme: Theme = themeStyle(themeId ?? 0);
		const iconStyle = {
			fontSize: 30,
			color: theme.color2,
		};

		return StyleSheet.create({
			icon: iconStyle,
			innerIcon: {
				...iconStyle,
				transform: [{
					scale: 0.4,
				}],
			},
		});
	}, [themeId]);
};

const SyncStatusIcon = connect((state: State) => {
	return {
		syncStarted: state.syncStarted,
		syncReport: state.syncReport,
		themeId: state.settings.theme as number,
		isOnMobileData: state.isOnMobileData,
		syncOnlyOverWifi: state.settings['sync.mobileWifiOnly'],
		syncTarget: state.settings['sync.target'],
	};
})(SyncStatusIconComponent);

export default SyncStatusIcon;
