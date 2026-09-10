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

	override fun onAppWidgetOptionsChanged(
		context: Context,
		appWidgetManager: AppWidgetManager,
		appWidgetId: Int,
		newOptions: Bundle,
	) {
		val minWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
		WidgetRefresher.refresh(context, appWidgetId, minWidth)
	}

	override fun onDeleted(context: Context, appWidgetIds: IntArray) {
		val store = WidgetConfigStore(context)
		for (appWidgetId in appWidgetIds) {
			store.clear(appWidgetId)
		}
	}
}
