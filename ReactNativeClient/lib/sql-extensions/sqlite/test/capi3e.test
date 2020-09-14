# 2010 Novemeber 18
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script testing the callback-free C/C++ API.
#
# $Id: capi3e.test,v 1.70 2009/01/09 02:49:32 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Make sure the system encoding is utf-8. Otherwise, if the system encoding
# is other than utf-8, [file isfile $x] may not refer to the same file
# as [sqlite3 db $x].
#
# This is no longer needed here because it should be done within the test
# fixture executable itself, via Tcl_SetSystemEncoding.
#
# encoding system utf-8

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

# Return the UTF-16 representation of the supplied UTF-8 string $str.
# If $nt is true, append two 0x00 bytes as a nul terminator.
proc utf16 {str {nt 1}} {
  set r [encoding convertto unicode $str]
  if {$nt} {
    append r "\x00\x00"
  }
  return $r
}

# Return the UTF-8 representation of the supplied UTF-16 string $str. 
proc utf8 {str} {
  # If $str ends in two 0x00 0x00 bytes, knock these off before
  # converting to UTF-8 using TCL.
  binary scan $str \c* vals
  if {[lindex $vals end]==0 && [lindex $vals end-1]==0} {
    set str [binary format \c* [lrange $vals 0 end-2]]
  }

  set r [encoding convertfrom unicode $str]
  return $r
}

# These tests complement those in capi2.test. They are organized
# as follows:
#
# capi3e-1.*: Test sqlite3_open with various UTF8 filenames
# capi3e-2.*: Test sqlite3_open16 with various UTF8 filenames
# capi3e-3.*: Test ATTACH with various UTF8 filenames

db close

# here's the list of file names we're testing
set names {t 1 t. 1. t.d 1.d t-1 1-1 t.db ä.db ë.db ö.db ü.db ÿ.db}

set i 0
foreach name $names {
  incr i
  do_test capi3e-1.1.$i {
    set db2 [sqlite3_open $name {}]
    sqlite3_errcode $db2
  } {SQLITE_OK}
  do_test capi3e-1.2.$i {
    sqlite3_close $db2
  } {SQLITE_OK}
  do_test capi3e-1.3.$i {
    file isfile $name
  } {1}
}

ifcapable {utf16} {
  set i 0
  foreach name $names {
    incr i
    do_test capi3e-2.1.$i {
      set db2 [sqlite3_open16 [utf16 $name] {}]
      sqlite3_errcode $db2
    } {SQLITE_OK}
    do_test capi3e-2.2.$i {
      sqlite3_close $db2
    } {SQLITE_OK}
    do_test capi3e-2.3.$i {
      file isfile $name
    } {1}
  }
}

ifcapable attach {
  do_test capi3e-3.1 {
    sqlite3 db2 base.db
  } {}
  set i 0
  foreach name $names {
    incr i
    do_test capi3e-3.2.$i {
      db2 eval "ATTACH DATABASE '$name' AS db$i;"
    } {}
    do_test capi3e-3.3.$i {
      db2 eval "DETACH DATABASE db$i;"
    } {}
  }
  do_test capi3e-3.4 {
    db2 close
  } {}
}

# clean up
forcedelete base.db
foreach name $names {
  forcedelete $name
}

finish_test
