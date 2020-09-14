# 2005 August 18
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
# This file implements tests to increase coverage of trigger.c.
#
# $Id: trigger7.test,v 1.3 2008/08/11 18:44:58 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable {!trigger} {
  finish_test
  return
}

# Error messages resulting from qualified trigger names.
#
do_test trigger7-1.1 {
  execsql {
    CREATE TABLE t1(x, y);
  }
  catchsql {
    CREATE TEMP TRIGGER main.r1 AFTER INSERT ON t1 BEGIN
      SELECT 'no nothing';
    END
  }
} {1 {temporary trigger may not have qualified name}}
do_test trigger7-1.2 {
  catchsql {
    CREATE TRIGGER not_a_db.r1 AFTER INSERT ON t1 BEGIN
      SELECT 'no nothing';
    END
  }
} {1 {unknown database not_a_db}}


# When the UPDATE OF syntax is used, no code is generated for triggers
# that do not match the update columns.
#
ifcapable explain {
  do_test trigger7-2.1 {
    execsql {
      CREATE TRIGGER r1 AFTER UPDATE OF x ON t1 BEGIN
        SELECT '___update_t1.x___';
      END;
      CREATE TRIGGER r2 AFTER UPDATE OF y ON t1 BEGIN
        SELECT '___update_t1.y___';
      END;
    }
    set txt [db eval {EXPLAIN UPDATE t1 SET x=5}]
    string match *___update_t1.x___* $txt
  } 1
  do_test trigger7-2.2 {
    set txt [db eval {EXPLAIN UPDATE t1 SET x=5}]
    string match *___update_t1.y___* $txt
  } 0
  do_test trigger7-2.3 {
    set txt [db eval {EXPLAIN UPDATE t1 SET y=5}]
    string match *___update_t1.x___* $txt
  } 0
  do_test trigger7-2.4 {
    set txt [db eval {EXPLAIN UPDATE t1 SET y=5}]
    string match *___update_t1.y___* $txt
  } 1
  do_test trigger7-2.5 {
    set txt [db eval {EXPLAIN UPDATE t1 SET rowid=5}]
    string match *___update_t1.x___* $txt
  } 0
  do_test trigger7-2.6 {
    set txt [db eval {EXPLAIN UPDATE t1 SET rowid=5}]
    string match *___update_t1.x___* $txt
  } 0
}

# Test the ability to create many triggers on the same table, then
# selectively drop those triggers.
#
do_test trigger7-3.1 {
  execsql {
    CREATE TABLE t2(x,y,z);
    CREATE TRIGGER t2r1 AFTER INSERT ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r2 BEFORE INSERT ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r3 AFTER UPDATE ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r4 BEFORE UPDATE ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r5 AFTER DELETE ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r6 BEFORE DELETE ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r7 AFTER INSERT ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r8 BEFORE INSERT ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r9 AFTER UPDATE ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r10 BEFORE UPDATE ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r11 AFTER DELETE ON t2 BEGIN SELECT 1; END;
    CREATE TRIGGER t2r12 BEFORE DELETE ON t2 BEGIN SELECT 1; END;
    DROP TRIGGER t2r6;
  }
} {}

# This test corrupts the database file so it must be the last test
# in the series.
#
do_test trigger7-99.1 {
  sqlite3_db_config db DEFENSIVE 0
  execsql {
    PRAGMA writable_schema=on;
    UPDATE sqlite_master SET sql='nonsense';
  }
  db close
  catch { sqlite3 db test.db }
  catchsql { DROP TRIGGER t2r5 }
} {/1 {malformed database schema .*}/}

finish_test
