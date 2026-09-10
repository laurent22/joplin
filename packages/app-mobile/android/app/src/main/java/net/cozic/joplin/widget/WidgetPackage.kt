package net.cozic.joplin.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ViewManager

class WidgetPackage : ReactPackage {
	override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
		listOf(WidgetManagerModule(reactContext))

	override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
		emptyList()
}

class WidgetManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
	override fun getName() = "JoplinWidget"

	@ReactMethod
	fun getConfigInfo(promise: Promise) {
		val activity = reactApplicationContext.currentActivity
		if (activity !is WidgetConfigActivity) {
			promise.reject("NO_CONFIG_ACTIVITY", "Widget config activity is not in the foreground")
			return
		}
		val store = WidgetConfigStore(reactApplicationContext)
		val map = Arguments.createMap()
		map.putInt("appWidgetId", activity.appWidgetId)
		val saved = if (store.has(activity.appWidgetId)) {
			val items = Arguments.createArray()
			for (action in store.load(activity.appWidgetId)) {
				val item = Arguments.createMap()
				item.putString("type", action.type)
				item.putString("title", action.title)
				items.pushMap(item)
			}
			items
		} else {
			null
		}
		map.putArray("items", saved)
		promise.resolve(map)
	}

	@ReactMethod
	fun saveConfig(appWidgetId: Int, items: ReadableArray, promise: Promise) {
		val actions = mutableListOf<WidgetAction>()
		for (i in 0 until items.size()) {
			val item = items.getMap(i) ?: continue
			val type = item.getString("type") ?: continue
			val title = item.getString("title") ?: continue
			actions.add(WidgetAction(type, title))
		}
		if (actions.isEmpty()) {
			promise.reject("EMPTY_CONFIG", "At least one action must be selected")
			return
		}
		WidgetConfigStore(reactApplicationContext).save(appWidgetId, actions)
		WidgetRefresher.refresh(reactApplicationContext, appWidgetId)

		reactApplicationContext.currentActivity?.let { activity ->
			val result = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
			activity.setResult(Activity.RESULT_OK, result)
			activity.finish()
		}
		promise.resolve(null)
	}

	@ReactMethod
	fun cancelConfig(promise: Promise) {
		reactApplicationContext.currentActivity?.finish()
		promise.resolve(null)
	}

	@ReactMethod
	fun addListener(eventName: String) {}

	@ReactMethod
	fun removeListeners(count: Int) {}
}
