import QtQuick 2.4

LoginPageForm {

	property Item appRoot

	id: root

	function onShown() {
		root.apiBaseUrl = settings.valueString("api.baseUrl");
		root.email = settings.valueString("user.email");
		root.password = "";
	}

	Connections {
		target: root
		onLoginButtonClicked: {
			appRoot.emitLoginClicked(root.apiBaseUrl, root.email, root.password);
		}
	}

	Connections {
		target: appRoot
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
