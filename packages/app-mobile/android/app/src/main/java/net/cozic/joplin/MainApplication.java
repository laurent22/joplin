package net.cozic.joplin;

import android.app.Application;
import android.database.CursorWindow;
import android.webkit.WebView;

// import androidx.multidex.MultiDex;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.oblador.vectoricons.VectorIconsPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;

import net.cozic.joplin.share.SharePackage;
import net.cozic.joplin.ssl.SslPackage;
import net.cozic.joplin.textinput.TextInputPackage;

import java.lang.reflect.Field;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  // Needed to fix: The number of method references in a .dex file cannot exceed 64K
  // @Override
  // protected void attachBaseContext(Context base) {
  //    super.attachBaseContext(base);
  //    MultiDex.install(this);
  // }

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          // Packages that cannot be autolinked yet can be added manually here, for example:
          packages.add(new SharePackage());
          packages.add(new SslPackage());
          packages.add(new TextInputPackage());
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }
        @Override
        protected Boolean isHermesEnabled() {
          return BuildConfig.IS_HERMES_ENABLED;
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();

    // To try to fix the error "Row too big to fit into CursorWindow"
		// https://github.com/andpor/react-native-sqlite-storage/issues/364#issuecomment-526423153
		// https://github.com/laurent22/joplin/issues/1767#issuecomment-515617991
		try {
			Field field = CursorWindow.class.getDeclaredField("sCursorWindowSize");
            field.setAccessible(true);
            field.set(null, 50 * 1024 * 1024); //the 102400 is the new size added
		} catch (Exception e) {
			e.printStackTrace();
    }
    
    SoLoader.init(this, /* native exopackage */ false);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load();
    }
    ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
  }
}
