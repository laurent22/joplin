import QtQuick 2.4

LoginPageForm {

	property Item appRoot

	id: root

	Connections {
		target: root
		onLoginButtonClicked: {
			dispatcher.emitLoginClicked(root.apiBaseUrl, root.email, root.password);
		}
	}

	Connections {
		target: dispatcher
		onLoginStarted: {
			root.enabled = false;
		}
		onLoginFailed: {
			root.enabled = true;
		}
		onLoginSuccess: {
			root.enabled = true;
		}
	}

}
