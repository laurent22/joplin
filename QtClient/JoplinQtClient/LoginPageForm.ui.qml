import QtQuick 2.4
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.3

Item {
	width: 400
	height: 400

	GridLayout {
		id: gridLayout1
		flow: GridLayout.LeftToRight
		rows: 6
		columns: 2
		anchors.fill: parent

		Label {
			id: label1
			text: qsTr("Domain")
		}

		TextField {
			id: textField1
			Layout.fillWidth: true
		}

		Label {
			id: label2
			text: qsTr("Email")
		}

		TextField {
			id: textField2
			Layout.fillWidth: true
		}

		Label {
			id: label3
			text: qsTr("Password")
		}

		TextField {
			id: textField3
			Layout.fillWidth: true
		}

		Button {
			id: button1
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
}
