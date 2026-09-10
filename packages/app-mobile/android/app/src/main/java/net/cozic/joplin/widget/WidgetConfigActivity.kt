package net.cozic.joplin.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper
import net.cozic.joplin.BuildConfig

class WidgetConfigActivity : ReactActivity() {
	val appWidgetId: Int
		get() = intent?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
			?: AppWidgetManager.INVALID_APPWIDGET_ID

	override fun getMainComponentName(): String = "widgetConfig"

	override fun createReactActivityDelegate(): ReactActivityDelegate =
		ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled))

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		// The default result must be RESULT_CANCELED so that backing out
		// of the config screen cancels the widget add (see
		// https://developer.android.com/develop/ui/views/appwidgets/configuration).
		setResult(Activity.RESULT_CANCELED)
	}
}
