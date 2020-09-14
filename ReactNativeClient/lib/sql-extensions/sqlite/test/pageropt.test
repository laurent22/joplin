# 2007 April 12
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
# The focus of the tests in this file are to verify that the
# pager optimizations implemented in version 3.3.14 work.
#
# $Id: pageropt.test,v 1.5 2008/08/20 14:49:25 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
do_not_use_codec

ifcapable {!pager_pragmas||secure_delete||direct_read} {
  finish_test
  return
}

# A non-zero reserved_bytes value changes the number of pages in the 
# database file, which messes up the results in this test.
if {[nonzero_reserved_bytes]} {finish_test; return;}

# Run the SQL statement supplied by the argument and return
# the results.  Prepend four integers to the beginning of the
# result which are
#
#     (1)  The number of page reads from the database
#     (2)  The number of page writes to the database
#     (3)  The number of page writes to the journal
#     (4)  The number of cache pages freed
#
proc pagercount_sql {sql {db db}} {
  global sqlite3_pager_readdb_count
  global sqlite3_pager_writedb_count
  global sqlite3_pager_writej_count
  global sqlite3_pager_pgfree_count
  set sqlite3_pager_readdb_count 0
  set sqlite3_pager_writedb_count 0
  set sqlite3_pager_writej_count 0
  set r [$db eval $sql]
  set cnt [list $sqlite3_pager_readdb_count \
                $sqlite3_pager_writedb_count \
                $sqlite3_pager_writej_count ]
  return [concat $cnt $r]
}

# Setup the test database
#
do_test pageropt-1.1 {
  sqlite3_soft_heap_limit 0
  execsql {
    PRAGMA auto_vacuum = OFF;
    PRAGMA page_size = 1024;
  }
  pagercount_sql {
    CREATE TABLE t1(x);
  }
} {0 2 0}
do_test pageropt-1.2 {
  pagercount_sql {
    INSERT INTO t1 VALUES(randomblob(5000));
  }
} {0 6 2}

# Verify that values remain in cache on for subsequent reads.
# We should not have to go back to disk.
#
do_test pageropt-1.3 {
  pagercount_sql {
    SELECT length(x) FROM t1
  }
} {0 0 0 5000}

# If another thread reads the database, the original cache
# remains valid.
#
sqlite3 db2 test.db
set blobcontent [db2 one {SELECT hex(x) FROM t1}]
do_test pageropt-1.4 {
  pagercount_sql {
    SELECT hex(x) FROM t1
  }
} [list 0 0 0 $blobcontent]

# But if the other thread modifies the database, then the cache
# must refill.
#
ifcapable mmap {
  set x [expr {[permutation]=="mmap" ? 1 : 6}]
} else {
  set x 6
}
do_test pageropt-1.5 {
  db2 eval {CREATE TABLE t2(y)}
  pagercount_sql {
    SELECT hex(x) FROM t1
  }
} [list $x 0 0 $blobcontent]
do_test pageropt-1.6 {
  pagercount_sql {
    SELECT hex(x) FROM t1
  }
} [list 0 0 0 $blobcontent]

# Verify that the last page of an overflow chain is not read from
# disk when deleting a row.  The one row of t1(x) has four pages
# of overflow.  So deleting that row from t1 should involve reading
# the sqlite_master table (1 page) the main page of t1 (1 page) and
# the three overflow pages of t1 for a total of 5 pages.
#
# Pages written are page 1 (for the freelist pointer), the root page
# of the table, and one of the overflow chain pointers because it
# becomes the trunk of the freelist.  Total 3.
#
do_test pageropt-2.1 {
  db close
  sqlite3 db test.db
  pagercount_sql {
    DELETE FROM t1 WHERE rowid=1
  }
} {5 3 3}

# When pulling pages off of the freelist, there is no reason
# to actually bring in the old content.
#
do_test pageropt-2.2 {
  db close
  sqlite3 db test.db
  pagercount_sql {
    INSERT INTO t1 VALUES(randomblob(1500));
  }
} {3 4 3}
do_test pageropt-2.3 {
  pagercount_sql {
    INSERT INTO t1 VALUES(randomblob(1500));
  }
} {0 4 3}

# Note the new optimization that when pulling the very last page off of the
# freelist we do not read the content of that page.
#
do_test pageropt-2.4 {
  pagercount_sql {
    INSERT INTO t1 VALUES(randomblob(1500));
  }
} {0 5 3}

# Appending a large quantity of data does not involve writing much
# to the journal file.
#
do_test pageropt-3.1 {
  pagercount_sql {
    INSERT INTO t2 SELECT * FROM t1;
  }
} {1 7 2}

# Once again, we do not need to read the last page of an overflow chain
# while deleting.
#
do_test pageropt-3.2 {
  pagercount_sql {
    DROP TABLE t2;
  }
} {0 2 3}
do_test pageropt-3.3 {
  pagercount_sql {
    DELETE FROM t1;
  }
} {0 3 3}

# There are now 11 pages on the freelist.  Move them all into an
# overflow chain by inserting a single large record.  Starting from
# a cold cache, only page 1, the root page of table t1, and the trunk
# of the freelist need to be read (3 pages).  And only those three
# pages need to be journalled.  But 13 pages need to be written:
# page1, the root page of table t1, and an 11 page overflow chain.
#
do_test pageropt-4.1 {
  db close
  sqlite3 db test.db
  pagercount_sql {
    INSERT INTO t1 VALUES(randomblob(11300))
  }
} {3 13 3}

# Now we delete that big entries starting from a cold cache and an
# empty freelist.  The first 10 of the 11 pages overflow chain have
# to be read, together with page1 and the root of the t1 table.  12
# reads total.  But only page1, the t1 root, and the trunk of the
# freelist need to be journalled and written back.
#
do_test pageropt-4.2 {
  db close
  sqlite3 db test.db
  pagercount_sql {
    DELETE FROM t1
  }
} {12 3 3}

sqlite3_soft_heap_limit $cmdlinearg(soft-heap-limit)
catch {db2 close}
finish_test
