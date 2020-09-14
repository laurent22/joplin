# 2001 September 15
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements some common TCL routines used for regression
# testing the SQLite library
#
# $Id: tester.tcl,v 1.143 2009/04/09 01:23:49 drh Exp $

#-------------------------------------------------------------------------
# The commands provided by the code in this file to help with creating
# test cases are as follows:
#
# Commands to manipulate the db and the file-system at a high level:
#
#      is_relative_file
#      test_pwd
#      get_pwd
#      copy_file              FROM TO
#      delete_file            FILENAME
#      drop_all_tables        ?DB?
#      drop_all_indexes       ?DB?
#      forcecopy              FROM TO
#      forcedelete            FILENAME
#
# Test the capability of the SQLite version built into the interpreter to
# determine if a specific test can be run:
#
#      capable                EXPR
#      ifcapable              EXPR
#
# Calulate checksums based on database contents:
#
#      dbcksum                DB DBNAME
#      allcksum               ?DB?
#      cksum                  ?DB?
#
# Commands to execute/explain SQL statements:
#
#      memdbsql               SQL
#      stepsql                DB SQL
#      execsql2               SQL
#      explain_no_trace       SQL
#      explain                SQL ?DB?
#      catchsql               SQL ?DB?
#      execsql                SQL ?DB?
#
# Commands to run test cases:
#
#      do_ioerr_test          TESTNAME ARGS...
#      crashsql               ARGS...
#      integrity_check        TESTNAME ?DB?
#      verify_ex_errcode      TESTNAME EXPECTED ?DB?
#      do_test                TESTNAME SCRIPT EXPECTED
#      do_execsql_test        TESTNAME SQL EXPECTED
#      do_catchsql_test       TESTNAME SQL EXPECTED
#      do_timed_execsql_test  TESTNAME SQL EXPECTED
#
# Commands providing a lower level interface to the global test counters:
#
#      set_test_counter       COUNTER ?VALUE?
#      omit_test              TESTNAME REASON ?APPEND?
#      fail_test              TESTNAME
#      incr_ntest
#
# Command run at the end of each test file:
#
#      finish_test
#
# Commands to help create test files that run with the "WAL" and other
# permutations (see file permutations.test):
#
#      wal_is_wal_mode
#      wal_set_journal_mode   ?DB?
#      wal_check_journal_mode TESTNAME?DB?
#      permutation
#      presql
#
# Command to test whether or not --verbose=1 was specified on the command
# line (returns 0 for not-verbose, 1 for verbose and 2 for "verbose in the
# output file only").
#
#      verbose
#

# Set the precision of FP arithmatic used by the interpreter. And
# configure SQLite to take database file locks on the page that begins
# 64KB into the database file instead of the one 1GB in. This means
# the code that handles that special case can be tested without creating
# very large database files.
#
set tcl_precision 15
sqlite3_test_control_pending_byte 0x0010000


# If the pager codec is available, create a wrapper for the [sqlite3]
# command that appends "-key {xyzzy}" to the command line. i.e. this:
#
#     sqlite3 db test.db
#
# becomes
#
#     sqlite3 db test.db -key {xyzzy}
#
if {[info command sqlite_orig]==""} {
  rename sqlite3 sqlite_orig
  proc sqlite3 {args} {
    if {[llength $args]>=2 && [string index [lindex $args 0] 0]!="-"} {
      # This command is opening a new database connection.
      #
      if {[info exists ::G(perm:sqlite3_args)]} {
        set args [concat $args $::G(perm:sqlite3_args)]
      }
      if {[sqlite_orig -has-codec] && ![info exists ::do_not_use_codec]} {
        lappend args -key {xyzzy}
      }

      set res [uplevel 1 sqlite_orig $args]
      if {[info exists ::G(perm:presql)]} {
        [lindex $args 0] eval $::G(perm:presql)
      }
      if {[info exists ::G(perm:dbconfig)]} {
        set ::dbhandle [lindex $args 0]
        uplevel #0 $::G(perm:dbconfig)
      }
      [lindex $args 0] cache size 3
      set res
    } else {
      # This command is not opening a new database connection. Pass the
      # arguments through to the C implementation as the are.
      #
      uplevel 1 sqlite_orig $args
    }
  }
}

proc getFileRetries {} {
  if {![info exists ::G(file-retries)]} {
    #
    # NOTE: Return the default number of retries for [file] operations.  A
    #       value of zero or less here means "disabled".
    #
    return [expr {$::tcl_platform(platform) eq "windows" ? 50 : 0}]
  }
  return $::G(file-retries)
}

proc getFileRetryDelay {} {
  if {![info exists ::G(file-retry-delay)]} {
    #
    # NOTE: Return the default number of milliseconds to wait when retrying
    #       failed [file] operations.  A value of zero or less means "do not
    #       wait".
    #
    return 100; # TODO: Good default?
  }
  return $::G(file-retry-delay)
}

# Return the string representing the name of the current directory.  On
# Windows, the result is "normalized" to whatever our parent command shell
# is using to prevent case-mismatch issues.
#
proc get_pwd {} {
  if {$::tcl_platform(platform) eq "windows"} {
    #
    # NOTE: Cannot use [file normalize] here because it would alter the
    #       case of the result to what Tcl considers canonical, which would
    #       defeat the purpose of this procedure.
    #
    return [string map [list \\ /] \
        [string trim [exec -- $::env(ComSpec) /c echo %CD%]]]
  } else {
    return [pwd]
  }
}

# Copy file $from into $to. This is used because some versions of
# TCL for windows (notably the 8.4.1 binary package shipped with the
# current mingw release) have a broken "file copy" command.
#
proc copy_file {from to} {
  do_copy_file false $from $to
}

proc forcecopy {from to} {
  do_copy_file true $from $to
}

proc do_copy_file {force from to} {
  set nRetry [getFileRetries]     ;# Maximum number of retries.
  set nDelay [getFileRetryDelay]  ;# Delay in ms before retrying.

  # On windows, sometimes even a [file copy -force] can fail. The cause is
  # usually "tag-alongs" - programs like anti-virus software, automatic backup
  # tools and various explorer extensions that keep a file open a little longer
  # than we expect, causing the delete to fail.
  #
  # The solution is to wait a short amount of time before retrying the copy.
  #
  if {$nRetry > 0} {
    for {set i 0} {$i<$nRetry} {incr i} {
      set rc [catch {
        if {$force} {
          file copy -force $from $to
        } else {
          file copy $from $to
        }
      } msg]
      if {$rc==0} break
      if {$nDelay > 0} { after $nDelay }
    }
    if {$rc} { error $msg }
  } else {
    if {$force} {
      file copy -force $from $to
    } else {
      file copy $from $to
    }
  }
}

# Check if a file name is relative
#
proc is_relative_file { file } {
  return [expr {[file pathtype $file] != "absolute"}]
}

# If the VFS supports using the current directory, returns [pwd];
# otherwise, it returns only the provided suffix string (which is
# empty by default).
#
proc test_pwd { args } {
  if {[llength $args] > 0} {
    set suffix1 [lindex $args 0]
    if {[llength $args] > 1} {
      set suffix2 [lindex $args 1]
    } else {
      set suffix2 $suffix1
    }
  } else {
    set suffix1 ""; set suffix2 ""
  }
  ifcapable curdir {
    return "[get_pwd]$suffix1"
  } else {
    return $suffix2
  }
}

# Delete a file or directory
#
proc delete_file {args} {
  do_delete_file false {*}$args
}

proc forcedelete {args} {
  do_delete_file true {*}$args
}

proc do_delete_file {force args} {
  set nRetry [getFileRetries]     ;# Maximum number of retries.
  set nDelay [getFileRetryDelay]  ;# Delay in ms before retrying.

  foreach filename $args {
    # On windows, sometimes even a [file delete -force] can fail just after
    # a file is closed. The cause is usually "tag-alongs" - programs like
    # anti-virus software, automatic backup tools and various explorer
    # extensions that keep a file open a little longer than we expect, causing
    # the delete to fail.
    #
    # The solution is to wait a short amount of time before retrying the
    # delete.
    #
    if {$nRetry > 0} {
      for {set i 0} {$i<$nRetry} {incr i} {
        set rc [catch {
          if {$force} {
            file delete -force $filename
          } else {
            file delete $filename
          }
        } msg]
        if {$rc==0} break
        if {$nDelay > 0} { after $nDelay }
      }
      if {$rc} { error $msg }
    } else {
      if {$force} {
        file delete -force $filename
      } else {
        file delete $filename
      }
    }
  }
}

if {$::tcl_platform(platform) eq "windows"} {
  proc do_remove_win32_dir {args} {
    set nRetry [getFileRetries]     ;# Maximum number of retries.
    set nDelay [getFileRetryDelay]  ;# Delay in ms before retrying.

    foreach dirName $args {
      # On windows, sometimes even a [remove_win32_dir] can fail just after
      # a directory is emptied. The cause is usually "tag-alongs" - programs
      # like anti-virus software, automatic backup tools and various explorer
      # extensions that keep a file open a little longer than we expect,
      # causing the delete to fail.
      #
      # The solution is to wait a short amount of time before retrying the
      # removal.
      #
      if {$nRetry > 0} {
        for {set i 0} {$i < $nRetry} {incr i} {
          set rc [catch {
            remove_win32_dir $dirName
          } msg]
          if {$rc == 0} break
          if {$nDelay > 0} { after $nDelay }
        }
        if {$rc} { error $msg }
      } else {
        remove_win32_dir $dirName
      }
    }
  }

  proc do_delete_win32_file {args} {
    set nRetry [getFileRetries]     ;# Maximum number of retries.
    set nDelay [getFileRetryDelay]  ;# Delay in ms before retrying.

    foreach fileName $args {
      # On windows, sometimes even a [delete_win32_file] can fail just after
      # a file is closed. The cause is usually "tag-alongs" - programs like
      # anti-virus software, automatic backup tools and various explorer
      # extensions that keep a file open a little longer than we expect,
      # causing the delete to fail.
      #
      # The solution is to wait a short amount of time before retrying the
      # delete.
      #
      if {$nRetry > 0} {
        for {set i 0} {$i < $nRetry} {incr i} {
          set rc [catch {
            delete_win32_file $fileName
          } msg]
          if {$rc == 0} break
          if {$nDelay > 0} { after $nDelay }
        }
        if {$rc} { error $msg }
      } else {
        delete_win32_file $fileName
      }
    }
  }
}

proc execpresql {handle args} {
  trace remove execution $handle enter [list execpresql $handle]
  if {[info exists ::G(perm:presql)]} {
    $handle eval $::G(perm:presql)
  }
}

# This command should be called after loading tester.tcl from within
# all test scripts that are incompatible with encryption codecs.
#
proc do_not_use_codec {} {
  set ::do_not_use_codec 1
  reset_db
}
unset -nocomplain do_not_use_codec

# Return true if the "reserved_bytes" integer on database files is non-zero.
#
proc nonzero_reserved_bytes {} {
  return [sqlite3 -has-codec]
}

# Print a HELP message and exit
#
proc print_help_and_quit {} {
  puts {Options:
  --pause                  Wait for user input before continuing
  --soft-heap-limit=N      Set the soft-heap-limit to N
  --hard-heap-limit=N      Set the hard-heap-limit to N
  --maxerror=N             Quit after N errors
  --verbose=(0|1)          Control the amount of output.  Default '1'
  --output=FILE            set --verbose=2 and output to FILE.  Implies -q
  -q                       Shorthand for --verbose=0
  --help                   This message
}
  exit 1
}

# The following block only runs the first time this file is sourced. It
# does not run in slave interpreters (since the ::cmdlinearg array is
# populated before the test script is run in slave interpreters).
#
if {[info exists cmdlinearg]==0} {

  # Parse any options specified in the $argv array. This script accepts the
  # following options:
  #
  #   --pause
  #   --soft-heap-limit=NN
  #   --hard-heap-limit=NN
  #   --maxerror=NN
  #   --malloctrace=N
  #   --backtrace=N
  #   --binarylog=N
  #   --soak=N
  #   --file-retries=N
  #   --file-retry-delay=N
  #   --start=[$permutation:]$testfile
  #   --match=$pattern
  #   --verbose=$val
  #   --output=$filename
  #   -q                                      Reduce output
  #   --testdir=$dir                          Run tests in subdirectory $dir
  #   --help
  #
  set cmdlinearg(soft-heap-limit)    0
  set cmdlinearg(hard-heap-limit)    0
  set cmdlinearg(maxerror)        1000
  set cmdlinearg(malloctrace)        0
  set cmdlinearg(backtrace)         10
  set cmdlinearg(binarylog)          0
  set cmdlinearg(soak)               0
  set cmdlinearg(file-retries)       0
  set cmdlinearg(file-retry-delay)   0
  set cmdlinearg(start)             ""
  set cmdlinearg(match)             ""
  set cmdlinearg(verbose)           ""
  set cmdlinearg(output)            ""
  set cmdlinearg(testdir)           "testdir"

  set leftover [list]
  foreach a $argv {
    switch -regexp -- $a {
      {^-+pause$} {
        # Wait for user input before continuing. This is to give the user an
        # opportunity to connect profiling tools to the process.
        puts -nonewline "Press RETURN to begin..."
        flush stdout
        gets stdin
      }
      {^-+soft-heap-limit=.+$} {
        foreach {dummy cmdlinearg(soft-heap-limit)} [split $a =] break
      }
      {^-+hard-heap-limit=.+$} {
        foreach {dummy cmdlinearg(hard-heap-limit)} [split $a =] break
      }
      {^-+maxerror=.+$} {
        foreach {dummy cmdlinearg(maxerror)} [split $a =] break
      }
      {^-+malloctrace=.+$} {
        foreach {dummy cmdlinearg(malloctrace)} [split $a =] break
        if {$cmdlinearg(malloctrace)} {
          if {0==$::sqlite_options(memdebug)} {
            set err "Error: --malloctrace=1 requires an SQLITE_MEMDEBUG build"
            puts stderr $err
            exit 1
          }
          sqlite3_memdebug_log start
        }
      }
      {^-+backtrace=.+$} {
        foreach {dummy cmdlinearg(backtrace)} [split $a =] break
        sqlite3_memdebug_backtrace $cmdlinearg(backtrace)
      }
      {^-+binarylog=.+$} {
        foreach {dummy cmdlinearg(binarylog)} [split $a =] break
        set cmdlinearg(binarylog) [file normalize $cmdlinearg(binarylog)]
      }
      {^-+soak=.+$} {
        foreach {dummy cmdlinearg(soak)} [split $a =] break
        set ::G(issoak) $cmdlinearg(soak)
      }
      {^-+file-retries=.+$} {
        foreach {dummy cmdlinearg(file-retries)} [split $a =] break
        set ::G(file-retries) $cmdlinearg(file-retries)
      }
      {^-+file-retry-delay=.+$} {
        foreach {dummy cmdlinearg(file-retry-delay)} [split $a =] break
        set ::G(file-retry-delay) $cmdlinearg(file-retry-delay)
      }
      {^-+start=.+$} {
        foreach {dummy cmdlinearg(start)} [split $a =] break

        set ::G(start:file) $cmdlinearg(start)
        if {[regexp {(.*):(.*)} $cmdlinearg(start) -> s.perm s.file]} {
          set ::G(start:permutation) ${s.perm}
          set ::G(start:file)        ${s.file}
        }
        if {$::G(start:file) == ""} {unset ::G(start:file)}
      }
      {^-+match=.+$} {
        foreach {dummy cmdlinearg(match)} [split $a =] break

        set ::G(match) $cmdlinearg(match)
        if {$::G(match) == ""} {unset ::G(match)}
      }

      {^-+output=.+$} {
        foreach {dummy cmdlinearg(output)} [split $a =] break
        set cmdlinearg(output) [file normalize $cmdlinearg(output)]
        if {$cmdlinearg(verbose)==""} {
          set cmdlinearg(verbose) 2
        }
      }
      {^-+verbose=.+$} {
        foreach {dummy cmdlinearg(verbose)} [split $a =] break
        if {$cmdlinearg(verbose)=="file"} {
          set cmdlinearg(verbose) 2
        } elseif {[string is boolean -strict $cmdlinearg(verbose)]==0} {
          error "option --verbose= must be set to a boolean or to \"file\""
        }
      }
      {^-+testdir=.*$} {
        foreach {dummy cmdlinearg(testdir)} [split $a =] break
      }
      {.*help.*} {
         print_help_and_quit
      }
      {^-q$} {
        set cmdlinearg(output) test-out.txt
        set cmdlinearg(verbose) 2
      }

      default {
        if {[file tail $a]==$a} {
          lappend leftover $a
        } else {
          lappend leftover [file normalize $a]
        }
      }
    }
  }
  set testdir [file normalize $testdir]
  set cmdlinearg(TESTFIXTURE_HOME) [pwd]
  set cmdlinearg(INFO_SCRIPT) [file normalize [info script]]
  set argv0 [file normalize $argv0]
  if {$cmdlinearg(testdir)!=""} {
    file mkdir $cmdlinearg(testdir)
    cd $cmdlinearg(testdir)
  }
  set argv $leftover

  # Install the malloc layer used to inject OOM errors. And the 'automatic'
  # extensions. This only needs to be done once for the process.
  #
  sqlite3_shutdown
  install_malloc_faultsim 1
  sqlite3_initialize
  autoinstall_test_functions

  # If the --binarylog option was specified, create the logging VFS. This
  # call installs the new VFS as the default for all SQLite connections.
  #
  if {$cmdlinearg(binarylog)} {
    vfslog new binarylog {} vfslog.bin
  }

  # Set the backtrace depth, if malloc tracing is enabled.
  #
  if {$cmdlinearg(malloctrace)} {
    sqlite3_memdebug_backtrace $cmdlinearg(backtrace)
  }

  if {$cmdlinearg(output)!=""} {
    puts "Copying output to file $cmdlinearg(output)"
    set ::G(output_fd) [open $cmdlinearg(output) w]
    fconfigure $::G(output_fd) -buffering line
  }

  if {$cmdlinearg(verbose)==""} {
    set cmdlinearg(verbose) 1
  }

  if {[info commands vdbe_coverage]!=""} {
    vdbe_coverage start
  }
}

# Update the soft-heap-limit each time this script is run. In that
# way if an individual test file changes the soft-heap-limit, it
# will be reset at the start of the next test file.
#
sqlite3_soft_heap_limit64 $cmdlinearg(soft-heap-limit)
sqlite3_hard_heap_limit64 $cmdlinearg(hard-heap-limit)

# Create a test database
#
proc reset_db {} {
  catch {db close}
  forcedelete test.db
  forcedelete test.db-journal
  forcedelete test.db-wal
  sqlite3 db ./test.db
  set ::DB [sqlite3_connection_pointer db]
  if {[info exists ::SETUP_SQL]} {
    db eval $::SETUP_SQL
  }
}
reset_db

# Abort early if this script has been run before.
#
if {[info exists TC(count)]} return

# Make sure memory statistics are enabled.
#
sqlite3_config_memstatus 1

# Initialize the test counters and set up commands to access them.
# Or, if this is a slave interpreter, set up aliases to write the
# counters in the parent interpreter.
#
if {0==[info exists ::SLAVE]} {
  set TC(errors)    0
  set TC(count)     0
  set TC(fail_list) [list]
  set TC(omit_list) [list]
  set TC(warn_list) [list]

  proc set_test_counter {counter args} {
    if {[llength $args]} {
      set ::TC($counter) [lindex $args 0]
    }
    set ::TC($counter)
  }
}

# Record the fact that a sequence of tests were omitted.
#
proc omit_test {name reason {append 1}} {
  set omitList [set_test_counter omit_list]
  if {$append} {
    lappend omitList [list $name $reason]
  }
  set_test_counter omit_list $omitList
}

# Record the fact that a test failed.
#
proc fail_test {name} {
  set f [set_test_counter fail_list]
  lappend f $name
  set_test_counter fail_list $f
  set_test_counter errors [expr [set_test_counter errors] + 1]

  set nFail [set_test_counter errors]
  if {$nFail>=$::cmdlinearg(maxerror)} {
    output2 "*** Giving up..."
    finalize_testing
  }
}

# Remember a warning message to be displayed at the conclusion of all testing
#
proc warning {msg {append 1}} {
  output2 "Warning: $msg"
  set warnList [set_test_counter warn_list]
  if {$append} {
    lappend warnList $msg
  }
  set_test_counter warn_list $warnList
}


# Increment the number of tests run
#
proc incr_ntest {} {
  set_test_counter count [expr [set_test_counter count] + 1]
}

# Return true if --verbose=1 was specified on the command line. Otherwise,
# return false.
#
proc verbose {} {
  return $::cmdlinearg(verbose)
}

# Use the following commands instead of [puts] for test output within
# this file. Test scripts can still use regular [puts], which is directed
# to stdout and, if one is open, the --output file.
#
# output1: output that should be printed if --verbose=1 was specified.
# output2: output that should be printed unconditionally.
# output2_if_no_verbose: output that should be printed only if --verbose=0.
#
proc output1 {args} {
  set v [verbose]
  if {$v==1} {
    uplevel output2 $args
  } elseif {$v==2} {
    uplevel puts [lrange $args 0 end-1] $::G(output_fd) [lrange $args end end]
  }
}
proc output2 {args} {
  set nArg [llength $args]
  uplevel puts $args
}
proc output2_if_no_verbose {args} {
  set v [verbose]
  if {$v==0} {
    uplevel output2 $args
  } elseif {$v==2} {
    uplevel puts [lrange $args 0 end-1] stdout [lrange $args end end]
  }
}

# Override the [puts] command so that if no channel is explicitly 
# specified the string is written to both stdout and to the file 
# specified by "--output=", if any.
#
proc puts_override {args} {
  set nArg [llength $args]
  if {$nArg==1 || ($nArg==2 && [string first [lindex $args 0] -nonewline]==0)} {
    uplevel puts_original $args
    if {[info exists ::G(output_fd)]} {
      uplevel puts [lrange $args 0 end-1] $::G(output_fd) [lrange $args end end]
    }
  } else {
    # A channel was explicitly specified.
    uplevel puts_original $args
  }
}
rename puts puts_original
proc puts {args} { uplevel puts_override $args }


# Invoke the do_test procedure to run a single test
#
# The $expected parameter is the expected result.  The result is the return
# value from the last TCL command in $cmd.
#
# Normally, $expected must match exactly.  But if $expected is of the form
# "/regexp/" then regular expression matching is used.  If $expected is
# "~/regexp/" then the regular expression must NOT match.  If $expected is
# of the form "#/value-list/" then each term in value-list must be numeric
# and must approximately match the corresponding numeric term in $result.
# Values must match within 10%.  Or if the $expected term is A..B then the
# $result term must be in between A and B.
#
proc do_test {name cmd expected} {
  global argv cmdlinearg

  fix_testname name

  sqlite3_memdebug_settitle $name

#  if {[llength $argv]==0} {
#    set go 1
#  } else {
#    set go 0
#    foreach pattern $argv {
#      if {[string match $pattern $name]} {
#        set go 1
#        break
#      }
#    }
#  }

  if {[info exists ::G(perm:prefix)]} {
    set name "$::G(perm:prefix)$name"
  }

  incr_ntest
  output1 -nonewline $name...
  flush stdout

  if {![info exists ::G(match)] || [string match $::G(match) $name]} {
    if {[catch {uplevel #0 "$cmd;\n"} result]} {
      output2_if_no_verbose -nonewline $name...
      output2 "\nError: $result"
      fail_test $name
    } else {
      if {[permutation]=="maindbname"} {
        set result [string map [list [string tolower ICECUBE] main] $result]
      }
      if {[regexp {^[~#]?/.*/$} $expected]} {
        # "expected" is of the form "/PATTERN/" then the result if correct if
        # regular expression PATTERN matches the result.  "~/PATTERN/" means
        # the regular expression must not match.
        if {[string index $expected 0]=="~"} {
          set re [string range $expected 2 end-1]
          if {[string index $re 0]=="*"} {
            # If the regular expression begins with * then treat it as a glob instead
            set ok [string match $re $result]
          } else {
            set re [string map {# {[-0-9.]+}} $re]
            set ok [regexp $re $result]
          }
          set ok [expr {!$ok}]
        } elseif {[string index $expected 0]=="#"} {
          # Numeric range value comparison.  Each term of the $result is matched
          # against one term of $expect.  Both $result and $expected terms must be
          # numeric.  The values must match within 10%.  Or if $expected is of the
          # form A..B then the $result term must be between A and B.
          set e2 [string range $expected 2 end-1]
          foreach i $result j $e2 {
            if {[regexp {^(-?\d+)\.\.(-?\d)$} $j all A B]} {
              set ok [expr {$i+0>=$A && $i+0<=$B}]
            } else {
              set ok [expr {$i+0>=0.9*$j && $i+0<=1.1*$j}]
            }
            if {!$ok} break
          }
          if {$ok && [llength $result]!=[llength $e2]} {set ok 0}
        } else {
          set re [string range $expected 1 end-1]
          if {[string index $re 0]=="*"} {
            # If the regular expression begins with * then treat it as a glob instead
            set ok [string match $re $result]
          } else {
            set re [string map {# {[-0-9.]+}} $re]
            set ok [regexp $re $result]
          }
        }
      } elseif {[regexp {^~?\*.*\*$} $expected]} {
        # "expected" is of the form "*GLOB*" then the result if correct if
        # glob pattern GLOB matches the result.  "~/GLOB/" means
        # the glob must not match.
        if {[string index $expected 0]=="~"} {
          set e [string range $expected 1 end]
          set ok [expr {![string match $e $result]}]
        } else {
          set ok [string match $expected $result]
        }
      } else {
        set ok [expr {[string compare $result $expected]==0}]
      }
      if {!$ok} {
        # if {![info exists ::testprefix] || $::testprefix eq ""} {
        #   error "no test prefix"
        # }
        output1 ""
        output2 "! $name expected: \[$expected\]\n! $name got:      \[$result\]"
        fail_test $name
      } else {
        output1 " Ok"
      }
    }
  } else {
    output1 " Omitted"
    omit_test $name "pattern mismatch" 0
  }
  flush stdout
}

proc dumpbytes {s} {
  set r ""
  for {set i 0} {$i < [string length $s]} {incr i} {
    if {$i > 0} {append r " "}
    append r [format %02X [scan [string index $s $i] %c]]
  }
  return $r
}

proc catchcmd {db {cmd ""}} {
  global CLI
  set out [open cmds.txt w]
  puts $out $cmd
  close $out
  set line "exec $CLI $db < cmds.txt"
  set rc [catch { eval $line } msg]
  list $rc $msg
}

proc catchcmdex {db {cmd ""}} {
  global CLI
  set out [open cmds.txt w]
  fconfigure $out -encoding binary -translation binary
  puts -nonewline $out $cmd
  close $out
  set line "exec -keepnewline -- $CLI $db < cmds.txt"
  set chans [list stdin stdout stderr]
  foreach chan $chans {
    catch {
      set modes($chan) [fconfigure $chan]
      fconfigure $chan -encoding binary -translation binary -buffering none
    }
  }
  set rc [catch { eval $line } msg]
  foreach chan $chans {
    catch {
      eval fconfigure [list $chan] $modes($chan)
    }
  }
  # puts [dumpbytes $msg]
  list $rc $msg
}

proc filepath_normalize {p} {
  # test cases should be written to assume "unix"-like file paths
  if {$::tcl_platform(platform)!="unix"} {
    # lreverse*2 as a hack to remove any unneeded {} after the string map
    lreverse [lreverse [string map {\\ /} [regsub -nocase -all {[a-z]:[/\\]+} $p {/}]]]
  } {
    set p
  }
}
proc do_filepath_test {name cmd expected} {
  uplevel [list do_test $name [
    subst -nocommands { filepath_normalize [ $cmd ] }
  ] [filepath_normalize $expected]]
}

proc realnum_normalize {r} {
  # different TCL versions display floating point values differently.
  string map {1.#INF inf Inf inf .0e e} [regsub -all {(e[+-])0+} $r {\1}]
}
proc do_realnum_test {name cmd expected} {
  uplevel [list do_test $name [
    subst -nocommands { realnum_normalize [ $cmd ] }
  ] [realnum_normalize $expected]]
}

proc fix_testname {varname} {
  upvar $varname testname
  if {[info exists ::testprefix]
   && [string is digit [string range $testname 0 0]]
  } {
    set testname "${::testprefix}-$testname"
  }
}

proc normalize_list {L} {
  set L2 [list]
  foreach l $L {lappend L2 $l}
  set L2
}

# Either:
#
#   do_execsql_test TESTNAME SQL ?RES?
#   do_execsql_test -db DB TESTNAME SQL ?RES?
#
proc do_execsql_test {args} {
  set db db
  if {[lindex $args 0]=="-db"} {
    set db [lindex $args 1]
    set args [lrange $args 2 end]
  }

  if {[llength $args]==2} {
    foreach {testname sql} $args {}
    set result ""
  } elseif {[llength $args]==3} {
    foreach {testname sql result} $args {}

    # With some versions of Tcl on windows, if $result is all whitespace but
    # contains some CR/LF characters, the [list {*}$result] below returns a
    # copy of $result instead of a zero length string. Not clear exactly why
    # this is. The following is a workaround.
    if {[llength $result]==0} { set result "" }
  } else {
    error [string trim {
      wrong # args: should be "do_execsql_test ?-db DB? testname sql ?result?"
    }]
  }

  fix_testname testname

  uplevel do_test                 \
      [list $testname]            \
      [list "execsql {$sql} $db"] \
      [list [list {*}$result]]
}

proc do_catchsql_test {testname sql result} {
  fix_testname testname
  uplevel do_test [list $testname] [list "catchsql {$sql}"] [list $result]
}
proc do_timed_execsql_test {testname sql {result {}}} {
  fix_testname testname
  uplevel do_test [list $testname] [list "execsql_timed {$sql}"]\
                                   [list [list {*}$result]]
}

# Run an EXPLAIN QUERY PLAN $sql in database "db".  Then rewrite the output
# as an ASCII-art graph and return a string that is that graph.
#
# Hexadecimal literals in the output text are converted into "xxxxxx" since those
# literals are pointer values that might very from one run of the test to the
# next, yet we want the output to be consistent.
#
proc query_plan_graph {sql} {
  db eval "EXPLAIN QUERY PLAN $sql" {
    set dx($id) $detail
    lappend cx($parent) $id
  }
  set a "\n  QUERY PLAN\n"
  append a [append_graph "  " dx cx 0]
  regsub -all { 0x[A-F0-9]+\y} $a { xxxxxx} a
  regsub -all {(MATERIALIZE|CO-ROUTINE|SUBQUERY) \d+\y} $a {\1 xxxxxx} a
  return $a
}

# Helper routine for [query_plan_graph SQL]:
#
# Output rows of the graph that are children of $level.
#
#   prefix:  Prepend to every output line
#
#   dxname:  Name of an array variable that stores text describe
#            The description for $id is $dx($id)
#
#   cxname:  Name of an array variable holding children of item.
#            Children of $id are $cx($id)
#
#   level:   Render all lines that are children of $level
# 
proc append_graph {prefix dxname cxname level} {
  upvar $dxname dx $cxname cx
  set a ""
  set x $cx($level)
  set n [llength $x]
  for {set i 0} {$i<$n} {incr i} {
    set id [lindex $x $i]
    if {$i==$n-1} {
      set p1 "`--"
      set p2 "   "
    } else {
      set p1 "|--"
      set p2 "|  "
    }
    append a $prefix$p1$dx($id)\n
    if {[info exists cx($id)]} {
      append a [append_graph "$prefix$p2" dx cx $id]
    }
  }
  return $a
}

# Do an EXPLAIN QUERY PLAN test on input $sql with expected results $res
#
# If $res begins with a "\s+QUERY PLAN\n" then it is assumed to be the 
# complete graph which must match the output of [query_plan_graph $sql]
# exactly.
#
# If $res does not begin with "\s+QUERY PLAN\n" then take it is a string
# that must be found somewhere in the query plan output.
#
proc do_eqp_test {name sql res} {
  if {[regexp {^\s+QUERY PLAN\n} $res]} {
    uplevel do_test $name [list [list query_plan_graph $sql]] [list $res]
  } else {
    if {[string index $res 0]!="/"} {
      set res "/*$res*/"
    }
    uplevel do_execsql_test $name [list "EXPLAIN QUERY PLAN $sql"] [list $res]
  }
}


#-------------------------------------------------------------------------
#   Usage: do_select_tests PREFIX ?SWITCHES? TESTLIST
#
# Where switches are:
#
#   -errorformat FMTSTRING
#   -count
#   -query SQL
#   -tclquery TCL
#   -repair TCL
#
proc do_select_tests {prefix args} {

  set testlist [lindex $args end]
  set switches [lrange $args 0 end-1]

  set errfmt ""
  set countonly 0
  set tclquery ""
  set repair ""

  for {set i 0} {$i < [llength $switches]} {incr i} {
    set s [lindex $switches $i]
    set n [string length $s]
    if {$n>=2 && [string equal -length $n $s "-query"]} {
      set tclquery [list execsql [lindex $switches [incr i]]]
    } elseif {$n>=2 && [string equal -length $n $s "-tclquery"]} {
      set tclquery [lindex $switches [incr i]]
    } elseif {$n>=2 && [string equal -length $n $s "-errorformat"]} {
      set errfmt [lindex $switches [incr i]]
    } elseif {$n>=2 && [string equal -length $n $s "-repair"]} {
      set repair [lindex $switches [incr i]]
    } elseif {$n>=2 && [string equal -length $n $s "-count"]} {
      set countonly 1
    } else {
      error "unknown switch: $s"
    }
  }

  if {$countonly && $errfmt!=""} {
    error "Cannot use -count and -errorformat together"
  }
  set nTestlist [llength $testlist]
  if {$nTestlist%3 || $nTestlist==0 } {
    error "SELECT test list contains [llength $testlist] elements"
  }

  eval $repair
  foreach {tn sql res} $testlist {
    if {$tclquery != ""} {
      execsql $sql
      uplevel do_test ${prefix}.$tn [list $tclquery] [list [list {*}$res]]
    } elseif {$countonly} {
      set nRow 0
      db eval $sql {incr nRow}
      uplevel do_test ${prefix}.$tn [list [list set {} $nRow]] [list $res]
    } elseif {$errfmt==""} {
      uplevel do_execsql_test ${prefix}.${tn} [list $sql] [list [list {*}$res]]
    } else {
      set res [list 1 [string trim [format $errfmt {*}$res]]]
      uplevel do_catchsql_test ${prefix}.${tn} [list $sql] [list $res]
    }
    eval $repair
  }

}

proc delete_all_data {} {
  db eval {SELECT tbl_name AS t FROM sqlite_master WHERE type = 'table'} {
    db eval "DELETE FROM '[string map {' ''} $t]'"
  }
}

# Run an SQL script.
# Return the number of microseconds per statement.
#
proc speed_trial {name numstmt units sql} {
  output2 -nonewline [format {%-21.21s } $name...]
  flush stdout
  set speed [time {sqlite3_exec_nr db $sql}]
  set tm [lindex $speed 0]
  if {$tm == 0} {
    set rate [format %20s "many"]
  } else {
    set rate [format %20.5f [expr {1000000.0*$numstmt/$tm}]]
  }
  set u2 $units/s
  output2 [format {%12d uS %s %s} $tm $rate $u2]
  global total_time
  set total_time [expr {$total_time+$tm}]
  lappend ::speed_trial_times $name $tm
}
proc speed_trial_tcl {name numstmt units script} {
  output2 -nonewline [format {%-21.21s } $name...]
  flush stdout
  set speed [time {eval $script}]
  set tm [lindex $speed 0]
  if {$tm == 0} {
    set rate [format %20s "many"]
  } else {
    set rate [format %20.5f [expr {1000000.0*$numstmt/$tm}]]
  }
  set u2 $units/s
  output2 [format {%12d uS %s %s} $tm $rate $u2]
  global total_time
  set total_time [expr {$total_time+$tm}]
  lappend ::speed_trial_times $name $tm
}
proc speed_trial_init {name} {
  global total_time
  set total_time 0
  set ::speed_trial_times [list]
  sqlite3 versdb :memory:
  set vers [versdb one {SELECT sqlite_source_id()}]
  versdb close
  output2 "SQLite $vers"
}
proc speed_trial_summary {name} {
  global total_time
  output2 [format {%-21.21s %12d uS TOTAL} $name $total_time]

  if { 0 } {
    sqlite3 versdb :memory:
    set vers [lindex [versdb one {SELECT sqlite_source_id()}] 0]
    versdb close
    output2 "CREATE TABLE IF NOT EXISTS time(version, script, test, us);"
    foreach {test us} $::speed_trial_times {
      output2 "INSERT INTO time VALUES('$vers', '$name', '$test', $us);"
    }
  }
}

# Run this routine last
#
proc finish_test {} {
  catch {db close}
  catch {db1 close}
  catch {db2 close}
  catch {db3 close}
  if {0==[info exists ::SLAVE]} { finalize_testing }
}
proc finalize_testing {} {
  global sqlite_open_file_count

  set omitList [set_test_counter omit_list]

  catch {db close}
  catch {db2 close}
  catch {db3 close}

  vfs_unlink_test
  sqlite3 db {}
  # sqlite3_clear_tsd_memdebug
  db close
  sqlite3_reset_auto_extension

  sqlite3_soft_heap_limit64 0
  sqlite3_hard_heap_limit64 0
  set nTest [incr_ntest]
  set nErr [set_test_counter errors]

  set nKnown 0
  if {[file readable known-problems.txt]} {
    set fd [open known-problems.txt]
    set content [read $fd]
    close $fd
    foreach x $content {set known_error($x) 1}
    foreach x [set_test_counter fail_list] {
      if {[info exists known_error($x)]} {incr nKnown}
    }
  }
  if {$nKnown>0} {
    output2 "[expr {$nErr-$nKnown}] new errors and $nKnown known errors\
         out of $nTest tests"
  } else {
    set cpuinfo {}
    if {[catch {exec hostname} hname]==0} {set cpuinfo [string trim $hname]}
    append cpuinfo " $::tcl_platform(os)"
    append cpuinfo " [expr {$::tcl_platform(pointerSize)*8}]-bit"
    append cpuinfo " [string map {E -e} $::tcl_platform(byteOrder)]"
    output2 "SQLite [sqlite3 -sourceid]"
    output2 "$nErr errors out of $nTest tests on $cpuinfo"
  }
  if {$nErr>$nKnown} {
    output2 -nonewline "!Failures on these tests:"
    foreach x [set_test_counter fail_list] {
      if {![info exists known_error($x)]} {output2 -nonewline " $x"}
    }
    output2 ""
  }
  foreach warning [set_test_counter warn_list] {
    output2 "Warning: $warning"
  }
  run_thread_tests 1
  if {[llength $omitList]>0} {
    output2 "Omitted test cases:"
    set prec {}
    foreach {rec} [lsort $omitList] {
      if {$rec==$prec} continue
      set prec $rec
      output2 [format {.  %-12s %s} [lindex $rec 0] [lindex $rec 1]]
    }
  }
  if {$nErr>0 && ![working_64bit_int]} {
    output2 "******************************************************************"
    output2 "N.B.:  The version of TCL that you used to build this test harness"
    output2 "is defective in that it does not support 64-bit integers.  Some or"
    output2 "all of the test failures above might be a result from this defect"
    output2 "in your TCL build."
    output2 "******************************************************************"
  }
  if {$::cmdlinearg(binarylog)} {
    vfslog finalize binarylog
  }
  if {$sqlite_open_file_count} {
    output2 "$sqlite_open_file_count files were left open"
    incr nErr
  }
  if {[lindex [sqlite3_status SQLITE_STATUS_MALLOC_COUNT 0] 1]>0 ||
              [sqlite3_memory_used]>0} {
    output2 "Unfreed memory: [sqlite3_memory_used] bytes in\
         [lindex [sqlite3_status SQLITE_STATUS_MALLOC_COUNT 0] 1] allocations"
    incr nErr
    ifcapable mem5||(mem3&&debug) {
      output2 "Writing unfreed memory log to \"./memleak.txt\""
      sqlite3_memdebug_dump ./memleak.txt
    }
  } else {
    output2 "All memory allocations freed - no leaks"
    ifcapable mem5 {
      sqlite3_memdebug_dump ./memusage.txt
    }
  }
  show_memstats
  output2 "Maximum memory usage: [sqlite3_memory_highwater 1] bytes"
  output2 "Current memory usage: [sqlite3_memory_highwater] bytes"
  if {[info commands sqlite3_memdebug_malloc_count] ne ""} {
    output2 "Number of malloc()  : [sqlite3_memdebug_malloc_count] calls"
  }
  if {$::cmdlinearg(malloctrace)} {
    output2 "Writing mallocs.tcl..."
    memdebug_log_sql mallocs.tcl
    sqlite3_memdebug_log stop
    sqlite3_memdebug_log clear
    if {[sqlite3_memory_used]>0} {
      output2 "Writing leaks.tcl..."
      sqlite3_memdebug_log sync
      memdebug_log_sql leaks.tcl
    }
  }
  if {[info commands vdbe_coverage]!=""} {
    vdbe_coverage_report
  }
  foreach f [glob -nocomplain test.db-*-journal] {
    forcedelete $f
  }
  foreach f [glob -nocomplain test.db-mj*] {
    forcedelete $f
  }
  exit [expr {$nErr>0}]
}

proc vdbe_coverage_report {} {
  puts "Writing vdbe coverage report to vdbe_coverage.txt"
  set lSrc [list]
  set iLine 0
  if {[file exists ../sqlite3.c]} {
    set fd [open ../sqlite3.c]
    set iLine
    while { ![eof $fd] } {
      set line [gets $fd]
      incr iLine
      if {[regexp {^/\** Begin file (.*\.c) \**/} $line -> file]} {
        lappend lSrc [list $iLine $file]
      }
    }
    close $fd
  }
  set fd [open vdbe_coverage.txt w]
  foreach miss [vdbe_coverage report] {
    foreach {line branch never} $miss {}
    set nextfile ""
    while {[llength $lSrc]>0 && [lindex $lSrc 0 0] < $line} {
      set nextfile [lindex $lSrc 0 1]
      set lSrc [lrange $lSrc 1 end]
    }
    if {$nextfile != ""} {
      puts $fd ""
      puts $fd "### $nextfile ###"
    }
    puts $fd "Vdbe branch $line: never $never (path $branch)"
  }
  close $fd
}

# Display memory statistics for analysis and debugging purposes.
#
proc show_memstats {} {
  set x [sqlite3_status SQLITE_STATUS_MEMORY_USED 0]
  set y [sqlite3_status SQLITE_STATUS_MALLOC_SIZE 0]
  set val [format {now %10d  max %10d  max-size %10d} \
              [lindex $x 1] [lindex $x 2] [lindex $y 2]]
  output1 "Memory used:          $val"
  set x [sqlite3_status SQLITE_STATUS_MALLOC_COUNT 0]
  set val [format {now %10d  max %10d} [lindex $x 1] [lindex $x 2]]
  output1 "Allocation count:     $val"
  set x [sqlite3_status SQLITE_STATUS_PAGECACHE_USED 0]
  set y [sqlite3_status SQLITE_STATUS_PAGECACHE_SIZE 0]
  set val [format {now %10d  max %10d  max-size %10d} \
              [lindex $x 1] [lindex $x 2] [lindex $y 2]]
  output1 "Page-cache used:      $val"
  set x [sqlite3_status SQLITE_STATUS_PAGECACHE_OVERFLOW 0]
  set val [format {now %10d  max %10d} [lindex $x 1] [lindex $x 2]]
  output1 "Page-cache overflow:  $val"
  ifcapable yytrackmaxstackdepth {
    set x [sqlite3_status SQLITE_STATUS_PARSER_STACK 0]
    set val [format {               max %10d} [lindex $x 2]]
    output2 "Parser stack depth:    $val"
  }
}

# A procedure to execute SQL
#
proc execsql {sql {db db}} {
  # puts "SQL = $sql"
  uplevel [list $db eval $sql]
}
proc execsql_timed {sql {db db}} {
  set tm [time {
    set x [uplevel [list $db eval $sql]]
  } 1]
  set tm [lindex $tm 0]
  output1 -nonewline " ([expr {$tm*0.001}]ms) "
  set x
}

# Execute SQL and catch exceptions.
#
proc catchsql {sql {db db}} {
  # puts "SQL = $sql"
  set r [catch [list uplevel [list $db eval $sql]] msg]
  lappend r $msg
  return $r
}

# Do an VDBE code dump on the SQL given
#
proc explain {sql {db db}} {
  output2 ""
  output2 "addr  opcode        p1      p2      p3      p4               p5  #"
  output2 "----  ------------  ------  ------  ------  ---------------  --  -"
  $db eval "explain $sql" {} {
    output2 [format {%-4d  %-12.12s  %-6d  %-6d  %-6d  % -17s %s  %s} \
      $addr $opcode $p1 $p2 $p3 $p4 $p5 $comment
    ]
  }
}

proc explain_i {sql {db db}} {
  output2 ""
  output2 "addr  opcode        p1      p2      p3      p4                p5  #"
  output2 "----  ------------  ------  ------  ------  ----------------  --  -"


  # Set up colors for the different opcodes. Scheme is as follows:
  #
  #   Red:   Opcodes that write to a b-tree.
  #   Blue:  Opcodes that reposition or seek a cursor. 
  #   Green: The ResultRow opcode.
  #
  if { [catch {fconfigure stdout -mode}]==0 } {
    set R "\033\[31;1m"        ;# Red fg
    set G "\033\[32;1m"        ;# Green fg
    set B "\033\[34;1m"        ;# Red fg
    set D "\033\[39;0m"        ;# Default fg
  } else {
    set R ""
    set G ""
    set B ""
    set D ""
  }
  foreach opcode {
      Seek SeekGE SeekGT SeekLE SeekLT NotFound Last Rewind
      NoConflict Next Prev VNext VPrev VFilter
      SorterSort SorterNext NextIfOpen
  } {
    set color($opcode) $B
  }
  foreach opcode {ResultRow} {
    set color($opcode) $G
  }
  foreach opcode {IdxInsert Insert Delete IdxDelete} {
    set color($opcode) $R
  }

  set bSeenGoto 0
  $db eval "explain $sql" {} {
    set x($addr) 0
    set op($addr) $opcode

    if {$opcode == "Goto" && ($bSeenGoto==0 || ($p2 > $addr+10))} {
      set linebreak($p2) 1
      set bSeenGoto 1
    }

    if {$opcode=="Once"} {
      for {set i $addr} {$i<$p2} {incr i} {
        set star($i) $addr
      }
    }

    if {$opcode=="Next"  || $opcode=="Prev" 
     || $opcode=="VNext" || $opcode=="VPrev"
     || $opcode=="SorterNext" || $opcode=="NextIfOpen"
    } {
      for {set i $p2} {$i<$addr} {incr i} {
        incr x($i) 2
      }
    }

    if {$opcode == "Goto" && $p2<$addr && $op($p2)=="Yield"} {
      for {set i [expr $p2+1]} {$i<$addr} {incr i} {
        incr x($i) 2
      }
    }

    if {$opcode == "Halt" && $comment == "End of coroutine"} {
      set linebreak([expr $addr+1]) 1
    }
  }

  $db eval "explain $sql" {} {
    if {[info exists linebreak($addr)]} {
      output2 ""
    }
    set I [string repeat " " $x($addr)]

    if {[info exists star($addr)]} {
      set ii [expr $x($star($addr))]
      append I "  "
      set I [string replace $I $ii $ii *]
    }

    set col ""
    catch { set col $color($opcode) }

    output2 [format {%-4d  %s%s%-12.12s%s  %-6d  %-6d  %-6d  % -17s %s  %s} \
      $addr $I $col $opcode $D $p1 $p2 $p3 $p4 $p5 $comment
    ]
  }
  output2 "----  ------------  ------  ------  ------  ----------------  --  -"
}

# Show the VDBE program for an SQL statement but omit the Trace
# opcode at the beginning.  This procedure can be used to prove
# that different SQL statements generate exactly the same VDBE code.
#
proc explain_no_trace {sql} {
  set tr [db eval "EXPLAIN $sql"]
  return [lrange $tr 7 end]
}

# Another procedure to execute SQL.  This one includes the field
# names in the returned list.
#
proc execsql2 {sql} {
  set result {}
  db eval $sql data {
    foreach f $data(*) {
      lappend result $f $data($f)
    }
  }
  return $result
}

# Use a temporary in-memory database to execute SQL statements
#
proc memdbsql {sql} {
  sqlite3 memdb :memory:
  set result [memdb eval $sql]
  memdb close
  return $result
}

# Use the non-callback API to execute multiple SQL statements
#
proc stepsql {dbptr sql} {
  set sql [string trim $sql]
  set r 0
  while {[string length $sql]>0} {
    if {[catch {sqlite3_prepare $dbptr $sql -1 sqltail} vm]} {
      return [list 1 $vm]
    }
    set sql [string trim $sqltail]
#    while {[sqlite_step $vm N VAL COL]=="SQLITE_ROW"} {
#      foreach v $VAL {lappend r $v}
#    }
    while {[sqlite3_step $vm]=="SQLITE_ROW"} {
      for {set i 0} {$i<[sqlite3_data_count $vm]} {incr i} {
        lappend r [sqlite3_column_text $vm $i]
      }
    }
    if {[catch {sqlite3_finalize $vm} errmsg]} {
      return [list 1 $errmsg]
    }
  }
  return $r
}

# Do an integrity check of the entire database
#
proc integrity_check {name {db db}} {
  ifcapable integrityck {
    do_test $name [list execsql {PRAGMA integrity_check} $db] {ok}
  }
}

# Check the extended error code
#
proc verify_ex_errcode {name expected {db db}} {
  do_test $name [list sqlite3_extended_errcode $db] $expected
}


# Return true if the SQL statement passed as the second argument uses a
# statement transaction.
#
proc sql_uses_stmt {db sql} {
  set stmt [sqlite3_prepare $db $sql -1 dummy]
  set uses [uses_stmt_journal $stmt]
  sqlite3_finalize $stmt
  return $uses
}

proc fix_ifcapable_expr {expr} {
  set ret ""
  set state 0
  for {set i 0} {$i < [string length $expr]} {incr i} {
    set char [string range $expr $i $i]
    set newstate [expr {[string is alnum $char] || $char eq "_"}]
    if {$newstate && !$state} {
      append ret {$::sqlite_options(}
    }
    if {!$newstate && $state} {
      append ret )
    }
    append ret $char
    set state $newstate
  }
  if {$state} {append ret )}
  return $ret
}

# Returns non-zero if the capabilities are present; zero otherwise.
#
proc capable {expr} {
  set e [fix_ifcapable_expr $expr]; return [expr ($e)]
}

# Evaluate a boolean expression of capabilities.  If true, execute the
# code.  Omit the code if false.
#
proc ifcapable {expr code {else ""} {elsecode ""}} {
  #regsub -all {[a-z_0-9]+} $expr {$::sqlite_options(&)} e2
  set e2 [fix_ifcapable_expr $expr]
  if ($e2) {
    set c [catch {uplevel 1 $code} r]
  } else {
    set c [catch {uplevel 1 $elsecode} r]
  }
  return -code $c $r
}

# This proc execs a seperate process that crashes midway through executing
# the SQL script $sql on database test.db.
#
# The crash occurs during a sync() of file $crashfile. When the crash
# occurs a random subset of all unsynced writes made by the process are
# written into the files on disk. Argument $crashdelay indicates the
# number of file syncs to wait before crashing.
#
# The return value is a list of two elements. The first element is a
# boolean, indicating whether or not the process actually crashed or
# reported some other error. The second element in the returned list is the
# error message. This is "child process exited abnormally" if the crash
# occurred.
#
#   crashsql -delay CRASHDELAY -file CRASHFILE ?-blocksize BLOCKSIZE? $sql
#
proc crashsql {args} {

  set blocksize ""
  set crashdelay 1
  set prngseed 0
  set opendb { sqlite3 db test.db -vfs crash }
  set tclbody {}
  set crashfile ""
  set dc ""
  set dfltvfs 0
  set sql [lindex $args end]

  for {set ii 0} {$ii < [llength $args]-1} {incr ii 2} {
    set z [lindex $args $ii]
    set n [string length $z]
    set z2 [lindex $args [expr $ii+1]]

    if     {$n>1 && [string first $z -delay]==0}     {set crashdelay $z2} \
    elseif {$n>1 && [string first $z -opendb]==0}    {set opendb $z2} \
    elseif {$n>1 && [string first $z -seed]==0}      {set prngseed $z2} \
    elseif {$n>1 && [string first $z -file]==0}      {set crashfile $z2}  \
    elseif {$n>1 && [string first $z -tclbody]==0}   {set tclbody $z2}  \
    elseif {$n>1 && [string first $z -blocksize]==0} {set blocksize "-s $z2" } \
    elseif {$n>1 && [string first $z -characteristics]==0} {set dc "-c {$z2}" }\
    elseif {$n>1 && [string first $z -dfltvfs]==0} {set dfltvfs $z2 }\
    else   { error "Unrecognized option: $z" }
  }

  if {$crashfile eq ""} {
    error "Compulsory option -file missing"
  }

  # $crashfile gets compared to the native filename in
  # cfSync(), which can be different then what TCL uses by
  # default, so here we force it to the "nativename" format.
  set cfile [string map {\\ \\\\} [file nativename [file join [get_pwd] $crashfile]]]

  set f [open crash.tcl w]
  puts $f "sqlite3_crash_enable 1 $dfltvfs"
  puts $f "sqlite3_crashparams $blocksize $dc $crashdelay $cfile"
  puts $f "sqlite3_test_control_pending_byte $::sqlite_pending_byte"

  # This block sets the cache size of the main database to 10
  # pages. This is done in case the build is configured to omit
  # "PRAGMA cache_size".
  if {$opendb!=""} {
    puts $f $opendb 
    puts $f {db eval {SELECT * FROM sqlite_master;}}
    puts $f {set bt [btree_from_db db]}
    puts $f {btree_set_cache_size $bt 10}
  }

  if {$prngseed} {
    set seed [expr {$prngseed%10007+1}]
    # puts seed=$seed
    puts $f "db eval {SELECT randomblob($seed)}"
  }

  if {[string length $tclbody]>0} {
    puts $f $tclbody
  }
  if {[string length $sql]>0} {
    puts $f "db eval {"
    puts $f   "$sql"
    puts $f "}"
  }
  close $f
  set r [catch {
    exec [info nameofexec] crash.tcl >@stdout
  } msg]

  # Windows/ActiveState TCL returns a slightly different
  # error message.  We map that to the expected message
  # so that we don't have to change all of the test
  # cases.
  if {$::tcl_platform(platform)=="windows"} {
    if {$msg=="child killed: unknown signal"} {
      set msg "child process exited abnormally"
    }
  }

  lappend r $msg
}

#   crash_on_write ?-devchar DEVCHAR? CRASHDELAY SQL
#
proc crash_on_write {args} {

  set nArg [llength $args]
  if {$nArg<2 || $nArg%2} {
    error "bad args: $args"
  }
  set zSql [lindex $args end]
  set nDelay [lindex $args end-1]

  set devchar {}
  for {set ii 0} {$ii < $nArg-2} {incr ii 2} {
    set opt [lindex $args $ii]
    switch -- [lindex $args $ii] {
      -devchar {
        set devchar [lindex $args [expr $ii+1]]
      }

      default { error "unrecognized option: $opt" }
    }
  }

  set f [open crash.tcl w]
  puts $f "sqlite3_crash_on_write $nDelay"
  puts $f "sqlite3_test_control_pending_byte $::sqlite_pending_byte"
  puts $f "sqlite3 db test.db -vfs writecrash"
  puts $f "db eval {$zSql}"
  puts $f "set {} {}"

  close $f
  set r [catch {
    exec [info nameofexec] crash.tcl >@stdout
  } msg]

  # Windows/ActiveState TCL returns a slightly different
  # error message.  We map that to the expected message
  # so that we don't have to change all of the test
  # cases.
  if {$::tcl_platform(platform)=="windows"} {
    if {$msg=="child killed: unknown signal"} {
      set msg "child process exited abnormally"
    }
  }

  lappend r $msg
}

proc run_ioerr_prep {} {
  set ::sqlite_io_error_pending 0
  catch {db close}
  catch {db2 close}
  catch {forcedelete test.db}
  catch {forcedelete test.db-journal}
  catch {forcedelete test2.db}
  catch {forcedelete test2.db-journal}
  set ::DB [sqlite3 db test.db; sqlite3_connection_pointer db]
  sqlite3_extended_result_codes $::DB $::ioerropts(-erc)
  if {[info exists ::ioerropts(-tclprep)]} {
    eval $::ioerropts(-tclprep)
  }
  if {[info exists ::ioerropts(-sqlprep)]} {
    execsql $::ioerropts(-sqlprep)
  }
  expr 0
}

# Usage: do_ioerr_test <test number> <options...>
#
# This proc is used to implement test cases that check that IO errors
# are correctly handled. The first argument, <test number>, is an integer
# used to name the tests executed by this proc. Options are as follows:
#
#     -tclprep          TCL script to run to prepare test.
#     -sqlprep          SQL script to run to prepare test.
#     -tclbody          TCL script to run with IO error simulation.
#     -sqlbody          TCL script to run with IO error simulation.
#     -exclude          List of 'N' values not to test.
#     -erc              Use extended result codes
#     -persist          Make simulated I/O errors persistent
#     -start            Value of 'N' to begin with (default 1)
#
#     -cksum            Boolean. If true, test that the database does
#                       not change during the execution of the test case.
#
proc do_ioerr_test {testname args} {

  set ::ioerropts(-start) 1
  set ::ioerropts(-cksum) 0
  set ::ioerropts(-erc) 0
  set ::ioerropts(-count) 100000000
  set ::ioerropts(-persist) 1
  set ::ioerropts(-ckrefcount) 0
  set ::ioerropts(-restoreprng) 1
  array set ::ioerropts $args

  # TEMPORARY: For 3.5.9, disable testing of extended result codes. There are
  # a couple of obscure IO errors that do not return them.
  set ::ioerropts(-erc) 0

  # Create a single TCL script from the TCL and SQL specified
  # as the body of the test.
  set ::ioerrorbody {}
  if {[info exists ::ioerropts(-tclbody)]} {
    append ::ioerrorbody "$::ioerropts(-tclbody)\n"
  }
  if {[info exists ::ioerropts(-sqlbody)]} {
    append ::ioerrorbody "db eval {$::ioerropts(-sqlbody)}"
  }

  save_prng_state
  if {$::ioerropts(-cksum)} {
    run_ioerr_prep
    eval $::ioerrorbody
    set ::goodcksum [cksum]
  }

  set ::go 1
  #reset_prng_state
  for {set n $::ioerropts(-start)} {$::go} {incr n} {
    set ::TN $n
    incr ::ioerropts(-count) -1
    if {$::ioerropts(-count)<0} break

    # Skip this IO error if it was specified with the "-exclude" option.
    if {[info exists ::ioerropts(-exclude)]} {
      if {[lsearch $::ioerropts(-exclude) $n]!=-1} continue
    }
    if {$::ioerropts(-restoreprng)} {
      restore_prng_state
    }

    # Delete the files test.db and test2.db, then execute the TCL and
    # SQL (in that order) to prepare for the test case.
    do_test $testname.$n.1 {
      run_ioerr_prep
    } {0}

    # Read the 'checksum' of the database.
    if {$::ioerropts(-cksum)} {
      set ::checksum [cksum]
    }

    # Set the Nth IO error to fail.
    do_test $testname.$n.2 [subst {
      set ::sqlite_io_error_persist $::ioerropts(-persist)
      set ::sqlite_io_error_pending $n
    }] $n

    # Execute the TCL script created for the body of this test. If
    # at least N IO operations performed by SQLite as a result of
    # the script, the Nth will fail.
    do_test $testname.$n.3 {
      set ::sqlite_io_error_hit 0
      set ::sqlite_io_error_hardhit 0
      set r [catch $::ioerrorbody msg]
      set ::errseen $r
      set rc [sqlite3_errcode $::DB]
      if {$::ioerropts(-erc)} {
        # If we are in extended result code mode, make sure all of the
        # IOERRs we get back really do have their extended code values.
        # If an extended result code is returned, the sqlite3_errcode
        # TCLcommand will return a string of the form:  SQLITE_IOERR+nnnn
        # where nnnn is a number
        if {[regexp {^SQLITE_IOERR} $rc] && ![regexp {IOERR\+\d} $rc]} {
          return $rc
        }
      } else {
        # If we are not in extended result code mode, make sure no
        # extended error codes are returned.
        if {[regexp {\+\d} $rc]} {
          return $rc
        }
      }
      # The test repeats as long as $::go is non-zero.  $::go starts out
      # as 1.  When a test runs to completion without hitting an I/O
      # error, that means there is no point in continuing with this test
      # case so set $::go to zero.
      #
      if {$::sqlite_io_error_pending>0} {
        set ::go 0
        set q 0
        set ::sqlite_io_error_pending 0
      } else {
        set q 1
      }

      set s [expr $::sqlite_io_error_hit==0]
      if {$::sqlite_io_error_hit>$::sqlite_io_error_hardhit && $r==0} {
        set r 1
      }
      set ::sqlite_io_error_hit 0

      # One of two things must have happened. either
      #   1.  We never hit the IO error and the SQL returned OK
      #   2.  An IO error was hit and the SQL failed
      #
      #puts "s=$s r=$r q=$q"
      expr { ($s && !$r && !$q) || (!$s && $r && $q) }
    } {1}

    set ::sqlite_io_error_hit 0
    set ::sqlite_io_error_pending 0

    # Check that no page references were leaked. There should be
    # a single reference if there is still an active transaction,
    # or zero otherwise.
    #
    # UPDATE: If the IO error occurs after a 'BEGIN' but before any
    # locks are established on database files (i.e. if the error
    # occurs while attempting to detect a hot-journal file), then
    # there may 0 page references and an active transaction according
    # to [sqlite3_get_autocommit].
    #
    if {$::go && $::sqlite_io_error_hardhit && $::ioerropts(-ckrefcount)} {
      do_test $testname.$n.4 {
        set bt [btree_from_db db]
        db_enter db
        array set stats [btree_pager_stats $bt]
        db_leave db
        set nRef $stats(ref)
        expr {$nRef == 0 || ([sqlite3_get_autocommit db]==0 && $nRef == 1)}
      } {1}
    }

    # If there is an open database handle and no open transaction,
    # and the pager is not running in exclusive-locking mode,
    # check that the pager is in "unlocked" state. Theoretically,
    # if a call to xUnlock() failed due to an IO error the underlying
    # file may still be locked.
    #
    ifcapable pragma {
      if { [info commands db] ne ""
        && $::ioerropts(-ckrefcount)
        && [db one {pragma locking_mode}] eq "normal"
        && [sqlite3_get_autocommit db]
      } {
        do_test $testname.$n.5 {
          set bt [btree_from_db db]
          db_enter db
          array set stats [btree_pager_stats $bt]
          db_leave db
          set stats(state)
        } 0
      }
    }

    # If an IO error occurred, then the checksum of the database should
    # be the same as before the script that caused the IO error was run.
    #
    if {$::go && $::sqlite_io_error_hardhit && $::ioerropts(-cksum)} {
      do_test $testname.$n.6 {
        catch {db close}
        catch {db2 close}
        set ::DB [sqlite3 db test.db; sqlite3_connection_pointer db]
        set nowcksum [cksum]
        set res [expr {$nowcksum==$::checksum || $nowcksum==$::goodcksum}]
        if {$res==0} {
          output2 "now=$nowcksum"
          output2 "the=$::checksum"
          output2 "fwd=$::goodcksum"
        }
        set res
      } 1
    }

    set ::sqlite_io_error_hardhit 0
    set ::sqlite_io_error_pending 0
    if {[info exists ::ioerropts(-cleanup)]} {
      catch $::ioerropts(-cleanup)
    }
  }
  set ::sqlite_io_error_pending 0
  set ::sqlite_io_error_persist 0
  unset ::ioerropts
}

# Return a checksum based on the contents of the main database associated
# with connection $db
#
proc cksum {{db db}} {
  set txt [$db eval {
      SELECT name, type, sql FROM sqlite_master order by name
  }]\n
  foreach tbl [$db eval {
      SELECT name FROM sqlite_master WHERE type='table' order by name
  }] {
    append txt [$db eval "SELECT * FROM $tbl"]\n
  }
  foreach prag {default_synchronous default_cache_size} {
    append txt $prag-[$db eval "PRAGMA $prag"]\n
  }
  set cksum [string length $txt]-[md5 $txt]
  # puts $cksum-[file size test.db]
  return $cksum
}

# Generate a checksum based on the contents of the main and temp tables
# database $db. If the checksum of two databases is the same, and the
# integrity-check passes for both, the two databases are identical.
#
proc allcksum {{db db}} {
  set ret [list]
  ifcapable tempdb {
    set sql {
      SELECT name FROM sqlite_master WHERE type = 'table' UNION
      SELECT name FROM sqlite_temp_master WHERE type = 'table' UNION
      SELECT 'sqlite_master' UNION
      SELECT 'sqlite_temp_master' ORDER BY 1
    }
  } else {
    set sql {
      SELECT name FROM sqlite_master WHERE type = 'table' UNION
      SELECT 'sqlite_master' ORDER BY 1
    }
  }
  set tbllist [$db eval $sql]
  set txt {}
  foreach tbl $tbllist {
    append txt [$db eval "SELECT * FROM $tbl"]
  }
  foreach prag {default_cache_size} {
    append txt $prag-[$db eval "PRAGMA $prag"]\n
  }
  # puts txt=$txt
  return [md5 $txt]
}

# Generate a checksum based on the contents of a single database with
# a database connection.  The name of the database is $dbname.
# Examples of $dbname are "temp" or "main".
#
proc dbcksum {db dbname} {
  if {$dbname=="temp"} {
    set master sqlite_temp_master
  } else {
    set master $dbname.sqlite_master
  }
  set alltab [$db eval "SELECT name FROM $master WHERE type='table'"]
  set txt [$db eval "SELECT * FROM $master"]\n
  foreach tab $alltab {
    append txt [$db eval "SELECT * FROM $dbname.$tab"]\n
  }
  return [md5 $txt]
}

proc memdebug_log_sql {filename} {

  set data [sqlite3_memdebug_log dump]
  set nFrame [expr [llength [lindex $data 0]]-2]
  if {$nFrame < 0} { return "" }

  set database temp

  set tbl "CREATE TABLE ${database}.malloc(zTest, nCall, nByte, lStack);"

  set sql ""
  foreach e $data {
    set nCall [lindex $e 0]
    set nByte [lindex $e 1]
    set lStack [lrange $e 2 end]
    append sql "INSERT INTO ${database}.malloc VALUES"
    append sql "('test', $nCall, $nByte, '$lStack');\n"
    foreach f $lStack {
      set frames($f) 1
    }
  }

  set tbl2 "CREATE TABLE ${database}.frame(frame INTEGER PRIMARY KEY, line);\n"
  set tbl3 "CREATE TABLE ${database}.file(name PRIMARY KEY, content);\n"

  set pid [pid]

  foreach f [array names frames] {
    set addr [format %x $f]
    set cmd "eu-addr2line --pid=$pid $addr"
    set line [eval exec $cmd]
    append sql "INSERT INTO ${database}.frame VALUES($f, '$line');\n"

    set file [lindex [split $line :] 0]
    set files($file) 1
  }

  foreach f [array names files] {
    set contents ""
    catch {
      set fd [open $f]
      set contents [read $fd]
      close $fd
    }
    set contents [string map {' ''} $contents]
    append sql "INSERT INTO ${database}.file VALUES('$f', '$contents');\n"
  }

  set escaped "BEGIN; ${tbl}${tbl2}${tbl3}${sql} ; COMMIT;"
  set escaped [string map [list "{" "\\{" "}" "\\}"] $escaped] 

  set fd [open $filename w]
  puts $fd "set BUILTIN {"
  puts $fd $escaped
  puts $fd "}"
  puts $fd {set BUILTIN [string map [list "\\{" "{" "\\}" "}"] $BUILTIN]}
  set mtv [open $::testdir/malloctraceviewer.tcl]
  set txt [read $mtv]
  close $mtv
  puts $fd $txt
  close $fd
}

# Drop all tables in database [db]
proc drop_all_tables {{db db}} {
  ifcapable trigger&&foreignkey {
    set pk [$db one "PRAGMA foreign_keys"]
    $db eval "PRAGMA foreign_keys = OFF"
  }
  foreach {idx name file} [db eval {PRAGMA database_list}] {
    if {$idx==1} {
      set master sqlite_temp_master
    } else {
      set master $name.sqlite_master
    }
    foreach {t type} [$db eval "
      SELECT name, type FROM $master
      WHERE type IN('table', 'view') AND name NOT LIKE 'sqliteX_%' ESCAPE 'X'
    "] {
      $db eval "DROP $type \"$t\""
    }
  }
  ifcapable trigger&&foreignkey {
    $db eval "PRAGMA foreign_keys = $pk"
  }
}

# Drop all auxiliary indexes from the main database opened by handle [db].
#
proc drop_all_indexes {{db db}} {
  set L [$db eval {
    SELECT name FROM sqlite_master WHERE type='index' AND sql LIKE 'create%'
  }]
  foreach idx $L { $db eval "DROP INDEX $idx" }
}


#-------------------------------------------------------------------------
# If a test script is executed with global variable $::G(perm:name) set to
# "wal", then the tests are run in WAL mode. Otherwise, they should be run
# in rollback mode. The following Tcl procs are used to make this less
# intrusive:
#
#   wal_set_journal_mode ?DB?
#
#     If running a WAL test, execute "PRAGMA journal_mode = wal" using
#     connection handle DB. Otherwise, this command is a no-op.
#
#   wal_check_journal_mode TESTNAME ?DB?
#
#     If running a WAL test, execute a tests case that fails if the main
#     database for connection handle DB is not currently a WAL database.
#     Otherwise (if not running a WAL permutation) this is a no-op.
#
#   wal_is_wal_mode
#
#     Returns true if this test should be run in WAL mode. False otherwise.
#
proc wal_is_wal_mode {} {
  expr {[permutation] eq "wal"}
}
proc wal_set_journal_mode {{db db}} {
  if { [wal_is_wal_mode] } {
    $db eval "PRAGMA journal_mode = WAL"
  }
}
proc wal_check_journal_mode {testname {db db}} {
  if { [wal_is_wal_mode] } {
    $db eval { SELECT * FROM sqlite_master }
    do_test $testname [list $db eval "PRAGMA main.journal_mode"] {wal}
  }
}

proc wal_is_capable {} {
  ifcapable !wal { return 0 }
  if {[permutation]=="journaltest"} { return 0 }
  return 1
}

proc permutation {} {
  set perm ""
  catch {set perm $::G(perm:name)}
  set perm
}
proc presql {} {
  set presql ""
  catch {set presql $::G(perm:presql)}
  set presql
}

proc isquick {} {
  set ret 0
  catch {set ret $::G(isquick)}
  set ret
}

#-------------------------------------------------------------------------
#
proc slave_test_script {script} {

  # Create the interpreter used to run the test script.
  interp create tinterp

  # Populate some global variables that tester.tcl expects to see.
  foreach {var value} [list              \
    ::argv0 $::argv0                     \
    ::argv  {}                           \
    ::SLAVE 1                            \
  ] {
    interp eval tinterp [list set $var $value]
  }

  # If output is being copied into a file, share the file-descriptor with
  # the interpreter.
  if {[info exists ::G(output_fd)]} {
    interp share {} $::G(output_fd) tinterp
  }

  # The alias used to access the global test counters.
  tinterp alias set_test_counter set_test_counter

  # Set up the ::cmdlinearg array in the slave.
  interp eval tinterp [list array set ::cmdlinearg [array get ::cmdlinearg]]

  # Set up the ::G array in the slave.
  interp eval tinterp [list array set ::G [array get ::G]]

  # Load the various test interfaces implemented in C.
  load_testfixture_extensions tinterp

  # Run the test script.
  interp eval tinterp $script

  # Check if the interpreter call [run_thread_tests]
  if { [interp eval tinterp {info exists ::run_thread_tests_called}] } {
    set ::run_thread_tests_called 1
  }

  # Delete the interpreter used to run the test script.
  interp delete tinterp
}

proc slave_test_file {zFile} {
  set tail [file tail $zFile]

  if {[info exists ::G(start:permutation)]} {
    if {[permutation] != $::G(start:permutation)} return
    unset ::G(start:permutation)
  }
  if {[info exists ::G(start:file)]} {
    if {$tail != $::G(start:file) && $tail!="$::G(start:file).test"} return
    unset ::G(start:file)
  }

  # Remember the value of the shared-cache setting. So that it is possible
  # to check afterwards that it was not modified by the test script.
  #
  ifcapable shared_cache { set scs [sqlite3_enable_shared_cache] }

  # Run the test script in a slave interpreter.
  #
  unset -nocomplain ::run_thread_tests_called
  reset_prng_state
  set ::sqlite_open_file_count 0
  set time [time { slave_test_script [list source $zFile] }]
  set ms [expr [lindex $time 0] / 1000]

  # Test that all files opened by the test script were closed. Omit this
  # if the test script has "thread" in its name. The open file counter
  # is not thread-safe.
  #
  if {[info exists ::run_thread_tests_called]==0} {
    do_test ${tail}-closeallfiles { expr {$::sqlite_open_file_count>0} } {0}
  }
  set ::sqlite_open_file_count 0

  # Test that the global "shared-cache" setting was not altered by
  # the test script.
  #
  ifcapable shared_cache {
    set res [expr {[sqlite3_enable_shared_cache] == $scs}]
    do_test ${tail}-sharedcachesetting [list set {} $res] 1
  }

  # Add some info to the output.
  #
  output2 "Time: $tail $ms ms"
  show_memstats
}

# Open a new connection on database test.db and execute the SQL script
# supplied as an argument. Before returning, close the new conection and
# restore the 4 byte fields starting at header offsets 28, 92 and 96
# to the values they held before the SQL was executed. This simulates
# a write by a pre-3.7.0 client.
#
proc sql36231 {sql} {
  set B [hexio_read test.db 92 8]
  set A [hexio_read test.db 28 4]
  sqlite3 db36231 test.db
  catch { db36231 func a_string a_string }
  execsql $sql db36231
  db36231 close
  hexio_write test.db 28 $A
  hexio_write test.db 92 $B
  return ""
}

proc db_save {} {
  foreach f [glob -nocomplain sv_test.db*] { forcedelete $f }
  foreach f [glob -nocomplain test.db*] {
    set f2 "sv_$f"
    forcecopy $f $f2
  }
}
proc db_save_and_close {} {
  db_save
  catch { db close }
  return ""
}
proc db_restore {} {
  foreach f [glob -nocomplain test.db*] { forcedelete $f }
  foreach f2 [glob -nocomplain sv_test.db*] {
    set f [string range $f2 3 end]
    forcecopy $f2 $f
  }
}
proc db_restore_and_reopen {{dbfile test.db}} {
  catch { db close }
  db_restore
  sqlite3 db $dbfile
}
proc db_delete_and_reopen {{file test.db}} {
  catch { db close }
  foreach f [glob -nocomplain test.db*] { forcedelete $f }
  sqlite3 db $file
}

# Close any connections named [db], [db2] or [db3]. Then use sqlite3_config
# to configure the size of the PAGECACHE allocation using the parameters
# provided to this command. Save the old PAGECACHE parameters in a global 
# variable so that [test_restore_config_pagecache] can restore the previous
# configuration.
#
# Before returning, reopen connection [db] on file test.db.
#
proc test_set_config_pagecache {sz nPg} {
  catch {db close}
  catch {db2 close}
  catch {db3 close}

  sqlite3_shutdown
  set ::old_pagecache_config [sqlite3_config_pagecache $sz $nPg]
  sqlite3_initialize
  autoinstall_test_functions
  reset_db
}

# Close any connections named [db], [db2] or [db3]. Then use sqlite3_config
# to configure the size of the PAGECACHE allocation to the size saved in
# the global variable by an earlier call to [test_set_config_pagecache].
#
# Before returning, reopen connection [db] on file test.db.
#
proc test_restore_config_pagecache {} {
  catch {db close}
  catch {db2 close}
  catch {db3 close}

  sqlite3_shutdown
  eval sqlite3_config_pagecache $::old_pagecache_config
  unset ::old_pagecache_config 
  sqlite3_initialize
  autoinstall_test_functions
  sqlite3 db test.db
}

proc test_binary_name {nm} {
  if {$::tcl_platform(platform)=="windows"} {
    set ret "$nm.exe"
  } else {
    set ret $nm
  }
  file normalize [file join $::cmdlinearg(TESTFIXTURE_HOME) $ret]
}

proc test_find_binary {nm} {
  set ret [test_binary_name $nm]
  if {![file executable $ret]} {
    finish_test
    return ""
  }
  return $ret
}

# Find the name of the 'shell' executable (e.g. "sqlite3.exe") to use for
# the tests in shell[1-5].test. If no such executable can be found, invoke
# [finish_test ; return] in the callers context.
#
proc test_find_cli {} {
  set prog [test_find_binary sqlite3]
  if {$prog==""} { return -code return }
  return $prog
}

# Find the name of the 'sqldiff' executable (e.g. "sqlite3.exe") to use for
# the tests in sqldiff tests. If no such executable can be found, invoke
# [finish_test ; return] in the callers context.
#
proc test_find_sqldiff {} {
  set prog [test_find_binary sqldiff]
  if {$prog==""} { return -code return }
  return $prog
}

# Call sqlite3_expanded_sql() on all statements associated with database
# connection $db. This sometimes finds use-after-free bugs if run with
# valgrind or address-sanitizer.
proc expand_all_sql {db} {
  set stmt ""
  while {[set stmt [sqlite3_next_stmt $db $stmt]]!=""} {
    sqlite3_expanded_sql $stmt
  }
}


# If the library is compiled with the SQLITE_DEFAULT_AUTOVACUUM macro set
# to non-zero, then set the global variable $AUTOVACUUM to 1.
set AUTOVACUUM $sqlite_options(default_autovacuum)

# Make sure the FTS enhanced query syntax is disabled.
set sqlite_fts3_enable_parentheses 0

# During testing, assume that all database files are well-formed.  The
# few test cases that deliberately corrupt database files should rescind 
# this setting by invoking "database_can_be_corrupt"
#
database_never_corrupt
extra_schema_checks 1

source $testdir/thread_common.tcl
source $testdir/malloc_common.tcl
