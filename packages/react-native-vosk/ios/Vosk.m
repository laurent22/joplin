#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(Vosk, RCTEventEmitter)

RCT_EXTERN_METHOD(loadModel:(NSString *)name
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(start:(NSArray)grammar)

RCT_EXTERN_METHOD(stop)

RCT_EXTERN_METHOD(unload)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
