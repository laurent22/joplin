import QtQuick 2.0
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.1

Item {

	id: root
	width: 120
	height: 100
	signal addNoteButtonClicked
	signal addFolderButtonClicked

	ColumnLayout {

		anchors.fill: parent
		spacing: 2

		Button {
			id: addNoteButton
			text: "Add note"
			Layout.fillWidth: true
			Layout.fillHeight: true
			onClicked: root.addNoteButtonClicked()
		}

		Button {
			id: addFolderButton
			text: "Add folder"
			Layout.fillWidth: true
			Layout.fillHeight: true
			onClicked: root.addFolderButtonClicked()
		}

		Button {
			text: "ADD"
			Layout.fillWidth: true
			Layout.fillHeight: true
		}

	}

}
