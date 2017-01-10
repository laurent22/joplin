import QtQuick 2.4
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.3

Item {
	id: root
	width: 400
	height: 400
	signal loginButtonClicked()
	property alias apiBaseUrl: apiBaseUrlTF.text
	property alias email: emailTF.text
	property alias password: passwordTF.text

	Rectangle {
		id: rectangle2
		color: "#ffffff"
		anchors.fill: parent
	}

	GridLayout {
		id: gridLayout1
		flow: GridLayout.LeftToRight
		rows: 6
		columns: 2
		anchors.fill: parent

		Label {
			id: label1
			text: qsTr("API base URL")
		}

		TextField {
			id: apiBaseUrlTF
			text: "http://joplin.local"
			Layout.fillWidth: true
		}

		Label {
			id: label2
			text: qsTr("Email")
		}

		TextField {
			id: emailTF
			text: "laurent@cozic.net"
			Layout.fillWidth: true
		}

		Label {
			id: label3
			text: qsTr("Password")
		}

		TextField {
			id: passwordTF
			text: "12345678"
			Layout.fillWidth: true
		}

		Button {
			id: loginButton
			text: qsTr("Login")
			Layout.fillWidth: true
			Layout.columnSpan: 2
		}

		Rectangle {
			id: rectangle1
			width: 200
			height: 200
			color: "#ffffff"
			Layout.columnSpan: 2
			Layout.rowSpan: 1
			Layout.fillHeight: true
			Layout.fillWidth: true
		}




	}

 Connections {
	 target: loginButton
	 onClicked: root.loginButtonClicked()
 }

}
