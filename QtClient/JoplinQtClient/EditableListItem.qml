import QtQuick 2.0
import QtQuick.Controls 2.0

Item {
	id: root
	width: parent.width
	height: 25

	Text {
		id: label
		text: display
		anchors.fill: parent
		verticalAlignment: Text.AlignVCenter
		MouseArea {
			anchors.fill: parent
			onClicked: {
				root.ListView.view.currentIndex = index
			}
			onDoubleClicked: {
				label.visible = false
				textField.visible = true
				textField.focus = true
				textField.selectAll()
				textField.text = display
			}
		}
	}

	TextField {
		id: textField
		text: display
		visible: false
		width: parent.width
		height: parent.height
		onAccepted: {
			root.ListView.view.model.setData(index, text)
		}
		onEditingFinished: {
			label.visible = true
			textField.visible = false
		}
	}
}
