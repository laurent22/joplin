package net.cozic.joplin.widget

import android.appwidget.AppWidgetManager
import android.content.Context

object WidgetRefresher {
	// Below this width (in dp) labels are hidden and buttons show icons only.
	const val LABEL_VISIBLE_MIN_WIDTH_DP = 180

	fun refresh(context: Context, appWidgetId: Int) {
		val manager = AppWidgetManager.getInstance(context)
		val minWidth = manager.getAppWidgetOptions(appWidgetId)
			.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
		refresh(context, appWidgetId, minWidth)
	}

	fun refresh(context: Context, appWidgetId: Int, minWidthDp: Int) {
		val actions = WidgetConfigStore(context).load(appWidgetId)
		val slots = WidgetSlotMapper.slotsFor(actions, showLabels = minWidthDp >= LABEL_VISIBLE_MIN_WIDTH_DP)
		val views = WidgetViewsBuilder(context).build(slots)
		AppWidgetManager.getInstance(context).updateAppWidget(appWidgetId, views)
	}
}
