//
//  ShareExtension.m
//  Joplin
//
//  Created by Duncan Cunningham on 2/6/21.
//  Copyright © 2021 joplinapp.org. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

#import "ShareData.h"
#import "ShareExtensionConstants.h"

@interface ShareExtension : NSObject <RCTBridgeModule>

@property (nonatomic, strong) ShareData* shareData;

@end

@implementation ShareExtension

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(data, resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSDictionary* dictionary = [self decodeShareDataFromURL:self.shareDataURL];
  self.shareData = [[ShareData alloc] initWithDictionary:dictionary];
  resolve(dictionary);
}

RCT_EXPORT_METHOD(close) {
  if (self.shareData.resources != nil) {
    for (NSDictionary* resource in self.shareData.resources) {
      NSString* uri = [ShareData resourceURLFromDictionary:resource];
      if (uri != nil && [NSFileManager.defaultManager fileExistsAtPath:uri]) {
        [NSFileManager.defaultManager removeItemAtPath:uri error:nil];
      }
    }
  }
  
  [NSFileManager.defaultManager removeItemAtPath:[[self shareDataURL] path] error:nil];
}

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (NSDictionary*)constantsToExport {
  return @{@"SHARE_EXTENSION_SHARE_URL": ShareExtensionShareURL};
}

- (NSDictionary*)decodeShareDataFromURL:(NSURL*)url {
  NSData* data = [NSData dataWithContentsOfFile:[url path]];
  if (data != nil) {
    return [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
  } else {
    return nil;
  }
}

- (NSURL*)shareDataURL {
  NSFileManager* fileManager = [NSFileManager defaultManager];
  NSURL* sharedContainerURL = [fileManager containerURLForSecurityApplicationGroupIdentifier:ShareExtensionGroupIdentifier];
  return [sharedContainerURL URLByAppendingPathComponent:ShareExtensionShareDataFilename];
}

@end
