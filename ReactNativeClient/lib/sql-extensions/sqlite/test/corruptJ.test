# 2015-03-30
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
# Corruption consisting of a database page that thinks it is a child
# of itself.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix corruptJ

if {[permutation]=="mmap"} {
  finish_test
  return
}

# This module uses hard-coded offsets which do not work if the reserved_bytes
# value is nonzero.
if {[nonzero_reserved_bytes]} {finish_test; return;}

database_may_be_corrupt

# Initialize the database.
#
do_execsql_test 1.1 {
  PRAGMA page_size=1024;
  PRAGMA auto_vacuum=0;
  CREATE TABLE t1(a,b);
  WITH RECURSIVE c(i) AS (VALUES(1) UNION ALL SELECT i+1 FROM c WHERE i<10)
    INSERT INTO t1(a,b) SELECT i, zeroblob(700) FROM c;
} {}
db close

# Corrupt the root page of the t1 table such that the left-child pointer
# for the very first cell points back to the root.  Then try to DROP the
# table.  The clearDatabasePage() routine should not loop.
#
do_test 1.2 {
  hexio_write test.db [expr {2*1024-2}] 02
  sqlite3 db test.db
  catchsql { DROP TABLE t1 }
} {1 {database disk image is malformed}}

# Similar test using a WITHOUT ROWID table
#
do_test 2.1 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    PRAGMA page_size=1024;
    PRAGMA auto_vacuum=0;
    CREATE TABLE t1(a,b,PRIMARY KEY(a,b)) WITHOUT ROWID;
    WITH RECURSIVE c(i) AS (VALUES(1) UNION ALL SELECT i+1 FROM c WHERE i<100)
      INSERT INTO t1(a,b) SELECT i, zeroblob(200) FROM c;
  }
} {}

# The table is three levels deep.  Corrupt the left child of an intermediate
# page so that it points back to the root page.
#
do_test 2.2 {
  db close
  hexio_read test.db [expr {9*1024+391}] 8
} {00000008814D0401}
do_test 2.2b {
  hexio_write test.db [expr {9*1024+391}] 00000002
  sqlite3 db test.db
  catchsql { PRAGMA secure_delete=ON; DROP TABLE t1; }
} {1 {database disk image is malformed}}

finish_test
