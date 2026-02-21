import * as React from 'react';
import { themeStyle } from './global-style';
import { _ } from '@joplin/lib/locale';
import { View, Button, Text, StyleSheet, TouchableOpacity } from 'react-native';
import time from '@joplin/lib/time';
import { Platform } from 'react-native';
import Modal from './Modal';
import { formatMsToLocal } from '@joplin/utils/time';
const DateTimePickerModal = require('react-native-modal-datetime-picker').default;

const styles = StyleSheet.create({
	centeredView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalView: {
		display: 'flex',
		flexDirection: 'column',
		margin: 10,
		backgroundColor: 'white',
		borderRadius: 10,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	button: {
		borderRadius: 20,
		padding: 10,
		elevation: 2,
	},
	buttonOpen: {
		backgroundColor: '#F194FF',
	},
	buttonClose: {
		backgroundColor: '#2196F3',
	},
	textStyle: {
		color: 'white',
		fontWeight: 'bold',
		textAlign: 'center',
	},
	modalText: {
		marginBottom: 15,
		textAlign: 'center',
	},
});

interface Props {
	themeId: number;
	shown: boolean;
	date: Date | null;
	// Optional repeat interval: 'none' | 'daily' | 'weekly' | 'monthly'
	interval?: string;
	onAccept: (date: Date | null, interval: string)=> void;
	onReject: ()=> void;
}

interface SelectDateTimeState {
	date: Date | null;
	mode: string;
	showPicker: boolean;
	selectedInterval: string;
}

export default class SelectDateTimeDialog extends React.PureComponent<Props, SelectDateTimeState> {

	public constructor(props: Props) {
		super(props);

		this.state = {
			date: null,
			mode: 'date',
			showPicker: false,
			selectedInterval: props.interval || 'none',
		};

		this.onReject = this.onReject.bind(this);
		this.onPickerConfirm = this.onPickerConfirm.bind(this);
		this.onPickerCancel = this.onPickerCancel.bind(this);
		this.onSetDate = this.onSetDate.bind(this);
	}

	public static getDerivedStateFromProps(nextProps: Props, prevState: SelectDateTimeState): Partial<SelectDateTimeState> | null {
		const updates: Partial<SelectDateTimeState> = {};
		if ((nextProps.date?.getTime() ?? null) !== (prevState.date?.getTime() ?? null)) {
			updates.date = nextProps.date;
		}
		if (nextProps.interval !== undefined && nextProps.interval !== prevState.selectedInterval) {
			updates.selectedInterval = nextProps.interval;
		}
		return Object.keys(updates).length > 0 ? updates : null;
	}

	public onAccept() {
		if (this.props.onAccept) this.props.onAccept(this.state.date, this.state.selectedInterval || 'none');
	}

	public onReject() {
		if (this.props.onReject) this.props.onReject();
	}

	public onClear() {
		if (this.props.onAccept) this.props.onAccept(null, 'none');
	}

	public onPickerConfirm(selectedDate: Date) {
		this.setState({ date: selectedDate, showPicker: false });
	}

	public onPickerCancel() {
		this.setState({ showPicker: false });
	}

	public onSetDate() {
		this.setState({ showPicker: true });
	}

	// web
	private onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ date: new Date(event.target.value) });
	};

	private getIntervalOptions() {
		return [
			{ value: 'none', label: _('No repeat') },
			{ value: 'daily', label: _('Daily') },
			{ value: 'weekly', label: _('Weekly') },
			{ value: 'monthly', label: _('Monthly') },
		];
	}

	private static readonly pillStyles = StyleSheet.create({
		container: {
			marginTop: 12,
			width: '100%' as const,
			paddingHorizontal: 10,
		},
		pillsRow: {
			flexDirection: 'row' as const,
			flexWrap: 'wrap' as const,
			justifyContent: 'center' as const,
		},
		pill: {
			paddingHorizontal: 14,
			paddingVertical: 6,
			margin: 4,
			borderRadius: 16,
			borderWidth: 1,
		},
		pillText: {
			fontSize: 12,
		},
	});

	private renderIntervalPills() {
		const theme = themeStyle(this.props.themeId);
		const { pillStyles } = SelectDateTimeDialog;

		const intervals = this.getIntervalOptions();

		return (
			<View style={pillStyles.container}>
				<Text style={{ ...theme.normalText, color: theme.colorFaded, fontSize: 12, marginBottom: 6 }}>{_('Repeat')}</Text>
				<View style={pillStyles.pillsRow}>
					{intervals.map(item => {
						const isSelected = this.state.selectedInterval === item.value;
						return (
							<TouchableOpacity
								key={item.value}
								onPress={() => this.setState({ selectedInterval: item.value })}
								style={[pillStyles.pill, { borderColor: theme.color, backgroundColor: isSelected ? theme.color : theme.backgroundColor }]}
							>
								<Text style={[pillStyles.pillText, { color: isSelected ? theme.backgroundColor : theme.color }]}>
									{item.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>
		);
	}

	public renderContent() {
		const theme = themeStyle(this.props.themeId);

		// DateTimePickerModal doesn't support web.
		if (Platform.OS === 'web') {
			// See https://developer.mozilla.org/en-US/docs/Web/HTML/Date_and_time_formats#local_date_and_time_strings
			// for the expected date input format:
			const dateString = this.state.date ? formatMsToLocal(this.state.date.getTime(), 'YYYY-MM-DD[T]HH:mm:ss') : '';
			return (
				<View style={{ margin: 10, alignItems: 'center' }}>
					<input
						type="datetime-local"
						value={dateString}
						onChange={this.onInputChange}
					/>
					<View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
						{this.getIntervalOptions().map(item => (
							<button
								key={item.value}
								onClick={() => this.setState({ selectedInterval: item.value })}
								style={{
									margin: 4,
									padding: '4px 12px',
									borderRadius: 14,
									border: `1px solid ${this.state.selectedInterval === item.value ? '#007AFF' : '#ccc'}`,
									backgroundColor: this.state.selectedInterval === item.value ? '#007AFF' : 'transparent',
									color: this.state.selectedInterval === item.value ? '#fff' : 'inherit',
									cursor: 'pointer',
									fontSize: 12,
								}}
							>
								{item.label}
							</button>
						))}
					</View>
				</View>
			);
		}

		return (
			<View style={{ flex: 0, margin: 20, alignItems: 'center' }}>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					{ this.state.date && <Text style={{ ...theme.normalText, color: theme.color, marginRight: 10 }}>{time.formatDateToLocal(this.state.date)}</Text> }
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
				{this.renderIntervalPills()}
			</View>
		);
	}

	public render() {
		const modalVisible = this.props.shown;

		if (!modalVisible) return null;

		const theme = themeStyle(this.props.themeId);

		return (
			<Modal
				visible={modalVisible}
				containerStyle={styles.centeredView}
				onClose={() => {
					this.onReject();
				}}
			>
				<View style={{ ...styles.modalView, backgroundColor: theme.backgroundColor }}>
					<View style={{ padding: 15, flexBasis: 'auto', paddingBottom: 0, flexGrow: 0, width: '100%', borderBottomWidth: 1, borderBottomColor: theme.dividerColor }}>
						<Text style={{ ...styles.modalText, color: theme.color, fontSize: 14, fontWeight: 'bold' }}>{_('Set alarm')}</Text>
					</View>
					{this.renderContent()}
					<View style={{ padding: 20, flexBasis: 'auto', borderTopWidth: 1, borderTopColor: theme.dividerColor }}>
						<View style={{ marginBottom: 10 }}>
							<Button title={_('Save alarm')} onPress={() => this.onAccept()} key="saveButton" />
						</View>
						<View style={{ marginBottom: 10 }}>
							<Button title={_('Clear alarm')} onPress={() => this.onClear()} key="clearButton" />
						</View>
						<View style={{ marginBottom: 10 }}>
							<Button title={_('Cancel')} onPress={() => this.onReject()} key="cancelButton" />
						</View>
					</View>
				</View>
			</Modal>
		);
	}

}

