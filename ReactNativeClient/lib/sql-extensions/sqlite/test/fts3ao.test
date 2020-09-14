# 2007 June 20
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
# focus of this script is testing the FTS3 module.
#
# $Id: fts3ao.test,v 1.1 2007/08/20 17:38:42 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is not defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

set ::testprefix fts3ao

#---------------------------------------------------------------------
# These tests, fts3ao-1.*, test that ticket #2429 is fixed.
#
db eval {
  CREATE VIRTUAL TABLE t1 USING fts3(a, b, c);
  INSERT INTO t1(a, b, c) VALUES('one three four', 'one four', 'one four two');
}
do_test fts3ao-1.1 {
  execsql {
    SELECT rowid, snippet(t1) FROM t1 WHERE c MATCH 'four';
  }
} {1 {one <b>four</b> two}}
do_test fts3ao-1.2 {
  execsql {
    SELECT rowid, snippet(t1) FROM t1 WHERE b MATCH 'four';
  }
} {1 {one <b>four</b>}}
do_test fts3ao-1.3 {
  execsql {
    SELECT rowid, snippet(t1) FROM t1 WHERE a MATCH 'four';
  }
} {1 {one three <b>four</b>}}

#---------------------------------------------------------------------
# Test that it is possible to rename an fts3 table.
#
do_test fts3ao-2.1 {
  execsql { SELECT tbl_name FROM sqlite_master WHERE type = 'table'}
} {t1 t1_content t1_segments t1_segdir}
do_test fts3ao-2.2 {
  execsql { ALTER TABLE t1 RENAME to fts_t1; }
} {}
do_test fts3ao-2.3 {
  execsql { SELECT rowid, snippet(fts_t1) FROM fts_t1 WHERE a MATCH 'four'; }
} {1 {one three <b>four</b>}}
do_test fts3ao-2.4 {
  execsql { SELECT tbl_name FROM sqlite_master WHERE type = 'table'}
} {fts_t1 fts_t1_content fts_t1_segments fts_t1_segdir}

# See what happens when renaming the fts3 table fails.
#
do_test fts3ao-2.5 {
  catchsql {
    CREATE TABLE t1_segdir(a, b, c);
    ALTER TABLE fts_t1 RENAME to t1;
  }
} {1 {SQL logic error}}
do_test fts3ao-2.6 {
  execsql { SELECT rowid, snippet(fts_t1) FROM fts_t1 WHERE a MATCH 'four'; }
} {1 {one three <b>four</b>}}
do_test fts3ao-2.7 {
  execsql { SELECT tbl_name FROM sqlite_master WHERE type = 'table'}
} {fts_t1 fts_t1_content fts_t1_segments fts_t1_segdir t1_segdir}

# See what happens when renaming the fts3 table fails inside a transaction.
#
do_test fts3ao-2.8 {
  execsql {
    BEGIN;
    INSERT INTO fts_t1(a, b, c) VALUES('one two three', 'one four', 'one two');
  }
} {}
do_test fts3ao-2.9 {
  catchsql {
    ALTER TABLE fts_t1 RENAME to t1;
  }
} {1 {SQL logic error}}
do_test fts3ao-2.10 {
  execsql { SELECT rowid, snippet( fts_t1 ) FROM fts_t1 WHERE a MATCH 'four'; }
} {1 {one three <b>four</b>}}
do_test fts3ao-2.11 {
  execsql { SELECT tbl_name FROM sqlite_master WHERE type = 'table'}
} {fts_t1 fts_t1_content fts_t1_segments fts_t1_segdir t1_segdir}
do_test fts3ao-2.12 {
  execsql COMMIT
  execsql {SELECT a FROM fts_t1}
} {{one three four} {one two three}}
do_test fts3ao-2.12 {
  execsql { SELECT a, b, c FROM fts_t1 WHERE c MATCH 'four'; }
} {{one three four} {one four} {one four two}}

#-------------------------------------------------------------------
# Close, delete and reopen the database. The following test should 
# be run on an initially empty db.
#
db close
forcedelete test.db test.db-journal
sqlite3 db test.db

do_test fts3ao-3.1 {
  execsql {
    CREATE VIRTUAL TABLE t1 USING fts3(a, b, c);
    INSERT INTO t1(a, b, c) VALUES('one three four', 'one four', 'one two');
    SELECT a, b, c FROM t1 WHERE c MATCH 'two';
  }
} {{one three four} {one four} {one two}}

# This test was crashing at one point.
#
do_test fts3ao-3.2 {
  execsql {
    SELECT a, b, c FROM t1 WHERE c MATCH 'two';
    CREATE TABLE t3(a, b, c);
    SELECT a, b, c FROM t1 WHERE  c  MATCH 'two';
  }
} {{one three four} {one four} {one two} {one three four} {one four} {one two}}

#---------------------------------------------------------------------
# Test that it is possible to rename an fts3 table in an attached 
# database.
#
forcedelete test2.db test2.db-journal

do_test fts3ao-3.1 {
  execsql {
    ATTACH 'test2.db' AS aux;
    CREATE VIRTUAL TABLE aux.t1 USING fts3(a, b, c);
    INSERT INTO aux.t1(a, b, c) VALUES(
      'neung song sahm', 'neung see', 'neung see song'
    );
  }
} {}

do_test fts3ao-3.2 {
  execsql { SELECT a, b, c FROM aux.t1 WHERE a MATCH 'song'; }
} {{neung song sahm} {neung see} {neung see song}}

do_test fts3ao-3.3 {
  execsql { SELECT a, b, c FROM t1 WHERE c MATCH 'two'; }
} {{one three four} {one four} {one two}}

do_test fts3ao-3.4 {
  execsql { ALTER TABLE aux.t1 RENAME TO t2 }
} {}

do_test fts3ao-3.2 {
  execsql { SELECT a, b, c FROM t2 WHERE a MATCH 'song'; }
} {{neung song sahm} {neung see} {neung see song}}

do_test fts3ao-3.3 {
  execsql { SELECT a, b, c FROM t1 WHERE c MATCH 'two'; }
} {{one three four} {one four} {one two}}

#---------------------------------------------------------------------
# Test that it is possible to rename an fts3 table within a 
# transaction.
#
do_test fts3ao-4.1 {
  execsql {
    CREATE VIRTUAL TABLE t4 USING fts3;
    INSERT INTO t4 VALUES('the quick brown fox');
  }
} {}
do_test fts3ao-4.2 {
  execsql {
    BEGIN;
      INSERT INTO t4 VALUES('jumped over the');
  }
} {}
do_test fts3ao-4.3 { execsql { ALTER TABLE t4 RENAME TO t5; } } {}
do_test fts3ao-4.4 { execsql { INSERT INTO t5 VALUES('lazy dog'); } } {}
do_test fts3ao-4.5 { execsql COMMIT } {}
do_test fts3ao-4.6 {
  execsql { SELECT * FROM t5 }
} {{the quick brown fox} {jumped over the} {lazy dog}}
do_test fts3ao-4.7 {
  execsql {
    BEGIN;
      INSERT INTO t5 VALUES('Down came a jumbuck to drink at that billabong');
      ALTER TABLE t5 RENAME TO t6;
      INSERT INTO t6 VALUES('Down came the troopers, one, two, three');
    ROLLBACK;
    SELECT * FROM t5;
  }
} {{the quick brown fox} {jumped over the} {lazy dog}}
do_execsql_test fts3ao-4.8 {
  SELECT snippet(t5, '[', ']') FROM t5 WHERE t5 MATCH 'the'
} {{[the] quick brown fox} {jumped over [the]}}

# Test that it is possible to rename an FTS4 table. Renaming an FTS4 table
# involves renaming the extra %_docsize and %_stat tables.
#
do_execsql_test 5.1 {
  CREATE VIRTUAL TABLE t7 USING FTS4;
  INSERT INTO t7 VALUES('coined by a German clinician');
  SELECT count(*) FROM sqlite_master WHERE name LIKE 't7%';
  SELECT count(*) FROM sqlite_master WHERE name LIKE 't8%';
} {6 0}
do_execsql_test 5.2 {
  ALTER TABLE t7 RENAME TO t8;
  SELECT count(*) FROM sqlite_master WHERE name LIKE 't7%';
  SELECT count(*) FROM sqlite_master WHERE name LIKE 't8%';
} {0 6}

# At one point this was causing a memory leak.
#
foreach {tn sql} {
  1 {}
  2 { INSERT INTO ft(ft) VALUES('merge=2,2'); }
} {
  reset_db
  do_execsql_test 6.$tn.1 "
    CREATE TABLE t1(x);
    CREATE VIRTUAL TABLE ft USING fts3;
    INSERT INTO ft VALUES('hello world');
    $sql
  "

  db close
  sqlite3 db test.db
  do_execsql_test 6.$tn.2 { SELECT * FROM t1 } {}

  do_test 6.$tn.3 {
    sqlite3 db2 test.db
    db2 eval { DROP TABLE t1 }
    db2 close
    set stmt [sqlite3_prepare db { SELECT * FROM ft } -1 dummy]
    sqlite3_finalize $stmt
  } {SQLITE_OK}
  db close
}

finish_test
