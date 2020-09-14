#!/bin/sh
# \
exec wapptclsh "$0" ${1+"$@"}

# package required wapp
source [file join [file dirname [info script]] wapp.tcl]

# Variables set by the "control" form:
#
#   G(platform) - User selected platform.
#   G(test)     - Set to "Normal", "Veryquick", "Smoketest" or "Build-Only".
#   G(keep)     - Boolean. True to delete no files after each test.
#   G(msvc)     - Boolean. True to use MSVC as the compiler.
#   G(tcl)      - Use Tcl from this directory for builds.
#   G(jobs)     - How many sub-processes to run simultaneously.
#
set G(platform) $::tcl_platform(os)-$::tcl_platform(machine)
set G(test)     Normal
set G(keep)     1
set G(msvc)     0
set G(tcl)      [::tcl::pkgconfig get libdir,install]
set G(jobs)     3
set G(debug)    0

set G(noui)     0
set G(stdout)   0


proc wapptest_init {} {
  global G

  set lSave [list platform test keep msvc tcl jobs debug noui stdout] 
  foreach k $lSave { set A($k) $G($k) }
  array unset G
  foreach k $lSave { set G($k) $A($k) }

  # The root of the SQLite source tree.
  set G(srcdir)   [file dirname [file dirname [info script]]]

  set G(sqlite_version) "unknown"

  # Either "config", "running" or "stopped":
  set G(state) "config"

  set G(hostname) "(unknown host)"
  catch { set G(hostname) [exec hostname] } 
  set G(host) $G(hostname)
  append G(host) " $::tcl_platform(os) $::tcl_platform(osVersion)"
  append G(host) " $::tcl_platform(machine) $::tcl_platform(byteOrder)"
}

proc wapptest_run {} {
  global G
  set_test_array
  set G(state) "running"

  wapptest_openlog

  wapptest_output "Running the following for $G(platform). $G(jobs) jobs."
  foreach t $G(test_array) {
    set config [dict get $t config]
    set target [dict get $t target]
    wapptest_output [format "    %-25s%s" $config $target]
  }
  wapptest_output [string repeat * 70]
}

proc releasetest_data {args} {
  global G
  set rtd [file join $G(srcdir) test releasetest_data.tcl]
  set fd [open "|[info nameofexecutable] $rtd $args" r+]
  set ret [read $fd]
  close $fd
  return $ret
}

# Generate the text for the box at the top of the UI. The current SQLite
# version, according to fossil, along with a warning if there are 
# uncommitted changes in the checkout.
#
proc generate_fossil_info {} {
  global G
  set pwd [pwd]
  cd $G(srcdir)
  set rc [catch {
    set r1 [exec fossil info]
    set r2 [exec fossil changes]
  }]
  cd $pwd
  if {$rc} return

  foreach line [split $r1 "\n"] {
    if {[regexp {^checkout: *(.*)$} $line -> co]} {
      wapp-trim { <br> %html($co) }
    }
  }

  if {[string trim $r2]!=""} {
    wapp-trim { 
      <br><span class=warning> 
      WARNING: Uncommitted changes in checkout
      </span>
    }
  }
}

# If the application is in "config" state, set the contents of the 
# ::G(test_array) global to reflect the tests that will be run. If the
# app is in some other state ("running" or "stopped"), this command
# is a no-op.
#
proc set_test_array {} {
  global G
  if { $G(state)=="config" } {
    set G(test_array) [list]
    set debug "-debug"
    if {$G(debug)==0} { set debug "-nodebug"}
    foreach {config target} [releasetest_data tests $debug $G(platform)] {

      # If using MSVC, do not run sanitize or valgrind tests. Or the
      # checksymbols test.
      if {$G(msvc) && (
          "Sanitize" == $config 
       || "checksymbols" in $target
       || "valgrindtest" in $target
      )} {
        continue
      }

      # If the test mode is not "Normal", override the target.
      #
      if {$target!="checksymbols" && $G(platform)!="Failure-Detection"} {
        switch -- $G(test) {
          Veryquick { set target quicktest }
          Smoketest { set target smoketest }
          Build-Only {
            set target testfixture
            if {$::tcl_platform(platform)=="windows"} {
              set target testfixture.exe
            }
          }
        }
      }

      lappend G(test_array) [dict create config $config target $target]
    }
  }
}

proc count_tests_and_errors {name logfile} {
  global G

  set fd [open $logfile rb]
  set seen 0
  while {![eof $fd]} {
    set line [gets $fd]
    if {[regexp {(\d+) errors out of (\d+) tests} $line all nerr ntest]} {
      incr G(test.$name.nError) $nerr
      incr G(test.$name.nTest) $ntest
      set seen 1
      if {$nerr>0} {
        set G(test.$name.errmsg) $line
      }
    }
    if {[regexp {runtime error: +(.*)} $line all msg]} {
      # skip over "value is outside range" errors
      if {[regexp {.* is outside the range of representable} $line]} {
         # noop
      } else {
        incr G(test.$name.nError)
        if {$G(test.$name.errmsg)==""} {
          set G(test.$name.errmsg) $msg
        }
      }
    }
    if {[regexp {fatal error +(.*)} $line all msg]} {
      incr G(test.$name.nError)
      if {$G(test.$name.errmsg)==""} {
        set G(test.$name.errmsg) $msg
      }
    }
    if {[regexp {ERROR SUMMARY: (\d+) errors.*} $line all cnt] && $cnt>0} {
      incr G(test.$name.nError)
      if {$G(test.$name.errmsg)==""} {
        set G(test.$name.errmsg) $all
      }
    }
    if {[regexp {^VERSION: 3\.\d+.\d+} $line]} {
      set v [string range $line 9 end]
      if {$G(sqlite_version) eq "unknown"} {
        set G(sqlite_version) $v
      } elseif {$G(sqlite_version) ne $v} {
        set G(test.$name.errmsg) "version conflict: {$G(sqlite_version)} vs. {$v}"
      }
    }
  }
  close $fd
  if {$G(test) == "Build-Only"} {
    incr G(test.$name.nTest)
    if {$G(test.$name.nError)>0} {
      set errmsg "Build failed"
    }
  } elseif {!$seen} {
    set G(test.$name.errmsg) "Test did not complete"
    if {[file readable core]} {
      append G(test.$name.errmsg) " - core file exists"
    }
  }
}

proc wapptest_output {str} {
  global G
  if {$G(stdout)} { puts $str }
  if {[info exists G(log)]} { 
    puts $G(log) $str 
    flush $G(log)
  }
}
proc wapptest_openlog {} {
  global G
  set G(log) [open wapptest-out.txt w+]
}
proc wapptest_closelog {} {
  global G
  close $G(log)
  unset G(log)
}

proc format_seconds {seconds} {
  set min [format %.2d [expr ($seconds / 60) % 60]]
  set  hr [format %.2d [expr $seconds / 3600]]
  set sec [format %.2d [expr $seconds % 60]]
  return "$hr:$min:$sec"
}

# This command is invoked once a slave process has finished running its
# tests, successfully or otherwise. Parameter $name is the name of the 
# test, $rc the exit code returned by the slave process.
#
proc slave_test_done {name rc} {
  global G
  set G(test.$name.done) [clock seconds]
  set G(test.$name.nError) 0
  set G(test.$name.nTest) 0
  set G(test.$name.errmsg) ""
  if {$rc} {
    incr G(test.$name.nError)
  }
  if {[file exists $G(test.$name.log)]} {
    count_tests_and_errors $name $G(test.$name.log)
  }

  # If the "keep files" checkbox is clear, delete all files except for
  # the executables and test logs. And any core file that is present.
  if {$G(keep)==0} {
    set keeplist {
      testfixture testfixture.exe
      sqlite3 sqlite3.exe
      test.log test-out.txt
      core
      wapptest_make.sh
      wapptest_configure.sh
      wapptest_run.tcl
    }
    foreach f [glob -nocomplain [file join $G(test.$name.dir) *]] {
      set t [file tail $f]
      if {[lsearch $keeplist $t]<0} {
        catch { file delete -force $f }
      }
    }
  }

  # Format a message regarding the success or failure of hte test.
  set t [format_seconds [expr $G(test.$name.done) - $G(test.$name.start)]]
  set res "OK"
  if {$G(test.$name.nError)} { set res "FAILED" }
  set dots [string repeat . [expr 60 - [string length $name]]]
  set msg "$name $dots $res ($t)"

  wapptest_output $msg
  if {[info exists G(test.$name.errmsg)] && $G(test.$name.errmsg)!=""} {
    wapptest_output "    $G(test.$name.errmsg)"
  }
}

# This is a fileevent callback invoked each time a file-descriptor that
# connects this process to a slave process is readable.
#
proc slave_fileevent {name} {
  global G
  set fd $G(test.$name.channel)

  if {[eof $fd]} {
    fconfigure $fd -blocking 1
    set rc [catch { close $fd }]
    unset G(test.$name.channel)
    slave_test_done $name $rc
  } else {
    set line [gets $fd]
    if {[string trim $line] != ""} { puts "Trace   : $name - \"$line\"" }
  }

  do_some_stuff
}

# Return the contents of the "slave script" - the script run by slave 
# processes to actually perform the test. All it does is execute the
# test script already written to disk (wapptest_cmd.sh or wapptest_cmd.bat).
#
proc wapptest_slave_script {} {
  global G
  if {$G(msvc)==0} {
    set dir [file join .. $G(srcdir)]
    set res [subst -nocommands {
      set rc [catch "exec sh wapptest_cmd.sh {$dir} >>& test.log" ]
      exit [set rc]
    }]
  } else {
    set dir [file nativename [file normalize $G(srcdir)]]
    set dir [string map [list "\\" "\\\\"] $dir]
    set res [subst -nocommands {
      set rc [catch "exec wapptest_cmd.bat {$dir} >>& test.log" ]
      exit [set rc]
    }]
  }

  set res
}


# Launch a slave process to run a test.
#
proc slave_launch {name target dir} {
  global G

  catch { file mkdir $dir } msg
  foreach f [glob -nocomplain [file join $dir *]] {
    catch { file delete -force $f }
  }
  set G(test.$name.dir) $dir

  # Write the test command to wapptest_cmd.sh|bat.
  #
  set ext sh
  if {$G(msvc)} { set ext bat }
  set fd1 [open [file join $dir wapptest_cmd.$ext] w]
  if {$G(msvc)} {
    puts $fd1 [releasetest_data script -msvc $name $target]
  } else {
    puts $fd1 [releasetest_data script $name $target]
  }
  close $fd1

  # Write the wapptest_run.tcl script to the test directory. To run the
  # commands in the other two files.
  #
  set fd3 [open [file join $dir wapptest_run.tcl] w]
  puts $fd3 [wapptest_slave_script]
  close $fd3

  set pwd [pwd]
  cd $dir
  set fd [open "|[info nameofexecutable] wapptest_run.tcl" r+]
  cd $pwd

  set G(test.$name.channel) $fd
  fconfigure $fd -blocking 0
  fileevent $fd readable [list slave_fileevent $name]
}

proc do_some_stuff {} {
  global G

  # Count the number of running jobs. A running job has an entry named
  # "channel" in its dictionary.
  set nRunning 0
  set bFinished 1
  foreach j $G(test_array) {
    set name [dict get $j config]
    if { [info exists G(test.$name.channel)]} { incr nRunning   }
    if {![info exists G(test.$name.done)]}    { set bFinished 0 }
  }

  if {$bFinished} {
    set nError 0
    set nTest 0
    set nConfig 0
    foreach j $G(test_array) {
      set name [dict get $j config]
      incr nError $G(test.$name.nError)
      incr nTest $G(test.$name.nTest)
      incr nConfig 
    }
    set G(result) "$nError errors from $nTest tests in $nConfig configurations."
    wapptest_output [string repeat * 70]
    wapptest_output $G(result)
    catch {
      append G(result) " SQLite version $G(sqlite_version)"
      wapptest_output " SQLite version $G(sqlite_version)"
    }
    set G(state) "stopped"
    wapptest_closelog
    if {$G(noui)} { exit 0 }
  } else {
    set nLaunch [expr $G(jobs) - $nRunning]
    foreach j $G(test_array) {
      if {$nLaunch<=0} break
      set name [dict get $j config]
      if { ![info exists G(test.$name.channel)]
        && ![info exists G(test.$name.done)]
      } {

        set target [dict get $j target]
        set dir [string tolower [string map {" " _ "-" _} $name]]
        set G(test.$name.start) [clock seconds]
        set G(test.$name.log) [file join $dir test.log]

        slave_launch $name $target $dir

        incr nLaunch -1
      }
    }
  }
}

proc generate_select_widget {label id lOpt opt} {
  wapp-trim {
    <label> %string($label) </label>
    <select id=%string($id) name=%string($id)>
  }
  foreach o $lOpt {
    set selected ""
    if {$o==$opt} { set selected " selected=1" }
    wapp-subst "<option $selected>$o</option>"
  }
  wapp-trim { </select> }
}

proc generate_main_page {{extra {}}} {
  global G
  set_test_array

  set hostname $G(hostname)
  wapp-trim {
    <html>
    <head>
      <title> %html($hostname): wapptest.tcl </title>
      <link rel="stylesheet" type="text/css" href="style.css"/>
    </head>
    <body>
  }

  set host $G(host)
  wapp-trim {
    <div class="border">%string($host)
  }
  generate_fossil_info
  wapp-trim {
    </div>
    <div class="border" id=controls> 
    <form action="control" method="post" name="control">
  }

  # Build the "platform" select widget. 
  set lOpt [releasetest_data platforms]
  generate_select_widget Platform control_platform $lOpt $G(platform)

  # Build the "test" select widget. 
  set lOpt [list Normal Veryquick Smoketest Build-Only] 
  generate_select_widget Test control_test $lOpt $G(test)

  # Build the "jobs" select widget. Options are 1 to 8.
  generate_select_widget Jobs control_jobs {1 2 3 4 5 6 7 8} $G(jobs)

  switch $G(state) {
    config {
      set txt "Run Tests!"
      set id control_run
    }
    running {
      set txt "STOP Tests!"
      set id control_stop
    }
    stopped {
      set txt "Reset!"
      set id control_reset
    }
  }
  wapp-trim {
    <div class=right>
    <input id=%string($id) name=%string($id) type=submit value="%string($txt)">
    </input>
    </div>
  }

  wapp-trim {
  <br><br>
        <label> Tcl: </label>
        <input id="control_tcl" name="control_tcl"></input>
        <label> Keep files: </label>
        <input id="control_keep" name="control_keep" type=checkbox value=1>
        </input>
        <label> Use MSVC: </label>
        <input id="control_msvc" name="control_msvc" type=checkbox value=1>
        <label> Debug tests: </label>
        <input id="control_debug" name="control_debug" type=checkbox value=1>
        </input>
  }
  wapp-trim {
     </form>
  }
  wapp-trim {
     </div>
     <div id=tests>
  }
  wapp-page-tests

  set script "script/$G(state).js"
  wapp-trim {
    </div>
      <script src=%string($script)></script>
    </body>
    </html>
  }
}

proc wapp-default {} {
  generate_main_page
}

proc wapp-page-tests {} {
  global G
  wapp-trim { <table class="border" width=100%> }
  foreach t $G(test_array) {
    set config [dict get $t config]
    set target [dict get $t target]

    set class "testwait"
    set seconds ""

    if {[info exists G(test.$config.log)]} {
      if {[info exists G(test.$config.channel)]} {
        set class "testrunning"
        set seconds [expr [clock seconds] - $G(test.$config.start)]
      } elseif {[info exists G(test.$config.done)]} {
        if {$G(test.$config.nError)>0} {
          set class "testfail" 
        } else {
          set class "testdone"
        }
        set seconds [expr $G(test.$config.done) - $G(test.$config.start)]
      }
      set seconds [format_seconds $seconds]
    }

    wapp-trim {
      <tr class=%string($class)>
      <td class="nowrap"> %html($config) 
      <td class="padleft nowrap"> %html($target)
      <td class="padleft nowrap"> %html($seconds)
      <td class="padleft nowrap">
    }
    if {[info exists G(test.$config.log)]} {
      set log $G(test.$config.log)
      set uri "log/$log"
      wapp-trim {
        <a href=%url($uri)> %html($log) </a>
      }
    }
    if {[info exists G(test.$config.errmsg)] && $G(test.$config.errmsg)!=""} {
      set errmsg $G(test.$config.errmsg)
      wapp-trim {
        <tr class=testfail>
        <td> <td class="padleft" colspan=3> %html($errmsg)
      }
    }
  }

  wapp-trim { </table> }

  if {[info exists G(result)]} {
    set res $G(result)
    wapp-trim {
      <div class=border id=result> %string($res) </div>
    }
  }
}

# URI: /control
#
# Whenever the form at the top of the application page is submitted, it
# is submitted here.
#
proc wapp-page-control {} {
  global G
  if {$::G(state)=="config"} {
    set lControls [list platform test tcl jobs keep msvc debug]
    set G(msvc) 0
    set G(keep) 0
    set G(debug) 0
  } else {
    set lControls [list jobs]
  }
  foreach v $lControls {
    if {[wapp-param-exists control_$v]} {
      set G($v) [wapp-param control_$v]
    }
  }

  if {[wapp-param-exists control_run]} {
    # This is a "run test" command.
    wapptest_run
  }

  if {[wapp-param-exists control_stop]} {
    # A "STOP tests" command.
    set G(state) "stopped"
    set G(result) "Test halted by user"
    foreach j $G(test_array) {
      set name [dict get $j config]
      if { [info exists G(test.$name.channel)] } {
        close $G(test.$name.channel)
        unset G(test.$name.channel)
        slave_test_done $name 1
      }
    }
    wapptest_closelog
  }

  if {[wapp-param-exists control_reset]} {
    # A "reset app" command.
    set G(state) "config"
    wapptest_init
  }

  if {$::G(state) == "running"} {
    do_some_stuff
  }
  wapp-redirect /
}

# URI: /style.css
#
# Return the stylesheet for the application main page.
#
proc wapp-page-style.css {} {
  wapp-subst {

    /* The boxes with black borders use this class */
    .border {
      border: 3px groove #444444;
      padding: 1em;
      margin-top: 1em;
      margin-bottom: 1em;
    }

    /* Float to the right (used for the Run/Stop/Reset button) */
    .right { float: right; }

    /* Style for the large red warning at the top of the page */
    .warning {
      color: red;
      font-weight: bold;
    }

    /* Styles used by cells in the test table */
    .padleft { padding-left: 5ex; }
    .nowrap  { white-space: nowrap; }

    /* Styles for individual tests, depending on the outcome */
    .testwait    {              }
    .testrunning { color: blue  }
    .testdone    { color: green }
    .testfail    { color: red   }
  }
}

# URI: /script/${state}.js
#
# The last part of this URI is always "config.js", "running.js" or 
# "stopped.js", depending on the state of the application. It returns
# the javascript part of the front-end for the requested state to the
# browser.
#
proc wapp-page-script {} {
  regexp {[^/]*$} [wapp-param REQUEST_URI] script

  set tcl $::G(tcl)
  set keep $::G(keep)
  set msvc $::G(msvc)
  set debug $::G(debug)
  
  wapp-subst {
    var lElem = \["control_platform", "control_test", "control_msvc", 
        "control_jobs", "control_debug"
    \];
    lElem.forEach(function(e) {
      var elem = document.getElementById(e);
      elem.addEventListener("change", function() { control.submit() } );
    })

    elem = document.getElementById("control_tcl");
    elem.value = "%string($tcl)"

    elem = document.getElementById("control_keep");
    elem.checked = %string($keep);

    elem = document.getElementById("control_msvc");
    elem.checked = %string($msvc);

    elem = document.getElementById("control_debug");
    elem.checked = %string($debug);
  }

  if {$script != "config.js"} {
    wapp-subst {
      var lElem = \["control_platform", "control_test", 
          "control_tcl", "control_keep", "control_msvc", 
          "control_debug"
      \];
      lElem.forEach(function(e) {
        var elem = document.getElementById(e);
        elem.disabled = true;
      })
    }
  }

  if {$script == "running.js"} {
    wapp-subst {
      function reload_tests() {
        fetch('tests')
          .then( data => data.text() )
          .then( data => {
            document.getElementById("tests").innerHTML = data;
          })
          .then( data => {
            if( document.getElementById("result") ){
              document.location = document.location;
            } else {
              setTimeout(reload_tests, 1000)
            }
          });
      }

      setTimeout(reload_tests, 1000)
    }
  }
}

# URI: /env
#
# This is for debugging only. Serves no other purpose.
#
proc wapp-page-env {} {
  wapp-allow-xorigin-params
  wapp-trim {
    <h1>Wapp Environment</h1>\n<pre>
    <pre>%html([wapp-debug-env])</pre>
  }
}

# URI: /log/dirname/test.log
#
# This URI reads file "dirname/test.log" from disk, wraps it in a <pre>
# block, and returns it to the browser. Use for viewing log files.
#
proc wapp-page-log {} {
  set log [string range [wapp-param REQUEST_URI] 5 end]
  set fd [open $log]
  set data [read $fd]
  close $fd
  wapp-trim {
    <pre>
    %html($data)
    </pre>
  }
}

# Print out a usage message. Then do [exit 1].
#
proc wapptest_usage {} {
  puts stderr {
This Tcl script is used to test various configurations of SQLite. By
default it uses "wapp" to provide an interactive interface. Supported 
command line options (all optional) are:

    --platform    PLATFORM         (which tests to run)
    --smoketest                    (run "make smoketest" only)
    --veryquick                    (run veryquick.test only)
    --buildonly                    (build executables, do not run tests)
    --jobs        N                (number of concurrent jobs)
    --tcl         DIR              (where to find tclConfig.sh)
    --deletefiles                  (delete extra files after each test)
    --msvc                         (Use MS Visual C)
    --debug                        (Also run [n]debugging versions of tests)
    --noui                         (do not use wapp)
  }
  exit 1
}

# Sort command line arguments into two groups: those that belong to wapp,
# and those that belong to the application.
set WAPPARG(-server)      1
set WAPPARG(-local)       1
set WAPPARG(-scgi)        1
set WAPPARG(-remote-scgi) 1
set WAPPARG(-fromip)      1
set WAPPARG(-nowait)      0
set WAPPARG(-cgi)         0
set lWappArg [list]
set lTestArg [list]
for {set i 0} {$i < [llength $argv]} {incr i} {
  set arg [lindex $argv $i]
  if {[string range $arg 0 1]=="--"} {
    set arg [string range $arg 1 end]
  }
  if {[info exists WAPPARG($arg)]} {
    lappend lWappArg $arg
    if {$WAPPARG($arg)} {
      incr i
      lappend lWappArg [lindex $argv $i]
    }
  } else {
    lappend lTestArg $arg
  }
}

wapptest_init
for {set i 0} {$i < [llength $lTestArg]} {incr i} {
  set opt [lindex $lTestArg $i]
  if {[string range $opt 0 1]=="--"} {
    set opt [string range $opt 1 end]
  }
  switch -- $opt {
    -platform {
      if {$i==[llength $lTestArg]-1} { wapptest_usage }
      incr i
      set arg [lindex $lTestArg $i]
      set lPlatform [releasetest_data platforms]
      if {[lsearch $lPlatform $arg]<0} {
        puts stderr "No such platform: $arg. Platforms are: $lPlatform"
        exit -1
      }
      set G(platform) $arg
    }

    -smoketest { set G(test) Smoketest }
    -veryquick { set G(test) Veryquick }
    -buildonly { set G(test) Build-Only }
    -jobs {
      if {$i==[llength $lTestArg]-1} { wapptest_usage }
      incr i
      set G(jobs) [lindex $lTestArg $i]
    }

    -tcl {
      if {$i==[llength $lTestArg]-1} { wapptest_usage }
      incr i
      set G(tcl) [lindex $lTestArg $i]
    }

    -deletefiles {
      set G(keep) 0
    }

    -msvc {
      set G(msvc) 1
    }

    -debug {
      set G(debug) 1
    }

    -noui {
      set G(noui) 1
      set G(stdout) 1
    }

    -stdout {
      set G(stdout) 1
    }

    default {
      puts stderr "Unrecognized option: [lindex $lTestArg $i]"
      wapptest_usage
    }
  }
}

if {$G(noui)==0} {
  wapp-start $lWappArg
} else {
  wapptest_run
  do_some_stuff
  vwait forever
}
