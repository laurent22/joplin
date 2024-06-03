import { useContext, useMemo } from 'react';
import NotyfContext from '../NotyfContext';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { themeStyle } from '@joplin/lib/theme';
import { Dispatch } from 'redux';
import { AppStateInterop } from '../../app.reducer';
import { INotyfIcon, NotyfNotification } from 'notyf';

interface Props {
	interopTaskProgress: AppStateInterop[];
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
				type.background = theme.backgroundColor5;
				// When type === 'error', type.icon is always of type object (INotyfIcon):
				// https://github.com/caroso1222/notyf/blob/master/src/notyf.options.ts
				(type.icon as INotyfIcon).color = theme.backgroundColor5;
			} else if (type.type === 'error') {
				type.background = theme.backgroundColor5;
				// When type === 'error', type.icon is always of type object (INotyfIcon):
				// https://github.com/caroso1222/notyf/blob/master/src/notyf.options.ts
				(type.icon as INotyfIcon).color = theme.backgroundColor5;
			} else if (type.type === 'loading') {
				type.background = theme.backgroundColor5;
			}

			return type;
		});
		return output;
	}, [notyfContext, theme]);

	useAsyncEffect(async (_event) => {
		for (const task of props.interopTaskProgress) {
			if (task.notification && !task.completed) return;

			let duration = 0;
			let notyfType = 'loading';

			if (task.completed) {
				notyf.dismiss(task.notification);
				duration = 6000;
				notyfType = 'success';
			}

			const notification: NotyfNotification = notyf.open({
				type: notyfType,
				message: task.message,
				duration: duration,
				dismissible: true,
			});

			props.dispatch({
				type: 'INTEROP_NOTIFICATION_DONE',
				id: task.id,
				notification: notification,
			});
		}
	}, [notyf, props.dispatch, props.interopTaskProgress]);

	return <div style={{ display: 'none' }}/>;
};
