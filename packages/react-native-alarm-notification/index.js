import { NativeModules } from 'react-native';

const { RNAlarmNotification } = NativeModules;
const ReactNativeAN = {};

const parseDateString = (string) => {
	const splits = string.split(' ');
	const dateSplits = splits[0].split('-');
	const timeSplits = splits[1].split(':');

	const year = dateSplits[2];
	const month = dateSplits[1];
	const day = dateSplits[0];

	const hours = timeSplits[0];
	const minutes = timeSplits[1];
	const seconds = timeSplits[2];

	return new Date(year, month - 1, day, hours, minutes, seconds);
};

ReactNativeAN.scheduleAlarm = async (details) => {
	if (!details.fire_date || (details.fire_date && details.fire_date === '')) {
		throw new Error('failed to schedule alarm because fire date is missing');
	}

	const past = parseDateString(details.fire_date);
	const today = new Date();
	if (past < today) {
		throw new Error(
			'failed to schedule alarm because fire date is in the past'
		);
	}

	const repeatInterval = details.repeat_interval || 'hourly';
	const intervalValue = details.interval_value || 1;
	if (isNaN(intervalValue)) {
		throw new Error('interval value should be a number');
	}

	if (
		repeatInterval === 'minutely' &&
		(intervalValue < 1 || intervalValue > 59)
	) {
		throw new Error('interval value should be between 1 and 59 minutes');
	}

	if (
		repeatInterval === 'hourly' &&
		(intervalValue < 1 || intervalValue > 23)
	) {
		throw new Error('interval value should be between 1 and 23 hours');
	}

	const data = {
		...details,
		has_button: details.has_button || false,
		vibrate: details.vibrate || true,
		play_sound: details.play_sound || true,
		schedule_type: details.schedule_type || 'once',
		repeat_interval: details.repeat_interval || 'hourly',
		interval_value: details.interval_value || 1,
		volume: details.volume || 0.5,
		sound_name: details.sound_name || '',
		snooze_interval: details.snooze_interval || 1,
		data: details.data || '',
	};

	return await RNAlarmNotification.scheduleAlarm(data);
};

ReactNativeAN.sendNotification = (details) => {
	const data = {
		...details,
		has_button: false,
		vibrate: details.vibrate || true,
		play_sound: details.play_sound || true,
		schedule_type: details.schedule_type || 'once',
		volume: details.volume || 0.5,
		sound_name: details.sound_name || '',
		snooze_interval: details.snooze_interval || 1,
		data: details.data || '',
	};

	RNAlarmNotification.sendNotification(data);
};

ReactNativeAN.deleteAlarm = (id) => {
	if (!id) {
		throw new Error('id is required to delete alarm');
	}

	RNAlarmNotification.deleteAlarm(id);
};

ReactNativeAN.deleteRepeatingAlarm = (id) => {
	if (!id) {
		throw new Error('id is required to delete alarm');
	}

	RNAlarmNotification.deleteRepeatingAlarm(id);
};

ReactNativeAN.stopAlarmSound = () => {
	return RNAlarmNotification.stopAlarmSound();
};

ReactNativeAN.removeFiredNotification = (id) => {
	if (!id) {
		throw new Error('id is required to remove notification');
	}

	RNAlarmNotification.removeFiredNotification(id);
};

ReactNativeAN.removeAllFiredNotifications = () => {
	RNAlarmNotification.removeAllFiredNotifications();
};

ReactNativeAN.getScheduledAlarms = async () => {
	return await RNAlarmNotification.getScheduledAlarms();
};

// ios request permission
ReactNativeAN.requestPermissions = async (permissions) => {
	let requestedPermissions = {
		alert: true,
		badge: true,
		sound: true,
	};

	if (permissions) {
		requestedPermissions = {
			alert: !!permissions.alert,
			badge: !!permissions.badge,
			sound: !!permissions.sound,
		};
	}

	return await RNAlarmNotification.requestPermissions(requestedPermissions);
};

// ios check permission
ReactNativeAN.checkPermissions = (callback) => {
	RNAlarmNotification.checkPermissions(callback);
};

ReactNativeAN.parseDate = (rawDate) => {
	let hours;
	let day;
	let month;

	if (rawDate.getHours().toString().length === 1) {
		hours = `0${rawDate.getHours()}`;
	} else {
		hours = `${rawDate.getHours()}`;
	}

	if (rawDate.getDate().toString().length === 1) {
		day = `0${rawDate.getDate()}`;
	} else {
		day = `${rawDate.getDate()}`;
	}

	if (rawDate.getMonth().toString().length === 1) {
		month = `0${rawDate.getMonth() + 1}`;
	} else {
		month = `${rawDate.getMonth() + 1}`;
	}

	return `${day}-${month}-${rawDate.getFullYear()} ${hours}:${rawDate.getMinutes()}:${rawDate.getSeconds()}`;
};

export default ReactNativeAN;
