const React = require('react');
const { forwardRef,useState, useImperativeHandle } = require('react');
const RnDialog = require('react-native-dialog').default;
const { View } = require('react-native');
const { _ } = require('lib/locale');

let dialogRef_:any = null;

export function initializeDialogs(ref:any) {
	dialogRef_ = ref;
}

export const Dialog = forwardRef(function(_props:any, ref:any) {
	const [visible, setVisible] = useState(false);
	const [type, setType] = useState('');
	const [message, setMessage] = useState('');
	const [buttons, setButtons] = useState([]);
	const [resultPromise, setResultPromise] = useState({});

	function dialogTitle(type:string) {
		if (type === 'info') return _('Information');
		if (type === 'error') return _('Error');
		return '';
	}

	useImperativeHandle(ref, () => {
		return {
			show: async function(type:string, message:string, buttons:any[] = null) {
				// Shouldn't happen but just to be sure throw an error in this case
				if (visible) throw new Error('Only one dialog can be visible at a time');

				setVisible(true);
				setType(type);
				setMessage(message);
				setButtons(buttons);

				return new Promise((resolve, reject) => {
					setResultPromise({
						resolve: resolve,
						reject: reject,
					});
				});
			},
		};
	});

	function onPress(event:any) {
		setVisible(false);
		resultPromise.resolve(event ? event.value : true);
	}

	function renderTitle() {
		const title = dialogTitle(type);
		if (!title) return null;
		return <RnDialog.Title>{title}</RnDialog.Title>;
	}

	function renderButtons() {
		const output = [];

		if (type === 'confirm') {
			output.push(<RnDialog.Button key="ok" label={_('OK')} onPress={() => onPress({ value: true })} />);
			output.push(<RnDialog.Button key="cancel" label={_('Cancel')}  onPress={() => onPress({ value: false })} />);
		}

		if (type === 'info' || type === 'error') {
			output.push(<RnDialog.Button key="ok" label={_('OK')} onPress={onPress} />);
		}

		if (type === 'pop') {
			for (const button of buttons) {
				output.push(<RnDialog.Button key={button.text} label={button.text} onPress={() => onPress({ value: button.id })} />);
			}
		}

		return output;
	}

	return (
		<View>
			<RnDialog.Container visible={visible}>
				{renderTitle()}
				<RnDialog.Description>{message}</RnDialog.Description>
				{renderButtons()}
			</RnDialog.Container>
		</View>
	);
});

export default {
	confirm: async function(message:string) {
		return dialogRef_.current.show('confirm', message);
	},
	pop: async function(message:string, buttons:any[]) {
		return dialogRef_.current.show('pop', message, buttons);
	},
	error: async function(message:string) {
		return dialogRef_.current.show('error', message);
	},
	info: async function(message:string) {
		return dialogRef_.current.show('info', message);
	},
};
