# 2007 May 24
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file is the driver for the "soak" tests. It is a peer of the
# quick.test and all.test scripts.
#
# $Id: soak.test,v 1.4 2008/11/13 18:29:51 shane Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
rename finish_test really_finish_test
proc finish_test {} {}

# By default, guarantee that the tests will run for at least 1 hour.
#
set TIMEOUT 3600

# Process command-line arguments. 
#
if {[llength $argv]>0} {
  foreach {name value} $argv {
    switch -- $name {
      -timeout {
        set TIMEOUT $value
      }
      default {
         puts stderr "Unknown option: $name"
         exit
      }
    }
  }
}
set argv [list]

# Test plan:
#
# The general principle is to run those SQLite tests that use
# pseudo-random data in some way over and over again for a very 
# long time. The number of tests run depends on the value of 
# global variable $TIMEOUT - tests are run for at least $TIMEOUT 
# seconds.
#
#   fuzz.test     (pseudo-random SQL statements)
#   trans.test    (pseudo-random changes to a database followed by rollbacks)
#   fuzz_malloc.test
#   corruptC.test (pseudo-random corruption to a database)
#
# Many database changes maintaining some kind of invariant. 
# Storing checksums etc.
#

# List of test files that are run by this file.
#
set SOAKTESTS {
  fuzz.test
  fuzz_malloc.test
  trans.test
  corruptC.test
}

set G(isquick) 1

set soak_starttime  [clock_seconds]
set soak_finishtime [expr {$soak_starttime + $TIMEOUT}]

# Loop until the timeout is reached or an error occurs.
#
for {set iRun 0} {[clock_seconds] < $soak_finishtime} {incr iRun} {

  set iIdx [expr {$iRun % [llength $SOAKTESTS]}]
  source [file join $testdir [lindex $SOAKTESTS $iIdx]]
  catch {db close}

  if {$sqlite_open_file_count>0} {
    puts "$tail did not close all files: $sqlite_open_file_count"
    fail_test $tail
    set sqlite_open_file_count 0
  }

  if {[set_test_counter errors]>0} break
}

really_finish_test
