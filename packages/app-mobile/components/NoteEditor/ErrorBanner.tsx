import { _ } from '@joplin/lib/locale';
import NavService from '@joplin/lib/services/NavService';
import shim from '@joplin/lib/shim';
import * as React from 'react';
import { useState } from 'react';
import { Banner } from 'react-native-paper';

interface Props {
	visible: boolean;
}

const ErrorBanner: React.FC<Props> = props => {
	const [dismissed, setDismissed] = useState(false);

	const getResolutionMessage = () => {
		const platform = shim.mobilePlatform();
		if (platform === 'android') {
			return _('Checking for and installing updates for "Android System WebView" in the app store may fix this issue.');
		} else if (platform === 'ios') {
			return _('Please consider reporting this issue on GitHub. To work around this issue, enable the "Plain Editor" in Configuration > Note > "Use the plain editor".');
		} else {
			return 'Unknown mobile platform. This is a bug.';
		}
	};

	return (
		<Banner
			visible={props.visible && !dismissed}
			icon='alert-octagon-outline'
			elevation={1}
			actions={[
				{
					label: _('Ignore'),
					onPress: () => setDismissed(true),
					icon: 'close',
				},
				{
					label: _('Show logs'),
					onPress: () => NavService.go('Log', { defaultFilter: 'NoteEditor' }),
					icon: 'information',
				},
			]}
		>
			{_('There was an error loading the note editor.')}
			{'\n\n'}
			{getResolutionMessage()}
		</Banner>
	);
};

export default ErrorBanner;
