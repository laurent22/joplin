package net.cozic.joplin.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle

class JoplinQuickActionsWidgetProvider : AppWidgetProvider() {
	override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
		for (appWidgetId in appWidgetIds) {
			WidgetRefresher.refresh(context, appWidgetId)
		}
	}

	// Re-render on resize so launcher-provided geometry changes never leave
	// a stale layout, even though the views themselves are size-independent.
	override fun onAppWidgetOptionsChanged(
		context: Context,
		appWidgetManager: AppWidgetManager,
		appWidgetId: Int,
		newOptions: Bundle,
	) {
		WidgetRefresher.refresh(context, appWidgetId)
	}

	override fun onDeleted(context: Context, appWidgetIds: IntArray) {
		val store = WidgetConfigStore(context)
		for (appWidgetId in appWidgetIds) {
			store.clear(appWidgetId)
		}
	}
}
