# 2008 June 9
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
# Test that it is possible to have two open blob handles on a single
# blob object.
#
# $Id: incrblob2.test,v 1.11 2009/06/29 06:00:37 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!autovacuum || !pragma || !incrblob} {
  finish_test
  return
}

do_test incrblob2-1.0 {
  execsql {
    CREATE TABLE blobs(id INTEGER PRIMARY KEY, data BLOB);
    INSERT INTO blobs VALUES(NULL, zeroblob(5000));
    INSERT INTO blobs VALUES(NULL, zeroblob(5000));
    INSERT INTO blobs VALUES(NULL, zeroblob(5000));
    INSERT INTO blobs VALUES(NULL, zeroblob(5000));
  }
} {}

foreach iOffset [list 0 256 4094] {
  do_test incrblob2-1.$iOffset.1 {
    set fd [db incrblob blobs data 1]
    puts $fd "[string repeat x $iOffset]SQLite version 3.6.0"
    close $fd
  } {}
  
  do_test incrblob2-1.$iOffset.2 {
    set fd1 [db incrblob blobs data 1]
    set fd2 [db incrblob blobs data 1]
    fconfigure $fd1 -buffering none
    fconfigure $fd2 -buffering none
    if {$iOffset != 0} {
      seek $fd2 $iOffset start
      seek $fd1 $iOffset start
    }
    read $fd1 6
  } {SQLite}
  
  do_test incrblob2-1.$iOffset.3 {
    read $fd2 6
  } {SQLite}
  
  do_test incrblob2-1.$iOffset.4 {
    seek $fd2 $iOffset start
    seek $fd1 $iOffset start
    puts -nonewline $fd2 "etiLQS"
  } {}

  
  do_test incrblob2-1.$iOffset.5 {
    seek $fd1 $iOffset start
    read $fd1 6
  } {etiLQS}
  
  do_test incrblob2-1.$iOffset.6 {
    seek $fd2 $iOffset start
    read $fd2 6
  } {etiLQS}
  
  do_test incrblob2-1.$iOffset.7 {
    seek $fd1 $iOffset start
    read $fd1 6
  } {etiLQS}
  
  do_test incrblob2-1.$iOffset.8 {
    close $fd1
    close $fd2
  } {}
}

#--------------------------------------------------------------------------

foreach iOffset [list 0 256 4094] {

  do_test incrblob2-2.$iOffset.1 {
    set fd1 [db incrblob blobs data 1]
    seek $fd1 [expr $iOffset - 5000] end
    fconfigure $fd1 -buffering none

    set fd2 [db incrblob blobs data 1]
    seek $fd2 [expr $iOffset - 5000] end
    fconfigure $fd2 -buffering none

    puts -nonewline $fd1 "123456"
  } {}
  
  do_test incrblob2-2.$iOffset.2 {
    read $fd2 6
  } {123456}

  do_test incrblob2-2.$iOffset.3 {
    close $fd1
    close $fd2
  } {}
}

do_test incrblob2-3.1 {
  set fd1 [db incrblob blobs data 1]
  fconfigure $fd1 -buffering none
} {}
do_test incrblob2-3.2 {
  execsql {
    INSERT INTO blobs VALUES(5, zeroblob(10240));
  }
} {}
do_test incrblob2-3.3 {
  set rc [catch { read $fd1 6 } msg]
  list $rc $msg
} {0 123456}
do_test incrblob2-3.4 {
  close $fd1
} {}

#--------------------------------------------------------------------------
# The following tests - incrblob2-4.* - test that blob handles are 
# invalidated at the correct times.
#
do_test incrblob2-4.1 {
  unset -nocomplain data
  db eval BEGIN
  db eval { CREATE TABLE t1(id INTEGER PRIMARY KEY, data BLOB); }
  for {set ii 1} {$ii < 100} {incr ii} {
    set data [string repeat "blob$ii" 500]
    db eval { INSERT INTO t1 VALUES($ii, $data) }
  }
  db eval COMMIT
} {}

proc aborted_handles {} {
  global handles

  set aborted {}
  for {set ii 1} {$ii < 100} {incr ii} {
    set str "blob$ii"
    set nByte [string length $str]
    set iOffset [expr $nByte * $ii * 2]

    set rc [catch {sqlite3_blob_read $handles($ii) $iOffset $nByte} msg]
    if {$rc && $msg eq "SQLITE_ABORT"} {
      lappend aborted $ii
    } else {
      if {$rc || $msg ne $str} {
        error "blob $ii: $msg"
      }
    }
  }
  set aborted
}

do_test incrblob2-4.2 {
  for {set ii 1} {$ii < 100} {incr ii} {
    set handles($ii) [db incrblob t1 data $ii]
  }
  aborted_handles
} {}

# Update row 3. This should abort handle 3 but leave all others untouched.
#
do_test incrblob2-4.3 {
  db eval {UPDATE t1 SET data = data || '' WHERE id = 3}
  aborted_handles
} {3}

# Test that a write to handle 3 also returns SQLITE_ABORT.
#
do_test incrblob2-4.3.1 {
  set rc [catch {sqlite3_blob_write $::handles(3) 10 HELLO} msg]
  list $rc $msg
} {1 SQLITE_ABORT}

# Delete row 14. This should abort handle 6 but leave all others untouched.
#
do_test incrblob2-4.4 {
  db eval {DELETE FROM t1 WHERE id = 14}
  aborted_handles
} {3 14}

# Change the rowid of row 15 to 102. Should abort handle 15.
#
do_test incrblob2-4.5 {
  db eval {UPDATE t1 SET id = 102 WHERE id = 15}
  aborted_handles
} {3 14 15}

# Clobber row 92 using INSERT OR REPLACE.
#
do_test incrblob2-4.6 {
  db eval {INSERT OR REPLACE INTO t1 VALUES(92, zeroblob(1000))}
  aborted_handles
} {3 14 15 92}

# Clobber row 65 using UPDATE OR REPLACE on row 35. This should abort 
# handles 35 and 65.
#
do_test incrblob2-4.7 {
  db eval {UPDATE OR REPLACE t1 SET id = 65 WHERE id = 35}
  aborted_handles
} {3 14 15 35 65 92}

# Insert a couple of new rows. This should not invalidate any handles.
#
do_test incrblob2-4.9 {
  db eval {INSERT INTO t1 SELECT NULL, data FROM t1}
  aborted_handles
} {3 14 15 35 65 92}

# Delete all rows from 1 to 25. This should abort all handles up to 25.
#
do_test incrblob2-4.9 {
  db eval {DELETE FROM t1 WHERE id >=1 AND id <= 25}
  aborted_handles
} {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 35 65 92}

# Delete the whole table (this will use sqlite3BtreeClearTable()). All handles
# should now be aborted.
#
do_test incrblob2-4.10 {
  db eval {DELETE FROM t1}
  aborted_handles
} {1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99}

do_test incrblob2-4.1.X {
  for {set ii 1} {$ii < 100} {incr ii} {
    close $handles($ii) 
  }
} {}

#--------------------------------------------------------------------------
# The following tests - incrblob2-5.* - test that in shared cache an open
# blob handle counts as a read-lock on its table.
#
ifcapable shared_cache {
  db close
  set ::enable_shared_cache [sqlite3_enable_shared_cache 1]

  do_test incrblob2-5.1 {
    sqlite3 db test.db
    sqlite3 db2 test.db

    execsql {
      INSERT INTO t1 VALUES(1, 'abcde');
    }
  } {}

  do_test incrblob2-5.2 {
    catchsql { INSERT INTO t1 VALUES(2, 'fghij') } db2
  } {0 {}}

  do_test incrblob2-5.3 {
    set blob [db incrblob t1 data 1]
    catchsql { INSERT INTO t1 VALUES(3, 'klmno') } db2
  } {1 {database table is locked}}

  do_test incrblob2-5.4 {
    close $blob
    execsql BEGIN db2
    catchsql { INSERT INTO t1 VALUES(4, 'pqrst') } db2
  } {0 {}}

  do_test incrblob2-5.5 {
    set rc [catch { db incrblob -readonly t1 data 1 } msg]
    list $rc $msg
  } {1 {database table is locked: t1}}

  do_test incrblob2-5.6 {
    execsql { PRAGMA read_uncommitted=1 }
    set blob [db incrblob -readonly t1 data 4]
    read $blob
  } {pqrst}

  do_test incrblob2-5.7 {
    catchsql { INSERT INTO t1 VALUES(3, 'klmno') } db2
  } {0 {}}

  do_test incrblob2-5.8 {
    close $blob
  } {}

  db2 close
  db close
  sqlite3_enable_shared_cache $::enable_shared_cache
}

#--------------------------------------------------------------------------
# The following tests - incrblob2-6.* - test a specific scenario that might
# be causing an error.
#
sqlite3 db test.db
do_test incrblob2-6.1 {
  execsql {
    DELETE FROM t1;
    INSERT INTO t1 VALUES(1, zeroblob(100));
  }
  
  set rdHandle [db incrblob -readonly t1 data 1]
  set wrHandle [db incrblob t1 data 1]

  sqlite3_blob_read $rdHandle 0 100

  sqlite3_blob_write $wrHandle 0 ABCDEF

  close $wrHandle
  close $rdHandle
} {}

do_test incrblob2-6.2 {
  set rdHandle [db incrblob -readonly t1 data 1]
  sqlite3_blob_read $rdHandle 0 2
} {AB}

if {$::tcl_platform(pointerSize)>=8} {
  do_test incrblob2-6.2b {
    set rc [catch {
      # Prior to 2015-02-07, the following caused a segfault due to
      # integer overflow.
      sqlite3_blob_read $rdHandle 2147483647 2147483647
    } errmsg]
    if {[string match {out of memory in *test_blob.c} $errmsg]} {
      set errmsg SQLITE_ERROR
    }
    lappend rc $errmsg
  } {1 SQLITE_ERROR}
}
do_test incrblob2-6.2c {
  set rc [catch {
    # Prior to 2015-02-07, the following caused a segfault due to
    # integer overflow.
    sqlite3_blob_read $rdHandle 2147483647 100
  } errmsg]
  lappend rc $errmsg
} {1 SQLITE_ERROR}

do_test incrblob2-6.3 {
  set wrHandle [db incrblob t1 data 1]
  sqlite3_blob_write $wrHandle 0 ZZZZZZZZZZ
  sqlite3_blob_read $rdHandle 2 4
} {ZZZZ}

do_test incrblob2-6.3b {
  set rc [catch {
    # Prior to 2015-02-07, the following caused a segfault due to
    # integer overflow.
    sqlite3_blob_write $wrHandle 2147483647 YYYYYYYYYYYYYYYYYY
  } errmsg]
  lappend rc $errmsg
} {1 SQLITE_ERROR}
do_test incrblob2-6.3c {
  sqlite3_blob_read $rdHandle 2 4
} {ZZZZ}


do_test incrblob2-6.4 {
  close $wrHandle
  close $rdHandle
} {}

sqlite3_memory_highwater 1
do_test incrblob2-7.1 {
  db eval {
    CREATE TABLE t2(B BLOB);
    INSERT INTO t2 VALUES(zeroblob(10 * 1024 * 1024)); 
  }
  expr {[sqlite3_memory_highwater]<(5 * 1024 * 1024)}
} {1}

do_test incrblob2-7.2 {
  set h [db incrblob t2 B 1]
  expr {[sqlite3_memory_highwater]<(5 * 1024 * 1024)}
} {1}

do_test incrblob2-7.3 {
  seek $h 0 end
  tell $h
} [expr 10 * 1024 * 1024]

do_test incrblob2-7.4 {
  expr {[sqlite3_memory_highwater]<(5 * 1024 * 1024)}
} {1}

do_test incrblob2-7.5 {
  close $h
} {}

#---------------------------------------------------------------------------
# The following tests, incrblob2-8.*, test that nothing terrible happens
# when a statement transaction is rolled back while there are open 
# incremental-blob handles. At one point an assert() was failing when
# this was attempted.
#
do_test incrblob2-8.1 {
  execsql BEGIN
  set h [db incrblob t2 B 1]
  set rc [catch {
    db eval {SELECT rowid FROM t2} { execsql "DROP TABLE t2" }
  } msg] 
  list $rc $msg
} {1 {database table is locked}}
do_test incrblob2-8.2 {
  close $h
  execsql COMMIT
} {}
do_test incrblob2-8.3 {
  execsql {
    CREATE TABLE t3(a INTEGER UNIQUE, b TEXT);
    INSERT INTO t3 VALUES(1, 'aaaaaaaaaaaaaaaaaaaa');
    INSERT INTO t3 VALUES(2, 'bbbbbbbbbbbbbbbbbbbb');
    INSERT INTO t3 VALUES(3, 'cccccccccccccccccccc');
    INSERT INTO t3 VALUES(4, 'dddddddddddddddddddd');
    INSERT INTO t3 VALUES(5, 'eeeeeeeeeeeeeeeeeeee');
  }
} {}
do_test incrblob2-8.4 {
  execsql BEGIN
  set h [db incrblob t3 b 3]
  sqlite3_blob_read $h 0 20
} {cccccccccccccccccccc}
do_test incrblob2-8.5 {
  catchsql {UPDATE t3 SET a = 6 WHERE a > 3}
} {1 {UNIQUE constraint failed: t3.a}}
do_test incrblob2-8.6 {
  catchsql {UPDATE t3 SET a = 6 WHERE a > 3}
} {1 {UNIQUE constraint failed: t3.a}}
do_test incrblob2-8.7 {
  sqlite3_blob_read $h 0 20
} {cccccccccccccccccccc}
do_test incrblob2-8.8 {
  catchsql {UPDATE t3 SET a = 6 WHERE a = 3 OR a = 5}
} {1 {UNIQUE constraint failed: t3.a}}
do_test incrblob2-8.9 {
  set rc [catch {sqlite3_blob_read $h 0 20} msg]
  list $rc $msg
} {1 SQLITE_ABORT}
do_test incrblob2-8.X {
  close $h
} {}

finish_test
