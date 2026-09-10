package net.cozic.joplin.widget

data class WidgetAction(val type: String, val title: String)

object DefaultWidgetActions {
	val all: List<WidgetAction> = listOf(
		WidgetAction("newNote", "New note"),
		WidgetAction("newTodo", "New to-do"),
		WidgetAction("newPhoto", "New photo"),
		WidgetAction("newResource", "New attachment"),
		WidgetAction("newDrawing", "New drawing"),
	)
}
