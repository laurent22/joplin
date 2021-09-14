import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import useSyncTargetUpgrade from 'lib/services/synchronizer/gui/useSyncTargetUpgrade';

const { connect } = require('react-redux');
const { themeStyle } = require('lib/components/global-style.js');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _ } = require('lib/locale.js');

function UpgradeSyncTargetScreen(props:any) {
	const upgradeResult = useSyncTargetUpgrade();

	const theme = themeStyle(props.theme);

	const lineStyle = { ...theme.normalText, marginBottom: 20 };
	const stackTraceStyle = { ...theme.normalText, flexWrap: 'nowrap', fontSize: theme.fontSize * 0.5, color: theme.colorFaded };
	const headerStyle = { ...theme.headerStyle, marginBottom: 20 };

	function renderUpgradeError() {
		if (!upgradeResult.error) return null;

		return (
			<View style={{ backgroundColor: theme.backgroundColor, flex: 1, flexDirection: 'column' }}>
				<Text style={headerStyle}>Error</Text>
				<Text style={lineStyle}>The sync target could not be upgraded due to an error. For support, please copy the content of this page and paste it in the forum: https://discourse.joplinapp.org/</Text>
				<Text style={lineStyle}>The full error was:</Text>
				<Text style={lineStyle}>{upgradeResult.error.message}</Text>
				<Text style={stackTraceStyle}>{upgradeResult.error.stack}</Text>
			</View>
		);
	}

	function renderInProgress() {
		if (upgradeResult.error || upgradeResult.done) return null;

		return (
			<View>
				<Text style={headerStyle}>Joplin upgrade in progress...</Text>
				<Text style={lineStyle}>Please wait while the sync target is being upgraded. It may take a few seconds or a few minutes depending on the upgrade.</Text>
				<Text style={lineStyle}>Make sure you leave your device on and the app opened while the upgrade is in progress.</Text>
			</View>
		);
	}

	function renderDone() {
		if (upgradeResult.error || !upgradeResult.done) return null;

		return (
			<View>
				<Text style={headerStyle}>Upgrade complete</Text>
				<Text style={lineStyle}>The upgrade has been applied successfully. Please press Back to exit this screen.</Text>
			</View>
		);
	}

	return (
		<ScrollView style={{ flex: 1, flexDirection: 'column', backgroundColor: theme.backgroundColor }}>
			<ScreenHeader title={_('Sync Target Upgrade')} parentComponent={this} showShouldUpgradeSyncTargetMessage={false} showSearchButton={false} showBackButton={upgradeResult.done}/>
			<View style={{ padding: 15, flex: 1 }}>
				{renderInProgress()}
				{renderDone()}
				{renderUpgradeError()}
			</View>
		</ScrollView>
	);
}

export default connect((state:any) => {
	return {
		theme: state.settings.theme,
	};
})(UpgradeSyncTargetScreen);
