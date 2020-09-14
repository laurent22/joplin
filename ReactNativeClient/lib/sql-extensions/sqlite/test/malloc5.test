# 2005 November 30
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
# This file contains test cases focused on the two memory-management APIs, 
# sqlite3_soft_heap_limit() and sqlite3_release_memory().
#
# Prior to version 3.6.2, calling sqlite3_release_memory() or exceeding
# the configured soft heap limit could cause sqlite to upgrade database 
# locks and flush dirty pages to the file system. As of 3.6.2, this is
# no longer the case. In version 3.6.2, sqlite3_release_memory() only
# reclaims clean pages. This test file has been updated accordingly.
#
# $Id: malloc5.test,v 1.22 2009/04/11 19:09:54 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
db close

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping malloc5 tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}

# Skip these tests if OMIT_MEMORY_MANAGEMENT was defined at compile time.
ifcapable !memorymanage {
   finish_test
   return
}

# The sizes of memory allocations from system malloc() might vary,
# depending on the memory allocator algorithms used.  The following
# routine is designed to support answers that fall within a range
# of values while also supplying easy-to-understand "expected" values
# when errors occur.
#
proc value_in_range {target x args} {
  set v [lindex $args 0]
  if {$v!=""} {
    if {$v<$target*$x} {return $v}
    if {$v>$target/$x} {return $v}
  }
  return "number between [expr {int($target*$x)}] and [expr {int($target/$x)}]"
}
set mrange 0.98   ;#  plus or minus 2%

test_set_config_pagecache 0 100

sqlite3_soft_heap_limit 0
sqlite3 db test.db
# db eval {PRAGMA cache_size=1}

do_test malloc5-1.1 {
  # Simplest possible test. Call sqlite3_release_memory when there is exactly
  # one unused page in a single pager cache. The page cannot be freed, as
  # it is dirty. So sqlite3_release_memory() returns 0.
  #
  execsql {
    PRAGMA auto_vacuum=OFF;
    BEGIN;
    CREATE TABLE abc(a, b, c);
  }
  sqlite3_release_memory
} {0}

do_test malloc5-1.2 {
  # Test that the transaction started in the above test is still active.
  # The lock on the database file should not have been upgraded (this was
  # not the case before version 3.6.2).
  #
  sqlite3 db2 test.db
  execsql {PRAGMA cache_size=2; SELECT * FROM sqlite_master } db2
} {}
do_test malloc5-1.3 {
  # Call [sqlite3_release_memory] when there is exactly one unused page 
  # in the cache belonging to db2.
  #
  set ::pgalloc [sqlite3_release_memory]
  value_in_range 1288 0.75
} [value_in_range 1288 0.75]

do_test malloc5-1.4 {
  # Commit the transaction and open a new one. Read 1 page into the cache.
  # Because the page is not dirty, it is eligible for collection even
  # before the transaction is concluded.
  #
  execsql {
    COMMIT;
    BEGIN;
    SELECT * FROM abc;
  }
  value_in_range $::pgalloc $::mrange [sqlite3_release_memory]
} [value_in_range $::pgalloc $::mrange]

do_test malloc5-1.5 {
  # Conclude the transaction opened in the previous [do_test] block. This
  # causes another page (page 1) to become eligible for recycling.
  #
  execsql { COMMIT }
  value_in_range $::pgalloc $::mrange [sqlite3_release_memory]
} [value_in_range $::pgalloc $::mrange]

do_test malloc5-1.6 {
  # Manipulate the cache so that it contains two unused pages. One requires 
  # a journal-sync to free, the other does not.
  db2 close
  execsql {
    BEGIN;
    CREATE TABLE def(d, e, f);
    SELECT * FROM abc;
  }
  value_in_range $::pgalloc $::mrange [sqlite3_release_memory 500]
} [value_in_range $::pgalloc $::mrange]
do_test malloc5-1.7 {
  # Database should not be locked this time. 
  sqlite3 db2 test.db
  catchsql { SELECT * FROM abc } db2
} {0 {}}
do_test malloc5-1.8 {
  # Try to release another block of memory. This will fail as the only
  # pages currently in the cache are dirty (page 3) or pinned (page 1).
  db2 close
  sqlite3_release_memory 500
} 0
do_test malloc5-1.8 {
  # Database is still not locked.
  #
  sqlite3 db2 test.db
  catchsql { SELECT * FROM abc } db2
} {0 {}}
do_test malloc5-1.9 {
  execsql {
    COMMIT;
  }
} {}

do_test malloc5-2.1 {
  # Put some data in tables abc and def. Both tables are still wholly 
  # contained within their root pages.
  execsql {
    INSERT INTO abc VALUES(1, 2, 3);
    INSERT INTO abc VALUES(4, 5, 6);
    INSERT INTO def VALUES(7, 8, 9);
    INSERT INTO def VALUES(10,11,12);
  }
} {}
do_test malloc5-2.2 {
  # Load the root-page for table def into the cache. Then query table abc. 
  # Halfway through the query call sqlite3_release_memory(). The goal of this
  # test is to make sure we don't free pages that are in use (specifically, 
  # the root of table abc).
  sqlite3_release_memory
  set nRelease 0
  execsql { 
    BEGIN;
    SELECT * FROM def;
  }
  set data [list]
  db eval {SELECT * FROM abc} {
    incr nRelease [sqlite3_release_memory]
    lappend data $a $b $c
  }
  execsql {
    COMMIT;
  }
  value_in_range $::pgalloc $::mrange $nRelease
} [value_in_range $::pgalloc $::mrange]
do_test malloc5-2.2.1 {
  set data
} {1 2 3 4 5 6}

do_test malloc5-3.1 {
  # Simple test to show that if two pagers are opened from within this
  # thread, memory is freed from both when sqlite3_release_memory() is
  # called.
  execsql {
    BEGIN;
    SELECT * FROM abc;
  }
  execsql {
    SELECT * FROM sqlite_master;
    BEGIN;
    SELECT * FROM def;
  } db2
  value_in_range [expr $::pgalloc*2] 0.99 [sqlite3_release_memory]
} [value_in_range [expr $::pgalloc * 2] 0.99]
do_test malloc5-3.2 {
  concat \
    [execsql {SELECT * FROM abc; COMMIT}] \
    [execsql {SELECT * FROM def; COMMIT} db2]
} {1 2 3 4 5 6 7 8 9 10 11 12}

db2 close
puts "Highwater mark: [sqlite3_memory_highwater]"

# The following two test cases each execute a transaction in which 
# 10000 rows are inserted into table abc. The first test case is used
# to ensure that more than 1MB of dynamic memory is used to perform
# the transaction. 
#
# The second test case sets the "soft-heap-limit" to 100,000 bytes (0.1 MB)
# and tests to see that this limit is not exceeded at any point during 
# transaction execution.
#
# Before executing malloc5-4.* we save the value of the current soft heap 
# limit in variable ::soft_limit. The original value is restored after 
# running the tests.
#
set ::soft_limit [sqlite3_soft_heap_limit -1]
execsql {PRAGMA cache_size=2000}
do_test malloc5-4.1 {
  execsql {BEGIN;}
  execsql {DELETE FROM abc;}
  for {set i 0} {$i < 10000} {incr i} {
    execsql "INSERT INTO abc VALUES($i, $i, '[string repeat X 100]');"
  }
  execsql {COMMIT;}
  db cache flush
  sqlite3_release_memory
  sqlite3_memory_highwater 1
  execsql {SELECT * FROM abc}
  set nMaxBytes [sqlite3_memory_highwater 1]
  puts -nonewline " (Highwater mark: $nMaxBytes) "
  expr $nMaxBytes > 1000000
} {1}
do_test malloc5-4.2 {
  db eval {PRAGMA cache_size=1}
  db cache flush
  sqlite3_release_memory
  sqlite3_soft_heap_limit 200000
  sqlite3_memory_highwater 1
  execsql {SELECT * FROM abc}
  set nMaxBytes [sqlite3_memory_highwater 1]
  puts -nonewline " (Highwater mark: $nMaxBytes) "
  expr $nMaxBytes <= 210000
} {1}
do_test malloc5-4.3 {
  # Check that the content of table abc is at least roughly as expected.
  execsql {
    SELECT count(*), sum(a), sum(b) FROM abc;
  }
} [list 10000 [expr int(10000.0 * 4999.5)] [expr int(10000.0 * 4999.5)]]

# Restore the soft heap limit.
sqlite3_soft_heap_limit $::soft_limit

# Test that there are no problems calling sqlite3_release_memory when
# there are open in-memory databases.
#
# At one point these tests would cause a seg-fault.
#
do_test malloc5-5.1 {
  db close
  sqlite3 db :memory:
  execsql {
    BEGIN;
    CREATE TABLE abc(a, b, c);
    INSERT INTO abc VALUES('abcdefghi', 1234567890, NULL);
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
  }
  sqlite3_release_memory
} 0
do_test malloc5-5.2 {
  sqlite3_soft_heap_limit 5000
  execsql {
    COMMIT;
    PRAGMA temp_store = memory;
    SELECT * FROM abc ORDER BY a;
  }
  expr 1
} {1}
sqlite3_soft_heap_limit $::soft_limit

#-------------------------------------------------------------------------
# The following test cases (malloc5-6.*) test the new global LRU list
# used to determine the pages to recycle when sqlite3_release_memory is
# called and there is more than one pager open.
#
proc nPage {db} {
  set bt [btree_from_db $db]
  array set stats [btree_pager_stats $bt]
  set stats(page)
}
db close
forcedelete test.db test.db-journal test2.db test2.db-journal

# This block of test-cases (malloc5-6.1.*) prepares two database files
# for the subsequent tests.
do_test malloc5-6.1.1 {
  sqlite3 db test.db
  execsql {
    PRAGMA page_size=1024;
    PRAGMA default_cache_size=2;
  }
  execsql {
    PRAGMA temp_store = memory;
    BEGIN;
    CREATE TABLE abc(a PRIMARY KEY, b, c);
    INSERT INTO abc VALUES(randstr(50,50), randstr(75,75), randstr(100,100));
    INSERT INTO abc 
        SELECT randstr(50,50), randstr(75,75), randstr(100,100) FROM abc;
    INSERT INTO abc 
        SELECT randstr(50,50), randstr(75,75), randstr(100,100) FROM abc;
    INSERT INTO abc 
        SELECT randstr(50,50), randstr(75,75), randstr(100,100) FROM abc;
    INSERT INTO abc 
        SELECT randstr(50,50), randstr(75,75), randstr(100,100) FROM abc;
    INSERT INTO abc 
        SELECT randstr(50,50), randstr(75,75), randstr(100,100) FROM abc;
    INSERT INTO abc 
        SELECT randstr(50,50), randstr(75,75), randstr(100,100) FROM abc;
    COMMIT;
  } 
  forcecopy test.db test2.db
  sqlite3 db2 test2.db
  db2 eval {PRAGMA cache_size=2}
  list \
    [expr ([file size test.db]/1024)>20] [expr ([file size test2.db]/1024)>20]
} {1 1}
do_test malloc5-6.1.2 {
  list [execsql {PRAGMA cache_size}] [execsql {PRAGMA cache_size} db2]
} {2 2}

do_test malloc5-6.2.1 {
  execsql {SELECT * FROM abc} db2
  execsql {SELECT * FROM abc} db
  expr [nPage db] + [nPage db2]
} {4}

do_test malloc5-6.2.2 {
  # If we now try to reclaim some memory, it should come from the db2 cache.
  sqlite3_release_memory 3000
  expr [nPage db] + [nPage db2]
} {1}
do_test malloc5-6.2.3 {
  # Access the db2 cache again, so that all the db2 pages have been used
  # more recently than all the db pages. Then try to reclaim 3000 bytes.
  # This time, 3 pages should be pulled from the db cache.
  execsql { SELECT * FROM abc } db2
  sqlite3_release_memory 3000
  expr [nPage db] + [nPage db2]
} {0}

do_test malloc5-6.3.1 {
  # Now open a transaction and update 2 pages in the db2 cache. Then
  # do a SELECT on the db cache so that all the db pages are more recently
  # used than the db2 pages. When we try to free memory, SQLite should
  # free the non-dirty db2 pages, then the db pages, then finally use
  # sync() to free up the dirty db2 pages. The only page that cannot be
  # freed is page1 of db2. Because there is an open transaction, the
  # btree layer holds a reference to page 1 in the db2 cache.
  #
  # UPDATE: No longer. As release_memory() does not cause a sync()
  execsql {
    BEGIN;
    UPDATE abc SET c = randstr(100,100) 
    WHERE rowid = 1 OR rowid = (SELECT max(rowid) FROM abc);
  } db2
  execsql { SELECT * FROM abc } db
  expr [nPage db] + [nPage db2]
} {4}
do_test malloc5-6.3.2 {
  # Try to release 7700 bytes. This should release all the 
  # non-dirty pages held by db2.
  sqlite3_release_memory [expr 7*1132]
  list [nPage db] [nPage db2]
} {0 3}
do_test malloc5-6.3.3 {
  # Try to release another 1000 bytes. This should come fromt the db
  # cache, since all three pages held by db2 are either in-use or diry.
  sqlite3_release_memory 1000
  list [nPage db] [nPage db2]
} {0 3}
do_test malloc5-6.3.4 {
  # Now release 9900 more (about 9 pages worth). This should expunge
  # the rest of the db cache. But the db2 cache remains intact, because
  # SQLite tries to avoid calling sync().
  if {$::tcl_platform(wordSize)==8} {
    sqlite3_release_memory 10500
  } else {
    sqlite3_release_memory 9900
  }
  list [nPage db] [nPage db2]
} {0 3}
do_test malloc5-6.3.5 {
  # But if we are really insistent, SQLite will consent to call sync()
  # if there is no other option. UPDATE: As of 3.6.2, SQLite will not
  # call sync() in this scenario. So no further memory can be reclaimed.
  sqlite3_release_memory 1000
  list [nPage db] [nPage db2]
} {0 3}
do_test malloc5-6.3.6 {
  # The referenced page (page 1 of the db2 cache) will not be freed no
  # matter how much memory we ask for:
  sqlite3_release_memory 31459
  list [nPage db] [nPage db2]
} {0 3}

db2 close

sqlite3_soft_heap_limit $::soft_limit
test_restore_config_pagecache
finish_test
catch {db close}
