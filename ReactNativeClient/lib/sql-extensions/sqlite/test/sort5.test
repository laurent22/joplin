# 2014 September 15.
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix sort5


#-------------------------------------------------------------------------
# Verify that sorting works with a version 1 sqlite3_io_methods structure.
#
testvfs tvfs -iversion 1 -default true
reset_db
do_execsql_test 1.0 {
  PRAGMA mmap_size = 10000000;
  PRAGMA cache_size = 10;
  CREATE TABLE t1(a, b);
} {0}

do_test 1.1 {
  execsql BEGIN
  for {set i 0} {$i < 2000} {incr i} {
    execsql { INSERT INTO t1 VALUES($i, randomblob(2000)) }
  }
  execsql COMMIT
} {}

do_execsql_test 1.2 {
  CREATE INDEX i1 ON t1(b);
}

db close
tvfs delete

#-------------------------------------------------------------------------
# Test that the PMA size is determined correctly. The PMA size should be
# roughly the same amount of memory allocated to the main pager cache, or
# 250 pages if this is larger.
#
testvfs tvfs
tvfs script tv_callback
tvfs filter {xOpen xWrite}

proc tv_callback {method args} {
  global iTemp
  global F
  switch $method {
    xOpen {
      if {[lindex $args 0]==""} { return "temp[incr iTemp]" }
      return "SQLITE_OK"
    }

    xWrite {
      foreach {filename id off amt} $args {}
      if {[info exists F($id)]==0 || $F($id)<($off + $amt)} {
        set F($id) [expr $off+$amt]
      }
    }
  }
}

catch { db close }
forcedelete test.db
sqlite3 db test.db -vfs tvfs
execsql { CREATE TABLE t1(x) }
execsql { PRAGMA temp_store = 1 }

# Each iteration of the following loop attempts to sort 10001 records
# each a bit over 100 bytes in size. In total a little more than 1MiB 
# of data.
#
foreach {tn pgsz cachesz bTemp} {
  1 4096   1000  0
  2 1024   1000  1

  3 4096  -1000  1
  4 1024  -1000  1

  5 4096  -9000  0
  6 1024  -9000  0
} {
  if {$::TEMP_STORE>2} {
    set bTemp 0
  }
  do_execsql_test 2.$tn.0 "
    PRAGMA page_size = $pgsz;
    VACUUM;
    PRAGMA cache_size = $cachesz;
  "

  if {[db one {PRAGMA page_size}]!=$pgsz} {
    # SEE is not able to change page sizes and that messes up the
    # results that follow.
    continue
  }

  do_test 2.$tn.1 {
    set ::iTemp 0
    catch { array unset F }
    execsql {
      WITH x(i, j) AS (
        SELECT 1, randomblob(100)
        UNION ALL
        SELECT i+1, randomblob(100) FROM x WHERE i<10000
      )
      SELECT * FROM x ORDER BY j;
    }
    expr {[array names F]!=""}
  } $bTemp
}

finish_test
