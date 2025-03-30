import { useContext, useMemo } from 'react';
import NotyfContext from '../NotyfContext';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { Toast, ToastType } from '@joplin/lib/services/plugins/api/types';
import { INotyfNotificationOptions } from 'notyf';

const emptyToast = (): Toast => {
	return {
		duration: 0,
		message: '',
		type: ToastType.Info,
		timestamp: 0,
	};
};

interface Props {
	themeId: number;
	toast: Toast;
}

export default (props: Props) => {
	const notyfContext = useContext(NotyfContext);
	const toast = useMemo(() => {
		const toast: Toast = props.toast ? props.toast : emptyToast();
		return toast;
	}, [props.toast]);

	useAsyncEffect(async () => {
		if (!toast.message) return;

		const options: Partial<INotyfNotificationOptions> = {
			type: toast.type,
			message: toast.message,
			duration: toast.duration,
		};

		notyfContext.open(options);
		// toast.timestamp needs to be included in the dependency list to allow
		// showing multiple toasts with the same message, one after another.
		// See https://github.com/laurent22/joplin/issues/11783
	}, [toast.message, toast.duration, toast.type, toast.timestamp, notyfContext]);

	return <div style={{ display: 'none' }}/>;
};
