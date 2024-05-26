import { useContext, useMemo } from 'react';
import { _ } from '@joplin/lib/locale';
import NotyfContext from '../NotyfContext';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { themeStyle } from '@joplin/lib/theme';
import { Dispatch } from 'redux';
import { AppStateInterop } from '../../app.reducer';
import { NotyfNotification } from 'notyf';

interface Props {
	interop: AppStateInterop[];
	themeId: number;
	dispatch: Dispatch;
}

export default (props: Props) => {
	const notyfContext = useContext(NotyfContext);

	const theme = useMemo(() => {
		return themeStyle(props.themeId);
	}, [props.themeId]);

	const notyf = useMemo(() => {
		const output = notyfContext;
		output.options.types = notyfContext.options.types.map(type => {
			if (type.type === 'success') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(type.icon as any).color = theme.backgroundColor5;
			} else if (type.type === 'error') {
				type.background = theme.backgroundColor5;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(type.icon as any).color = theme.backgroundColor5;
			} else if (type.type === 'loading') {
				type.background = theme.backgroundColor5;
			}

			return type;
		});
		return output;
	}, [notyfContext, theme]);

	useAsyncEffect(async (_event) => {
		for (const op of props.interop) {
			if (op.notification && !op.completed) return;

			let msg = '';

			if (op.operation === 'export') {
				if (op.completed) {
					msg = _('Successfully exported to %s.', op.path);
				} else {
					msg = _('Exporting to "%s" as "%s" format. Please wait...', op.path, op.format);
				}
			} else {
				if (op.completed) {
					msg = _('Successfully imported from %s.', op.path);
				} else {
					msg = _('Importing from "%s" as "%s" format. Please wait...', op.path, op.format);
				}
			}

			let duration = 0;
			let notyfType = 'loading';

			if (op.completed) {
				notyf.dismiss(op.notification);
				duration = 6000;
				notyfType = 'success';
			}

			const notification: NotyfNotification = notyf.open({
				type: notyfType,
				message: `${msg}`,
				duration: duration,
				dismissible: true,
			});

			props.dispatch({
				type: 'INTEROP_NOTIFICATION_DONE',
				operation: op.operation,
				path: op.path,
				notification: notification,
			});
		}
	}, [notyf, props.dispatch, props.interop]);

	return <div style={{ display: 'none' }}/>;
};
