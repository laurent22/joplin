package net.cozic.joplin
import android.content.res.Configuration
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import net.cozic.joplin.versioninfo.SystemVersionInformationPackage
import net.cozic.joplin.share.SharePackage
import net.cozic.joplin.ssl.SslPackage

class MainApplication : Application(), ReactApplication {
    override val reactHost: ReactHost by lazy {
        ExpoReactHostFactory.getDefaultReactHost(
            context = applicationContext,
            packageList =
                PackageList(this).packages.apply {
                    add(SharePackage())
                    add(SslPackage())
                    add(SystemInformationPackage())
                }
            )
    }

    override val reactHost: ReactHost
        get() = ReactNativeHostWrapper.createReactHost(this.applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()

        try {
            DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
        } catch (e: IllegalArgumentException) {
            DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.STABLE
        }
        loadReactNative(this)
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
}
