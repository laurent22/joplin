# 2008 August 29
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file is focused on testing the pcache module.
#
# $Id: pcache.test,v 1.5 2009/05/08 06:52:48 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

# Only works with a mode-2 pcache where all pcaches share a single set
# of pages.
#
ifcapable {!memorymanage && threadsafe} {
  finish_test
  return
}

# The pcache module limits the number of pages available to purgeable
# caches to the sum of the 'cache_size' values for the set of open
# caches. This block of tests, pcache-1.*, test that the library behaves
# corrctly when it is forced to exceed this limit.
#
do_test pcache-1.1 {
  db close
  pcache_stats
} {current 0 max 0 min 0 recyclable 0}

do_test pcache-1.2 {
  sqlite3 db test.db
  execsql {
    PRAGMA cache_size=12;
    PRAGMA auto_vacuum=0;
    PRAGMA mmap_size=0;
  }
  pcache_stats
} {current 1 max 12 min 10 recyclable 1}

do_test pcache-1.3 {
  execsql {
    BEGIN;
    CREATE TABLE t1(a, b, c);
    CREATE TABLE t2(a, b, c);
    CREATE TABLE t3(a, b, c);
    CREATE TABLE t4(a, b, c);
    CREATE TABLE t5(a, b, c);
  }
  pcache_stats
} {current 6 max 12 min 10 recyclable 0}

do_test pcache-1.4 {
  execsql {
    CREATE TABLE t6(a, b, c);
    CREATE TABLE t7(a, b, c);
    CREATE TABLE t8(a, b, c);
    CREATE TABLE t9(a, b, c);
  }
  pcache_stats
} {current 10 max 12 min 10 recyclable 0}

do_test pcache-1.5 {
  sqlite3 db2 test.db
  execsql "PRAGMA cache_size; PRAGMA cache_size=10" db2
  pcache_stats
} {current 11 max 22 min 20 recyclable 1}

do_test pcache-1.6.1 {
  execsql {
    BEGIN;
    SELECT * FROM sqlite_master;
  } db2
  pcache_stats
} {current 11 max 22 min 20 recyclable 0}

# At this point connection db2 has a read lock on the database file and a 
# single pinned page in its cache. Connection [db] is holding 10 dirty 
# pages. It cannot recycle them because of the read lock held by db2.
#
do_test pcache-1.6.2 {
  execsql {
    CREATE INDEX i1 ON t1(a, b);
    CREATE INDEX i2 ON t2(a, b);
    CREATE INDEX i3 ON t3(a, b);
    CREATE INDEX i4 ON t4(a, b);
    CREATE INDEX i5 ON t5(a, b);
    CREATE INDEX i6 ON t6(a, b);
    CREATE INDEX i7 ON t7(a, b);
    CREATE INDEX i8 ON t8(a, b);
    CREATE INDEX i9 ON t9(a, b);
    CREATE INDEX i10 ON t9(a, b);
    CREATE INDEX i11 ON t9(a, b);
  } 
  pcache_stats
} {current 23 max 22 min 20 recyclable 0}

do_test pcache-1.7 {
  execsql {
    CREATE TABLE t10(a, b, c);
  } 
  pcache_stats
} {current 24 max 22 min 20 recyclable 0}

# Rolling back the transaction held by db2 at this point releases a pinned
# page. Because the number of allocated pages is greater than the 
# configured maximum, this page should be freed immediately instead of
# recycled.
#
do_test pcache-1.8 {
  execsql {ROLLBACK} db2
  pcache_stats
} {current 23 max 22 min 20 recyclable 0}

do_test pcache-1.9 {
  execsql COMMIT
  pcache_stats
} {current 22 max 22 min 20 recyclable 22}

do_test pcache-1.10 {
  db2 close
  pcache_stats
} {current 12 max 12 min 10 recyclable 12}

do_test pcache-1.11 {
  execsql { PRAGMA cache_size = 20 }
  pcache_stats
} {current 12 max 20 min 10 recyclable 12}

do_test pcache-1.12 {
  execsql { 
    SELECT * FROM t1 ORDER BY a; SELECT * FROM t1;
    SELECT * FROM t2 ORDER BY a; SELECT * FROM t2;
    SELECT * FROM t3 ORDER BY a; SELECT * FROM t3;
    SELECT * FROM t4 ORDER BY a; SELECT * FROM t4;
    SELECT * FROM t5 ORDER BY a; SELECT * FROM t5;
    SELECT * FROM t6 ORDER BY a; SELECT * FROM t6;
    SELECT * FROM t7 ORDER BY a; SELECT * FROM t7;
    SELECT * FROM t8 ORDER BY a; SELECT * FROM t8;
    SELECT * FROM t9 ORDER BY a; SELECT * FROM t9;
  }
  pcache_stats
} {current 19 max 20 min 10 recyclable 19}

do_test pcache-1.13 {
  execsql { PRAGMA cache_size = 15 }
  pcache_stats
} {current 15 max 15 min 10 recyclable 15}

do_test pcache-1.14 {
  hexio_write test.db 24 [hexio_render_int32 1000]
  execsql { SELECT * FROM sqlite_master }
  pcache_stats
} {current 2 max 15 min 10 recyclable 2}

do_test pcache-1.15 {
  execsql { 
    SELECT * FROM t1 ORDER BY a; SELECT * FROM t1;
    SELECT * FROM t2 ORDER BY a; SELECT * FROM t2;
    SELECT * FROM t3 ORDER BY a; SELECT * FROM t3;
    SELECT * FROM t4 ORDER BY a; SELECT * FROM t4;
    SELECT * FROM t5 ORDER BY a; SELECT * FROM t5;
    SELECT * FROM t6 ORDER BY a; SELECT * FROM t6;
    SELECT * FROM t7 ORDER BY a; SELECT * FROM t7;
    SELECT * FROM t8 ORDER BY a; SELECT * FROM t8;
    SELECT * FROM t9 ORDER BY a; SELECT * FROM t9;
  }
  pcache_stats
} {current 14 max 15 min 10 recyclable 14}

finish_test
