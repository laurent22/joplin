require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-alarm-notification"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  react-native-alarm-notification
                   DESC
  s.homepage     = "https://github.com/laurent22/joplin/tree/dev/packages/react-native-alarm-notification"
  s.license    = { :type => "MIT", :file => "LICENSE" }
  s.authors      = { "Chukwuemeka Ihedoro" => "caihedoro@gmail.com" }
  s.platforms    = { :ios => "9.0" }
  s.source       = { :git => "https://github.com/laurent22/joplin.git" }

  s.source_files = "ios/**/*.{h,c,m,swift}"
  s.requires_arc = true

  s.dependency "React"
  # ...
  # s.dependency "..."
end

