# 2010 February 18
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
# This file implements tests to make sure SQLite does not crash or
# segfault if it sees a corrupt database file.  It specifcally
# focuses on rowid order corruption.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# This module uses hard-coded offsets which do not work if the reserved_bytes
# value is nonzero.
if {[nonzero_reserved_bytes]} {finish_test; return;}

# These tests deal with corrupt database files
#
database_may_be_corrupt

# Do not run the tests in this file if ENABLE_OVERSIZE_CELL_CHECK is on.
#
ifcapable oversize_cell_check {
  finish_test
  return
}

# Construct a compact, dense database for testing.
#
do_test corruptE-1.1 {
  sqlite3_db_config db LEGACY_FILE_FORMAT 1
  execsql {
    PRAGMA auto_vacuum = 0;
    BEGIN;
    CREATE TABLE t1(x,y);
    INSERT INTO t1 VALUES(1,1);
    INSERT OR IGNORE INTO t1 SELECT x*2,y FROM t1;
    INSERT OR IGNORE INTO t1 SELECT x*3,y FROM t1;
    INSERT OR IGNORE INTO t1 SELECT x*5,y FROM t1;
    INSERT OR IGNORE INTO t1 SELECT x*7,y FROM t1;
    INSERT OR IGNORE INTO t1 SELECT x*11,y FROM t1;
    INSERT OR IGNORE INTO t1 SELECT x*13,y FROM t1;
    INSERT OR IGNORE INTO t1 SELECT x*17,y FROM t1;
    INSERT OR IGNORE INTO t1 SELECT x*19,y FROM t1;
    CREATE INDEX t1i1 ON t1(x);
    CREATE TABLE t2 AS SELECT x,2 as y FROM t1 WHERE rowid%5!=0 ORDER BY rowid;
    COMMIT;
  }
} {}

ifcapable {integrityck} {
  integrity_check corruptE-1.2
}

# Setup for the tests.  Make a backup copy of the good database in test.bu.
#
db close
forcecopy test.db test.bu
sqlite3 db test.db
set fsize [file size test.db]


do_test corruptE-2.1 {
  db close
  forcecopy test.bu test.db

  # insert corrupt byte(s)
  hexio_write test.db 2041 [format %02x 0x2e]

  sqlite3 db test.db

  catchsql {PRAGMA integrity_check}
} {/ out of order/}

do_test corruptE-2.2 {
  db close
  forcecopy test.bu test.db

  # insert corrupt byte(s)
  hexio_write test.db 2047 [format %02x 0x84]

  sqlite3 db test.db

  catchsql {PRAGMA integrity_check}
} {/ Extends off end of page/}

do_test corruptE-2.3 {
  db close
  forcecopy test.bu test.db

  # insert corrupt byte(s)
  hexio_write test.db 7420 [format %02x 0xa8]
  hexio_write test.db 10459 [format %02x 0x8d]

  sqlite3 db test.db

  catchsql {PRAGMA integrity_check}
} {/out of order/}

do_test corruptE-2.4 {
  db close
  forcecopy test.bu test.db

  # insert corrupt byte(s)
  hexio_write test.db 10233 [format %02x 0xd0]

  sqlite3 db test.db

  catchsql {PRAGMA integrity_check}
} {/out of order/}


set tests [list {10233 0xd0} \
                {941 0x42} \
                {2041 0xd0} \
                {2042 0x1f} \
                {2274 0x75} \
                {3267 0xf2} \
                {5113 0x36} \
                {10233 0x84} \
                {10234 0x74} \
                {10239 0x41} \
                {11273 0x28} \
                {11461 0xe6} \
                {12297 0xd7} \
                {13303 0x53} ]

set tc 1
foreach test $tests {
  do_test corruptE-3.$tc {
    db close
    forcecopy test.bu test.db

    # insert corrupt byte(s)
    hexio_write test.db [lindex $test 0] [format %02x [lindex $test 1]]

    sqlite3 db test.db

    catchsql {PRAGMA integrity_check}
  } {/out of order/}
  incr tc 1
}

finish_test
