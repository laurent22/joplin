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
# This file implements regression tests for SQLite library.
#
# $Id: blob.test,v 1.8 2009/04/28 18:00:27 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!bloblit} {
  finish_test
  return
}

proc bin_to_hex {blob} {
  set bytes {}
  binary scan $blob \c* bytes
  set bytes2 [list]
  foreach b $bytes {lappend bytes2 [format %02X [expr $b & 0xFF]]}
  join $bytes2 {}
}

# Simplest possible case. Specify a blob literal
do_test blob-1.0 {
  set blob [execsql {SELECT X'01020304';}]
  bin_to_hex [lindex $blob 0]
} {01020304}
do_test blob-1.1 {
  set blob [execsql {SELECT x'ABCDEF';}]
  bin_to_hex [lindex $blob 0]
} {ABCDEF}
do_test blob-1.2 {
  set blob [execsql {SELECT x'';}]
  bin_to_hex [lindex $blob 0]
} {}
do_test blob-1.3 {
  set blob [execsql {SELECT x'abcdEF12';}]
  bin_to_hex [lindex $blob 0]
} {ABCDEF12}
do_test blob-1.3.2 {
  set blob [execsql {SELECT x'0123456789abcdefABCDEF';}]
  bin_to_hex [lindex $blob 0]
} {0123456789ABCDEFABCDEF}

# Try some syntax errors in blob literals.
do_test blob-1.4 {
  catchsql {SELECT X'01020k304', 100}
} {1 {unrecognized token: "X'01020k304'"}}
do_test blob-1.5 {
  catchsql {SELECT X'01020, 100}
} {1 {unrecognized token: "X'01020, 100"}}
do_test blob-1.6 {
  catchsql {SELECT X'01020 100'}
} {1 {unrecognized token: "X'01020 100'"}}
do_test blob-1.7 {
  catchsql {SELECT X'01001'}
} {1 {unrecognized token: "X'01001'"}}
do_test blob-1.8 {
  catchsql {SELECT x'012/45'}
} {1 {unrecognized token: "x'012/45'"}}
do_test blob-1.9 {
  catchsql {SELECT x'012:45'}
} {1 {unrecognized token: "x'012:45'"}}
do_test blob-1.10 {
  catchsql {SELECT x'012@45'}
} {1 {unrecognized token: "x'012@45'"}}
do_test blob-1.11 {
  catchsql {SELECT x'012G45'}
} {1 {unrecognized token: "x'012G45'"}}
do_test blob-1.12 {
  catchsql {SELECT x'012`45'}
} {1 {unrecognized token: "x'012`45'"}}
do_test blob-1.13 {
  catchsql {SELECT x'012g45'}
} {1 {unrecognized token: "x'012g45'"}}


# Insert a blob into a table and retrieve it.
do_test blob-2.0 {
  execsql {
    CREATE TABLE t1(a BLOB, b BLOB);
    INSERT INTO t1 VALUES(X'123456', x'7890ab');
    INSERT INTO t1 VALUES(X'CDEF12', x'345678');
  }
  set blobs [execsql {SELECT * FROM t1}]
  set blobs2 [list]
  foreach b $blobs {lappend blobs2 [bin_to_hex $b]}
  set blobs2
} {123456 7890AB CDEF12 345678}

# An index on a blob column
do_test blob-2.1 {
  execsql {
    CREATE INDEX i1 ON t1(a);
  }
  set blobs [execsql {SELECT * FROM t1}]
  set blobs2 [list]
  foreach b $blobs {lappend blobs2 [bin_to_hex $b]}
  set blobs2
} {123456 7890AB CDEF12 345678}
do_test blob-2.2 {
  set blobs [execsql {SELECT * FROM t1 where a = X'123456'}]
  set blobs2 [list]
  foreach b $blobs {lappend blobs2 [bin_to_hex $b]}
  set blobs2
} {123456 7890AB}
do_test blob-2.3 {
  set blobs [execsql {SELECT * FROM t1 where a = X'CDEF12'}]
  set blobs2 [list]
  foreach b $blobs {lappend blobs2 [bin_to_hex $b]}
  set blobs2
} {CDEF12 345678}
do_test blob-2.4 {
  set blobs [execsql {SELECT * FROM t1 where a = X'CD12'}]
  set blobs2 [list]
  foreach b $blobs {lappend blobs2 [bin_to_hex $b]}
  set blobs2
} {}

# Try to bind a blob value to a prepared statement.
do_test blob-3.0 {
  sqlite3 db2 test.db
  set DB [sqlite3_connection_pointer db2]
  set STMT [sqlite3_prepare $DB "DELETE FROM t1 WHERE a = ?" -1 DUMMY]
  sqlite3_bind_blob $STMT 1 "\x12\x34\x56" 3
  sqlite3_step $STMT
} {SQLITE_DONE}
do_test blob-3.1 {
  sqlite3_finalize $STMT
  db2 close
} {}
do_test blob-3.2 {
  set blobs [execsql {SELECT * FROM t1}]
  set blobs2 [list]
  foreach b $blobs {lappend blobs2 [bin_to_hex $b]}
  set blobs2
} {CDEF12 345678}

finish_test
