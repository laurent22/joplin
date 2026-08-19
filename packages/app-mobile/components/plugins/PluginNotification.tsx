import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { connect } from 'react-redux';
import { AppState } from '../../utils/types';
import { Toast } from '@joplin/lib/services/plugins/api/types';
import { useCallback } from 'react';
import { Dispatch } from 'redux';
import { ViewStyle } from 'react-native';

interface Props {
	dispatch: Dispatch;
	toast: Toast;
}

const snackbarAction = {
	label: _('Close'),
};

const wrapperStyle: ViewStyle = {
	maxWidth: 600,
	alignSelf: 'center',
};

const PluginNotification: React.FC<Props> = props => {
	const onDismiss = useCallback(() => {
		props.dispatch({ type: 'TOAST_HIDE' });
	}, [props.dispatch]);

	// Reload the <Portal> for each new toast. This keeps the toast notification on top
	// of other <Portal> components and resets the toast timestamp when its message changes.
	return <Portal key={`toast-${props.toast?.timestamp}`}>
		<Snackbar
			visible={!!props.toast}
			onDismiss={onDismiss}
			duration={props.toast?.duration}
			wrapperStyle={wrapperStyle}
			action={snackbarAction}
		>{props.toast?.message ?? ''}</Snackbar>
	</Portal>;
};

export default connect((state: AppState) => ({
	toast: state.toast,
}))(PluginNotification);
