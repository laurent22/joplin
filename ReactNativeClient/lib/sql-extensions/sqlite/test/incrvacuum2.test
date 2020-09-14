# 2007 May 04
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
# focus of this file is testing the incremental vacuum feature.
#
# $Id: incrvacuum2.test,v 1.6 2009/07/25 13:42:50 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If this build of the library does not support auto-vacuum, omit this
# whole file.
ifcapable {!autovacuum || !pragma} {
  finish_test
  return
}

set testprefix incrvacuum2

# Create a database in incremental vacuum mode that has many
# pages on the freelist.
#
do_test incrvacuum2-1.1 {
  execsql {
    PRAGMA page_size=1024;
    PRAGMA auto_vacuum=incremental;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(zeroblob(30000));
    DELETE FROM t1;
  }
  file size test.db
} {32768}

# Vacuum off a single page.
#
do_test incrvacuum2-1.2 {
  execsql {
    PRAGMA incremental_vacuum(1);
  }
  file size test.db
} {31744}

# Vacuum off five pages
#
do_test incrvacuum2-1.3 {
  execsql {
    PRAGMA incremental_vacuum(5);
  }
  file size test.db
} {26624}

# Vacuum off all the rest
#
do_test incrvacuum2-1.4 {
  execsql {
    PRAGMA incremental_vacuum(1000);
  }
  file size test.db
} {3072}

# Make sure incremental vacuum works on attached databases.
#
ifcapable attach {
  do_test incrvacuum2-2.1 {
    forcedelete test2.db test2.db-journal
    execsql {
      ATTACH DATABASE 'test2.db' AS aux;
      PRAGMA aux.auto_vacuum=incremental;
      CREATE TABLE aux.t2(x);
      INSERT INTO t2 VALUES(zeroblob(30000));
      INSERT INTO t1 SELECT * FROM t2;
      DELETE FROM t2;
      DELETE FROM t1;
    }
    list [file size test.db] [file size test2.db]
  } {32768 32768}
  do_test incrvacuum2-2.2 {
    execsql {
      PRAGMA aux.incremental_vacuum(1)
    }
    list [file size test.db] [file size test2.db]
  } {32768 31744}
  do_test incrvacuum2-2.3 {
    execsql {
      PRAGMA aux.incremental_vacuum(5)
    }
    list [file size test.db] [file size test2.db]
  } {32768 26624}
  do_test incrvacuum2-2.4 {
    execsql {
      PRAGMA main.incremental_vacuum(5)
    }
    list [file size test.db] [file size test2.db]
  } {27648 26624}
  do_test incrvacuum2-2.5 {
    execsql {
      PRAGMA aux.incremental_vacuum
    }
    list [file size test.db] [file size test2.db]
  } {27648 3072}
  do_test incrvacuum2-2.6 {
    execsql {
      PRAGMA incremental_vacuum(1)
    }
    list [file size test.db] [file size test2.db]
  } {26624 3072}
}

do_test incrvacuum2-3.1 {
  execsql {
    PRAGMA auto_vacuum = 'full';
    BEGIN;
    CREATE TABLE abc(a);
    INSERT INTO abc VALUES(randstr(1500,1500));
    COMMIT;
  }
} {}
do_test incrvacuum2-3.2 {
  execsql {
    BEGIN;
    DELETE FROM abc;
    PRAGMA incremental_vacuum;
    COMMIT;
  }
} {}

integrity_check incrvacuum2-3.3

if {[wal_is_capable]} {
  # At one point, when a specific page was being extracted from the b-tree
  # free-list (e.g. during an incremental-vacuum), all trunk pages that
  # occurred before the specific page in the free-list trunk were being
  # written to the journal or wal file. This is not necessary. Only the 
  # extracted page and the page that contains the pointer to it need to
  # be journalled.
  #
  # This problem was fixed by [d03d63d77e] (just before 3.7.6 release).
  #
  # This test case builds a database containing many free pages. Then runs
  # "PRAGMA incremental_vacuum(1)" until the db contains zero free pages.
  # Each "PRAGMA incremental_vacuum(1)" should modify at most 4 pages. The
  # worst case is when a trunk page is removed from the end of the db file.
  # In this case pages written are:
  #
  #   1. The previous trunk page (that contains a pointer to the recycled
  #      trunk page), and
  #   2. The leaf page transformed into a trunk page to replace the recycled
  #      page, and
  #   3. The trunk page that contained a pointer to the leaf page used 
  #      in (2), and
  #   4. Page 1. Page 1 is always updated, even in WAL mode, since it contains
  #      the "number of free-list pages" field.
  #
  db close
  forcedelete test.db
  sqlite3 db test.db

  do_execsql_test 4.1 {
    PRAGMA page_size = 512;
    PRAGMA auto_vacuum = 2;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(400));
    INSERT INTO t1 SELECT * FROM t1;            --    2
    INSERT INTO t1 SELECT * FROM t1;            --    4
    INSERT INTO t1 SELECT * FROM t1;            --    8
    INSERT INTO t1 SELECT * FROM t1;            --   16
    INSERT INTO t1 SELECT * FROM t1;            --   32
    INSERT INTO t1 SELECT * FROM t1;            --  128
    INSERT INTO t1 SELECT * FROM t1;            --  256
    INSERT INTO t1 SELECT * FROM t1;            --  512
    INSERT INTO t1 SELECT * FROM t1;            -- 1024
    INSERT INTO t1 SELECT * FROM t1;            -- 2048
    INSERT INTO t1 SELECT * FROM t1;            -- 4096
    INSERT INTO t1 SELECT * FROM t1;            -- 8192
    DELETE FROM t1 WHERE oid>512;
    DELETE FROM t1;
  }

  do_test 4.2 {
    execsql { 
      PRAGMA journal_mode = WAL;
      PRAGMA incremental_vacuum(1);
    }
  } {wal}
  do_test 4.2.1 {
    execsql { PRAGMA wal_checkpoint }
    file size test.db-wal
  } [expr {32+2*(512+24)}]

  do_test 4.3 {
    db close
    sqlite3 db test.db
    set maxsz 0
    while {[file size test.db] > [expr 512*3]} {
      execsql { PRAGMA journal_mode = WAL }
      execsql { PRAGMA wal_checkpoint }
      execsql { PRAGMA incremental_vacuum(1) }
      set newsz [file size test.db-wal]
      if {$newsz>$maxsz} {set maxsz $newsz}
    }
    set maxsz 
  } [expr {32+3*(512+24)}]
}

finish_test
