#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#import <UserNotifications/UserNotifications.h>

@interface RnAlarmNotification : RCTEventEmitter <RCTBridgeModule>
+ (void)didReceiveNotificationResponse:(UNNotificationResponse *)response API_AVAILABLE(ios(10.0));
+ (void)didReceiveNotification:(UNNotification *)notification API_AVAILABLE(ios(10.0));
@end
