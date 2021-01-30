const { BackButtonService } = require('../services/back-button.js');
const DialogBox = require('react-native-dialogbox').default;

export default class BackButtonDialogBox extends DialogBox {
	constructor(props: any) {
		super(props);

		this.backHandler_ = () => {
			if (this.state.isVisible) {
				this.close();
				return true;
			}
			return false;
		};
	}

	async componentDidUpdate() {
		if (this.state.isVisible) {
			BackButtonService.addHandler(this.backHandler_);
		} else {
			BackButtonService.removeHandler(this.backHandler_);
		}
	}
}
