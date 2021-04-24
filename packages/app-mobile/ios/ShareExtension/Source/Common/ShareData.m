//
//  ShareData.m
//  ShareExtension
//
//  Created by Duncan Cunningham on 2/6/21.
//  Copyright © 2021 joplinapp.org. All rights reserved.
//

#import "ShareData.h"

static NSString* const ShareDataTitleKey = @"title";
static NSString* const ShareDataTextKey = @"text";
static NSString* const ShareDataResourcesKey = @"resources";

static NSString* const ShareDataResourceUriKey = @"uri";
static NSString* const ShareDataResourceNameKey = @"name";
static NSString* const ShareDataResourceMimeTypeKey = @"mimeType";

@implementation ShareData

- (id)initWithDictionary:(NSDictionary*)dictionary {
  self = [super init];
  
  if (self != nil) {
    self.title = [dictionary objectForKey:ShareDataTitleKey];
    self.text = [dictionary objectForKey:ShareDataTextKey];
    self.resources = [dictionary objectForKey:ShareDataResourcesKey];
  }
       
  return self;
}

- (NSDictionary*)encodeToDictionary {
  NSString* title = (self.title == nil) ? @"" : self.title;
  NSString* text = (self.text == nil) ? @"" : self.text;
  NSArray* resources = (self.resources == nil) ? @[] : self.resources;
 
  return @{ShareDataTitleKey: title,
           ShareDataTextKey: text,
           ShareDataResourcesKey: resources};
}

+ (NSDictionary*)resourceDictionaryForURL:(NSString*)url withName:(NSString*)name andMimeType:(NSString*)mimeType {
  return @{ShareDataResourceUriKey: url,
           ShareDataResourceNameKey: name,
           ShareDataResourceMimeTypeKey: mimeType};
}

+ (NSString*)resourceURLFromDictionary:(NSDictionary*)dictionary {
  return [dictionary objectForKey:ShareDataResourceUriKey];
}

@end
