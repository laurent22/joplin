import * as React from 'react';
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
const { View, Button, Text } = require('react-native');

const PopupDialog = require('react-native-popup-dialog').default;
const { DialogTitle, DialogButton } = require('react-native-popup-dialog');
const time = require('@joplin/lib/time').default;
const DateTimePickerModal = require('react-native-modal-datetime-picker').default;

export default class SelectDateTimeDialog extends React.PureComponent<any, any> {

	private dialog_:any = null;
	private shown_:boolean = false;

	constructor(props:any) {
		super(props);

		this.state = {
			date: null,
			mode: 'date',
			showPicker: false,
		};

		this.onReject = this.onReject.bind(this);
		this.onPickerConfirm = this.onPickerConfirm.bind(this);
		this.onPickerCancel = this.onPickerCancel.bind(this);
		this.onSetDate = this.onSetDate.bind(this);
	}

	UNSAFE_componentWillReceiveProps(newProps:any) {
		if (newProps.date != this.state.date) {
			this.setState({ date: newProps.date });
		}

		if ('shown' in newProps && newProps.shown != this.shown_) {
			this.show(newProps.shown);
		}
	}

	show(doShow:boolean = true) {
		if (doShow) {
			this.dialog_.show();
		} else {
			this.dialog_.dismiss();
		}

		this.shown_ = doShow;
	}

	dismiss() {
		this.show(false);
	}

	onAccept() {
		if (this.props.onAccept) this.props.onAccept(this.state.date);
	}

	onReject() {
		if (this.props.onReject) this.props.onReject();
	}

	onClear() {
		if (this.props.onAccept) this.props.onAccept(null);
	}

	onPickerConfirm(selectedDate:Date) {
		this.setState({ date: selectedDate, showPicker: false });
	}

	onPickerCancel() {
		this.setState({ showPicker: false });
	}

	onSetDate() {
		this.setState({ showPicker: true });
	}

	renderContent() {
		if (!this.shown_) return <View/>;

		const theme = themeStyle(this.props.themeId);

		return (
			<View style={{ flex: 1, margin: 20, alignItems: 'center' }}>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					{ this.state.date && <Text style={{ ...theme.normalText, marginRight: 10 }}>{time.formatDateToLocal(this.state.date)}</Text> }
					<Button title="Set date" onPress={this.onSetDate} />
				</View>
				<DateTimePickerModal
					date={this.state.date ? this.state.date : new Date()}
					is24Hour={time.use24HourFormat()}
					isVisible={this.state.showPicker}
					mode="datetime"
					onConfirm={this.onPickerConfirm}
					onCancel={this.onPickerCancel}
				/>
			</View>
		);
	}

	render() {
		const clearAlarmText = _('Clear alarm'); // For unknown reasons, this particular string doesn't get translated if it's directly in the text property below

		const popupActions = [
			<DialogButton text={_('Save alarm')} align="center" onPress={() => this.onAccept()} key="saveButton" />,
			<DialogButton text={clearAlarmText} align="center" onPress={() => this.onClear()} key="clearButton" />,
			<DialogButton text={_('Cancel')} align="center" onPress={() => this.onReject()} key="cancelButton" />,
		];

		return (
			<PopupDialog
				ref={(dialog:any) => { this.dialog_ = dialog; }}
				dialogTitle={<DialogTitle title={_('Set alarm')} />}
				actions={popupActions}
				dismissOnTouchOutside={false}
				width={0.9}
				height={350}
			>
				{this.renderContent()}
			</PopupDialog>
		);
	}

}
