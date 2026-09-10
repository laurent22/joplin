package net.cozic.joplin.widget

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.PersistableBundle
import android.view.View
import android.widget.RemoteViews

import net.cozic.joplin.MainActivity
import net.cozic.joplin.R

class WidgetViewsBuilder(private val context: Context) {
	fun build(slots: List<WidgetSlot>): RemoteViews {
		val views = RemoteViews(context.packageName, R.layout.widget_quick_actions)
		for (slot in slots) {
			val index = slot.slotIndex
			val action = slot.action
			if (action == null) {
				views.setViewVisibility(slotIds[index], View.GONE)
				continue
			}
			views.setViewVisibility(slotIds[index], View.VISIBLE)
			views.setImageViewResource(iconIds[index], WidgetIcons.drawableIdFor(action.type))
			views.setTextViewText(labelIds[index], action.title)
			views.setViewVisibility(labelIds[index], if (slot.labelVisible) View.VISIBLE else View.GONE)
			views.setContentDescription(slotIds[index], action.title)
			views.setOnClickPendingIntent(slotIds[index], pendingIntentFor(action))
		}
		return views
	}

	private fun pendingIntentFor(action: WidgetAction): PendingIntent {
		// Duplicates the intent contract of react-native-quick-actions
		// (AppShortcutsModule.java in jordanbyron/react-native-quick-actions):
		// a MainActivity intent with action "ACTION_SHORTCUT" and a
		// PersistableBundle extra "SHORTCUT_ITEM" carrying type/title/icon/userInfo.
		// Matching that format lets widget taps reuse the existing
		// quickActionShortcut handling in setupQuickActions.ts unchanged.
		val intent = Intent(context, MainActivity::class.java).apply {
			setAction(ACTION_QUICK_ACTION)
			putExtra(
				EXTRA_SHORTCUT_ITEM,
				PersistableBundle().apply {
					putString("type", action.type)
					putString("title", action.title)
					putString("icon", WidgetIcons.iconNameFor(action.type))
					putPersistableBundle("userInfo", PersistableBundle().apply { putString("url", "") })
				},
			)
		}
		return PendingIntent.getActivity(
			context,
			action.type.hashCode(),
			intent,
			PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
		)
	}

	companion object {
		const val ACTION_QUICK_ACTION = "ACTION_SHORTCUT"
		const val EXTRA_SHORTCUT_ITEM = "SHORTCUT_ITEM"

		private val slotIds = intArrayOf(R.id.slot_1, R.id.slot_2, R.id.slot_3, R.id.slot_4, R.id.slot_5)
		private val iconIds = intArrayOf(R.id.icon_1, R.id.icon_2, R.id.icon_3, R.id.icon_4, R.id.icon_5)
		private val labelIds = intArrayOf(R.id.label_1, R.id.label_2, R.id.label_3, R.id.label_4, R.id.label_5)
	}
}
