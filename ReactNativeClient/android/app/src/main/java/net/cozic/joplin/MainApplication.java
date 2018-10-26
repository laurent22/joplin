package net.cozic.joplin;

import android.app.Application;

import com.facebook.react.ReactApplication;
import org.reactnative.camera.RNCameraPackage;
import com.vinzscam.reactnativefileviewer.RNFileViewerPackage;
import net.rhogan.rnsecurerandom.RNSecureRandomPackage;
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;
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

import com.alinz.parkerdan.shareextension.SharePackage;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

	private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
		@Override
		public boolean getUseDeveloperSupport() {
			return BuildConfig.DEBUG;
		}

		@Override
		protected List<ReactPackage> getPackages() {
			return Arrays.<ReactPackage>asList(
				new ImageResizerPackage(),
				new MainReactPackage(),
            new RNCameraPackage(),
            new RNFileViewerPackage(),
            new RNSecureRandomPackage(),
            new ReactNativePushNotificationPackage(),
				new ImagePickerPackage(),
				new ReactNativeDocumentPicker(),
				new RNFetchBlobPackage(),
				new RNFSPackage(),
				new SQLitePluginPackage(),
				new VectorIconsPackage(),
				new SharePackage()
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
		SoLoader.init(this, /* native exopackage */ false);
	}
}
