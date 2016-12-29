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
		MouseArea {
			anchors.fill: parent
			onClicked: {
				root.ListView.view.currentIndex = index
			}
			onDoubleClicked: {
				label.visible = false
				textField.visible = true
				textField.focus = true
				console.info("Editing ", index)
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
			console.info(root.ListView.view.model);
			console.info("Done ", index)
			root.ListView.view.model.setData(index, text)
			//root.ListView.view.model.setDataInt(index, "trest")
			//root.ListView.view.currentItem = "test"
		}
		onEditingFinished: {
			label.visible = true
			textField.visible = false
		}
	}
}
