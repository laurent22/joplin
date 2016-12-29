import QtQuick 2.0
import QtQuick.Controls 2.0

Component {
	Item {
		width: parent.width
		height: 25
		Text {
			id: label
			text: display
			anchors.fill: parent
			MouseArea {
				anchors.fill: parent
				onClicked: {
					listView.currentIndex = index
				}
				onDoubleClicked: {
					label.visible = false
					textField.visible = true
					textField.focus = true
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
				
			}
			onEditingFinished: {
				label.visible = true
				textField.visible = false
			}
		}
	}
}
