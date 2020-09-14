# 2002 November 30
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
# focus of this script testing the ability of SQLite to handle database
# files larger than 4GB.
#
# $Id: bigfile.test,v 1.12 2009/03/05 04:27:08 shane Exp $
#

if {[file exists skip-big-file]} return
if {$tcl_platform(os)=="Darwin"} return

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for this file, as the database is manipulated using
# external methods (the [fake_big_file] and [hexio_write] commands).
#
do_not_use_codec

# If SQLITE_DISABLE_LFS is defined, omit this file.
ifcapable !lfs {
  finish_test
  return
}

# These tests only work for Tcl version 8.4 and later.  Prior to 8.4,
# Tcl was unable to handle large files.
#
scan $::tcl_version %f vx
if {$vx<8.4} return

# Mac OS X does not handle large files efficiently.  So skip this test
# on that platform.
if {$tcl_platform(os)=="Darwin"} return

# This is the md5 checksum of all the data in table t1 as created
# by the first test.  We will use this number to make sure that data
# never changes.
#
set MAGIC_SUM {593f1efcfdbe698c28b4b1b693f7e4cf}

do_test bigfile-1.1 {
  execsql {
    BEGIN;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES('abcdefghijklmnopqrstuvwxyz');
    INSERT INTO t1 SELECT rowid || ' ' || x FROM t1;
    INSERT INTO t1 SELECT rowid || ' ' || x FROM t1;
    INSERT INTO t1 SELECT rowid || ' ' || x FROM t1;
    INSERT INTO t1 SELECT rowid || ' ' || x FROM t1;
    INSERT INTO t1 SELECT rowid || ' ' || x FROM t1;
    INSERT INTO t1 SELECT rowid || ' ' || x FROM t1;
    INSERT INTO t1 SELECT rowid || ' ' || x FROM t1;
    COMMIT;
  }
  execsql {
    SELECT md5sum(x) FROM t1;
  }
} $::MAGIC_SUM

# Try to create a large file - a file that is larger than 2^32 bytes.
# If this fails, it means that the system being tested does not support
# large files.  So skip all of the remaining tests in this file.
#
db close
if {[catch {fake_big_file 4096 [get_pwd]/test.db} msg]} {
  puts "**** Unable to create a file larger than 4096 MB. *****"
  finish_test
  return
}
hexio_write test.db 28 00000000

do_test bigfile-1.2 {
  sqlite3 db test.db
  execsql {
    SELECT md5sum(x) FROM t1;
  }
} $::MAGIC_SUM

# The previous test may fail on some systems because they are unable
# to handle large files.  If that is so, then skip all of the following
# tests.  We will know the above test failed because the "db" command
# does not exist.
#
if {[llength [info command db]]<=0} {
  puts "**** Large file support appears to be broken. *****"
  finish_test
  return
}

do_test bigfile-1.3 {
  execsql {
    CREATE TABLE t2 AS SELECT * FROM t1;
    SELECT md5sum(x) FROM t2;
  }
} $::MAGIC_SUM
do_test bigfile-1.4 {
  db close
  sqlite3 db test.db
  execsql {
    SELECT md5sum(x) FROM t1;
  }
} $::MAGIC_SUM

db close
if {[catch {fake_big_file 8192 [get_pwd]/test.db}]} {
  puts "**** Unable to create a file larger than 8192 MB. *****"
  finish_test
  return
}
hexio_write test.db 28 00000000

do_test bigfile-1.5 {
  sqlite3 db test.db
  execsql {
    SELECT md5sum(x) FROM t1;
  }
} $::MAGIC_SUM
do_test bigfile-1.6 {
  sqlite3 db test.db
  execsql {
    SELECT md5sum(x) FROM t2;
  }
} $::MAGIC_SUM
do_test bigfile-1.7 {
  execsql {
    CREATE TABLE t3 AS SELECT * FROM t1;
    SELECT md5sum(x) FROM t3;
  }
} $::MAGIC_SUM
do_test bigfile-1.8 {
  db close
  sqlite3 db test.db
  execsql {
    SELECT md5sum(x) FROM t1;
  }
} $::MAGIC_SUM
do_test bigfile-1.9 {
  execsql {
    SELECT md5sum(x) FROM t2;
  }
} $::MAGIC_SUM

db close
if {[catch {fake_big_file 16384 [get_pwd]/test.db}]} {
  puts "**** Unable to create a file larger than 16384 MB. *****"
  finish_test
  return
}
hexio_write test.db 28 00000000

do_test bigfile-1.10 {
  sqlite3 db test.db
  execsql {
    SELECT md5sum(x) FROM t1;
  }
} $::MAGIC_SUM
do_test bigfile-1.11 {
  sqlite3 db test.db
  execsql {
    SELECT md5sum(x) FROM t2;
  }
} $::MAGIC_SUM
do_test bigfile-1.12 {
  sqlite3 db test.db
  execsql {
    SELECT md5sum(x) FROM t3;
  }
} $::MAGIC_SUM
do_test bigfile-1.13 {
  execsql {
    CREATE TABLE t4 AS SELECT * FROM t1;
    SELECT md5sum(x) FROM t4;
  }
} $::MAGIC_SUM
do_test bigfile-1.14 {
  db close
  sqlite3 db test.db
  execsql {
    SELECT md5sum(x) FROM t1;
  }
} $::MAGIC_SUM
do_test bigfile-1.15 {
  execsql {
    SELECT md5sum(x) FROM t2;
  }
} $::MAGIC_SUM
do_test bigfile-1.16 {
  execsql {
    SELECT md5sum(x) FROM t3;
  }
} $::MAGIC_SUM

finish_test
