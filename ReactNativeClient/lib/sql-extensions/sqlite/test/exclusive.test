# 2007 March 24
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
# of these tests is exclusive access mode (i.e. the thing activated by 
# "PRAGMA locking_mode = EXCLUSIVE").
#
# $Id: exclusive.test,v 1.15 2009/06/26 12:30:40 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!pager_pragmas} {
  finish_test
  return
}

forcedelete test2.db-journal
forcedelete test2.db
forcedelete test3.db-journal
forcedelete test3.db
forcedelete test4.db-journal
forcedelete test4.db

#----------------------------------------------------------------------
# Test cases exclusive-1.X test the PRAGMA logic.
#
do_test exclusive-1.0 {
  execsql {
    pragma locking_mode;
    pragma main.locking_mode;
    pragma temp.locking_mode;
  } 
} [list normal normal exclusive]
do_test exclusive-1.1 {
  execsql {
    pragma locking_mode = exclusive;
  } 
} {exclusive}
do_test exclusive-1.2 {
  execsql {
    pragma locking_mode;
    pragma main.locking_mode;
    pragma temp.locking_mode;
  } 
} [list exclusive exclusive exclusive]
do_test exclusive-1.3 {
  execsql {
    pragma locking_mode = normal;
  } 
} {normal}
do_test exclusive-1.4 {
  execsql {
    pragma locking_mode;
    pragma main.locking_mode;
    pragma temp.locking_mode;
  } 
} [list normal normal exclusive]
do_test exclusive-1.5 {
  execsql {
    pragma locking_mode = invalid;
  } 
} {normal}
do_test exclusive-1.6 {
  execsql {
    pragma locking_mode;
    pragma main.locking_mode;
    pragma temp.locking_mode;
  } 
} [list normal normal exclusive]
ifcapable attach {
  do_test exclusive-1.7 {
    execsql {
      pragma locking_mode = exclusive;
      ATTACH 'test2.db' as aux;
    }
    execsql {
      pragma main.locking_mode;
      pragma aux.locking_mode;
    }
  } {exclusive exclusive}
  do_test exclusive-1.8 {
    execsql {
      pragma main.locking_mode = normal;
    }
    execsql {
      pragma main.locking_mode;
      pragma temp.locking_mode;
      pragma aux.locking_mode;
    }
  } [list normal exclusive exclusive]
  do_test exclusive-1.9 {
    execsql {
      pragma locking_mode;
    }
  } {exclusive}
  do_test exclusive-1.10 {
    execsql {
      ATTACH 'test3.db' as aux2;
    }
    execsql {
      pragma main.locking_mode;
      pragma aux.locking_mode;
      pragma aux2.locking_mode;
    }
  } {normal exclusive exclusive}
  do_test exclusive-1.11 {
    execsql {
      pragma aux.locking_mode = normal;
    }
    execsql {
      pragma main.locking_mode;
      pragma aux.locking_mode;
      pragma aux2.locking_mode;
    }
  } {normal normal exclusive}
  do_test exclusive-1.12 {
    execsql {
      pragma locking_mode = normal;
    }
    execsql {
      pragma main.locking_mode;
      pragma temp.locking_mode;
      pragma aux.locking_mode;
      pragma aux2.locking_mode;
    }
  } [list normal exclusive normal normal]
  do_test exclusive-1.13 {
    execsql {
      ATTACH 'test4.db' as aux3;
    }
    execsql {
      pragma main.locking_mode;
      pragma temp.locking_mode;
      pragma aux.locking_mode;
      pragma aux2.locking_mode;
      pragma aux3.locking_mode;
    }
  } [list normal exclusive normal normal normal]
  
  do_test exclusive-1.99 {
    execsql {
      DETACH aux;
      DETACH aux2;
      DETACH aux3;
    }
  } {}
}

#----------------------------------------------------------------------
# Test cases exclusive-2.X verify that connections in exclusive 
# locking_mode do not relinquish locks.
#
do_test exclusive-2.0 {
  execsql {
    CREATE TABLE abc(a, b, c);
    INSERT INTO abc VALUES(1, 2, 3);
    PRAGMA locking_mode = exclusive;
  }
} {exclusive}
do_test exclusive-2.1 {
  sqlite3 db2 test.db
  execsql {
    INSERT INTO abc VALUES(4, 5, 6);
    SELECT * FROM abc;
  } db2
} {1 2 3 4 5 6}
do_test exclusive-2.2 {
  # This causes connection 'db' (in exclusive mode) to establish 
  # a shared-lock on the db. The other connection should now be
  # locked out as a writer.
  execsql {
    SELECT * FROM abc;
  } db
} {1 2 3 4 5 6}
do_test exclusive-2.4 {
  execsql {
    SELECT * FROM abc;
  } db2
} {1 2 3 4 5 6}
do_test exclusive-2.5 {
  catchsql {
    INSERT INTO abc VALUES(7, 8, 9);
  } db2
} {1 {database is locked}}
sqlite3_soft_heap_limit 0
do_test exclusive-2.6 {
  # Because connection 'db' only has a shared-lock, the other connection
  # will be able to get a RESERVED, but will fail to upgrade to EXCLUSIVE.
  execsql {
    BEGIN;
    INSERT INTO abc VALUES(7, 8, 9);
  } db2
  catchsql {
    COMMIT
  } db2
} {1 {database is locked}}
do_test exclusive-2.7 {
  catchsql {
    COMMIT
  } db2
} {1 {database is locked}}
do_test exclusive-2.8 {
  execsql {
    ROLLBACK;
  } db2
} {}
sqlite3_soft_heap_limit $cmdlinearg(soft-heap-limit)

do_test exclusive-2.9 {
  # Write the database to establish the exclusive lock with connection 'db.
  execsql {
    INSERT INTO abc VALUES(7, 8, 9);
  } db
  catchsql {
    SELECT * FROM abc;
  } db2
} {1 {database is locked}}
do_test exclusive-2.10 {
  # Changing the locking-mode does not release any locks.
  execsql {
    PRAGMA locking_mode = normal;
  } db
  catchsql {
    SELECT * FROM abc;
  } db2
} {1 {database is locked}}
do_test exclusive-2.11 {
  # After changing the locking mode, accessing the db releases locks.
  execsql {
    SELECT * FROM abc;
  } db
  execsql {
    SELECT * FROM abc;
  } db2
} {1 2 3 4 5 6 7 8 9}
db2 close

#----------------------------------------------------------------------
# Tests exclusive-3.X - test that a connection in exclusive mode 
# truncates instead of deletes the journal file when committing 
# a transaction.
#
# These tests are not run on windows because the windows backend
# opens the journal file for exclusive access, preventing its contents 
# from being inspected externally.
#
if {$tcl_platform(platform) != "windows"
 && [atomic_batch_write test.db]==0
} {

  # Return a list of two booleans (either 0 or 1). The first is true
  # if the named file exists. The second is true only if the file
  # exists and the first 28 bytes contain at least one non-zero byte.
  #
  proc filestate {fname} {
    set exists 0
    set content 0
    if {[file exists $fname]} {
      set exists 1
      set hdr [hexio_read $fname 0 28]
      set content [expr {0==[string match $hdr [string repeat 0 56]]}]
    }
    list $exists $content
  }

  do_test exclusive-3.0 {
    filestate test.db-journal
  } {0 0}
  do_test exclusive-3.1 {
    execsql {
      PRAGMA locking_mode = exclusive;
      BEGIN;
      DELETE FROM abc;
    }
    filestate test.db-journal
  } {1 1}
  do_test exclusive-3.2 {
    execsql {
      COMMIT;
    }
    filestate test.db-journal
  } {1 0}
  do_test exclusive-3.3 {
    execsql {
      INSERT INTO abc VALUES('A', 'B', 'C');
      SELECT * FROM abc;
    }
  } {A B C}
  do_test exclusive-3.4 {
    execsql {
      BEGIN;
      UPDATE abc SET a = 1, b = 2, c = 3;
      ROLLBACK;
      SELECT * FROM abc;
    }
  } {A B C}
  do_test exclusive-3.5 {
    filestate test.db-journal
  } {1 0}
  do_test exclusive-3.6 {
    execsql {
      PRAGMA locking_mode = normal;
      SELECT * FROM abc;
    }
    filestate test.db-journal
  } {0 0}
}

#----------------------------------------------------------------------
# Tests exclusive-4.X - test that rollback works correctly when
# in exclusive-access mode.
#

# The following procedure computes a "signature" for table "t3".  If
# T3 changes in any way, the signature should change.  
#
# This is used to test ROLLBACK.  We gather a signature for t3, then
# make lots of changes to t3, then rollback and take another signature.
# The two signatures should be the same.
#
proc signature {} {
  return [db eval {SELECT count(*), md5sum(x) FROM t3}]
}

do_test exclusive-4.0 {
  execsql { PRAGMA locking_mode = exclusive; }
  execsql { PRAGMA default_cache_size = 10; }
  execsql {
    BEGIN;
    CREATE TABLE t3(x TEXT);
    INSERT INTO t3 VALUES(randstr(10,400));
    INSERT INTO t3 VALUES(randstr(10,400));
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    COMMIT;
  }
  execsql {SELECT count(*) FROM t3;}
} {32}

set ::X [signature]
do_test exclusive-4.1 {
  execsql {
    BEGIN;
    DELETE FROM t3 WHERE random()%10!=0;
    INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
    INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
    SELECT count(*) FROM t3;
    ROLLBACK;
  }
  signature
} $::X

do_test exclusive-4.2 {
  execsql {
    BEGIN;
    DELETE FROM t3 WHERE random()%10!=0;
    INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
    DELETE FROM t3 WHERE random()%10!=0;
    INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
    ROLLBACK;
  }
  signature
} $::X

do_test exclusive-4.3 {
  execsql {
    INSERT INTO t3 SELECT randstr(10,400) FROM t3 WHERE random()%10==0;
  }
} {}

do_test exclusive-4.4 {
  catch {set ::X [signature]}
} {0}
do_test exclusive-4.5 {
  execsql {
    PRAGMA locking_mode = NORMAL;
    DROP TABLE t3;
    DROP TABLE abc;
  }
} {normal}

#----------------------------------------------------------------------
# Tests exclusive-5.X - test that statement journals are truncated
# instead of deleted when in exclusive access mode.
#
if {[atomic_batch_write test.db]==0} {

# Close and reopen the database so that the temp database is no
# longer active.
#
db close
sqlite3 db test.db

# if we're using proxy locks, we use 3 filedescriptors for a db
# that is open but NOT writing changes, normally
# sqlite uses 1 (proxy locking adds the conch and the local lock)
set using_proxy 0
foreach {name value} [array get env SQLITE_FORCE_PROXY_LOCKING] {
  set using_proxy $value
}
set extrafds 0
if {$using_proxy!=0} {
  set extrafds 2
} 

do_test exclusive-5.0 {
  execsql {
    CREATE TABLE abc(a UNIQUE, b UNIQUE, c UNIQUE);
    BEGIN;
    INSERT INTO abc VALUES(1, 2, 3);
    INSERT INTO abc SELECT a+1, b+1, c+1 FROM abc;
  }
} {}
do_test exclusive-5.1 {
  # Three files are open: The db, journal and statement-journal.
  # (2016-03-04) The statement-journal is now opened lazily
  set sqlite_open_file_count
  expr $sqlite_open_file_count-$extrafds
} {2}
do_test exclusive-5.2 {
  execsql {
    COMMIT;
  }
  # One file open: the db.
  set sqlite_open_file_count
  expr $sqlite_open_file_count-$extrafds
} {1}
do_test exclusive-5.3 {
  execsql {
    PRAGMA locking_mode = exclusive;
    BEGIN;
    INSERT INTO abc VALUES(5, 6, 7);
  }
  # Two files open: the db and journal.
  set sqlite_open_file_count
  expr $sqlite_open_file_count-$extrafds
} {2}
do_test exclusive-5.4 {
  execsql {
    INSERT INTO abc SELECT a+10, b+10, c+10 FROM abc;
  }
  # Three files are open: The db, journal and statement-journal.
  # 2016-03-04: The statement-journal open is deferred
  set sqlite_open_file_count
  expr $sqlite_open_file_count-$extrafds
} {2}
do_test exclusive-5.5 {
  execsql {
    COMMIT;
  }
  # Three files are still open: The db, journal and statement-journal.
  # 2016-03-04: The statement-journal open is deferred
  set sqlite_open_file_count
  expr $sqlite_open_file_count-$extrafds
} {2}
do_test exclusive-5.6 {
  execsql {
    PRAGMA locking_mode = normal;
    SELECT * FROM abc;
  }
} {normal 1 2 3 2 3 4 5 6 7 11 12 13 12 13 14 15 16 17}
do_test exclusive-5.7 {
  # Just the db open.
  set sqlite_open_file_count
  expr $sqlite_open_file_count-$extrafds
} {1}

#-------------------------------------------------------------------------

do_execsql_test exclusive-6.1 {
  CREATE TABLE t4(a, b);
  INSERT INTO t4 VALUES('Eden', 1955);
  BEGIN;
    INSERT INTO t4 VALUES('Macmillan', 1957);
    INSERT INTO t4 VALUES('Douglas-Home', 1963);
    INSERT INTO t4 VALUES('Wilson', 1964);
}
do_test exclusive-6.2 {
  forcedelete test2.db test2.db-journal
  copy_file test.db test2.db
  copy_file test.db-journal test2.db-journal
  sqlite3 db test2.db
} {}

do_execsql_test exclusive-6.3 {
  PRAGMA locking_mode = EXCLUSIVE;
  SELECT * FROM t4;
} {exclusive Eden 1955}

do_test exclusive-6.4 {
  db close
  forcedelete test.db test.db-journal
  set fd [open test.db-journal w]
  puts $fd x
  close $fd
  sqlite3 db test.db
} {}

do_execsql_test exclusive-6.5 {
  PRAGMA locking_mode = EXCLUSIVE;
  SELECT * FROM sqlite_master;
} {exclusive}

# 2019-12-26 ticket fb3b3024ea238d5c
if {[permutation]!="journaltest"} {
  # The custom VFS used by the "journaltest" permutation cannot open the
  # shared-memory file. So, while it is able to switch the db file to
  # journal_mode=WAL when locking_mode=EXCLUSIVE, it can no longer access
  # it once the locking_mode is changed back to NORMAL.
  do_test exclusive-7.1 {
    db close
    forcedelete test.db test.db-journal test.db-wal
    sqlite3 db test.db
    # The following sequence of pragmas would trigger an assert()
    # associated with Pager.changeCountDone inside of assert_pager_state(),
    # prior to the fix.
    db eval {
      PRAGMA locking_mode = EXCLUSIVE;
      PRAGMA journal_mode = WAL;
      PRAGMA locking_mode = NORMAL;
      PRAGMA user_version;
      PRAGMA journal_mode = DELETE;
    }
  } {exclusive wal normal 0 delete}
}
 

} ;# atomic_batch_write==0

finish_test
