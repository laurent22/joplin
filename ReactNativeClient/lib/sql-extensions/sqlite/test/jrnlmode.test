# 2008 April 17
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. The focus
# of these tests is the journal mode pragma.
#
# $Id: jrnlmode.test,v 1.16 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!pager_pragmas} {
  finish_test
  return
}

if {[info exists TEMP_STORE] && $TEMP_STORE>=2} {
  set temp_persist memory
  set temp_delete memory
  set temp_truncate memory
  set temp_off off
} else {
  set temp_persist persist
  set temp_delete delete
  set temp_truncate truncate
  set temp_off off
}

proc temp_journal_mode {newmode} {
  if {[info exists ::TEMP_STORE] && $::TEMP_STORE>=2} {
    if {$newmode ne "off" && $newmode ne "memory"} {
      execsql {PRAGMA temp.journal_mode}
      set newmode [db one {PRAGMA temp.journal_mode}]
    }
  }
  set newmode
}

#----------------------------------------------------------------------
# Test cases jrnlmode-1.X test the PRAGMA logic.
#
do_test jrnlmode-1.0 {
  execsql {
    PRAGMA journal_mode;
    PRAGMA main.journal_mode;
    PRAGMA temp.journal_mode;
  } 
} [list delete delete [temp_journal_mode delete]]
do_test jrnlmode-1.1 {
  execsql {
    PRAGMA journal_mode = persist;
  } 
} {persist}
do_test jrnlmode-1.2 {
  execsql {
    PRAGMA journal_mode;
    PRAGMA main.journal_mode;
    PRAGMA temp.journal_mode;
  } 
} [list persist persist [temp_journal_mode persist]]
do_test jrnlmode-1.4a {
  # When defensive is on, unable to set journal_mode to OFF
  sqlite3_db_config db DEFENSIVE 1
  execsql {
    PRAGMA journal_mode = off;
  } 
} {persist}
do_test jrnlmode-1.4b {
  # When defensive is on, unable to set journal_mode to OFF
  sqlite3_db_config db DEFENSIVE 0
  execsql {
    PRAGMA journal_mode = off;
  } 
} {off}
do_test jrnlmode-1.5 {
  execsql {
    PRAGMA journal_mode;
    PRAGMA main.journal_mode;
    PRAGMA temp.journal_mode;
  } 
} [list off off [temp_journal_mode off]]
do_test jrnlmode-1.6 {
  execsql {
    PRAGMA journal_mode = delete;
  } 
} {delete}
do_test jrnlmode-1.7 {
  execsql {
    PRAGMA journal_mode;
    PRAGMA main.journal_mode;
    PRAGMA Temp.journal_mode;
  } 
} [list delete delete [temp_journal_mode delete]]
do_test jrnlmode-1.7.1 {
  execsql {
    PRAGMA journal_mode = truncate;
  } 
} {truncate}
do_test jrnlmode-1.7.2 {
  execsql {
    PRAGMA journal_mode;
    PRAGMA main.journal_mode;
    PRAGMA temp.journal_mode;
  } 
} [list truncate truncate [temp_journal_mode truncate]]
do_test jrnlmode-1.8 {
  execsql {
    PRAGMA journal_mode = off;
    PRAGMA journal_mode = invalid;
  } 
} {off off}
ifcapable attach {
  do_test jrnlmode-1.9 {
    execsql {
      PRAGMA journal_mode = PERSIST;
      ATTACH ':memory:' as aux1;
    }
    execsql {
      PRAGMA main.journal_mode;
      PRAGMA aux1.journal_mode;
    }
  } {persist memory}
  do_test jrnlmode-1.10 {
    execsql {
      PRAGMA main.journal_mode = OFF;
    }
    execsql {
      PRAGMA main.journal_mode;
      PRAGMA temp.journal_mode;
      PRAGMA aux1.journal_mode;
    }
  } [list off [temp_journal_mode persist] memory]
  do_test jrnlmode-1.11 {
    execsql {
      PRAGMA journal_mode;
    }
  } {off}
  do_test jrnlmode-1.12 {
    execsql {
      ATTACH ':memory:' as aux2;
    }
    execsql {
      PRAGMA main.journal_mode;
      PRAGMA aux1.journal_mode;
      PRAGMA aux2.journal_mode;
    }
  } {off memory memory}
  do_test jrnlmode-1.13 {
    # The journal-mode used by in-memory databases cannot be changed.
    execsql {
      PRAGMA aux1.journal_mode = DELETE;
    }
    execsql {
      PRAGMA main.journal_mode;
      PRAGMA aux1.journal_mode;
      PRAGMA aux2.journal_mode;
    }
  } {off memory memory}
  do_test jrnlmode-1.14 {
    execsql {
      PRAGMA journal_mode = delete;
    }
    execsql {
      PRAGMA main.journal_mode;
      PRAGMA temp.journal_mode;
      PRAGMA aux1.journal_mode;
      PRAGMA aux2.journal_mode;
    }
  } [list delete [temp_journal_mode delete] memory memory]
  do_test jrnlmode-1.15 {
    execsql {
      ATTACH ':memory:' as aux3;
    }
    execsql {
      PRAGMA main.journal_mode;
      PRAGMA temp.journal_mode;
      PRAGMA aux1.journal_mode;
      PRAGMA aux2.journal_mode;
      PRAGMA aux3.journal_mode;
    }
  } [list delete [temp_journal_mode delete] memory memory memory]
  do_test jrnlmode-1.16 {
    execsql {
      PRAGMA journal_mode = TRUNCATE;
    }
    execsql {
      PRAGMA main.journal_mode;
      PRAGMA temp.journal_mode;
      PRAGMA aux1.journal_mode;
      PRAGMA aux2.journal_mode;
      PRAGMA aux3.journal_mode;
    }
  } [list truncate [temp_journal_mode truncate] memory memory memory]

  do_test jrnlmode-1.99 {
    execsql {
      DETACH aux1;
      DETACH aux2;
      DETACH aux3;
    }
  } {}
}

ifcapable attach {
  forcedelete test2.db
  do_test jrnlmode-2.1 {
    execsql {
      ATTACH 'test2.db' AS aux;
      PRAGMA main.journal_mode = persist;
      PRAGMA aux.journal_mode = persist;
      CREATE TABLE abc(a, b, c);
      CREATE TABLE aux.def(d, e, f);
    }
    execsql {
      BEGIN;
      INSERT INTO abc VALUES(1, 2, 3);
      INSERT INTO def VALUES(4, 5, 6);
      COMMIT;
    }
    list [file exists test.db-journal] [file exists test2.db-journal]
  } {1 1}

  do_test jrnlmode-2.2 {
    file size test.db-journal
  } {0}

  do_test jrnlmode-2.3 {
    execsql {
      SELECT * FROM abc;
    }
  } {1 2 3}

  do_test jrnlmode-2.4 {
    file size test.db-journal
  } {0}

  do_test jrnlmode-2.5 {
    execsql {
      SELECT * FROM def;
    }
  } {4 5 6}

#----------------------------------------------------------------------
# Test caes jrnlmode-3.X verify that ticket #3127 has been fixed.
#
  db close
  forcedelete test2.db
  forcedelete test.db
  sqlite3 db test.db

  do_test jrnlmode-3.1 {
    execsql { 
      CREATE TABLE x(n INTEGER); 
      ATTACH 'test2.db' AS a; 
      create table a.x ( n integer ); 
      insert into a.x values(1); 
      insert into a.x values (2); 
      insert into a.x values (3); 
      insert into a.x values (4); 
    }
  } {}
  
  do_test jrnlmode-3.2 {
    execsql { PRAGMA journal_mode=off; }
    execsql { 
      BEGIN IMMEDIATE;
      INSERT OR IGNORE INTO main.x SELECT * FROM a.x;
      COMMIT;
    }
  } {}
}

ifcapable autovacuum&&pragma {
  db close
  forcedelete test.db
  sqlite3 db test.db
  do_test jrnlmode-4.1 {
    execsql {
      PRAGMA cache_size = 1;
      PRAGMA auto_vacuum = 1;
      CREATE TABLE abc(a, b, c);
    }
    execsql { PRAGMA page_count }
  } {3}

  do_test jrnlmode-4.2 {
    execsql { PRAGMA journal_mode = off }
  } {off}

  do_test jrnlmode-4.3 {
    execsql { INSERT INTO abc VALUES(1, 2, randomblob(2000)) }
  } {}

  # This will attempt to truncate the database file. Check that this
  # is not a problem when journal_mode=off.
  do_test jrnlmode-4.4 {
    execsql { DELETE FROM abc }
  } {}

  integrity_check jrnlmode-4.5
}

#------------------------------------------------------------------------
# The following test caes, jrnlmode-5.*, test the journal_size_limit
# pragma.
ifcapable pragma {
if {[atomic_batch_write test.db]==0} {
  db close
  forcedelete test.db test2.db test3.db
  sqlite3 db test.db

  do_test jrnlmode-5.1 {
    execsql {pragma page_size=1024}
    execsql {pragma journal_mode=persist}
  } {persist}

  do_test jrnlmode-5.2 {
    execsql { PRAGMA journal_size_limit }
  } {-1}
  do_test jrnlmode-5.3 {
    execsql { 
      ATTACH 'test2.db' AS aux;
      PRAGMA aux.journal_mode=persist;
      PRAGMA aux.journal_size_limit;
    }
  } {persist -1}
  do_test jrnlmode-5.4.1 {
    execsql { PRAGMA aux.journal_size_limit = 999999999999 }
  } {999999999999}
  do_test jrnlmode-5.4.2 {
    execsql { PRAGMA aux.journal_size_limit = 10240 }
  } {10240}
  do_test jrnlmode-5.5 {
    execsql { PRAGMA main.journal_size_limit = 20480 }
  } {20480}
  do_test jrnlmode-5.6 {
    execsql { PRAGMA journal_size_limit }
  } {20480}
  do_test jrnlmode-5.7 {
    execsql { PRAGMA aux.journal_size_limit }
  } {10240}

  do_test jrnlmode-5.8 {
    execsql {
      ATTACH 'test3.db' AS aux2;
      PRAGMA aux2.journal_mode=persist;
    }
  } {persist}

  do_test jrnlmode-5.9 {
    execsql {
      CREATE TABLE main.t1(a, b, c);
      CREATE TABLE aux.t2(a, b, c);
      CREATE TABLE aux2.t3(a, b, c);
    }
  } {}
  do_test jrnlmode-5.10 {
    list \
      [file exists test.db-journal]  \
      [file exists test2.db-journal] \
      [file exists test3.db-journal]
  } {1 1 1}
  do_test jrnlmode-5.11 {
    execsql {
      BEGIN;
      INSERT INTO t3 VALUES(randomblob(1000),randomblob(1000),randomblob(1000));
      INSERT INTO t3 
          SELECT randomblob(1000),randomblob(1000),randomblob(1000) FROM t3;
      INSERT INTO t3 
          SELECT randomblob(1000),randomblob(1000),randomblob(1000) FROM t3;
      INSERT INTO t3 
          SELECT randomblob(1000),randomblob(1000),randomblob(1000) FROM t3;
      INSERT INTO t3 
          SELECT randomblob(1000),randomblob(1000),randomblob(1000) FROM t3;
      INSERT INTO t3 
          SELECT randomblob(1000),randomblob(1000),randomblob(1000) FROM t3;
      INSERT INTO t2 SELECT * FROM t3;
      INSERT INTO t1 SELECT * FROM t2;
      COMMIT;
    }
    list \
      [file exists test.db-journal]  \
      [file exists test2.db-journal] \
      [file exists test3.db-journal] \
      [file size test.db-journal]    \
      [file size test2.db-journal]   \
      [file size test3.db-journal]
  } {1 1 1 0 0 0}

  do_test jrnlmode-5.12 {
    execsql {
      BEGIN;
      UPDATE t1 SET a = randomblob(1000);
    }
    expr {[file size test.db-journal]>30000}
  } {1}
  do_test jrnlmode-5.13 {
    execsql COMMIT
    file size test.db-journal
  } {20480}

  do_test jrnlmode-5.14 {
    execsql {
      BEGIN;
      UPDATE t2 SET a = randomblob(1000);
    }
    expr {[file size test2.db-journal]>30000}
  } {1}
  do_test jrnlmode-5.15 {
    execsql COMMIT
    file size test2.db-journal
  } {10240}

  do_test jrnlmode-5.16 {
    execsql {
      BEGIN;
      UPDATE t3 SET a = randomblob(1000);
    }
    set journalsize [file size test3.db-journal]
    expr {$journalsize>30000}
  } {1}
  do_test jrnlmode-5.17 {
    execsql COMMIT
    set sz [file size test3.db-journal]
    expr {$sz>=$journalsize}
  } {1}

  do_test jrnlmode-5.18 {
    execsql {
      PRAGMA journal_size_limit = -4;
      BEGIN;
      UPDATE t1 SET a = randomblob(1000);
    }
    set journalsize [file size test.db-journal]
    expr {$journalsize>30000}
  } {1}
  do_test jrnlmode-5.19 {
    execsql COMMIT
    set sz [file size test.db-journal]
    expr {$sz>=$journalsize}
  } {1}

  # Test a size-limit of 0.
  #
  do_test jrnlmode-5.20 {
    execsql {
      PRAGMA journal_size_limit = 0;
      BEGIN;
      UPDATE t1 SET a = randomblob(1000);
    }
  } {0}
  do_test jrnlmode-5.21 {
    expr {[file size test.db-journal] > 1024}
  } {1}
  do_test jrnlmode-5.22 {
    execsql COMMIT
    list [file exists test.db-journal] [file size test.db-journal]
  } {1 0}
}
}

ifcapable pragma {
if {[atomic_batch_write test.db]==0} {
  # These tests are not run as part of the "journaltest" permutation,
  # as the test_journal.c layer is incompatible with in-memory journaling.
  if {[permutation] ne "journaltest"} {

    do_test jrnlmode-6.1 {
      execsql {
        PRAGMA journal_mode = truncate;
        CREATE TABLE t4(a, b);
        BEGIN;
          INSERT INTO t4 VALUES(1, 2);
          PRAGMA journal_mode = memory;
      }
    } {truncate truncate}
    do_test jrnlmode-6.2 {
      file exists test.db-journal
    } {1}
    do_test jrnlmode-6.3 {
      execsql {
        COMMIT;
        SELECT * FROM t4;
      }
    } {1 2}
    do_test jrnlmode-6.4 {
      file exists test.db-journal
    } {1}
    do_test jrnlmode-6.5 {
      execsql {
        PRAGMA journal_mode = MEMORY;
        BEGIN;
          INSERT INTO t4 VALUES(3, 4);
      }
      file exists test.db-journal
    } {0}
    do_test jrnlmode-6.7 {
      execsql {
        COMMIT;
        SELECT * FROM t4;
      }
    } {1 2 3 4}
    do_test jrnlmode-6.8 {
      file exists test.db-journal
    } {0}
    do_test jrnlmode-6.9 {
      execsql {
        PRAGMA journal_mode = DELETE;
        BEGIN IMMEDIATE; INSERT INTO t4 VALUES(1,2); COMMIT;
      }
      file exists test.db-journal
    } {0}
  }
}
}

ifcapable pragma {
  catch { db close }
  do_test jrnlmode-7.1 {
    foreach f [glob -nocomplain test.db*] { forcedelete $f }
    sqlite3 db test.db
    execsql {
      PRAGMA journal_mode = memory;
      PRAGMA auto_vacuum = 0;
      PRAGMA page_size = 1024;
      PRAGMA user_version = 5;
      PRAGMA user_version;
    }
  } {memory 5}
  do_test jrnlmode-7.2 { file size test.db } {1024}
}

do_execsql_test jrnlmode-8.1  { PRAGMA locking_mode=EXCLUSIVE } {exclusive}
do_execsql_test jrnlmode-8.2  { CREATE TABLE t1(x) }            {}
do_execsql_test jrnlmode-8.3  { INSERT INTO t1 VALUES(123) }    {}
do_execsql_test jrnlmode-8.4  { SELECT * FROM t1 }              {123}
do_execsql_test jrnlmode-8.5  { PRAGMA journal_mode=PERSIST }   {persist}
do_execsql_test jrnlmode-8.6  { PRAGMA journal_mode=DELETE }    {delete}
do_execsql_test jrnlmode-8.7  { PRAGMA journal_mode=TRUNCATE }  {truncate}
do_execsql_test jrnlmode-8.8  { PRAGMA journal_mode=DELETE }    {delete}
do_execsql_test jrnlmode-8.9  { CREATE TABLE t2(y) }            {}
do_execsql_test jrnlmode-8.10 { INSERT INTO t2 VALUES(456) }    {}
do_execsql_test jrnlmode-8.11 { SELECT * FROM t1, t2 }          {123 456}
do_execsql_test jrnlmode-8.12 { PRAGMA locking_mode=NORMAL }    {normal}
do_execsql_test jrnlmode-8.13 { PRAGMA journal_mode=PERSIST }   {persist}
do_execsql_test jrnlmode-8.14 { PRAGMA journal_mode=TRUNCATE }  {truncate}
do_execsql_test jrnlmode-8.15 { PRAGMA journal_mode=PERSIST }   {persist}
do_execsql_test jrnlmode-8.16 { PRAGMA journal_mode=DELETE }    {delete}
do_execsql_test jrnlmode-8.17 { PRAGMA journal_mode=TRUNCATE }  {truncate}
do_execsql_test jrnlmode-8.18 { PRAGMA locking_mode=EXCLUSIVE } {exclusive}
do_execsql_test jrnlmode-8.19 { CREATE TABLE t3(z) }            {}
do_execsql_test jrnlmode-8.20 { BEGIN IMMEDIATE }               {}
do_execsql_test jrnlmode-8.21 { PRAGMA journal_mode=DELETE }    {delete}
do_execsql_test jrnlmode-8.22 { COMMIT }                        {}
do_execsql_test jrnlmode-8.23 { PRAGMA journal_mode=DELETE }    {delete}
do_execsql_test jrnlmode-8.24 { PRAGMA journal_mode=TRUNCATE }  {truncate}
do_execsql_test jrnlmode-8.25 { PRAGMA locking_mode=NORMAL }    {normal}
do_execsql_test jrnlmode-8.26 { CREATE TABLE t4(w) }            {}
do_execsql_test jrnlmode-8.27 { BEGIN IMMEDIATE }               {}
do_execsql_test jrnlmode-8.28 { PRAGMA journal_mode=DELETE }    {delete}
do_execsql_test jrnlmode-8.29 { COMMIT }                        {}
do_execsql_test jrnlmode-8.30 { PRAGMA journal_mode=DELETE }    {delete}

# Assertion fault on 2015-05-01
do_test jrnlmode-9.1 {
  forcedelete test2.db
  sqlite3 db2 test2.db
  db2 eval {CREATE TEMP TABLE t(l); PRAGMA journal_mode=off;}
  db2 close
} {}
do_execsql_test jrnlmode-9.2 {
  PRAGMA locking_mode = exclusive;
  CREATE TABLE tx(a);
  PRAGMA journal_mode = off;
} {exclusive off}


finish_test
