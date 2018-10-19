package net.cozic.joplin;

import android.content.pm.PackageInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.Map;
import java.util.HashMap;

public class VersionInfo extends ReactContextBaseJavaModule {

	ReactApplicationContext reactContext;

	public VersionInfo(ReactApplicationContext reactContext) {
		super(reactContext);

		this.reactContext = reactContext;
	}

	@Override
	public String getName() {
		return "VersionInfo";
	}

	@Override
	public Map<String, Object> getConstants() {
		HashMap<String, Object> constants = new HashMap<String, Object>();

		PackageManager packageManager = this.reactContext.getPackageManager();
		String packageName = this.reactContext.getPackageName();

		constants.put("appVersion", "not available");

		try {
			PackageInfo info = packageManager.getPackageInfo(packageName, 0);
			constants.put("appVersion", info.versionName);
		} catch (PackageManager.NameNotFoundException e) {
			e.printStackTrace();
		}
		return constants;
	}

}
