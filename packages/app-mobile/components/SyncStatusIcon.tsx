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
	const [innerIcon, outerIconName] = useMemo((): [ReactElement|null, string] => {
		const defaultOuterIconName = 'cloud-outline';


		if (props.isOnMobileData && props.syncOnlyOverWifi) {
			return [null, 'cloud-offline-outline'];
		}

		if (props.syncStarted && !props.syncReport.cancelling) {
			return [syncingIcon, defaultOuterIconName];
		}

		// Don't show information from the previous sync target.
		const haveNewSyncTarget = (props.syncReport.syncTarget ?? props.syncTarget) !== props.syncTarget;
		if (haveNewSyncTarget) {
			return [null, 'cloud-upload-outline'];
		}

		if (props.syncReport.errors && props.syncReport.errors.length > 0) {
			return [syncErrorIcon, defaultOuterIconName];
		}

		const changesPublished = (props.syncReport.startTime ?? 0) > (props.noteLastModifiedTimestamp ?? 0);
		console.log(props.syncReport.startTime, props.noteLastModifiedTimestamp);
		if (changesPublished) {
			return [syncSuccessIcon, defaultOuterIconName];
		} else {
			return [null, 'cloud-upload-outline'];
		}
	}, [
		props.isOnMobileData, props.syncOnlyOverWifi, props.syncStarted, props.syncReport, props.syncTarget,
		props.noteLastModifiedTimestamp,

		syncErrorIcon, syncSuccessIcon, syncingIcon,
	]);

	if (!props.syncTarget) {
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
		const theme = themeStyle(themeId);
		const iconStyle = {
			fontSize: 30,
			color: theme.color,
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
