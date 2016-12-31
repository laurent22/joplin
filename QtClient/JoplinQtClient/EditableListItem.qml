import QtQuick 2.0
import QtQuick.Controls 2.0

Item {
	id: root
	width: parent.width
	height: 25
	property int mouseAreaDefaultWidth
	property Menu contextMenu

	signal stoppedEditing;
	signal editingAccepted(int index, string text);

	function makeEditable(editable) {
		if (typeof editable === 'undefined') editable = true;

		if (editable === isEditable()) return; // Nothing to do

		if (editable) {
			label.visible = false
			mouseArea.anchors.rightMargin = 10000; // Hack because `mouseArea.visible = false` makes the MouseArea ignore the next click event
			textField.visible = true
			textField.focus = true
			textField.text = display
			root.ListView.view.focus = true;
			textField.selectAll()
		} else {
			mouseArea.anchors.rightMargin = 0;
			label.visible = true
			textField.visible = false
			root.stoppedEditing();
		}
	}

	function startEditing() {
		makeEditable(true);
	}

	function stopEditing() {
		makeEditable(false);
	}

	function isEditable() {
		return textField.visible;
	}

	Text {
		id: label
		text: display
		anchors.fill: parent
		verticalAlignment: Text.AlignVCenter
	}

	TextField {
		id: textField
		visible: false
		width: parent.width
		height: parent.height
		onAccepted: {
			root.editingAccepted(index, text);
		}
		onEditingFinished: {
			stopEditing();
		}
	}

	MouseArea {
		id: mouseArea
		anchors.fill: parent
		acceptedButtons: Qt.LeftButton | Qt.RightButton
		onClicked: {
			root.ListView.view.currentIndex = index
			if (mouse.button === Qt.RightButton) {
				contextMenu.open();
			}
		}
		onDoubleClicked: {
			startEditing();
		}
	}

}
