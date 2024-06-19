import { useContext, useMemo, useEffect } from 'react';
import NotyfContext from '../NotyfContext';
import { themeStyle } from '@joplin/lib/theme';
import { Dispatch } from 'redux';
import { INotyfIcon, NotyfNotification } from 'notyf';
import TaskProgressUIService from '@joplin/lib/TaskProgressUIService';
import { waitForElement } from '@joplin/lib/dom';

interface Props {
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

	useEffect(() => {
		TaskProgressUIService.setListener(async task => {
			if (task.progress === 100) {
				if (task.data) {
					notyf.dismiss(task.data as NotyfNotification);
				}

				notyf.success({
					message: task.message,
					dismissible: true,
				});
			} else if (task.data && !task.started) {
				const spinner: HTMLElement = await waitForElement(document, task.id);
				if (spinner) {
					spinner.classList.remove('-indeterminate');
					spinner.classList.add('-progress');
					task.started = true;
				}

			} else if (task.data && task.started) {
				const spinner: HTMLElement = await waitForElement(document, task.id);
				spinner.style.background = `conic-gradient(var(--joplin-background-color, white) ${task.progress * 3.6}deg, var(--joplin-color, black) 0deg)`;

			} else {
				task.data = notyf.open({
					type: 'loading',
					message: task.message,
					duration: 0,
					dismissible: true,
					icon: `<i class='loading-spinner -indeterminate' id="${task.id}"></i>`,
				});
			}
		});


		return () => TaskProgressUIService.setListener(undefined);
	}, [notyf]);

	return <div style={{ display: 'none' }}/>;
};
