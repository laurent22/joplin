package net.cozic.joplin.widget

import net.cozic.joplin.R

class WidgetIcons private constructor() {
	companion object {
		fun drawableIdFor(type: String): Int = when (type) {
			"newTodo" -> R.drawable.ic_widget_new_todo
			"newPhoto" -> R.drawable.ic_widget_new_photo
			"newResource" -> R.drawable.ic_widget_new_attachment
			"newDrawing" -> R.drawable.ic_widget_new_drawing
			else -> R.drawable.ic_widget_new_note
		}

		// Icon name recorded in the shortcut-item bundle to match the
		// format produced by setShortcutItems() in setupQuickActions.ts.
		fun iconNameFor(type: String): String = when (type) {
			"newTodo" -> "Add"
			"newPhoto" -> "CapturePhoto"
			"newResource" -> "Bookmark"
			"newDrawing" -> "Favorite"
			else -> "Compose"
		}
	}
}
