package com.ikuteam.notestn.ui.editor

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.ImageDecoder
import android.net.Uri
import android.view.DragEvent
import android.view.ViewGroup
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import com.ikuteam.notestn.BuildConfig
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewFeature
import com.ikuteam.notestn.data.DatabaseManager
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * Hosts the shared ProseMirror editor bundle (Mac/EditorBundle, built into
 * app/src/main/assets/editor.html + editor.bundle.js) inside an Android WebView.
 * Mirrors Mac/NotesTN/NotesTN/Views/EditorView.swift `RichTextEditorView`.
 *
 * Local files (the editor bundle and image resources) are served through
 * https://appassets.androidplatform.net/ via WebViewAssetLoader — the modern
 * replacement for file:// access, which WebView restricts on API 30+.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun EditorWebView(
    coordinator: EditorCoordinator,
    darkTheme: Boolean,
    readOnly: Boolean = false,
    modifier: Modifier = Modifier,
) {
    // Bumped when the WebView's render process dies (see onRenderProcessGone below)
    // — re-keys the AndroidView so a fresh WebView is created in place of the dead
    // one. Without this the editor silently rendered blank/broken until the app was
    // killed and reopened.
    var webViewGeneration by remember { mutableIntStateOf(0) }
    // Theme last pushed into the page — `update` runs on every recomposition
    // (including each frame of the keyboard animation, since EditorScreen reads the
    // raw IME inset), and re-evaluating the same JS per frame is pointless bridge
    // chatter. Plain holder (not MutableState): only read/written inside `update`.
    val lastAppliedDark = remember { arrayOf<Boolean?>(null) }

    key(webViewGeneration) {
    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            val assetLoader = WebViewAssetLoader.Builder()
                .setDomain("appassets.androidplatform.net")
                .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(ctx))
                .addPathHandler(
                    "/resources/",
                    WebViewAssetLoader.InternalStoragePathHandler(ctx, DatabaseManager.shared.resourcesDirectory),
                )
                .build()

            // Debug builds only: lets chrome://inspect attach, and forwards JS console
            // errors (e.g. an uncaught exception in the Enter/paragraph-split keymap)
            // to Logcat instead of them vanishing silently inside the WebView.
            if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)

            WebView(ctx).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                // WebView's default layout algorithm is TEXT_AUTOSIZING, which inflates
                // font sizes by the ratio between the WebView's width and the screen's.
                // In the resizable two-pane layout that means dragging the divider
                // silently rescaled the note's text, and the same note rendered at a
                // different size depending on the split. NORMAL turns the boosting off,
                // so the CSS font sizes in editor.html are what actually renders and
                // text only ever reflows to the new width.
                settings.layoutAlgorithm = WebSettings.LayoutAlgorithm.NORMAL
                setBackgroundColor(Color.TRANSPARENT)
                if (BuildConfig.DEBUG) {
                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                            Log.d("EditorJS", "${message.message()} (${message.sourceId()}:${message.lineNumber()})")
                            return true
                        }
                    }
                }

                // Belt-and-suspenders for any native WebView chrome (e.g. scrollbars);
                // the actual page theming below no longer depends on this.
                if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                    WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, true)
                }

                addJavascriptInterface(EditorJsBridge(coordinator), "AndroidBridge")

                // Drag and drop an image in from another app (split screen, or a
                // desktop-mode window). Android's WebView doesn't pass file drops to
                // the page, so this can't ride on the editor bundle's handleDrop the
                // way Mac and iPad do — the drop is caught here and handed to the
                // screen, which inserts it at the cursor.
                setOnDragListener { _, event ->
                    when (event.action) {
                        DragEvent.ACTION_DRAG_STARTED ->
                            event.clipDescription?.hasMimeType("image/*") == true

                        DragEvent.ACTION_DROP -> {
                            // The URI belongs to the dragging app, so we need read
                            // permission on it before the copy. The grant lasts until
                            // this activity is destroyed, which is well past the copy.
                            ctx.findActivity()?.requestDragAndDropPermissions(event)
                            val clip = event.clipData
                            var handled = false
                            if (clip != null) {
                                for (i in 0 until clip.itemCount) {
                                    clip.getItemAt(i).uri?.let {
                                        coordinator.onImageDropped?.invoke(it)
                                        handled = true
                                    }
                                }
                            }
                            handled
                        }

                        else -> true
                    }
                }

                webViewClient = object : WebViewClient() {
                    override fun shouldInterceptRequest(
                        view: WebView,
                        request: WebResourceRequest,
                    ): WebResourceResponse? {
                        // Chromium (the WebView's rendering engine) has no built-in HEIC/HEIF
                        // decoder, unlike Coil/ImageDecoder which the note list's thumbnails
                        // already go through — so an <img> pointed straight at a .heic
                        // resource silently fails to render here. Transcode to JPEG on the
                        // fly for just this request; the original HEIC file on disk (and
                        // whatever gets synced to Joplin Cloud) is never touched.
                        val url = request.url
                        val filename = url.lastPathSegment
                        if (url.host == "appassets.androidplatform.net" && url.path?.startsWith("/resources/") == true && filename != null) {
                            val mimeType = DatabaseManager.shared.resourceMimeTypeForFilename(filename)
                            if (mimeType == "image/heic" || mimeType == "image/heif") {
                                val jpegBytes = transcodeHeicToJpeg(File(DatabaseManager.shared.resourcesDirectory, filename))
                                if (jpegBytes != null) {
                                    return WebResourceResponse("image/jpeg", "utf-8", ByteArrayInputStream(jpegBytes))
                                }
                                // Decode failed — fall through to the normal asset loader below,
                                // same (broken) behavior as before this fix rather than crashing.
                            }
                        }
                        return assetLoader.shouldInterceptRequest(url)
                    }

                    override fun shouldOverrideUrlLoading(
                        view: WebView,
                        request: WebResourceRequest,
                    ): Boolean {
                        val url = request.url
                        // The editor page itself and its resources live on this virtual domain —
                        // only intercept genuine outbound navigation (defensive fallback; normal
                        // link clicks are handled by the ProseMirror "openUrl" bridge message).
                        if (url.host == "appassets.androidplatform.net") return false
                        openInBrowser(view.context, url)
                        return true
                    }

                    override fun onPageFinished(view: WebView, url: String) {
                        // Belt-and-suspenders: the ?theme= param (below) already sets this
                        // before first paint, but re-apply in case the page reloads.
                        applyDarkMode(view, darkTheme)
                    }

                    // The OS can kill the WebView's sandboxed render process (memory
                    // pressure, long background stretches). Returning true keeps the
                    // whole app from being killed along with it (the default), and
                    // re-keying the AndroidView swaps the dead WebView for a fresh
                    // one — coordinator.isReady drops until the new page's "ready"
                    // fires, at which point EditorScreen re-pushes the current
                    // content. Previously the editor just went permanently blank.
                    override fun onRenderProcessGone(
                        view: WebView,
                        detail: RenderProcessGoneDetail,
                    ): Boolean {
                        Log.w("EditorWebView", "Render process gone (crashed=${detail.didCrash()}) — recreating editor")
                        coordinator.notifyEditorReset()
                        webViewGeneration++
                        return true
                    }
                }

                coordinator.webView = this
                // ?theme= is read by a synchronous bootstrap script in editor.html's
                // <head>, before first paint — avoids a flash of the wrong theme.
                // ?readonly=1 disables ProseMirror's contentEditable entirely for a
                // trashed note opened from Trash — see EditorBundle/src/index.ts.
                // ?platform=android adds extra bottom padding (body.pm-android in
                // build.mjs) so the last line of a long note can scroll clear of the
                // floating formatting toolbar/keyboard.
                // See Mac/EditorBundle/build.mjs.
                val themeParam = if (darkTheme) "dark" else "light"
                val readOnlyParam = if (readOnly) "&readonly=1" else ""
                loadUrl("https://appassets.androidplatform.net/assets/editor.html?theme=$themeParam$readOnlyParam&platform=android")
            }
        },
        update = { webView ->
            if (lastAppliedDark[0] != darkTheme) {
                lastAppliedDark[0] = darkTheme
                applyDarkMode(webView, darkTheme)
            }
        },
        // onRelease (not DisposableEffect) so cleanup gets the exact WebView instance
        // being released. destroy() matters: a WebView is a native browser instance,
        // and this app creates one per opened note — without destroy(), each one's
        // renderer memory lingered until finalizers ran, degrading the whole app
        // over a long session (another "fixed by restarting" symptom).
        onRelease = { webView ->
            if (coordinator.webView === webView) coordinator.webView = null
            webView.stopLoading()
            webView.removeJavascriptInterface("AndroidBridge")
            webView.destroy()
        },
    )
    }
}

private fun applyDarkMode(webView: WebView, dark: Boolean) {
    val theme = if (dark) "dark" else "light"
    webView.evaluateJavascript(
        "document.documentElement.setAttribute('data-theme', '$theme')",
        null,
    )
}

private fun openInBrowser(context: android.content.Context, url: Uri) {
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, url)) }
}

/** The Activity behind a Context, which may be wrapped a few layers deep. Needed to
 * ask for permission on a dragged-in URI, which only an Activity can do. */
private fun android.content.Context.findActivity(): android.app.Activity? {
    var context: android.content.Context? = this
    while (context is android.content.ContextWrapper) {
        if (context is android.app.Activity) return context
        context = context.baseContext
    }
    return null
}

/** Decodes a HEIC/HEIF file and re-encodes it as JPEG bytes, for serving to the
 * WebView in place of the original (see shouldInterceptRequest above). Forces
 * ALLOCATOR_SOFTWARE so the resulting Bitmap is guaranteed compressible — the
 * platform default allocator can hand back a hardware Bitmap that Bitmap.compress
 * can't read pixels from. Returns null on any failure (corrupt file, decode error,
 * etc.) so the caller can fall back to the previous (unsupported-format) behavior
 * instead of crashing the WebView load. */
private fun transcodeHeicToJpeg(file: File): ByteArray? = runCatching {
    val source = ImageDecoder.createSource(file)
    val bitmap = ImageDecoder.decodeBitmap(source) { decoder, _, _ ->
        decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
    }
    ByteArrayOutputStream().use { out ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
        out.toByteArray()
    }
}.getOrNull()
