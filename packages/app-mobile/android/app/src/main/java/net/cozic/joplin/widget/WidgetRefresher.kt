package net.cozic.joplin.widget

import android.appwidget.AppWidgetManager
import android.content.Context

object WidgetRefresher {
	fun refresh(context: Context, appWidgetId: Int) {
		val actions = WidgetConfigStore(context).load(appWidgetId)
		val slots = WidgetSlotMapper.slotsFor(actions)
		val views = WidgetViewsBuilder(context).build(slots)
		AppWidgetManager.getInstance(context).updateAppWidget(appWidgetId, views)
	}
}
