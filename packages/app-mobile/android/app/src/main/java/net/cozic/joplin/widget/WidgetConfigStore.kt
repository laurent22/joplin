package net.cozic.joplin.widget

import android.content.Context

class WidgetConfigStore(private val context: Context) {
	fun load(appWidgetId: Int): List<WidgetAction> =
		WidgetConfigCodec.deserialize(prefs().getString(key(appWidgetId), null))

	fun has(appWidgetId: Int): Boolean = prefs().contains(key(appWidgetId))

	fun save(appWidgetId: Int, actions: List<WidgetAction>) {
		prefs().edit().putString(key(appWidgetId), WidgetConfigCodec.serialize(actions)).apply()
	}

	fun clear(appWidgetId: Int) {
		prefs().edit().remove(key(appWidgetId)).apply()
	}

	private fun prefs() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

	private fun key(appWidgetId: Int) = "widget_actions_$appWidgetId"

	companion object {
		private const val PREFS_NAME = "joplin_widget_quick_actions"
	}
}
