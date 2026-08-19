import Expo
import React
import ReactAppDependencyProvider
 
// Notes:
// - UNUserNotificationCenterDelegate is required by @react-native-community/push-notification-ios
// - This file is derived from the default React Native and Expo `AppDelegate.swift`.
@UIApplicationMain
public class AppDelegate: ExpoAppDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?
 
  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
 
  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
 
    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)
 
#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
    
    // Define UNUserNotificationCenter -- required by @react-native-community/push-notification-ios
    let center = UNUserNotificationCenter.current();
    center.delegate = self;
 
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
 
  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }
 
  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
  
  // Quick actions
  public override func application(
    _ application: UIApplication,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    RNQuickActionManager.onQuickActionPress(shortcutItem, completionHandler: completionHandler)
  }
  
  // Notifications with @react-native-community/push-notification-ios
  // IOS 10+ Required for localNotification event
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    RNCPushNotificationIOS.didReceive(response);
    completionHandler();
  }
}
 
class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins
 
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }
 
  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
