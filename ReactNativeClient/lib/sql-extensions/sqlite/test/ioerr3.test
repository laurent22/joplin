# 2007 December 19
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
# focus of this file is testing for correct handling of I/O errors
# in conjunction with very small soft-heap-limit values.
#
# $Id: ioerr3.test,v 1.2 2008/01/19 23:50:26 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_ioerr_test ioerr3-1 -sqlprep {
  CREATE TABLE t1(id INTEGER, name TEXT);
} -tclbody {
  sqlite3_soft_heap_limit 8192
  db cache size 0
  execsql BEGIN
  for {set ii 0} {$ii < 100} {incr ii} {
    execsql {
      INSERT INTO t1(id, name) VALUES (1,
'A1234567890B1234567890C1234567890D1234567890E1234567890F1234567890G1234567890H1234567890I1234567890J1234567890K1234567890L1234567890M1234567890N1234567890O1234567890P1234567890Q1234567890R1234567890'
      );
    }
  }
  execsql COMMIT
}

do_ioerr_test ioerr3-2 -sqlbody {
  CREATE TEMP TABLE t1(x,y);
}

sqlite3_soft_heap_limit 0

finish_test
