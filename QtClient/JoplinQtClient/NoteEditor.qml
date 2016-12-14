import QtQuick 2.0
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.1

Item {

	property QtObject model

	Connections {
		target: model
		onChanged: {
			if (!model) {
				titleField.text = ""
				bodyField.text = ""
			} else {
				titleField.text = model.title
				bodyField.text = model.body
			}
		}
	}

	Rectangle {
		color: "#eeeeee"
		border.color: "#0000ff"
		anchors.fill: parent
	}

	ColumnLayout {

		anchors.fill: parent
		spacing: 2

		TextField {
			id: titleField
			Layout.fillWidth: true
			Layout.minimumWidth: 50
			Layout.preferredWidth: 100
		}

		TextArea {
			id: bodyField
			Layout.fillWidth: true
			Layout.fillHeight: true
			Layout.minimumWidth: 50
			Layout.preferredWidth: 100
			Layout.minimumHeight: 150
		}

	}

}
