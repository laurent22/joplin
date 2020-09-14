# 2005 December 29
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
# This file implements tests to verify that the new serial_type
# values of 8 (integer 0) and 9 (integer 1) work correctly.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

#db eval {PRAGMA legacy_file_format=OFF}
sqlite3_db_config db LEGACY_FILE_FORMAT 0

# The size of the database depends on whether or not autovacuum
# is enabled.
#
ifcapable autovacuum {
  if {[db one {PRAGMA auto_vacuum}]} {
    set small 3072
    set large 5120
  } else {
    set small 2048
    set large 4096
  }
} else {
  set small 2048
  set large 4096
}

do_test format4-1.1 {
  execsql {
    CREATE TABLE t1(x0,x1,x2,x3,x4,x5,x6,x7,x8,x9);
    INSERT INTO t1 VALUES(0,0,0,0,0,0,0,0,0,0);
    INSERT INTO t1 SELECT * FROM t1;
    INSERT INTO t1 SELECT * FROM t1;
    INSERT INTO t1 SELECT * FROM t1;
    INSERT INTO t1 SELECT * FROM t1;
    INSERT INTO t1 SELECT * FROM t1;
    INSERT INTO t1 SELECT * FROM t1;
  }
  file size test.db
} $small
do_test format4-1.2 {
  execsql {
    UPDATE t1 SET x0=1, x1=1, x2=1, x3=1, x4=1, x5=1, x6=1, x7=1, x8=1, x9=1
  }
  file size test.db
} $small
do_test format4-1.3 {
  execsql {
    UPDATE t1 SET x0=2, x1=2, x2=2, x3=2, x4=2, x5=2, x6=2, x7=2, x8=2, x9=2
  }
  file size test.db
} $large


finish_test
