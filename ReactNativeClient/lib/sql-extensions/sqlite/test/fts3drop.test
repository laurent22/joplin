# 2011 October 29
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS3 module. More specifically,
# that DROP TABLE commands can co-exist with savepoints inside transactions.
# See ticket [48f299634a] for details.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fts3drop

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

do_execsql_test 1.1 {
  CREATE VIRTUAL TABLE f1 USING fts3;
  INSERT INTO f1 VALUES('a b c');
}

do_execsql_test 1.2 {
  BEGIN;
    INSERT INTO f1 VALUES('d e f');
    SAVEPOINT one;
      INSERT INTO f1 VALUES('g h i');
      DROP TABLE f1;
    ROLLBACK TO one;
  COMMIT;
}

do_execsql_test 1.3 {
  SELECT * FROM f1;
} {{a b c} {d e f}}

do_execsql_test 1.4 {
  BEGIN;
    INSERT INTO f1 VALUES('g h i');
    SAVEPOINT one;
      INSERT INTO f1 VALUES('j k l');
      DROP TABLE f1;
    RELEASE one;
  ROLLBACK;
}

do_execsql_test 1.5 {
  SELECT * FROM f1;
} {{a b c} {d e f}}

finish_test
