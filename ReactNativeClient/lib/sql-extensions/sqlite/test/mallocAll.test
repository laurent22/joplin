#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file runs all out-of-memory tests.
#
# $Id: mallocAll.test,v 1.1 2007/11/26 13:36:00 drh Exp $

proc lshift {lvar} {
  upvar $lvar l
  set ret [lindex $l 0]
  set l [lrange $l 1 end]
  return $ret
}
while {[set arg [lshift argv]] != ""} {
  switch -- $arg {
    -sharedpagercache {
      sqlite3_enable_shared_cache 1
    }
    default {
      set argv [linsert $argv 0 $arg]
      break
    }
  }
}

set testdir [file dirname $argv0]
source $testdir/tester.tcl
rename finish_test really_finish_test
proc finish_test {} {}
set G(isquick) 1

set EXCLUDE {
  mallocAll.test
}

if {[sqlite3 -has-codec]} {
  # lappend EXCLUDE \
  #  conflict.test
}


# Files to include in the test.  If this list is empty then everything
# that is not in the EXCLUDE list is run.
#
set INCLUDE {
}

foreach testfile [lsort -dictionary [glob $testdir/*malloc*.test]] {
  set tail [file tail $testfile]
  if {[lsearch -exact $EXCLUDE $tail]>=0} continue
  if {[llength $INCLUDE]>0 && [lsearch -exact $INCLUDE $tail]<0} continue
  source $testfile
  catch {db close}
  if {$sqlite_open_file_count>0} {
    puts "$tail did not close all files: $sqlite_open_file_count"
    fail_test $tail
    set sqlite_open_file_count 0
  }
}
source $testdir/misuse.test

set sqlite_open_file_count 0
really_finish_test
