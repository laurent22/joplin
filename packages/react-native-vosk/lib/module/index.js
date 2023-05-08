function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';
const LINKING_ERROR = `The package 'react-native-vosk' doesn't seem to be linked. Make sure: \n\n${Platform.select({
  ios: '- You have run \'pod install\'\n',
  default: ''
})}- You rebuilt the app after installing the package\n` + '- You are not using Expo managed workflow\n';
const VoskModule = NativeModules.Vosk ? NativeModules.Vosk : new Proxy({}, {
  get() {
    throw new Error(LINKING_ERROR);
  }
});
const eventEmitter = new NativeEventEmitter(VoskModule);
export default class Vosk {
  constructor() {
    var _this = this;
    _defineProperty(this, "loadModel", path => VoskModule.loadModel(path));
    _defineProperty(this, "currentRegisteredEvents", []);
    _defineProperty(this, "start", function () {
      let grammar = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      return new Promise((resolve, reject) => {
        // Check for permission
        _this.requestRecordPermission()
        // eslint-disable-next-line promise/prefer-await-to-then
        .then(granted => {
          if (!granted) return reject('Audio record permission denied');

          // Setup events
          _this.currentRegisteredEvents.push(eventEmitter.addListener('onResult', e => resolve(e.data)));
          _this.currentRegisteredEvents.push(eventEmitter.addListener('onFinalResult', e => resolve(e.data)));
          _this.currentRegisteredEvents.push(eventEmitter.addListener('onError', e => reject(e.data)));
          _this.currentRegisteredEvents.push(eventEmitter.addListener('onTimeout', () => reject('timeout')));

          // Start recognition
          VoskModule.start(grammar);
        })
        // eslint-disable-next-line promise/prefer-await-to-then
        .catch(e => {
          reject(e);
        });
        // eslint-disable-next-line promise/prefer-await-to-then
      }).finally(() => {
        _this.cleanListeners();
      });
    });
    _defineProperty(this, "stop", () => {
      this.cleanListeners();
      VoskModule.stop();
    });
    _defineProperty(this, "stopOnly", () => {
      VoskModule.stopOnly();
    });
    _defineProperty(this, "cleanup", () => {
      this.cleanListeners();
      VoskModule.cleanup();
    });
    _defineProperty(this, "unload", () => {
      this.cleanListeners();
      VoskModule.unload();
    });
    _defineProperty(this, "onResult", onResult => {
      return eventEmitter.addListener('onResult', onResult);
    });
    _defineProperty(this, "onFinalResult", onFinalResult => {
      return eventEmitter.addListener('onFinalResult', onFinalResult);
    });
    _defineProperty(this, "onError", onError => {
      return eventEmitter.addListener('onError', onError);
    });
    _defineProperty(this, "onTimeout", onTimeout => {
      return eventEmitter.addListener('onTimeout', onTimeout);
    });
    _defineProperty(this, "requestRecordPermission", async () => {
      if (Platform.OS === 'ios') return true;
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    });
    _defineProperty(this, "cleanListeners", () => {
      // Clean event listeners
      this.currentRegisteredEvents.forEach(subscription => subscription.remove());
      this.currentRegisteredEvents = [];
    });
  } // Public functions
  // Event listeners builders
  // Private functions
}
//# sourceMappingURL=index.js.map