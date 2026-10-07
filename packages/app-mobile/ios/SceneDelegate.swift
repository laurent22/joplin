internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options: UIScene.ConnectionOptions
  ) {
    if let shortcutItem = options.shortcutItem {
      RNQuickActionManager.setInitialAction(shortcutItem)
    }
    
    super.scene(scene, willConnectTo: session, options: options)
  }
  
  // For react-native-quick-actions support:
  public override func windowScene(
    _ scene: UIWindowScene,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    RNQuickActionManager.onQuickActionPress(shortcutItem, completionHandler: completionHandler)
  }
}
