package net.cozic.joplin
import expo.modules.ReactActivityDelegateWrapper

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled))

  /**
   * This is a workaround to fix the upstream issue https://github.com/facebook/react-native/issues/49759#issuecomment-2918934967
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= 35) {
        val rootView = findViewById<View>(android.R.id.content)
        ViewCompat.setOnApplyWindowInsetsListener(rootView) { _, insets ->
          val innerPadding = insets.getInsets(WindowInsetsCompat.Type.ime())
          rootView.setPadding(
            innerPadding.left,
            innerPadding.top,
            innerPadding.right,
            innerPadding.bottom
          )
          insets
      }
    }
  }

  // Fix for https://github.com/laurent22/joplin/issues/14548
  // RN 0.81 made Pressable focusable by default, so Tab from the note title would visit
  // every header button before reaching the editor. Instead, when Tab is pressed from any
  // view that is not the editor WebView, we jump straight to the WebView.
  // This works because CodeMirror's tabMovesFocus=false means Tab inside the editor is
  // consumed as indentation and never bubbles up to this handler.
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (event.action == KeyEvent.ACTION_DOWN && event.keyCode == KeyEvent.KEYCODE_TAB && !event.isShiftPressed) {
      val focused = currentFocus
      // Only intercept Tab when focus is in the activity's own window (not in a dialog).
      if (focused != null && focused !is WebView && focused.rootView == window.decorView) {
        val editorWebView = findFirstWebView(window.decorView)
        if (editorWebView != null) {
          editorWebView.requestFocus()
          return true
        }
      }
    }
    return super.dispatchKeyEvent(event)
  }

  private fun findFirstWebView(root: View): WebView? {
    if (root is WebView) return root
    if (root is ViewGroup) {
      for (i in 0 until root.childCount) {
        val found = findFirstWebView(root.getChildAt(i))
        if (found != null) return found
      }
    }
    return null
  }
}
