The base application's source code is available from the portable app's
homepage listed in the help.html file.

Details of most other things are available there as well.

LICENSE
=======

This package and its launcher are released under the GPL. The launcher is the
PortableApps.com Launcher, available with full source and documentation from
http://portableapps.com/development. We request that developers using the
PortableApps.com Launcher please leave this directory intact and unchanged.

USER CONFIGURATION
==================

(For this section, AppNamePortable is the executable base file name, normally
the App ID of the package.)

Some configuration in the PortableApps.com Launcher can be overridden by the
user in an INI file next to AppNamePortable.exe called AppNamePortable.ini.  If
you are happy with the default options, it is not necessary, though.  There is
an example INI included with this package to get you started.  To use it, copy
PortableApps.comLauncher.ini from this directory to AppNamePortable.ini next to
AppNamePortable.exe. The options in the INI file are as follows::

   AdditionalParameters=
   DisableSplashScreen=false
   RunLocally=false

(There is no need for an INI header in this file; if you have one, though, it
won't damage anything.)

The AdditionalParameters entry allows you to pass additional command-line
parameters to the application.

The DisableSplashScreen entry allows you to run the launcher without the splash
screen showing up.  The default is false.

The RunLocally entry allows you to run the portable application from a read-
only medium. This is known as Live mode. It copies what it needs to to a
temporary directory on the host computer, runs the application, and then
deletes it afterwards, leaving nothing behind. This can be useful for running
the application from a CD or if you work on a computer that may have spyware or
viruses and you'd like to keep your device set to read-only. As a consequence
of this technique, any changes you make during the Live mode session aren't
saved back to your device.  The default is false.

There may be other values also permitted in the user configuration file by the
portable application; refer to help.html for any details of them.
