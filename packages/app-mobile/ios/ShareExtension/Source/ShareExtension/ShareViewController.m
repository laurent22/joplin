//
//  ShareViewController.m
//  ShareExtension
//
//  Created by Duncan Cunningham on 12/28/20.
//  Copyright © 2020 joplinapp.org. All rights reserved.
//

#import "ShareViewController.h"
#import "ShareData.h"
#import "ShareExtensionConstants.h"

#import <MobileCoreServices/MobileCoreServices.h>

@interface ShareViewController ()

@property (nonatomic, strong) NSURL* sharedContainerURL;

@property (nonatomic, weak) IBOutlet UIActivityIndicatorView *spinner;

@end

@implementation ShareViewController

- (NSURL*)sharedContainerURL {
  if (_sharedContainerURL == nil) {
    NSFileManager* fileManager = [NSFileManager defaultManager];
    _sharedContainerURL = [fileManager containerURLForSecurityApplicationGroupIdentifier:ShareExtensionGroupIdentifier];
  }
  
  return _sharedContainerURL;
}

- (void)viewDidLoad {
  [super viewDidLoad];
  
  [self.spinner startAnimating];
  
  [self extractDataFromContext:self.extensionContext withCallback:^(ShareData* shareData) {
    [self serializeShareDataToSharedContainer:shareData];
    
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.2 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^(void){
      [self.spinner stopAnimating];
      [self.extensionContext completeRequestReturningItems:nil completionHandler:nil];
      [self launchMainApp];
    });
  }];
}

- (void)extractDataFromContext:(NSExtensionContext *)context withCallback:(void(^)(ShareData* shareData))callback {
  __block ShareData* shareData = [[ShareData alloc] init];
  NSMutableArray* resources = [[NSMutableArray alloc] init];

  NSExtensionItem* item = [context.inputItems firstObject];
  NSArray* attachments = item.attachments;
  __block NSUInteger index = 0;

  [attachments enumerateObjectsUsingBlock:^(NSItemProvider* provider, NSUInteger idx, BOOL* stop) {
    [provider.registeredTypeIdentifiers enumerateObjectsUsingBlock:^(NSString* identifier, NSUInteger idx, BOOL* stop) {
      [provider loadItemForTypeIdentifier:identifier options:nil completionHandler:^(id<NSSecureCoding> item, NSError* error) {
        index += 1;

        // is an URL - Can be a path or Web URL
        if ([(NSObject*)item isKindOfClass:[NSURL class]]) {
          NSURL* url = (NSURL*)item;
          if ([[url pathExtension] isEqualToString:@""] || [url.scheme containsString:@"http"]) {
            shareData.text = [url absoluteString];
          } else {
            NSURL* copiedURL = [self copyURLToSharedContainer:url];
            NSDictionary* resource = [self resourceDictionaryForMediaURL:copiedURL];
            [resources addObject:resource];
          }
        // is a String
        } else if ([(NSObject*)item isKindOfClass:[NSString class]]) {
          shareData.text = (NSString*)item;
        // is an Image
        } else if ([(NSObject*)item isKindOfClass:[UIImage class]]) {
          UIImage* sharedImage = (UIImage*)item;
          NSURL* path = [self copyImageToSharedContainer:sharedImage];
          NSDictionary* resource = [self resourceDictionaryForMediaURL:path];
          [resources addObject:resource];
        }

        if (index == [attachments count]) {
          shareData.resources = resources;
          callback(shareData);
        }
      }];

      // We'll only use the first provider
      *stop = YES;
    }];
  }];
}

- (NSURL*)copyImageToSharedContainer:(UIImage*)image {
  NSString* name = [NSString stringWithFormat:@"%@%@", [NSUUID new].UUIDString, @".png"];
  NSURL* path = [self.sharedContainerURL URLByAppendingPathComponent:name];
  [UIImagePNGRepresentation(image) writeToFile:[path path] atomically:YES];
  return path;
}

- (NSURL*)copyURLToSharedContainer:(NSURL*)url {
  NSString* name = [url lastPathComponent];
  NSURL* path = [self.sharedContainerURL URLByAppendingPathComponent:name];
  [[NSFileManager defaultManager] copyItemAtPath:[url path] toPath:[path path] error:nil];
  return path;
}

- (void)serializeShareDataToSharedContainer:(ShareData*)shareData {
  NSData* data = [NSJSONSerialization dataWithJSONObject:[shareData encodeToDictionary] options:0 error:nil];
  NSURL* path = [self.sharedContainerURL URLByAppendingPathComponent:ShareExtensionShareDataFilename isDirectory:NO];
  [data writeToFile:[path path] options:NSDataWritingAtomic error: nil];
}

- (NSDictionary*)resourceDictionaryForMediaURL:(NSURL*)url {
  NSString* name = [url lastPathComponent];
  NSString* extension = [url pathExtension];
  NSString* mimeType = [self mimeTypeFor:extension];
  return [ShareData resourceDictionaryForURL:[url absoluteString] withName:name andMimeType:mimeType];
}

- (NSString*)mimeTypeFor:(NSString*)fileExtension{
  NSString* UTI = (__bridge_transfer NSString*)UTTypeCreatePreferredIdentifierForTag(kUTTagClassFilenameExtension, (__bridge CFStringRef)fileExtension, NULL);
  NSString* mimeType = (__bridge_transfer NSString*)UTTypeCopyPreferredTagWithClass((__bridge CFStringRef)UTI, kUTTagClassMIMEType);
  return mimeType;
}

- (void)launchMainApp {
  SEL selector = NSSelectorFromString(@"openURL:");
  
  UIResponder* responder = self;
  while (responder != nil) {
    if ([responder respondsToSelector:selector]) {
      [responder performSelector:selector withObject:[NSURL URLWithString:ShareExtensionShareURL]];
      break;
    }
  
    responder = responder.nextResponder;
  }
}

@end
