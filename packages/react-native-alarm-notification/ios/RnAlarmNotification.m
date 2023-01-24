#import "RnAlarmNotification.h"

#import <UserNotifications/UserNotifications.h>

#import <React/RCTBridge.h>
#import <React/RCTConvert.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTUtils.h>
#import <AudioToolbox/AudioToolbox.h>
#import <AVFoundation/AVFoundation.h>

static NSString *const kLocalNotificationReceived = @"LocalNotificationReceived";
static NSString *const kLocalNotificationDismissed = @"LocalNotificationDismissed";

static AVAudioPlayer *player;
static id _sharedInstance = nil;

@implementation RnAlarmNotification

+(instancetype)sharedInstance {
    static dispatch_once_t p;
    dispatch_once(&p, ^{
        _sharedInstance = [[self alloc] init];
    });
    return _sharedInstance;
}

API_AVAILABLE(ios(10.0))
static NSDictionary *RCTFormatUNNotification(UNNotification *notification) {
    NSMutableDictionary *formattedNotification = [NSMutableDictionary dictionary];
    UNNotificationContent *content = notification.request.content;

    formattedNotification[@"id"] = notification.request.identifier;
    formattedNotification[@"data"] = RCTNullIfNil([content.userInfo objectForKey:@"data"]);

    return formattedNotification;
}

static NSDateComponents *parseDate(NSString *dateString) {
    NSArray *fire_date = [dateString componentsSeparatedByString:@" "];
    NSString *date = fire_date[0];
    NSString *time = fire_date[1];
    
    NSArray *splitDate = [date componentsSeparatedByString:@"-"];
    NSArray *splitHour = [time componentsSeparatedByString:@":"];
    
    NSString *strNumDay = splitDate[0];
    NSString *strNumMonth = splitDate[1];
    NSString *strNumYear = splitDate[2];
    
    NSString *strNumHour = splitHour[0];
    NSString *strNumMinute = splitHour[1];
    NSString *strNumSecond = splitHour[2];
    
    // Configure the trigger for date
    NSDateComponents *fireDate = [[NSDateComponents alloc] init];
    fireDate.day = [strNumDay intValue];
    fireDate.month = [strNumMonth intValue];
    fireDate.year = [strNumYear intValue];
    fireDate.hour = [strNumHour intValue];
    fireDate.minute = [strNumMinute intValue];
    fireDate.second = [strNumSecond intValue];
    fireDate.timeZone = [NSTimeZone defaultTimeZone];
    
    return fireDate;
}

static NSDateComponents *dateToComponents(NSDate *date) {
    NSDateComponents *fireDate = [[NSDateComponents alloc] init];
    
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    
    [formatter setDateFormat:@"yyyy"];
    NSString *year = [formatter stringFromDate:date];
    
    [formatter setDateFormat:@"MM"];
    NSString *month = [formatter stringFromDate:date];
    
    [formatter setDateFormat:@"dd"];
    NSString *day = [formatter stringFromDate:date];
    
    [formatter setDateFormat:@"HH"];
    NSString *hour = [formatter stringFromDate:date];
    
    [formatter setDateFormat:@"mm"];
    NSString *minute = [formatter stringFromDate:date];
    
    [formatter setDateFormat:@"ss"];
    NSString *second = [formatter stringFromDate:date];
    
    fireDate.day = [day intValue];
    fireDate.month = [month intValue];
    fireDate.year = [year intValue];
    fireDate.hour = [hour intValue];
    fireDate.minute = [minute intValue];
    fireDate.second = [second intValue];
    fireDate.timeZone = [NSTimeZone defaultTimeZone];
    
    return fireDate;
}

static NSString *stringify(NSDictionary *notification) {
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:notification options:0 error:&error];
    
    if (! jsonData) {
        NSLog(@"Got an error: %@", error);
        return @"bad json";
    } else {
        NSString * jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
        
        return jsonString;
    }
}

- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

RCT_EXPORT_MODULE(RNAlarmNotification);

+ (void)vibratePhone {
    NSLog(@"vibratePhone %@", @"here");
    if([[UIDevice currentDevice].model isEqualToString:@"iPhone"]) {
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate);
    } else {
        AudioServicesPlayAlertSound(kSystemSoundID_Vibrate);
    }
}

+ (void) didReceiveNotification:(UNNotification *)notification  API_AVAILABLE(ios(10.0)){
    NSLog(@"content: %@", notification.request.content.userInfo);
    NSLog(@"alarm id: %@", notification.request.identifier);
    
    NSNumber *vibrate = [notification.request.content.userInfo objectForKey:@"vibrate"];
    NSLog(@"vibrate: %@", vibrate);
    
    NSNumber *sound = [notification.request.content.userInfo objectForKey:@"sound"];
    
    if([vibrate isEqualToNumber: [NSNumber numberWithInt: 1]]){
        NSLog(@"do vibrate now");
        [RnAlarmNotification vibratePhone];
    }
    
    if([sound isEqualToNumber: [NSNumber numberWithInt: 1]]){
        [RnAlarmNotification playSound:notification];
    }
    
    NSString *scheduleType = [notification.request.content.userInfo objectForKey:@"schedule_type"];
    if([scheduleType isEqualToString:@"repeat"]){
        [RnAlarmNotification repeatAlarm:notification];
    }
}

+ (void)didReceiveNotificationResponse:(UNNotificationResponse *)response
API_AVAILABLE(ios(10.0)) {
    NSLog(@"show notification");
    [[UIApplication sharedApplication] setIdleTimerDisabled:NO];
    if ([response.notification.request.content.categoryIdentifier isEqualToString:@"CUSTOM_ACTIONS"]) {
       if ([response.actionIdentifier isEqualToString:@"SNOOZE_ACTION"]) {
           [RnAlarmNotification snoozeAlarm:response.notification];
       } else if ([response.actionIdentifier isEqualToString:@"DISMISS_ACTION"]) {
           NSLog(@"do dismiss");
           [RnAlarmNotification stopSound];
           
           NSMutableDictionary *notification = [NSMutableDictionary dictionary];
           notification[@"id"] = response.notification.request.identifier;
           
           [[NSNotificationCenter defaultCenter] postNotificationName:kLocalNotificationDismissed
                                                               object:self
                                                             userInfo:notification];
       }
    }
    
    // send notification
    [[NSNotificationCenter defaultCenter] postNotificationName:kLocalNotificationReceived
                                                        object:self
                                                      userInfo:RCTFormatUNNotification(response.notification)];
}

- (void)startObserving {
    // receive notification
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleLocalNotificationReceived:) name:kLocalNotificationReceived
                                               object:nil];
    
    // dismiss notification
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleLocalNotificationDismissed:) name:kLocalNotificationDismissed
                                               object:nil];
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"OnNotificationOpened", @"OnNotificationDismissed"];
}

- (void)handleLocalNotificationReceived:(NSNotification *)notification {
    // send to js
    [self sendEventWithName:@"OnNotificationOpened" body: stringify(notification.userInfo)];
}

- (void)handleLocalNotificationDismissed:(NSNotification *)notification {
    // send to js
    [self sendEventWithName:@"OnNotificationDismissed" body: stringify(notification.userInfo)];
}

- (void)stopObserving {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

+ (void)playSound:(UNNotification *)notification  API_AVAILABLE(ios(10.0)){
    @try {
        NSString *soundName = [notification.request.content.userInfo objectForKey:@"sound_name"];
        NSNumber *loopSound = [notification.request.content.userInfo objectForKey:@"loop_sound"];
        NSString *volume = [notification.request.content.userInfo objectForKey:@"volume"];
        
        NSLog(@"do play sound now: %@", soundName);
        NSLog(@"loop sound: %@", loopSound);
        NSLog(@"volume sound: %@", volume);
        
//        AVAudioSession *session = [AVAudioSession sharedInstance];
//        [session setCategory:AVAudioSessionCategoryPlayback
//                 withOptions:AVAudioSessionCategoryOptionMixWithOthers
//                       error:nil];
//        [session setActive:true error:nil];
        //[session setMode:AVAudioSessionModeDefault error:nil]; // optional
        
//        NSError *playerError = nil;
        
//        if([RnAlarmNotification checkStringIsNotEmpty:soundName]){
//            NSLog(@"soundName: %@", soundName);
//
//            NSString *path = [[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:soundName];
//
//            NSString* soundPathEscaped = [path stringByAddingPercentEncodingWithAllowedCharacters:[NSCharacterSet URLQueryAllowedCharacterSet]];
//            NSURL *soundUri = [NSURL URLWithString:soundPathEscaped];
//
//            NSLog(@"sound path: %@", soundUri);
//
//            if(player){
//                [player stop];
//                player = nil;
//            }
//
//            player = [[AVAudioPlayer alloc] initWithContentsOfURL:soundUri
//                                                            error:&playerError];
//
//            if(playerError) {
//                NSLog(@"[AppDelegate] audioPlayerError: %@", playerError);
//            } else if (player){
//                @synchronized(self){
//                    player.delegate = (id<AVAudioPlayerDelegate>)self;;
//                    player.enableRate = YES;
//                    [player prepareToPlay];
//
//                    NSLog(@"sound volume: %@", RCTNullIfNil(volume));
//                    // set volume
//                    player.volume = [volume floatValue];
//
//                    NSLog(@"sound loop: %@", loopSound);
//                    // enable/disable loop
//                    if ([loopSound isEqualToNumber: [NSNumber numberWithInt: 1]]) {
//                        player.numberOfLoops = -1;
//                    } else {
//                        player.numberOfLoops = 0;
//                    }
//
//                    [player play];
//                }
//            }
//        }
    } @catch(NSException *exception){
        NSLog(@"%@", exception.reason);
    }
}

+ (void)stopSound {
    @try {
        if (player) {
            [player stop];
            player.currentTime = 0;
        }
    } @catch(NSException *exception){
        NSLog(@"%@", exception.reason);
    }
}

+ (void)repeatAlarm:(UNNotification *)notification  API_AVAILABLE(ios(10.0)) {
    [RnAlarmNotification stopSound];
    
    @try {
        if (@available(iOS 10.0, *)) {
            UNNotificationContent *contentInfo = notification.request.content;
            UNMutableNotificationContent* content = [[UNMutableNotificationContent alloc] init];
            
            content.title = contentInfo.title;
            content.body = contentInfo.body;
            
            NSString *scheduleType = [contentInfo.userInfo objectForKey:@"schedule_type"];
            NSLog(@"schedule type: %@", scheduleType);
            
            NSNumber *has_button = [contentInfo.userInfo objectForKey:@"has_button"];
            
            // set buttons
            if([has_button isEqualToNumber: [NSNumber numberWithInt: 1]]){
                content.categoryIdentifier = @"CUSTOM_ACTIONS";
            }
            
            // set alarm date
            NSString *fire_date = [contentInfo.userInfo objectForKey:@"fire_date"];
            
            NSDateComponents *fireDate = parseDate(fire_date);
            
            NSString *repeat_interval = [contentInfo.userInfo objectForKey:@"repeat_interval"];
            NSNumber *interval_value = [contentInfo.userInfo objectForKey:@"interval_value"];
            NSLog(@"schedule repeat interval %@", repeat_interval);
            
            if([repeat_interval isEqualToString:@"minutely"]){
                fireDate.minute = fireDate.minute + [interval_value intValue];
            } else if([repeat_interval isEqualToString:@"hourly"]) {
                fireDate.hour = fireDate.hour + [interval_value intValue];
            } else if([repeat_interval isEqualToString:@"daily"]) {
                fireDate.day = fireDate.day + 1;
            } else if([repeat_interval isEqualToString:@"weekly"]) {
                fireDate.weekday = fireDate.weekday + 1;
            }
            
            NSLog(@"------ next fire date: %@", fireDate);
            
            // date to string
            NSCalendar *gregorianCalendar = [[NSCalendar alloc] initWithCalendarIdentifier:NSCalendarIdentifierGregorian];
            NSDate *dateString = [gregorianCalendar dateFromComponents:fireDate];
            NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
            [formatter setDateFormat:@"dd-MM-yyyy HH:mm:ss"];
            NSString *stringFromDate = [formatter stringFromDate:dateString];
            NSLog(@"%@", stringFromDate);
            
            UNCalendarNotificationTrigger* trigger = [UNCalendarNotificationTrigger triggerWithDateMatchingComponents:fireDate repeats:NO];
            
            // alarm id
            NSString *alarmId = [contentInfo.userInfo objectForKey:@"alarmId"];
            
            NSString *soundName = [contentInfo.userInfo objectForKey:@"sound_name"];
            NSNumber *playSound = [contentInfo.userInfo objectForKey:@"sound"];
            
            content.userInfo = @{
                @"alarmId": alarmId,
                @"sound": playSound,
                @"vibrate": [contentInfo.userInfo objectForKey:@"vibrate"],
                @"data": [contentInfo.userInfo objectForKey:@"data"],
                @"fire_date": stringFromDate,
                @"sound_name": soundName,
                @"loop_sound": [contentInfo.userInfo objectForKey:@"loop_sound"],
                @"volume": [contentInfo.userInfo objectForKey:@"volume"],
                @"has_button": [contentInfo.userInfo objectForKey:@"has_button"],
                @"schedule_type": [contentInfo.userInfo objectForKey:@"schedule_type"],
                @"repeat_interval": [contentInfo.userInfo objectForKey:@"repeat_interval"],
                @"interval_value": [contentInfo.userInfo objectForKey:@"interval_value"],
                @"snooze_interval": [contentInfo.userInfo objectForKey:@"snooze_interval"]
            };
            
            if([playSound isEqualToNumber: [NSNumber numberWithInt: 1]]) {
                BOOL notEmpty = [RnAlarmNotification checkStringIsNotEmpty:soundName];
                if(notEmpty != YES){
                    content.sound = UNNotificationSound.defaultSound;
                } else {
                    content.sound = [UNNotificationSound soundNamed:soundName];
                }
            }
            
            // Create the request object.
            UNNotificationRequest* request = [UNNotificationRequest requestWithIdentifier:alarmId content:content trigger:trigger];
            
            UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
            
            [center addNotificationRequest:request withCompletionHandler:^(NSError * _Nullable error) {
                if (error != nil) {
                    NSLog(@"error: %@", error.localizedDescription);
                }
            }];
            
            NSDictionary *alarm = [NSDictionary dictionaryWithObjectsAndKeys: alarmId, @"id", nil];
            NSLog(@"repeat alarm: %@", alarm);
        } else {
            // Fallback on earlier versions
        }
    } @catch(NSException *exception){
        NSLog(@"error: %@", exception.reason);
    }
}

+ (void)snoozeAlarm:(UNNotification *)notification  API_AVAILABLE(ios(10.0)) {
    NSLog(@"do snooze");
    [RnAlarmNotification stopSound];
    
    @try {
        if (@available(iOS 10.0, *)) {
            UNNotificationContent *contentInfo = notification.request.content;
            UNMutableNotificationContent* content = [[UNMutableNotificationContent alloc] init];
            
            content.title = contentInfo.title;
            content.body = contentInfo.body;
            
            NSNumber *has_button = [contentInfo.userInfo objectForKey:@"has_button"];
            NSNumber *snooze_interval = [contentInfo.userInfo objectForKey:@"snooze_interval"];
            
            // set buttons
            if([has_button isEqualToNumber: [NSNumber numberWithInt: 1]]){
                content.categoryIdentifier = @"CUSTOM_ACTIONS";
            }
            
            // set alarm date
            int interval = [snooze_interval intValue];
            NSTimeInterval snoozeInterval = interval * 60;
            
            NSDate *now = [NSDate date];
            NSDate *newDate = [now dateByAddingTimeInterval:snoozeInterval];
            NSLog(@"new fire date after snooze: %@", newDate);
            
            NSDateComponents *newFireDate = dateToComponents(newDate);
            
            UNCalendarNotificationTrigger* trigger = [UNCalendarNotificationTrigger triggerWithDateMatchingComponents:newFireDate repeats:NO];
            
            NSString *alarmId = [NSString stringWithFormat: @"%ld", (long) NSDate.date.timeIntervalSince1970];
            
            NSString *soundName = [contentInfo.userInfo objectForKey:@"sound_name"];
            NSNumber *playSound = [contentInfo.userInfo objectForKey:@"sound"];
            
            content.userInfo = @{
                @"alarmId": alarmId,
                @"sound": playSound,
                @"vibrate": [contentInfo.userInfo objectForKey:@"vibrate"],
                @"data": [contentInfo.userInfo objectForKey:@"data"],
                @"fire_date": [contentInfo.userInfo objectForKey:@"fire_date"],
                @"sound_name": soundName,
                @"loop_sound": [contentInfo.userInfo objectForKey:@"loop_sound"],
                @"volume": [contentInfo.userInfo objectForKey:@"volume"],
                @"has_button": [contentInfo.userInfo objectForKey:@"has_button"],
                @"schedule_type": [contentInfo.userInfo objectForKey:@"schedule_type"],
                @"repeat_interval": [contentInfo.userInfo objectForKey:@"repeat_interval"],
                @"interval_value": [contentInfo.userInfo objectForKey:@"interval_value"],
                @"snooze_interval": [contentInfo.userInfo objectForKey:@"snooze_interval"]
            };
            
            if([playSound isEqualToNumber: [NSNumber numberWithInt: 1]]) {
                BOOL notEmpty = [RnAlarmNotification checkStringIsNotEmpty:soundName];
                if(notEmpty != YES){
                    NSLog(@"use default sound");
                    content.sound = UNNotificationSound.defaultSound;
                } else {
                    content.sound = [UNNotificationSound soundNamed:soundName];
                }
            }
            
            // Create the request object.
            UNNotificationRequest* request = [UNNotificationRequest requestWithIdentifier:alarmId content:content trigger:trigger];
            
            UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
            
            [center addNotificationRequest:request withCompletionHandler:^(NSError * _Nullable error) {
                if (error != nil) {
                    NSLog(@"error: %@", error.localizedDescription);
                }
            }];
            
            NSDictionary *alarm = [NSDictionary dictionaryWithObjectsAndKeys: alarmId, @"id", nil];
            NSLog(@"snooze alarm: %@", alarm);
        } else {
            // Fallback on earlier versions
        }
    } @catch(NSException *exception){
        NSLog(@"error: %@", exception.reason);
    }
}

+ (BOOL) checkStringIsNotEmpty:(NSString*)string {
    if (string == (id)[NSNull null] || string.length == 0) return NO;
    return YES;
}

RCT_EXPORT_METHOD(scheduleAlarm: (NSDictionary *)details resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject){
    @try {
        if (@available(iOS 10.0, *)) {
            UNMutableNotificationContent* content = [[UNMutableNotificationContent alloc] init];
            
            content.title = [NSString localizedUserNotificationStringForKey:details[@"title"] arguments:nil];
            content.body = [NSString localizedUserNotificationStringForKey:details[@"message"] arguments:nil];
            
            // set buttons
            if([details[@"has_button"] isEqualToNumber: [NSNumber numberWithInt: 1]]){
                content.categoryIdentifier = @"CUSTOM_ACTIONS";
            }
            
            // set alarm date
            NSDateComponents *fireDate = parseDate(details[@"fire_date"]);
            
            UNCalendarNotificationTrigger* trigger = [UNCalendarNotificationTrigger triggerWithDateMatchingComponents:fireDate repeats:NO];
            
            // alarm id
            NSString *alarmId = [NSString stringWithFormat: @"%ld", (long) NSDate.date.timeIntervalSince1970];
            
            NSString *volume = [details[@"volume"] stringValue];
            
            content.userInfo = @{
                @"alarmId": alarmId,
                @"sound": details[@"play_sound"],
                @"vibrate": details[@"vibrate"],
                @"data": details[@"data"],
                @"fire_date": details[@"fire_date"],
                @"sound_name": details[@"sound_name"],
                @"loop_sound": details[@"loop_sound"],
                @"volume": volume,
                @"has_button": details[@"has_button"],
                @"schedule_type": details[@"schedule_type"],
                @"repeat_interval": details[@"repeat_interval"],
                @"interval_value": details[@"interval_value"],
                @"snooze_interval": details[@"snooze_interval"]
            };
            
            if([details[@"play_sound"] isEqualToNumber: [NSNumber numberWithInt: 1]]) {
                BOOL notEmpty = [RnAlarmNotification checkStringIsNotEmpty:details[@"sound_name"]];
                if(notEmpty != YES){
                    content.sound = UNNotificationSound.defaultSound;
                } else {
                    content.sound = [UNNotificationSound soundNamed:details[@"sound_name"]];
                }
            }
            
            // Create the request object.
            UNNotificationRequest* request = [UNNotificationRequest requestWithIdentifier:alarmId content:content trigger:trigger];
            
            UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
            
            [center addNotificationRequest:request withCompletionHandler:^(NSError * _Nullable error) {
                if (error != nil) {
                    NSLog(@"error: %@", error.localizedDescription);
                    reject(@"error", nil, error);
                }
            }];
            
            NSDictionary *alarm = [NSDictionary dictionaryWithObjectsAndKeys: alarmId, @"id", nil];
            
            resolve(alarm);
        } else {
            // Fallback on earlier versions
        }
    } @catch(NSException *exception){
        NSLog(@"%@", exception.reason);
        NSMutableDictionary * info = [NSMutableDictionary dictionary];
        [info setValue:exception.name forKey:@"ExceptionName"];
        [info setValue:exception.reason forKey:@"ExceptionReason"];
        [info setValue:exception.callStackSymbols forKey:@"ExceptionCallStackSymbols"];
        [info setValue:exception.userInfo forKey:@"ExceptionUserInfo"];

        NSError *error = [[NSError alloc] initWithDomain:exception.name code:0 userInfo:info];
        reject(@"error", nil, error);
    }
}

RCT_EXPORT_METHOD(sendNotification: (NSDictionary *)details) {
    @try {
        NSLog(@"send notification now");
        if (@available(iOS 10.0, *)) {
            UNMutableNotificationContent* content = [[UNMutableNotificationContent alloc] init];
            content.title = [NSString localizedUserNotificationStringForKey:details[@"title"] arguments:nil];
            content.body = [NSString localizedUserNotificationStringForKey:details[@"message"] arguments:nil];
            
            // set buttons
            if([details[@"has_button"] isEqualToNumber: [NSNumber numberWithInt: 1]]){
                content.categoryIdentifier = @"CUSTOM_ACTIONS";
            }
            
            // alarm id
            NSString *alarmId = [NSString stringWithFormat: @"%ld", (long) NSDate.date.timeIntervalSince1970];
            
            NSString *volume = [details[@"volume"] stringValue];
            
            content.userInfo = @{
                @"alarmId": alarmId,
                @"sound": details[@"play_sound"],
                @"vibrate": details[@"vibrate"],
                @"data": details[@"data"],
                @"sound_name": details[@"sound_name"],
                @"loop_sound": details[@"loop_sound"],
                @"volume": volume,
                @"schedule_type": @"once"
            };
            
            if([details[@"play_sound"] isEqualToNumber: [NSNumber numberWithInt: 1]]) {
                BOOL notEmpty = [RnAlarmNotification checkStringIsNotEmpty:details[@"sound_name"]];
                if(notEmpty != YES){
                    content.sound = UNNotificationSound.defaultSound;
                } else {
                    content.sound = [UNNotificationSound soundNamed:details[@"sound_name"]];
                }
            }
            
            // Create the request object.
            UNNotificationRequest* request = [UNNotificationRequest requestWithIdentifier:alarmId content:content trigger:nil];
            
            UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
            
            [center addNotificationRequest:request withCompletionHandler:^(NSError * _Nullable error) { }];
        } else {
            // Fallback on earlier versions
        }
    } @catch(NSException *exception){
        NSLog(@"error: %@", exception.reason);
    }
}

RCT_EXPORT_METHOD(deleteAlarm: (NSInteger *)id){
    NSLog(@"delete alarm: %li", (long) id);
    if (@available(iOS 10.0, *)) {
        UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
        NSArray *array = [NSArray arrayWithObjects:[NSString stringWithFormat:@"%li", (long)id], nil];
        [center removePendingNotificationRequestsWithIdentifiers:array];
    } else {
        // Fallback on earlier versions
    }
}

RCT_EXPORT_METHOD(deleteRepeatingAlarm: (NSInteger *)id){
    NSLog(@"delete alarm: %li", (long) id);
    if (@available(iOS 10.0, *)) {
        UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
        NSArray *array = [NSArray arrayWithObjects:[NSString stringWithFormat:@"%li", (long)id], nil];
        [center removePendingNotificationRequestsWithIdentifiers:array];
    } else {
        // Fallback on earlier versions
    }
}

RCT_EXPORT_METHOD(stopAlarmSound){
    NSLog(@"stop alarm sound");
    [RnAlarmNotification stopSound];
}

RCT_EXPORT_METHOD(removeFiredNotification: (NSInteger)id){
    NSLog(@"remove fired notification: %li", (long) id);
    if (@available(iOS 10.0, *)) {
        UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
        NSArray *array = [NSArray arrayWithObjects:[NSString stringWithFormat:@"%li", (long)id], nil];
        [center removeDeliveredNotificationsWithIdentifiers:array];
    } else {
        // Fallback on earlier versions
    }
}

RCT_EXPORT_METHOD(removeAllFiredNotifications){
    NSLog(@"remove all notifications");
    if (@available(iOS 10.0, *)) {
        if ([UNUserNotificationCenter class]) {
            UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
            [center removeAllDeliveredNotifications];
        }
    } else {
        // Fallback on earlier versions
    }
}

API_AVAILABLE(ios(10.0))
static NSDictionary *RCTFormatUNNotificationRequest(UNNotificationRequest *request)
{
    NSMutableDictionary *formattedNotification = [NSMutableDictionary dictionary];
    UNNotificationContent *content = request.content;
    
    NSDateComponents *fireDate = parseDate(content.userInfo[@"fire_date"]);

    formattedNotification[@"id"] = request.identifier;
    formattedNotification[@"day"] = [NSString stringWithFormat:@"%li", (long)fireDate.day];
    formattedNotification[@"month"] = [NSString stringWithFormat:@"%li", (long)fireDate.month];
    formattedNotification[@"year"] = [NSString stringWithFormat:@"%li", (long)fireDate.year];
    formattedNotification[@"hour"] = [NSString stringWithFormat:@"%li", (long)fireDate.hour];
    formattedNotification[@"minute"] =[NSString stringWithFormat:@"%li", (long)fireDate.minute];
    formattedNotification[@"second"] = [NSString stringWithFormat:@"%li", (long)fireDate.second];

    return formattedNotification;
}

RCT_EXPORT_METHOD(getScheduledAlarms: (RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject){
    NSLog(@"get all notifications");
    if (@available(iOS 10.0, *)) {
        UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
        
        [center getPendingNotificationRequestsWithCompletionHandler:^(NSArray<UNNotificationRequest *> * _Nonnull requests) {
            NSLog(@"count%lu",(unsigned long)requests.count);
            
            NSMutableArray<NSDictionary *> *formattedNotifications = [NSMutableArray new];
            
            for (UNNotificationRequest *request in requests) {
                [formattedNotifications addObject:RCTFormatUNNotificationRequest(request)];
            }
            resolve(formattedNotifications);
        }];
    } else {
        resolve(nil);
    }
}

RCT_EXPORT_METHOD(requestPermissions:(NSDictionary *)permissions
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (RCTRunningInAppExtension()) {
        reject(@"E_UNABLE_TO_REQUEST_PERMISSIONS", nil, RCTErrorWithMessage(@"Requesting push notifications is currently unavailable in an app extension"));
        return;
    }
    
    UIUserNotificationType types = UIUserNotificationTypeNone;
    if (permissions) {
        if ([RCTConvert BOOL:permissions[@"alert"]]) {
            types |= UIUserNotificationTypeAlert;
        }
        if ([RCTConvert BOOL:permissions[@"badge"]]) {
            types |= UIUserNotificationTypeBadge;
        }
        if ([RCTConvert BOOL:permissions[@"sound"]]) {
            types |= UIUserNotificationTypeSound;
        }
    } else {
        types = UIUserNotificationTypeAlert | UIUserNotificationTypeBadge | UIUserNotificationTypeSound;
    }
    
    if (@available(iOS 10.0, *)) {
        UNNotificationCategory* generalCategory = [UNNotificationCategory
            categoryWithIdentifier:@"GENERAL"
            actions:@[]
            intentIdentifiers:@[]
            options:UNNotificationCategoryOptionCustomDismissAction];
        
        UNNotificationAction* snoozeAction = [UNNotificationAction
              actionWithIdentifier:@"SNOOZE_ACTION"
              title:@"SNOOZE"
              options:UNNotificationActionOptionNone];
         
        UNNotificationAction* stopAction = [UNNotificationAction
              actionWithIdentifier:@"DISMISS_ACTION"
              title:@"DISMISS"
              options:UNNotificationActionOptionForeground];
        
        UNNotificationCategory* customCategory = [UNNotificationCategory
            categoryWithIdentifier:@"CUSTOM_ACTIONS"
            actions:@[snoozeAction, stopAction]
            intentIdentifiers:@[]
            options:UNNotificationCategoryOptionNone];
        
        UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
        
        [center setNotificationCategories:[NSSet setWithObjects:generalCategory, customCategory, nil]];
        
        [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert + UIUserNotificationTypeBadge + UNAuthorizationOptionSound) completionHandler:^(BOOL granted, NSError *_Nullable error) {
            
            if (error != NULL) {
                reject(@"-1", @"Error - Push authorization request failed.", error);
            } else {
                dispatch_async(dispatch_get_main_queue(), ^(void){
                    [RCTSharedApplication() registerForRemoteNotifications];
                });
                [UNUserNotificationCenter.currentNotificationCenter getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings * _Nonnull settings) {
                    resolve(RCTPromiseResolveValueForUNNotificationSettings(settings));
                }];
            }
        }];
    } else {
        // Fallback on earlier versions
        resolve(nil);
    }
}

RCT_EXPORT_METHOD(checkPermissions:(RCTResponseSenderBlock)callback) {
    if (RCTRunningInAppExtension()) {
        callback(@[RCTSettingsDictForUNNotificationSettings(NO, NO, NO, NO, NO)]);
        return;
    }
    
    if (@available(iOS 10.0, *)) {
        [UNUserNotificationCenter.currentNotificationCenter getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings * _Nonnull settings) {
            callback(@[RCTPromiseResolveValueForUNNotificationSettings(settings)]);
        }];
    } else {
        // Fallback on earlier versions
    }
}

API_AVAILABLE(ios(10.0))
static inline NSDictionary *RCTPromiseResolveValueForUNNotificationSettings(UNNotificationSettings* _Nonnull settings) {
    return RCTSettingsDictForUNNotificationSettings(settings.alertSetting == UNNotificationSettingEnabled, settings.badgeSetting == UNNotificationSettingEnabled, settings.soundSetting == UNNotificationSettingEnabled, settings.lockScreenSetting == UNNotificationSettingEnabled, settings.notificationCenterSetting == UNNotificationSettingEnabled);
}

static inline NSDictionary *RCTSettingsDictForUNNotificationSettings(BOOL alert, BOOL badge, BOOL sound, BOOL lockScreen, BOOL notificationCenter) {
    return @{@"alert": @(alert), @"badge": @(badge), @"sound": @(sound), @"lockScreen": @(lockScreen), @"notificationCenter": @(notificationCenter)};
}

@end
