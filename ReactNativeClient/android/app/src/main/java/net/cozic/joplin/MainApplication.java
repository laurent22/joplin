package net.cozic.joplin;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.reactnativecommunity.slider.ReactSliderPackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;
import com.vinzscam.reactnativefileviewer.RNFileViewerPackage;
import net.rhogan.rnsecurerandom.RNSecureRandomPackage;
import com.imagepicker.ImagePickerPackage;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.oblador.vectoricons.VectorIconsPackage;
import com.reactnativedocumentpicker.ReactNativeDocumentPicker;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.rnfs.RNFSPackage;
import fr.bamlab.rnimageresizer.ImageResizerPackage;
import org.pgsqlite.SQLitePluginPackage;
import org.reactnative.camera.RNCameraPackage;

import com.alinz.parkerdan.shareextension.SharePackage;

import cx.evermeet.versioninfo.RNVersionInfoPackage;

import java.util.Arrays;
import java.util.List;
import android.database.CursorWindow;

public class MainApplication extends Application implements ReactApplication {

	private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
		@Override
		public boolean getUseDeveloperSupport() {
			return BuildConfig.DEBUG;
		}

		@Override
		protected List<ReactPackage> getPackages() {
			return Arrays.<ReactPackage>asList(
				new MainReactPackage(),
            new ReactSliderPackage(),
            new RNCWebViewPackage(),
            new ReactNativePushNotificationPackage(),
				new ImageResizerPackage(),
				new RNFileViewerPackage(),
				new RNSecureRandomPackage(),
				new ImagePickerPackage(),
				new ReactNativeDocumentPicker(),
				new RNFetchBlobPackage(),
				new RNFSPackage(),
				new SQLitePluginPackage(),
				new VectorIconsPackage(),
				new SharePackage(),
				new RNCameraPackage(),
				new RNVersionInfoPackage()
			);
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
			// Field field = CursorWindow.class.getDeclaredField("sCursorWindowSize");
			CursorWindow.class.getDeclaredField("sCursorWindowSize").setAccessible(true);
			CursorWindow.class.getDeclaredField("sCursorWindowSize").set(null, 50 * 1024 * 1024); // 50 MB
		} catch (Exception e) {
			// if (DEBUG_MODE) {
			// 	e.printStackTrace();
			// }
		}

		SoLoader.init(this, /* native exopackage */ false);
	}
}
