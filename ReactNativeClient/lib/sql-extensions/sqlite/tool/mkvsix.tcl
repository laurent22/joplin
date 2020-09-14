#!/usr/bin/tclsh
#
# This script is used to generate a VSIX (Visual Studio Extension) file for
# SQLite usable by Visual Studio.
#
# PREREQUISITES
#
# 1. Tcl 8.4 and later are supported, earlier versions have not been tested.
#
# 2. The "sqlite3.h" file is assumed to exist in the parent directory of the
#    directory containing this script.  The [optional] second command line
#    argument to this script may be used to specify an alternate location.
#    This script also assumes that the "sqlite3.h" file corresponds with the
#    version of the binaries to be packaged.  This assumption is not verified
#    by this script.
#
# 3. The temporary directory specified in the TEMP or TMP environment variables
#    must refer to an existing directory writable by the current user.
#
# 4. The "zip" and "unzip" command line tools must be located either in a
#    directory contained in the PATH environment variable or specified as the
#    exact file names to execute in the "ZipTool" and "UnZipTool" environment
#    variables, respectively.
#
# 5. The template VSIX file (which is basically a zip file) must be located in
#    a "win" directory inside the directory containing this script.  It should
#    not contain any executable binaries.  It should only contain dynamic
#    textual content files to be processed using [subst] and/or static content
#    files to be copied verbatim.
#
# 6. The executable and other compiled binary files to be packaged into the
#    final VSIX file (e.g. DLLs, LIBs, and PDBs) must be located in a single
#    directory tree.  The top-level directory of the tree must be specified as
#    the first command line argument to this script.  The second level
#    sub-directory names must match those of the build configuration (e.g.
#    "Debug" or "Retail").  The third level sub-directory names must match
#    those of the platform (e.g. "x86", "x64", and "ARM").  For example, the
#    binary files to be packaged would need to be organized as follows when
#    packaging the "Debug" and "Retail" build configurations for the "x86" and
#    "x64" platforms (in this example, "C:\temp" is the top-level directory as
#    specified in the first command line argument):
#
#                         C:\Temp\Debug\x86\sqlite3.lib
#                         C:\Temp\Debug\x86\sqlite3.dll
#                         C:\Temp\Debug\x86\sqlite3.pdb
#                         C:\Temp\Debug\x64\sqlite3.lib
#                         C:\Temp\Debug\x64\sqlite3.dll
#                         C:\Temp\Debug\x64\sqlite3.pdb
#                         C:\Temp\Retail\x86\sqlite3.lib
#                         C:\Temp\Retail\x86\sqlite3.dll
#                         C:\Temp\Retail\x86\sqlite3.pdb
#                         C:\Temp\Retail\x64\sqlite3.lib
#                         C:\Temp\Retail\x64\sqlite3.dll
#                         C:\Temp\Retail\x64\sqlite3.pdb
#
#    The above directory tree organization is performed automatically if the
#    "tool\build-all-msvc.bat" batch script is used to build the binary files
#    to be packaged.
#
# USAGE
#
# The first argument to this script is required and must be the name of the
# top-level directory containing the directories and files organized into a
# tree as described in item 6 of the PREREQUISITES section, above.  The second
# argument is optional and if present must contain the name of the directory
# containing the root of the source tree for SQLite.  The third argument is
# optional and if present must contain the flavor the VSIX package to build.
# Currently, the only supported package flavors are "WinRT", "WinRT81", "WP80",
# "WP81", and "Win32".  The fourth argument is optional and if present must be
# a string containing a list of platforms to include in the VSIX package.  The
# platform list is "platform1,platform2,platform3".  The fifth argument is
# optional and if present must contain the version of Visual Studio required by
# the package.  Currently, the only supported versions are "2012" and "2013".
# The package flavors "WinRT81" and "WP81" are only supported when the Visual
# Studio version is "2013".  Typically, when on Windows, this script is
# executed using commands similar to the following from a normal Windows
# command prompt:
#
#                         CD /D C:\dev\sqlite\core
#                         tclsh tool\mkvsix.tcl C:\Temp
#
# In the example above, "C:\dev\sqlite\core" represents the root of the source
# tree for SQLite and "C:\Temp" represents the top-level directory containing
# the executable and other compiled binary files, organized into a directory
# tree as described in item 6 of the PREREQUISITES section, above.
#
# This script should work on non-Windows platforms as well, provided that all
# the requirements listed in the PREREQUISITES section are met.
#
# NOTES
#
# The temporary directory is used as a staging area for the final VSIX file.
# The template VSIX file is extracted, its contents processed, and then the
# resulting files are packaged into the final VSIX file.
#
package require Tcl 8.4

proc fail { {error ""} {usage false} } {
  if {[string length $error] > 0} then {
    puts stdout $error
    if {!$usage} then {exit 1}
  }

  puts stdout "usage:\
[file tail [info nameofexecutable]]\
[file tail [info script]] <binaryDirectory> \[sourceDirectory\]\
\[packageFlavor\] \[platformNames\] \[vsVersion\]"

  exit 1
}

proc getEnvironmentVariable { name } {
  #
  # NOTE: Returns the value of the specified environment variable or an empty
  #       string for environment variables that do not exist in the current
  #       process environment.
  #
  return [expr {[info exists ::env($name)] ? $::env($name) : ""}]
}

proc getTemporaryPath {} {
  #
  # NOTE: Returns the normalized path to the first temporary directory found
  #       in the typical set of environment variables used for that purpose
  #       or an empty string to signal a failure to locate such a directory.
  #
  set names [list]

  foreach name [list TEMP TMP] {
    lappend names [string toupper $name] [string tolower $name] \
        [string totitle $name]
  }

  foreach name $names {
    set value [getEnvironmentVariable $name]

    if {[string length $value] > 0} then {
      return [file normalize $value]
    }
  }

  return ""
}

proc appendArgs { args } {
  #
  # NOTE: Returns all passed arguments joined together as a single string with
  #       no intervening spaces between arguments.
  #
  eval append result $args
}

proc readFile { fileName } {
  #
  # NOTE: Reads and returns the entire contents of the specified file, which
  #       may contain binary data.
  #
  set file_id [open $fileName RDONLY]
  fconfigure $file_id -encoding binary -translation binary
  set result [read $file_id]
  close $file_id
  return $result
}

proc writeFile { fileName data } {
  #
  # NOTE: Writes the entire contents of the specified file, which may contain
  #       binary data.
  #
  set file_id [open $fileName {WRONLY CREAT TRUNC}]
  fconfigure $file_id -encoding binary -translation binary
  puts -nonewline $file_id $data
  close $file_id
  return ""
}

#
# TODO: Modify this procedure when a new version of Visual Studio is released.
#
proc getMinVsVersionXmlChunk { vsVersion } {
  switch -exact $vsVersion {
    2012 {
      return [appendArgs \
          "\r\n    " {MinVSVersion="11.0"}]
    }
    2013 {
      return [appendArgs \
          "\r\n    " {MinVSVersion="12.0"}]
    }
    2015 {
      return [appendArgs \
          "\r\n    " {MinVSVersion="14.0"}]
    }
    default {
      return ""
    }
  }
}

#
# TODO: Modify this procedure when a new version of Visual Studio is released.
#
proc getMaxPlatformVersionXmlChunk { packageFlavor vsVersion } {
  #
  # NOTE: Only Visual Studio 2013 and later support this attribute within the
  #       SDK manifest.
  #
  if {![string equal $vsVersion 2013] && \
      ![string equal $vsVersion 2015]} then {
    return ""
  }

  switch -exact $packageFlavor {
    WinRT {
      return [appendArgs \
          "\r\n    " {MaxPlatformVersion="8.0"}]
    }
    WinRT81 {
      return [appendArgs \
          "\r\n    " {MaxPlatformVersion="8.1"}]
    }
    WP80 {
      return [appendArgs \
          "\r\n    " {MaxPlatformVersion="8.0"}]
    }
    WP81 {
      return [appendArgs \
          "\r\n    " {MaxPlatformVersion="8.1"}]
    }
    default {
      return ""
    }
  }
}

#
# TODO: Modify this procedure when a new version of Visual Studio is released.
#
proc getExtraFileListXmlChunk { packageFlavor vsVersion } {
  #
  # NOTE: Windows Phone 8.0 does not require any extra attributes in its VSIX
  #       package SDK manifests; however, it appears that Windows Phone 8.1
  #       does.
  #
  if {[string equal $packageFlavor WP80]} then {
    return ""
  }

  set appliesTo [expr {[string equal $packageFlavor Win32] ? \
      "VisualC" : "WindowsAppContainer"}]

  switch -exact $vsVersion {
    2012 {
      return [appendArgs \
          "\r\n    " AppliesTo=\" $appliesTo \" \
          "\r\n    " {DependsOn="Microsoft.VCLibs, version=11.0"}]
    }
    2013 {
      return [appendArgs \
          "\r\n    " AppliesTo=\" $appliesTo \" \
          "\r\n    " {DependsOn="Microsoft.VCLibs, version=12.0"}]
    }
    2015 {
      return [appendArgs \
          "\r\n    " AppliesTo=\" $appliesTo \" \
          "\r\n    " {DependsOn="Microsoft.VCLibs, version=14.0"}]
    }
    default {
      return ""
    }
  }
}

proc replaceFileNameTokens { fileName name buildName platformName } {
  #
  # NOTE: Returns the specified file name containing the platform name instead
  #       of platform placeholder tokens.
  #
  return [string map [list <build> $buildName <platform> $platformName \
      <name> $name] $fileName]
}

proc substFile { fileName } {
  #
  # NOTE: Performs all Tcl command, variable, and backslash substitutions in
  #       the specified file and then rewrites the contents of that same file
  #       with the substituted data.
  #
  return [writeFile $fileName [uplevel 1 [list subst [readFile $fileName]]]]
}

#
# NOTE: This is the entry point for this script.
#
set script [file normalize [info script]]

if {[string length $script] == 0} then {
  fail "script file currently being evaluated is unknown" true
}

set path [file dirname $script]
set rootName [file rootname [file tail $script]]

###############################################################################

#
# NOTE: Process and verify all the command line arguments.
#
set argc [llength $argv]
if {$argc < 1 || $argc > 5} then {fail}

set binaryDirectory [lindex $argv 0]

if {[string length $binaryDirectory] == 0} then {
  fail "invalid binary directory"
}

if {![file exists $binaryDirectory] || \
    ![file isdirectory $binaryDirectory]} then {
  fail "binary directory does not exist"
}

if {$argc >= 2} then {
  set sourceDirectory [lindex $argv 1]
} else {
  #
  # NOTE: Assume that the source directory is the parent directory of the one
  #       that contains this script file.
  #
  set sourceDirectory [file dirname $path]
}

if {[string length $sourceDirectory] == 0} then {
  fail "invalid source directory"
}

if {![file exists $sourceDirectory] || \
    ![file isdirectory $sourceDirectory]} then {
  fail "source directory does not exist"
}

if {$argc >= 3} then {
  set packageFlavor [lindex $argv 2]
} else {
  #
  # NOTE: Assume the package flavor is WinRT.
  #
  set packageFlavor WinRT
}

if {[string length $packageFlavor] == 0} then {
  fail "invalid package flavor"
}

if {$argc >= 4} then {
  set platformNames [list]

  foreach platformName [split [lindex $argv 3] ", "] {
    set platformName [string trim $platformName]

    if {[string length $platformName] > 0} then {
      lappend platformNames $platformName
    }
  }
}

if {$argc >= 5} then {
  set vsVersion [lindex $argv 4]
} else {
  set vsVersion 2012
}

if {[string length $vsVersion] == 0} then {
  fail "invalid Visual Studio version"
}

if {![string equal $vsVersion 2012] && ![string equal $vsVersion 2013] && \
    ![string equal $vsVersion 2015]} then {
  fail [appendArgs \
      "unsupported Visual Studio version, must be one of: " \
      [list 2012 2013 2015]]
}

set shortNames(WinRT,2012) SQLite.WinRT
set shortNames(WinRT,2013) SQLite.WinRT.2013
set shortNames(WinRT81,2013) SQLite.WinRT81
set shortNames(WP80,2012) SQLite.WP80
set shortNames(WP80,2013) SQLite.WP80.2013
set shortNames(WP81,2013) SQLite.WP81
set shortNames(Win32,2012) SQLite.Win32
set shortNames(Win32,2013) SQLite.Win32.2013
set shortNames(UWP,2015) SQLite.UWP.2015

set displayNames(WinRT,2012) "SQLite for Windows Runtime"
set displayNames(WinRT,2013) "SQLite for Windows Runtime"
set displayNames(WinRT81,2013) "SQLite for Windows Runtime (Windows 8.1)"
set displayNames(WP80,2012) "SQLite for Windows Phone"
set displayNames(WP80,2013) "SQLite for Windows Phone"
set displayNames(WP81,2013) "SQLite for Windows Phone 8.1"
set displayNames(Win32,2012) "SQLite for Windows"
set displayNames(Win32,2013) "SQLite for Windows"
set displayNames(UWP,2015) "SQLite for Universal Windows Platform"

if {[string equal $packageFlavor WinRT]} then {
  set shortName $shortNames($packageFlavor,$vsVersion)
  set displayName $displayNames($packageFlavor,$vsVersion)
  set targetPlatformIdentifier Windows
  set targetPlatformVersion v8.0
  set minVsVersion [getMinVsVersionXmlChunk $vsVersion]
  set maxPlatformVersion \
      [getMaxPlatformVersionXmlChunk $packageFlavor $vsVersion]
  set extraSdkPath ""
  set extraFileListAttributes \
      [getExtraFileListXmlChunk $packageFlavor $vsVersion]
} elseif {[string equal $packageFlavor WinRT81]} then {
  if {$vsVersion ne "2013"} then {
    fail [appendArgs \
        "unsupported combination, package flavor " $packageFlavor \
        " is only supported with Visual Studio 2013"]
  }
  set shortName $shortNames($packageFlavor,$vsVersion)
  set displayName $displayNames($packageFlavor,$vsVersion)
  set targetPlatformIdentifier Windows
  set targetPlatformVersion v8.1
  set minVsVersion [getMinVsVersionXmlChunk $vsVersion]
  set maxPlatformVersion \
      [getMaxPlatformVersionXmlChunk $packageFlavor $vsVersion]
  set extraSdkPath ""
  set extraFileListAttributes \
      [getExtraFileListXmlChunk $packageFlavor $vsVersion]
} elseif {[string equal $packageFlavor WP80]} then {
  set shortName $shortNames($packageFlavor,$vsVersion)
  set displayName $displayNames($packageFlavor,$vsVersion)
  set targetPlatformIdentifier "Windows Phone"
  set targetPlatformVersion v8.0
  set minVsVersion [getMinVsVersionXmlChunk $vsVersion]
  set maxPlatformVersion \
      [getMaxPlatformVersionXmlChunk $packageFlavor $vsVersion]
  set extraSdkPath "\\..\\$targetPlatformIdentifier"
  set extraFileListAttributes \
      [getExtraFileListXmlChunk $packageFlavor $vsVersion]
} elseif {[string equal $packageFlavor WP81]} then {
  if {$vsVersion ne "2013"} then {
    fail [appendArgs \
        "unsupported combination, package flavor " $packageFlavor \
        " is only supported with Visual Studio 2013"]
  }
  set shortName $shortNames($packageFlavor,$vsVersion)
  set displayName $displayNames($packageFlavor,$vsVersion)
  set targetPlatformIdentifier WindowsPhoneApp
  set targetPlatformVersion v8.1
  set minVsVersion [getMinVsVersionXmlChunk $vsVersion]
  set maxPlatformVersion \
      [getMaxPlatformVersionXmlChunk $packageFlavor $vsVersion]
  set extraSdkPath "\\..\\$targetPlatformIdentifier"
  set extraFileListAttributes \
      [getExtraFileListXmlChunk $packageFlavor $vsVersion]
} elseif {[string equal $packageFlavor UWP]} then {
  if {$vsVersion ne "2015"} then {
    fail [appendArgs \
        "unsupported combination, package flavor " $packageFlavor \
        " is only supported with Visual Studio 2015"]
  }
  set shortName $shortNames($packageFlavor,$vsVersion)
  set displayName $displayNames($packageFlavor,$vsVersion)
  set targetPlatformIdentifier UAP; # NOTE: Not "UWP".
  set targetPlatformVersion v0.8.0.0
  set minVsVersion [getMinVsVersionXmlChunk $vsVersion]
  set maxPlatformVersion \
      [getMaxPlatformVersionXmlChunk $packageFlavor $vsVersion]
  set extraSdkPath "\\..\\$targetPlatformIdentifier"
  set extraFileListAttributes \
      [getExtraFileListXmlChunk $packageFlavor $vsVersion]
} elseif {[string equal $packageFlavor Win32]} then {
  set shortName $shortNames($packageFlavor,$vsVersion)
  set displayName $displayNames($packageFlavor,$vsVersion)
  set targetPlatformIdentifier Windows
  set targetPlatformVersion v8.0
  set minVsVersion [getMinVsVersionXmlChunk $vsVersion]
  set maxPlatformVersion \
      [getMaxPlatformVersionXmlChunk $packageFlavor $vsVersion]
  set extraSdkPath ""
  set extraFileListAttributes \
      [getExtraFileListXmlChunk $packageFlavor $vsVersion]
} else {
  fail [appendArgs \
      "unsupported package flavor, must be one of: " \
      [list WinRT WinRT81 WP80 WP81 UWP Win32]]
}

###############################################################################

#
# NOTE: Evaluate the user-specific customizations file, if it exists.
#
set userFile [file join $path [appendArgs \
    $rootName . $tcl_platform(user) .tcl]]

if {[file exists $userFile] && \
    [file isfile $userFile]} then {
  source $userFile
}

###############################################################################

set templateFile [file join $path win sqlite.vsix]

if {![file exists $templateFile] || \
    ![file isfile $templateFile]} then {
  fail [appendArgs "template file \"" $templateFile "\" does not exist"]
}

set currentDirectory [pwd]
set outputFile [file join $currentDirectory [appendArgs sqlite- \
    $packageFlavor -output.vsix]]

if {[file exists $outputFile]} then {
  fail [appendArgs "output file \"" $outputFile "\" already exists"]
}

###############################################################################

#
# NOTE: Make sure that a valid temporary directory exists.
#
set temporaryDirectory [getTemporaryPath]

if {[string length $temporaryDirectory] == 0 || \
    ![file exists $temporaryDirectory] || \
    ![file isdirectory $temporaryDirectory]} then {
  fail "cannot locate a usable temporary directory"
}

#
# NOTE: Setup the staging directory to have a unique name inside of the
#       configured temporary directory.
#
set stagingDirectory [file normalize [file join $temporaryDirectory \
    [appendArgs $rootName . [pid]]]]

###############################################################################

#
# NOTE: Configure the external zipping tool.  First, see if it has already
#       been pre-configured.  If not, try to query it from the environment.
#       Finally, fallback on the default of simply "zip", which will then
#       be assumed to exist somewhere along the PATH.
#
if {![info exists zip]} then {
  if {[info exists env(ZipTool)]} then {
    set zip $env(ZipTool)
  }
  if {![info exists zip] || ![file exists $zip]} then {
    set zip zip
  }
}

#
# NOTE: Configure the external unzipping tool.  First, see if it has already
#       been pre-configured.  If not, try to query it from the environment.
#       Finally, fallback on the default of simply "unzip", which will then
#       be assumed to exist somewhere along the PATH.
#
if {![info exists unzip]} then {
  if {[info exists env(UnZipTool)]} then {
    set unzip $env(UnZipTool)
  }
  if {![info exists unzip] || ![file exists $unzip]} then {
    set unzip unzip
  }
}

###############################################################################

#
# NOTE: Attempt to extract the SQLite version from the "sqlite3.h" header file
#       in the source directory.  This script assumes that the header file has
#       already been generated by the build process.
#
set pattern {^#define\s+SQLITE_VERSION\s+"(.*)"$}
set data [readFile [file join $sourceDirectory sqlite3.h]]

if {![regexp -line -- $pattern $data dummy version]} then {
  fail [appendArgs "cannot locate SQLITE_VERSION value in \"" \
      [file join $sourceDirectory sqlite3.h] \"]
}

###############################################################################

#
# NOTE: Setup all the master file list data.  This includes the source file
#       names, the destination file names, and the file processing flags.  The
#       possible file processing flags are:
#
#       "buildNeutral" -- This flag indicates the file location and content do
#                         not depend on the build configuration.
#
#       "platformNeutral" -- This flag indicates the file location and content
#                            do not depend on the build platform.
#
#       "subst" -- This flag indicates that the file contains dynamic textual
#                  content that needs to be processed using [subst] prior to
#                  packaging the file into the final VSIX package.  The primary
#                  use of this flag is to insert the name of the VSIX package,
#                  some package flavor-specific value, or the SQLite version
#                  into a file.
#
#       "noDebug" -- This flag indicates that the file should be skipped when
#                    processing the debug build.
#
#       "noRetail" -- This flag indicates that the file should be skipped when
#                     processing the retail build.
#
#       "move" -- This flag indicates that the file should be moved from the
#                 source to the destination instead of being copied.
#
#       This file metadata may be overridden, either in whole or in part, via
#       the user-specific customizations file.
#
if {![info exists fileNames(source)]} then {
  set fileNames(source) [list "" "" \
    [file join $stagingDirectory DesignTime <build> <platform> sqlite3.props] \
    [file join $sourceDirectory sqlite3.h] \
    [file join $binaryDirectory <build> <platform> sqlite3.lib] \
    [file join $binaryDirectory <build> <platform> sqlite3.dll]]

  if {![info exists no(symbols)]} then {
    lappend fileNames(source) \
        [file join $binaryDirectory <build> <platform> sqlite3.pdb]
  }
}

if {![info exists fileNames(destination)]} then {
  set fileNames(destination) [list \
    [file join $stagingDirectory extension.vsixmanifest] \
    [file join $stagingDirectory SDKManifest.xml] \
    [file join $stagingDirectory DesignTime <build> <platform> <name>.props] \
    [file join $stagingDirectory DesignTime <build> <platform> sqlite3.h] \
    [file join $stagingDirectory DesignTime <build> <platform> sqlite3.lib] \
    [file join $stagingDirectory Redist <build> <platform> sqlite3.dll]]

  if {![info exists no(symbols)]} then {
    lappend fileNames(destination) \
        [file join $stagingDirectory Redist <build> <platform> sqlite3.pdb]
  }
}

if {![info exists fileNames(flags)]} then {
  set fileNames(flags) [list \
      [list buildNeutral platformNeutral subst] \
      [list buildNeutral platformNeutral subst] \
      [list buildNeutral platformNeutral subst move] \
      [list buildNeutral platformNeutral] \
      [list] [list] [list noRetail]]

  if {![info exists no(symbols)]} then {
    lappend fileNames(flags) [list noRetail]
  }
}

###############################################################################

#
# NOTE: Setup the list of builds supported by this script.  These may be
#       overridden via the user-specific customizations file.
#
if {![info exists buildNames]} then {
  set buildNames [list Debug Retail]
}

###############################################################################

#
# NOTE: Setup the list of platforms supported by this script.  These may be
#       overridden via the command line or the user-specific customizations
#       file.
#
if {![info exists platformNames] || [llength $platformNames] == 0} then {
  set platformNames [list x86 x64 ARM]
}

###############################################################################

#
# NOTE: Make sure the staging directory exists, creating it if necessary.
#
file mkdir $stagingDirectory

#
# NOTE: Build the Tcl command used to extract the template VSIX package to
#       the staging directory.
#
set extractCommand [list exec -- $unzip $templateFile -d $stagingDirectory]

#
# NOTE: Extract the template VSIX package to the staging directory.
#
eval $extractCommand

###############################################################################

#
# NOTE: Process each file in the master file list.  There are actually three
#       parallel lists that contain the source file names, the destination file
#       names, and the file processing flags. If the "buildNeutral" flag is
#       present, the file location and content do not depend on the build
#       configuration and "CommonConfiguration" will be used in place of the
#       build configuration name.  If the "platformNeutral" flag is present,
#       the file location and content do not depend on the build platform and
#       "neutral" will be used in place of the build platform name.  If the
#       "subst" flag is present, the file is assumed to be a text file that may
#       contain Tcl variable, command, and backslash replacements, to be
#       dynamically replaced during processing using the Tcl [subst] command.
#       If the "noDebug" flag is present, the file will be skipped when
#       processing for the debug build.  If the "noRetail" flag is present, the
#       file will be skipped when processing for the retail build.  If the
#       "move" flag is present, the source file will be deleted after it is
#       copied to the destination file.  If the source file name is an empty
#       string, the destination file name will be assumed to already exist in
#       the staging directory and will not be copied; however, Tcl variable,
#       command, and backslash replacements may still be performed on the
#       destination file prior to the final VSIX package being built if the
#       "subst" flag is present.
#
foreach sourceFileName      $fileNames(source) \
        destinationFileName $fileNames(destination) \
        fileFlags           $fileNames(flags) {
  #
  # NOTE: Process the file flags into separate boolean variables that may be
  #       used within the loop.
  #
  set isBuildNeutral [expr {[lsearch $fileFlags buildNeutral] != -1}]
  set isPlatformNeutral [expr {[lsearch $fileFlags platformNeutral] != -1}]
  set isMove [expr {[lsearch $fileFlags move] != -1}]
  set useSubst [expr {[lsearch $fileFlags subst] != -1}]

  #
  # NOTE: If the current file is build-neutral, then only one build will
  #       be processed for it, namely "CommonConfiguration"; otherwise, each
  #       supported build will be processed for it individually.
  #
  foreach buildName \
      [expr {$isBuildNeutral ? [list CommonConfiguration] : $buildNames}] {
    #
    # NOTE: Should the current file be skipped for this build?
    #
    if {[lsearch $fileFlags no${buildName}] != -1} then {
      continue
    }

    #
    # NOTE: If the current file is platform-neutral, then only one platform
    #       will be processed for it, namely "neutral"; otherwise, each
    #       supported platform will be processed for it individually.
    #
    foreach platformName \
        [expr {$isPlatformNeutral ? [list neutral] : $platformNames}] {
      #
      # NOTE: Use the actual platform name in the destination file name.
      #
      set newDestinationFileName [replaceFileNameTokens $destinationFileName \
          $shortName $buildName $platformName]

      #
      # NOTE: Does the source file need to be copied to the destination file?
      #
      if {[string length $sourceFileName] > 0} then {
        #
        # NOTE: First, make sure the destination directory exists.
        #
        file mkdir [file dirname $newDestinationFileName]

        #
        # NOTE: Then, copy the source file to the destination file verbatim.
        #
        set newSourceFileName [replaceFileNameTokens $sourceFileName \
            $shortName $buildName $platformName]

        file copy $newSourceFileName $newDestinationFileName

        #
        # NOTE: If this is a move instead of a copy, delete the source file
        #       now.
        #
        if {$isMove} then {
          file delete $newSourceFileName
        }
      }

      #
      # NOTE: Does the destination file contain dynamic replacements that must
      #       be processed now?
      #
      if {$useSubst} then {
        #
        # NOTE: Perform any dynamic replacements contained in the destination
        #       file and then re-write it in-place.
        #
        substFile $newDestinationFileName
      }
    }
  }
}

###############################################################################

#
# NOTE: Change the current directory to the staging directory so that the
#       external archive building tool can pickup the necessary files using
#       relative paths.
#
cd $stagingDirectory

#
# NOTE: Build the Tcl command used to archive the final VSIX package in the
#       output directory.
#
set archiveCommand [list exec -- $zip -r $outputFile *]

#
# NOTE: Build the final VSIX package archive in the output directory.
#
eval $archiveCommand

#
# NOTE: Change back to the previously saved current directory.
#
cd $currentDirectory

#
# NOTE: Cleanup the temporary staging directory.
#
file delete -force $stagingDirectory

###############################################################################

#
# NOTE: Success, emit the fully qualified path of the generated VSIX file.
#
puts stdout $outputFile
