# 2010 April 10
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file tests that bug  9d68c883132c8e9ffcd5b0c148c990807b5df1b7
# is fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-9d68c88-1.1 {
  execsql {
    PRAGMA page_size = 1024;
    PRAGMA auto_vacuum = 2;
    CREATE TABLE t3(x);
    CREATE TABLE t4(x);
    CREATE TABLE t5(x);
    INSERT INTO t5 VALUES(randomblob(1500));
    CREATE TABLE t7(x);
    CREATE TABLE t8(x);
  }
} {}


for {set i 0} {$i < 100} {incr i} {
  db close
  sqlite3_simulate_device -sectorsize 8192
  sqlite3 db test.db -vfs devsym

  do_test tkt-9d68c88-2.$i {
    execsql {
      BEGIN;
        DELETE FROM t5;
        INSERT INTO t8 VALUES('hello world');
    }
  
    sqlite3_memdebug_fail $i -repeat 0
    catchsql { DROP TABLE t7; }
    sqlite3_memdebug_fail -1

    catchsql { ROLLBACK }
    execsql { PRAGMA integrity_check }
  } {ok}
}

catch { db close } 
unregister_devsim
finish_test
