import React, { Component } from 'react';
import { Keyboard, View, Button, Text, StyleSheet, Linking, Image } from 'react-native';
import PopupDialog, { DialogTitle, DialogButton } from 'react-native-popup-dialog';
import DatePicker from 'react-native-datepicker'
import moment from 'moment';
import { _ } from 'lib/locale.js';

class SelectDateTimeDialog extends Component {

	constructor() {
		super();
		this.dialog_ = null;
		this.shown_ = false;
		this.state = { date: null };
	}

	UNSAFE_componentWillReceiveProps(newProps) {
		if (newProps.date != this.state.date) {
			this.setState({ date: newProps.date });
		}

		if ('shown' in newProps) {
			this.show(newProps.shown);
		}
	}

	show(doShow = true) {
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

	dateTimeFormat() {
		return "MM/DD/YYYY HH:mm";
	}

	stringToDate(s) {
		return moment(s, this.dateTimeFormat()).toDate();
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

	render() {
		const popupActions = [
			<DialogButton text="Save alarm" align="center" onPress={() => this.onAccept()} key="saveButton" />,
			<DialogButton text="Clear alarm" align="center" onPress={() => this.onClear()} key="clearButton" />,
			<DialogButton text="Cancel" align="center" onPress={() => this.onReject()} key="cancelButton" />,
		];

		return (
			<PopupDialog
				ref={(dialog) => { this.dialog_ = dialog; }}
				dialogTitle={<DialogTitle title={_('Set alarm')} />}
				actions={popupActions}
				width={0.9}
				height={350}
				>
				<View style={{flex:1, margin: 20, alignItems:'center'}}>
					<DatePicker
						date={this.state.date}
						mode="datetime"
						placeholder={_('Select date')}
						format={this.dateTimeFormat()}
						confirmBtnText={_('Confirm')}
						cancelBtnText={_('Cancel')}
						onDateChange={(date) => { this.setState({ date: this.stringToDate(date) }); }}
						style={{width:300}}
					/>
				</View>
			</PopupDialog>
		);
	}

}

export { SelectDateTimeDialog };