import { useContext, useMemo, useEffect } from 'react';
import { Dispatch } from 'redux';
import { INotyfIcon, NotyfNotification } from 'notyf';
import { themeStyle } from '@joplin/lib/theme';
import { waitForElement } from '@joplin/lib/dom';
import TaskUIService from '@joplin/lib/services/TaskUIService';
import NotyfContext from '../NotyfContext';

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
				// When type === 'success', type.icon is always of type object (INotyfIcon):
				// https://github.com/caroso1222/notyf/blob/master/src/notyf.options.ts
				(type.icon as INotyfIcon).color = theme.backgroundColor5;
			} else if (type.type === 'error') {
				// When type === 'error', type.icon is always of type object (INotyfIcon):
				// https://github.com/caroso1222/notyf/blob/master/src/notyf.options.ts
				(type.icon as INotyfIcon).color = theme.backgroundColor5;
			}

			type.background = theme.backgroundColor5;
			return type;
		});
		return output;
	}, [notyfContext, theme]);

	useEffect(() => {
		TaskUIService.setListener(async task => {
			if (task.progress === 100) {
				if (task.data) {
					notyf.dismiss(task.data as NotyfNotification);
				}

				notyf.success({
					message: task.message,
					dismissible: true,
				});
			} else if (task.data) {
				const spinner: HTMLElement = await waitForElement(document, task.id);

				// Remove the animation.
				spinner.classList.remove('-indeterminate');
				// Update the progress percentage.
				spinner.style.setProperty('--percentage', `${task.progress}%`);
			} else {
				const options = notyf.options.types.find(type => type.type === 'loading');

				let cssStyle = `color: ${options.background};`;
				let className = 'loading-spinner';

				if (task.progress > 0) {
					// Display the current progress.
					cssStyle += ` --percentage: ${task.progress}%;`;
				} else {
					// Show an infinite animation until there is some progress.
					className += ' -indeterminate';
				}

				task.data = notyf.open({
					type: 'loading',
					message: task.message,
					duration: 0,
					dismissible: true,
					icon: `<i class="${className}" id="${task.id}" style="${cssStyle}"></i>`,
				});
			}
		});


		return () => TaskUIService.setListener(undefined);
	}, [notyf]);

	return <div style={{ display: 'none' }}/>;
};
