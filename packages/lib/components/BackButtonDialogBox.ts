const { BackButtonService } = require('lib/services/back-button.js');
const DialogBox = require('react-native-dialogbox').default;

export default class BackButtonDialogBox extends DialogBox {
	constructor() {
		super();

		this.backHandler_ = () => {
			if (this.state.isVisible) {
				this.close();
				return true;
			}
			return false;
		};
	}

	componentDidMount() {
		BackButtonService.addHandler(this.backHandler_);
	}

	componentWillUnmount() {
		BackButtonService.removeHandler(this.backHandler_);
	}
}
