import * as React from 'react';
import { Alert, Text } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { ProgressBar } from 'react-native-paper';
import { FunctionComponent, useCallback, useState } from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import SettingsButton from '../SettingsButton';
import Logger from '@joplin/utils/Logger';

// Undefined = indeterminate progress
export type OnProgressCallback = (progressFraction: number|undefined)=> void;
export type AfterCompleteListener = (success: boolean)=> Promise<void>;
export type SetAfterCompleteListenerCallback = (listener: AfterCompleteListener)=> void;

const logger = Logger.create('TaskButton');

interface TaskResult {
	warnings: string[];
	success: boolean;
}

export enum TaskStatus {
	NotStarted,
	InProgress,
	Done,
}

interface Props {
	taskName: string;
	buttonLabel: (status: TaskStatus)=> string;
	finishedLabel: string;
	description?: string;
	styles: ConfigScreenStyles;
	onRunTask: (
		setProgress: OnProgressCallback,
		setAfterCompleteListener: SetAfterCompleteListenerCallback,
	)=> Promise<TaskResult>;
}

const TaskButton: FunctionComponent<Props> = props => {
	const [taskStatus, setTaskStatus] = useState<TaskStatus>(TaskStatus.NotStarted);
	const [progress, setProgress] = useState<number|undefined>(0);
	const [warnings, setWarnings] = useState<string>('');

	const startTask = useCallback(async () => {
		// Don't run multiple task instances at the same time.
		if (taskStatus === TaskStatus.InProgress) {
			return;
		}

		logger.info(`Starting task: ${props.taskName}`);

		setTaskStatus(TaskStatus.InProgress);
		let completedSuccessfully = false;
		let afterCompleteListener: AfterCompleteListener = async () => {};

		try {
			// Initially, undetermined progress
			setProgress(undefined);

			const status = await props.onRunTask(setProgress, (afterComplete: AfterCompleteListener) => {
				afterCompleteListener = afterComplete;
			});

			setWarnings(status.warnings.join('\n'));
			if (status.success) {
				setTaskStatus(TaskStatus.Done);
				completedSuccessfully = true;
			}
		} catch (error) {
			logger.error(`Task ${props.taskName} failed`, error);
			Alert.alert(_('Error'), _('Task "%s" failed with error: %s', props.taskName, error.toString()));
		} finally {
			if (!completedSuccessfully) {
				setTaskStatus(TaskStatus.NotStarted);
			}

			await afterCompleteListener(completedSuccessfully);
		}
	}, [props.onRunTask, props.taskName, taskStatus]);

	let statusComponent = (
		<ProgressBar
			visible={taskStatus === TaskStatus.InProgress}
			indeterminate={progress === undefined}
			progress={progress}
		/>
	);
	if (taskStatus === TaskStatus.Done && warnings.length > 0) {
		statusComponent = (
			<Text style={props.styles.styleSheet.warningText}>
				{_('Completed with warnings:\n%s', warnings)}
			</Text>
		);
	}

	let buttonDescription = props.description;
	if (taskStatus === TaskStatus.Done) {
		buttonDescription = props.finishedLabel;
	}

	return (
		<SettingsButton
			title={props.buttonLabel(taskStatus)}
			disabled={taskStatus === TaskStatus.InProgress}
			description={buttonDescription}
			statusComponent={statusComponent}
			clickHandler={startTask}
			styles={props.styles}
		/>
	);
};

export default TaskButton;
