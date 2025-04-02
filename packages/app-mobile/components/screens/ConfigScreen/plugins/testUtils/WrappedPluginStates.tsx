import * as React from 'react';
import { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import configScreenStyles from '../../configScreenStyles';
import Setting from '@joplin/lib/models/Setting';
import { Store } from 'redux';
import PluginStates from '../PluginStates';
import { AppState } from '../../../../../utils/types';
import { useCallback, useState } from 'react';
import TestProviderStack from '../../../../testing/TestProviderStack';

interface WrapperProps {
	initialPluginSettings: PluginSettings;
	store: Store<AppState>;
}
const shouldShowBasedOnSettingSearchQuery = ()=>true;

const PluginStatesWrapper = (props: WrapperProps) => {
	const styles = configScreenStyles(Setting.THEME_LIGHT);

	const [pluginSettings, setPluginSettings] = useState(() => {
		return props.initialPluginSettings ?? {};
	});

	const updatePluginStates = useCallback((newStates: PluginSettings) => {
		setPluginSettings(newStates);
		Setting.setValue('plugins.states', newStates);
	}, []);

	return (
		<TestProviderStack store={props.store}>
			<PluginStates
				styles={styles}
				themeId={Setting.THEME_LIGHT}
				updatePluginStates={updatePluginStates}
				pluginSettings={pluginSettings}
				shouldShowBasedOnSearchQuery={shouldShowBasedOnSettingSearchQuery}
			/>
		</TestProviderStack>
	);
};

export default PluginStatesWrapper;
