# 2005 September 17
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically.
# it contains tests to verify that ticket #2285 has been fixed.  
#
# $Id: tkt2285.test,v 1.2 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !tempdb {
  finish_test
  return
}

do_test tkt2285-1.1 {
  execsql {
    PRAGMA locking_mode = EXCLUSIVE;
  }
  execsql {
    BEGIN;
    CREATE TABLE abc(a, b, c);
    ROLLBACK;
  }
} {}

do_test tkt2285-1.2 {
  execsql {
    SELECT * FROM sqlite_master;
  }
} {}

ifcapable tempdb {
  do_test tkt2285-2.1 {
    execsql {
      BEGIN;
      CREATE TEMP TABLE abc(a, b, c);
      ROLLBACK;
    }
  } {}
  do_test tkt2285-2.2 {
    execsql {
      SELECT * FROM sqlite_temp_master;
    }
  } {}
}

finish_test
