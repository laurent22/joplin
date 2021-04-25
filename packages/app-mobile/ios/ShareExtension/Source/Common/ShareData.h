//
//  ShareData.h
//  ShareExtension
//
//  Created by Duncan Cunningham on 2/6/21.
//  Copyright © 2021 joplinapp.org. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface ShareData : NSObject

@property (nonatomic, strong) NSString* title;
@property (nonatomic, strong) NSString* text;
@property (nonatomic, strong) NSArray<NSDictionary*>* resources;

- (id)initWithDictionary:(NSDictionary*)dictionary;

- (NSDictionary*)encodeToDictionary;

+ (NSDictionary*)resourceDictionaryForURL:(NSString*)url withName:(NSString*)name andMimeType:(NSString*)mimeType;
+ (NSString*)resourceURLFromDictionary:(NSDictionary*)dictionary;

@end
