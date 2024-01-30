import * as React from 'react';
import { Alert, Text, View } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { ProgressBar } from 'react-native-paper';
import { FunctionComponent, useCallback, useState } from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import SettingsButton from '../SettingsButton';
import Logger from '@joplin/utils/Logger';

// Undefined = indeterminant progress
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
	title: (status: TaskStatus)=> string;
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
			logger.error(`Task ${props.taskName} failed`);
			Alert.alert(_('Error'), _('Task "%s" failed with error: %s', props.taskName, error.toString()));
		} finally {
			if (!completedSuccessfully) {
				setTaskStatus(TaskStatus.NotStarted);
			}

			await afterCompleteListener(completedSuccessfully);
		}
	}, [props.onRunTask, props.taskName, taskStatus]);

	if (taskStatus === TaskStatus.NotStarted || taskStatus === TaskStatus.InProgress) {
		const progressComponent = (
			<ProgressBar
				visible={taskStatus === TaskStatus.InProgress}
				indeterminate={progress === undefined}
				progress={progress}
			/>
		);

		const startOrCancelExportButton = (
			<SettingsButton
				title={props.title(taskStatus)}
				disabled={taskStatus === TaskStatus.InProgress}
				description={taskStatus === TaskStatus.NotStarted ? props.description : null}
				statusComponent={progressComponent}
				clickHandler={startTask}
				styles={props.styles}
			/>
		);

		return startOrCancelExportButton;
	} else {
		const warningComponent = (
			<Text style={props.styles.styleSheet.warningText}>
				{_('Warnings:\n%s', warnings)}
			</Text>
		);

		const taskSummary = (
			<View style={props.styles.styleSheet.settingContainer}>
				<Text style={props.styles.styleSheet.descriptionText}>{props.title(taskStatus)}</Text>
				{warnings.length > 0 ? warningComponent : null}
			</View>
		);
		return taskSummary;
	}
};

export default TaskButton;
