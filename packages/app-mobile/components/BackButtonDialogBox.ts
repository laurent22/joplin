import BackButtonService from '../services/BackButtonService';
const DialogBox = require('react-native-dialogbox').default;

export default class BackButtonDialogBox extends DialogBox {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(props: any) {
		super(props);

		this.backHandler_ = () => {
			if (this.state.isVisible) {
				this.close();
				return true;
			}
			return false;
		};
	}

	public async componentDidUpdate() {
		if (this.state.isVisible) {
			BackButtonService.addHandler(this.backHandler_);
		} else {
			BackButtonService.removeHandler(this.backHandler_);
		}
	}
}
