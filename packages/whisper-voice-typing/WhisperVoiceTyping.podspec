require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Currently disabled on iOS.
# To enable,
# 1. Uncomment the code after "DISABLED:"
# 2. Run vencor/whisper.cpp/build-xcframework.sh
# 3. Add vendor/whisper.cpp as a dependency?
# 4. Implement cpp/IAudioRecorder.hpp for iOS.


Pod::Spec.new do |s|
  s.name         = "WhisperVoiceTyping"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported, :visionos => 1.0 }
  s.source       = { :git => "https://github.com/mrousavy/nitro.git", :tag => "#{s.version}" }

  s.source_files = [
    # Implementation (Swift)
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
    # Implementation (C++ objects)
    # DISABLED: for now:
    #"cpp/**/*.{hpp,cpp}",
  ]

  # DISABLED: Currently, this package lacks iOS support
  #load 'nitrogen/generated/ios/WhisperVoiceTyping+autolinking.rb'
  #add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end

