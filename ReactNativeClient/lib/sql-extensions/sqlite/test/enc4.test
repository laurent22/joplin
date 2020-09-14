# 2010 Sept 29
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The focus of
# this file is testing the SQLite routines used for converting between the
# various suported unicode encodings (UTF-8, UTF-16, UTF-16le and
# UTF-16be).
#
# $Id: enc4.test,v 1.0 2010/09/29 08:29:32 shaneh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If UTF16 support is disabled, ignore the tests in this file
#
ifcapable {!utf16} {
  finish_test
  return
}

db close

# The three unicode encodings understood by SQLite.
set encodings [list UTF-8 UTF-16le UTF-16be]

# initial value to use in SELECT
set inits [list 1 1.0 1. 1e0]

# vals
set vals [list\
"922337203685477580792233720368547758079223372036854775807"\
"100000000000000000000000000000000000000000000000000000000"\
"1.0000000000000000000000000000000000000000000000000000000"\
]

set i 1
foreach enc $encodings {

  forcedelete test.db
  sqlite3 db test.db
  db eval "PRAGMA encoding = \"$enc\""

  do_test enc4-$i.1 {
    db eval {PRAGMA encoding}
  } $enc

  set j 1
  foreach init $inits {

    do_test enc4-$i.$j.2 {
      set S [sqlite3_prepare_v2 db "SELECT $init+?" -1 dummy]
      sqlite3_expired $S
    } {0}
      
    set k 1
    foreach val $vals {
      for {set x 1} {$x<16} {incr x} {
        set part [expr $init + [string range $val 0 [expr $x-1]]]

        do_realnum_test enc4-$i.$j.$k.3.$x {
          sqlite3_reset $S
          sqlite3_bind_text $S 1 $val $x
          sqlite3_step $S
          sqlite3_column_text $S 0
        } [list $part]
        
        do_realnum_test enc4-$i.$j.$k.4.$x {
          sqlite3_reset $S
          sqlite3_bind_text16 $S 1 [encoding convertto unicode $val] [expr $x*2]
          sqlite3_step $S
          sqlite3_column_text $S 0
        } [list $part]
      }
      
      incr k
    }

    do_test enc4-$i.$j.5 {
      sqlite3_finalize $S
    } {SQLITE_OK}

    incr j
  }

  db close
  incr i
}

forcedelete test.db
sqlite3 db test.db

do_test enc4-4.1 {
  db eval "select 1+1."
} {2.0}

do_test enc4-4.2.1 {
  set S [sqlite3_prepare_v2 db "SELECT 1+1." -1 dummy]
  sqlite3_step $S
  sqlite3_column_text $S 0
} {2.0}

do_test enc4-4.2.2 {
  sqlite3_finalize $S
} {SQLITE_OK}

do_test enc4-4.3.1 {
  set S [sqlite3_prepare_v2 db "SELECT 1+?" -1 dummy]
  sqlite3_bind_text $S 1 "1." 2
  sqlite3_step $S
  sqlite3_column_text $S 0
} {2.0}

do_test enc4-4.3.2 {
  sqlite3_finalize $S
} {SQLITE_OK}

do_test enc4-4.4.1 {
  set S [sqlite3_prepare_v2 db "SELECT 1+?" -1 dummy]
  sqlite3_bind_text $S 1 "1.0" 2
  sqlite3_step $S
  sqlite3_column_text $S 0
} {2.0}

do_test enc4-4.4.2 {
  sqlite3_finalize $S
} {SQLITE_OK}

db close

finish_test
