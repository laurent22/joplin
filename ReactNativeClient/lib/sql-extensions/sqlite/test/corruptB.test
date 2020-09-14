# 2008 Sep 10
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
# segfault if it sees a corrupt database file.  It specifically focuses
# on loops in the B-Tree structure. A loop is formed in a B-Tree structure
# when there exists a page that is both an a descendent or ancestor of
# itself.
#
# Also test that an SQLITE_CORRUPT error is returned if a B-Tree page
# contains a (corrupt) reference to a page greater than the configured
# maximum page number.
#
# $Id: corruptB.test,v 1.4 2009/07/21 19:25:24 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

# These tests deal with corrupt database files
#
database_may_be_corrupt


do_test corruptB-1.1 {
  execsql {
    PRAGMA auto_vacuum = 1;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(200));
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
  }
  expr {[file size test.db] > (1024*9)}
} {1}
integrity_check corruptB-1.2

forcecopy test.db bak.db

# Set the right-child of a B-Tree rootpage to refer to the root-page itself.
#
do_test corruptB-1.3.1 {
  set ::root [execsql {SELECT rootpage FROM sqlite_master}]
  set ::offset [expr {($::root-1)*1024}]
  hexio_write test.db [expr $offset+8] [hexio_render_int32 $::root]
} {4}
do_test corruptB-1.3.2 {
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 }
} {1 {database disk image is malformed}}

# Set the left-child of a cell in a B-Tree rootpage to refer to the 
# root-page itself.
#
do_test corruptB-1.4.1 {
  db close
  forcecopy bak.db test.db
  set cell_offset [hexio_get_int [hexio_read test.db [expr $offset+12] 2]]
  hexio_write test.db [expr $offset+$cell_offset] [hexio_render_int32 $::root]
} {4}
do_test corruptB-1.4.2 {
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 }
} {1 {database disk image is malformed}}

# Now grow the table B-Tree so that it is more than 2 levels high.
#
do_test corruptB-1.5.1 {
  db close
  forcecopy bak.db test.db
  sqlite3 db test.db
  execsql {
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
    INSERT INTO t1 SELECT randomblob(200) FROM t1;
  }
} {}

forcecopy test.db bak.db

# Set the right-child pointer of the right-child of the root page to point
# back to the root page.
#
do_test corruptB-1.6.1 {
  db close
  set iRightChild [hexio_get_int [hexio_read test.db [expr $offset+8] 4]]
  set c_offset [expr ($iRightChild-1)*1024]
  hexio_write test.db [expr $c_offset+8] [hexio_render_int32 $::root]
} {4}
do_test corruptB-1.6.2 {
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 }
} {1 {database disk image is malformed}}

# Set the left-child pointer of a cell of the right-child of the root page to
# point back to the root page.
#
do_test corruptB-1.7.1 {
  db close
  forcecopy bak.db test.db
  set cell_offset [hexio_get_int [hexio_read test.db [expr $c_offset+12] 2]]
  hexio_write test.db [expr $c_offset+$cell_offset] [hexio_render_int32 $::root]
} {4}
do_test corruptB-1.7.2 {
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 }
} {1 {database disk image is malformed}}

do_test corruptB-1.8.1 {
  db close
  set cell_offset [hexio_get_int [hexio_read test.db [expr $offset+12] 2]]
  set iLeftChild [
      hexio_get_int [hexio_read test.db [expr $offset+$cell_offset] 4]
  ]
  set c_offset [expr ($iLeftChild-1)*1024]
  hexio_write test.db [expr $c_offset+8] [hexio_render_int32 $::root]
} {4}
do_test corruptB-1.8.2 {
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 }
} {1 {database disk image is malformed}}

# Set the left-child pointer of a cell of the right-child of the root page to
# point back to the root page.
#
do_test corruptB-1.9.1 {
  db close
  forcecopy bak.db test.db
  set cell_offset [hexio_get_int [hexio_read test.db [expr $c_offset+12] 2]]
  hexio_write test.db [expr $c_offset+$cell_offset] [hexio_render_int32 $::root]
} {4}
do_test corruptB-1.9.2 {
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 }
} {1 {database disk image is malformed}}

#---------------------------------------------------------------------------

do_test corruptB-2.1.1 {
  db close
  forcecopy bak.db test.db
  hexio_write test.db [expr $offset+8] [hexio_render_int32 0x6FFFFFFF]
} {4}
do_test corruptB-2.1.2 {
  sqlite3 db test.db
  catchsql { SELECT * FROM t1 }
} {1 {database disk image is malformed}}

#---------------------------------------------------------------------------

# Corrupt the header-size field of a database record.
#
do_test corruptB-3.1.1 {
  db close
  forcecopy bak.db test.db
  sqlite3 db test.db
  set v [string repeat abcdefghij 200]
  execsql {
    CREATE TABLE t2(a);
    INSERT INTO t2 VALUES($v);
  }
  set t2_root [execsql {SELECT rootpage FROM sqlite_master WHERE name = 't2'}]
  set iPage [expr ($t2_root-1)*1024]
  set iCellarray [expr $iPage + 8]
  set iRecord [hexio_get_int [hexio_read test.db $iCellarray 2]]
  db close
  hexio_write test.db [expr $iPage+$iRecord+3] FF00
} {2}
do_test corruptB-3.1.2 {
  sqlite3 db test.db
  catchsql { SELECT * FROM t2 }
} {1 {database disk image is malformed}}

finish_test
