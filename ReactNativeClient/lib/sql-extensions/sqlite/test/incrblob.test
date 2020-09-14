# 2007 May 1
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
# $Id: incrblob.test,v 1.24 2009/06/19 22:23:42 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!autovacuum || !pragma || !incrblob} {
  finish_test
  return
}

do_test incrblob-1.1 {
  execsql {
    CREATE TABLE blobs(k PRIMARY KEY, v BLOB);
    INSERT INTO blobs VALUES('one', X'0102030405060708090A');
    INSERT INTO blobs VALUES('two', X'0A090807060504030201');
  }
} {}

do_test incrblob-1.2.1 {
  set ::blob [db incrblob blobs v 1]
  string match incrblob_* $::blob
} {1}
unset -nocomplain data
do_test incrblob-1.2.2 {
  binary scan [read $::blob] c* data
  set data
} {1 2 3 4 5 6 7 8 9 10}
do_test incrblob-1.2.3 {
  seek $::blob 0
  puts -nonewline $::blob "1234567890"
  flush $::blob
} {}
do_test incrblob-1.2.4 {
  seek $::blob 0
  binary scan [read $::blob] c* data
  set data
} {49 50 51 52 53 54 55 56 57 48}
do_test incrblob-1.2.5 {
  close $::blob
} {}
do_test incrblob-1.2.6 {
  execsql {
    SELECT v FROM blobs WHERE rowid = 1;
  }
} {1234567890}

#--------------------------------------------------------------------
# Test cases incrblob-1.3.X check that it is possible to read and write
# regions of a blob that lie on overflow pages.
#
do_test incrblob-1.3.1 {
  set ::str "[string repeat . 10000]"
  execsql {
    INSERT INTO blobs(rowid, k, v) VALUES(3, 'three', $::str);
  }
} {}

do_test incrblob-1.3.2 {
  set ::blob [db incrblob blobs v 3]
  seek $::blob 8500
  read $::blob 10
} {..........}
do_test incrblob-1.3.3 {
  seek $::blob 8500
  puts -nonewline $::blob 1234567890
} {}
do_test incrblob-1.3.4 {
  seek $::blob 8496
  read $::blob 10
} {....123456}
do_test incrblob-1.3.10 {
  close $::blob
} {}

#------------------------------------------------------------------------
# incrblob-2.*: 
#
# Test that the following operations use ptrmap pages to reduce
# unnecessary reads:
#
#     * Reading near the end of a blob,
#     * Writing near the end of a blob, and
#     * SELECT a column value that is located on an overflow page.
#
proc nRead {db} {
  set bt [btree_from_db $db]
  db_enter $db
  array set stats [btree_pager_stats $bt]
  db_leave $db
  return $stats(read)
}
proc nWrite {db} {
  set bt [btree_from_db $db]
  db_enter $db
  array set stats [btree_pager_stats $bt]
  db_leave $db
  return $stats(write)
}

sqlite3_soft_heap_limit 0

foreach AutoVacuumMode [list 0 1] {

  if {$AutoVacuumMode>0} {
    ifcapable !autovacuum {
      break
    }
  }

  db close
  forcedelete test.db test.db-journal

  sqlite3 db test.db
  execsql "PRAGMA mmap_size = 0"
  execsql "PRAGMA auto_vacuum = $AutoVacuumMode"

  # Extra value added to size answers
  set ib2_extra 0
  if {$AutoVacuumMode} {incr ib2_extra}
  if {[nonzero_reserved_bytes]} {incr ib2_extra}

  do_test incrblob-2.$AutoVacuumMode.1 {
    set ::str [string repeat abcdefghij 2900]
    execsql {
      BEGIN;
      CREATE TABLE blobs(k PRIMARY KEY, v BLOB, i INTEGER);
      DELETE FROM blobs;
      INSERT INTO blobs VALUES('one', $::str || randstr(500,500), 45);
      COMMIT;
    }
    expr [file size test.db]/1024
  } [expr 31 + $ib2_extra]

  ifcapable autovacuum {
    do_test incrblob-2.$AutoVacuumMode.2 {
      execsql {
        PRAGMA auto_vacuum;
      }
    } $AutoVacuumMode
  }

  do_test incrblob-2.$AutoVacuumMode.3 {
    # Open and close the db to make sure the page cache is empty.
    db close
    sqlite3 db test.db
    execsql "PRAGMA mmap_size = 0"
  
    # Read the last 20 bytes of the blob via a blob handle.
    set ::blob [db incrblob blobs v 1]
    seek $::blob -20 end
    set ::fragment [read $::blob]
    close $::blob
  
    # If the database is not in auto-vacuum mode, the whole of
    # the overflow-chain must be scanned. In auto-vacuum mode,
    # sqlite uses the ptrmap pages to avoid reading the other pages.
    #
    nRead db
  } [expr $AutoVacuumMode ? 4 : 30+$ib2_extra]

  do_test incrblob-2.$AutoVacuumMode.4 {
    string range [db one {SELECT v FROM blobs}] end-19 end
  } $::fragment

  do_test incrblob-2.$AutoVacuumMode.5 {
    # Open and close the db to make sure the page cache is empty.
    db close
    sqlite3 db test.db
    execsql "PRAGMA mmap_size = 0"
  
    # Write the second-to-last 20 bytes of the blob via a blob handle.
    #
    set ::blob [db incrblob blobs v 1]
    seek $::blob -40 end
    puts -nonewline $::blob "1234567890abcdefghij"
    flush $::blob
  
    # If the database is not in auto-vacuum mode, the whole of
    # the overflow-chain must be scanned. In auto-vacuum mode,
    # sqlite uses the ptrmap pages to avoid reading the other pages.
    #
    nRead db
  } [expr $AutoVacuumMode ? 4 : 30 + $ib2_extra]

  # Pages 1 (the write-counter) and 32 (the blob data) were written.
  do_test incrblob-2.$AutoVacuumMode.6 {
    close $::blob
    nWrite db
  } 2

  do_test incrblob-2.$AutoVacuumMode.7 {
    string range [db one {SELECT v FROM blobs}] end-39 end-20
  } "1234567890abcdefghij"

  do_test incrblob-2.$AutoVacuumMode.8 {
    # Open and close the db to make sure the page cache is empty.
    db close
    sqlite3 db test.db
    execsql { PRAGMA mmap_size = 0 }

    execsql { SELECT i FROM blobs } 
  } {45}

  do_test incrblob-2.$AutoVacuumMode.9 {
    nRead db
  } [expr $AutoVacuumMode ? 4 : 30 + $ib2_extra]
}
sqlite3_soft_heap_limit $cmdlinearg(soft-heap-limit)

#------------------------------------------------------------------------
# incrblob-3.*: 
#
# Test the outcome of trying to write to a read-only blob handle.
#
do_test incrblob-3.1 {
  set ::blob [db incrblob -readonly blobs v 1]
  seek $::blob -40 end
  read $::blob 20
} "1234567890abcdefghij"
do_test incrblob-3.2 {
  seek $::blob 0
  set rc [catch {
    puts -nonewline $::blob "helloworld"
  } msg]
  close $::blob
  list $rc $msg
} "1 {channel \"$::blob\" wasn't opened for writing}"

do_test incrblob-3.3 {
  set ::blob [db incrblob -readonly blobs v 1]
  seek $::blob -40 end
  read $::blob 20
} "1234567890abcdefghij"
do_test incrblob-3.4 {
  set rc [catch {
    sqlite3_blob_write $::blob 20 "qwertyuioplkjhgfds" 
  } msg]
  list $rc $msg
} {1 SQLITE_READONLY}
catch {close $::blob}

#------------------------------------------------------------------------
# incrblob-4.*: 
#
# Try a couple of error conditions:
#
#     4.1 - Attempt to open a row that does not exist.
#     4.2 - Attempt to open a column that does not exist.
#     4.3 - Attempt to open a table that does not exist.
#     4.4 - Attempt to open a database that does not exist.
#
#     4.5 - Attempt to open an integer
#     4.6 - Attempt to open a real value
#     4.7 - Attempt to open an SQL null
#
#     4.8 - Attempt to open an indexed column for writing
#     4.9 - Attempt to open an indexed column for reading (this works)
#
#     4.11 - Attempt to open a column of a view.
#     4.12 - Attempt to open a column of a virtual table.
#
do_test incrblob-4.1 {
  set rc [catch {
    set ::blob [db incrblob blobs v 2]
  } msg ] 
  list $rc $msg
} {1 {no such rowid: 2}}
do_test incrblob-4.2 {
  set rc [catch {
    set ::blob [db incrblob blobs blue 1]
  } msg ] 
  list $rc $msg
} {1 {no such column: "blue"}}
do_test incrblob-4.3 {
  set rc [catch {
    set ::blob [db incrblob nosuchtable blue 1]
  } msg ]
  list $rc $msg
} {1 {no such table: main.nosuchtable}}
do_test incrblob-4.4 {
  set rc [catch {
    set ::blob [db incrblob nosuchdb blobs v 1]
  } msg ] 
  list $rc $msg
} {1 {no such table: nosuchdb.blobs}}

do_test incrblob-4.5 {
  set rc [catch {
    set ::blob [db incrblob blobs i 1]
  } msg ] 
  list $rc $msg
} {1 {cannot open value of type integer}}
do_test incrblob-4.6 {
  execsql {
    INSERT INTO blobs(k, v, i) VALUES(123, 567.765, NULL);
  }
  set rc [catch {
    set ::blob [db incrblob blobs v 2]
  } msg ] 
  list $rc $msg
} {1 {cannot open value of type real}}
do_test incrblob-4.7 {
  set rc [catch {
    set ::blob [db incrblob blobs i 2]
  } msg ] 
  list $rc $msg
} {1 {cannot open value of type null}}

do_test incrblob-4.8.1 {
  execsql {
    INSERT INTO blobs(k, v, i) VALUES(X'010203040506070809', 'hello', 'world');
  }
  set rc [catch {
    set ::blob [db incrblob blobs k 3]
  } msg ] 
  list $rc $msg
} {1 {cannot open indexed column for writing}}
do_test incrblob-4.8.2 {
  execsql {
    CREATE TABLE t3(a INTEGER PRIMARY KEY, b);
    INSERT INTO t3 VALUES(1, 2);
  }
  set rc [catch {
    set ::blob [db incrblob -readonly t3 a 1]
  } msg ] 
  list $rc $msg
} {1 {cannot open value of type null}}
do_test incrblob-4.8.3 {
  set rc [catch {
    set ::blob [db incrblob -readonly t3 rowid 1]
  } msg ] 
  list $rc $msg
} {1 {no such column: "rowid"}}

do_test incrblob-4.9.1 {
  set rc [catch {
    set ::blob [db incrblob -readonly blobs k 3]
  } msg]
} {0}
do_test incrblob-4.9.2 {
  binary scan [read $::blob] c* c
  close $::blob
  set c
} {1 2 3 4 5 6 7 8 9}

do_test incrblob-4.10 {
  set ::blob [db incrblob -readonly blobs k 3]
  set rc [catch { sqlite3_blob_read $::blob 10 100 } msg]
  list $rc $msg
} {1 SQLITE_ERROR}
do_test incrblob-4.10.2 {
  close $::blob
} {}

ifcapable view {
  do_test incrblob-4.11 {
    execsql { CREATE VIEW blobs_view AS SELECT k, v, i FROM blobs }
    set rc [catch { db incrblob blobs_view v 3 } msg]
    list $rc $msg
  } {1 {cannot open view: blobs_view}}
}
ifcapable vtab {
  register_echo_module [sqlite3_connection_pointer db]
  do_test incrblob-4.12 {
    execsql { CREATE VIRTUAL TABLE blobs_echo USING echo(blobs) }
    set rc [catch { db incrblob blobs_echo v 3 } msg]
    list $rc $msg
  } {1 {cannot open virtual table: blobs_echo}}
}


#------------------------------------------------------------------------
# incrblob-5.*: 
#
#     Test that opening a blob in an attached database works.
#
ifcapable attach {
  do_test incrblob-5.1 {
    forcedelete test2.db test2.db-journal
    set ::size [expr [file size $::cmdlinearg(INFO_SCRIPT)]]
    execsql {
      ATTACH 'test2.db' AS aux;
      CREATE TABLE aux.files(name, text);
      INSERT INTO aux.files VALUES('this one', zeroblob($::size));
    }
    set fd  [db incrblob aux files text 1]
    fconfigure $fd -translation binary
    set fd2 [open $::cmdlinearg(INFO_SCRIPT)]
    fconfigure $fd2 -translation binary
    puts -nonewline $fd [read $fd2]
    close $fd
    close $fd2
    set ::text [db one {select text from aux.files}]
    string length $::text
  } [file size $::cmdlinearg(INFO_SCRIPT)]
  do_test incrblob-5.2 {
    set fd2 [open $::cmdlinearg(INFO_SCRIPT)]
    fconfigure $fd2 -translation binary
    set ::data [read $fd2]
    close $fd2
    set ::data
  } $::text
}

# free memory
unset -nocomplain ::data
unset -nocomplain ::text

#------------------------------------------------------------------------
# incrblob-6.*: 
#
#     Test that opening a blob for write-access is impossible if
#     another connection has the database RESERVED lock.
#
#     Then test that blob writes that take place inside of a
#     transaction are not visible to external connections until
#     after the transaction is commited and the blob channel 
#     closed.
#
#     This test does not work with the "memsubsys1" configuration.
#     Permutation memsubsys1 configures a very small static allocation 
#     for use as page-cache memory. This causes SQLite to upgrade
#     to an exclusive lock when writing earlier than usual, which
#     makes some of these tests fail.
#
sqlite3_soft_heap_limit 0
if {[permutation] != "memsubsys1"} {
  do_test incrblob-6.1 {
    sqlite3 db2 test.db
    execsql {
      BEGIN;
      INSERT INTO blobs(k, v, i) VALUES('a', 'different', 'connection');
    } db2
  } {}
  do_test incrblob-6.2 {
    execsql {
      SELECT rowid FROM blobs ORDER BY rowid
    }
  } {1 2 3}
  do_test incrblob-6.3 {
    set rc [catch {
      db incrblob blobs v 1
    } msg]
    list $rc $msg
  } {1 {database is locked}}
  do_test incrblob-6.4 {
    set rc [catch {
      db incrblob blobs v 3
    } msg]
    list $rc $msg
  } {1 {database is locked}}
  do_test incrblob-6.5 {
    set ::blob [db incrblob -readonly blobs v 3]
    read $::blob
  } {hello}
  do_test incrblob-6.6 {
    close $::blob
  } {}
  
  do_test incrblob-6.7 {
    set ::blob [db2 incrblob blobs i 4]
    gets $::blob
  } {connection}
  do_test incrblob-6.8 {
    tell $::blob
  } {10}
  do_test incrblob-6.9 {
    seek $::blob 0
    puts -nonewline $::blob "invocation"
    flush $::blob
  } {}
  
  # At this point commit should be illegal (because 
  # there is an open blob channel).
  #
  do_test incrblob-6.11 {
    catchsql {
      COMMIT;
    } db2
  } {1 {cannot commit transaction - SQL statements in progress}}
  
  do_test incrblob-6.12 {
    execsql {
      SELECT * FROM blobs WHERE rowid = 4;
    }
  } {}
  do_test incrblob-6.13 {
    close $::blob
  } {}
  do_test incrblob-6.14 {
    catchsql {
      COMMIT;
    } db2
  } {0 {}}
  do_test incrblob-6.15 {
    execsql {
      SELECT * FROM blobs WHERE rowid = 4;
    }
  } {a different invocation}
  db2 close
}
sqlite3_soft_heap_limit $cmdlinearg(soft-heap-limit)

#-----------------------------------------------------------------------
# The following tests verify the behavior of the incremental IO
# APIs in the following cases:
#
#     7.1 A row that containing an open blob is modified.
#
#     7.2 A CREATE TABLE requires that an overflow page that is part
#         of an open blob is moved.
#
#     7.3 An INCREMENTAL VACUUM moves an overflow page that is part
#         of an open blob.
#
# In the first case above, correct behavior is for all subsequent
# read/write operations on the blob-handle to return SQLITE_ABORT.
# More accurately, blob-handles are invalidated whenever the table
# they belong to is written to.
#
# The second two cases have no external effect. They are testing
# that the internal cache of overflow page numbers is correctly
# invalidated.
#
do_test incrblob-7.1.0 {
  execsql {
    BEGIN;
    DROP TABLE blobs;
    CREATE TABLE t1 (a, b, c, d BLOB);
    INSERT INTO t1(a, b, c, d) VALUES(1, 2, 3, 4);
    COMMIT;
  }
} {}

foreach {tn arg} {1 "" 2 -readonly} {

  execsql {
    UPDATE t1 SET d = zeroblob(10000);
  }

  do_test incrblob-7.1.$tn.1 {
    set ::b [eval db incrblob $arg t1 d 1]
    binary scan [sqlite3_blob_read $::b 5000 5] c* c
    set c
  } {0 0 0 0 0}
  do_test incrblob-7.1.$tn.2 {
    execsql {
      UPDATE t1 SET d = 15;
    }
  } {}
  do_test incrblob-7.1.$tn.3 {
    set rc [catch { sqlite3_blob_read $::b 5000 5 } msg]
    list $rc $msg
  } {1 SQLITE_ABORT}
  do_test incrblob-7.1.$tn.4 {
    execsql {
      SELECT d FROM t1;
    }
  } {15}
  do_test incrblob-7.1.$tn.5 {
    set rc [catch { close $::b } msg]
    list $rc $msg
  } {0 {}}
  do_test incrblob-7.1.$tn.6 {
    execsql {
      SELECT d FROM t1;
    }
  } {15}

}

set fd [open $::cmdlinearg(INFO_SCRIPT)]
fconfigure $fd -translation binary
set ::data [read $fd 14000]
close $fd

db close
forcedelete test.db test.db-journal
sqlite3 db test.db

do_test incrblob-7.2.1 {
  execsql {
    PRAGMA auto_vacuum = "incremental";
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b);        -- root@page3
    INSERT INTO t1 VALUES(123, $::data);
  }
  set ::b [db incrblob -readonly t1 b 123]
  fconfigure $::b -translation binary
  read $::b
} $::data
do_test incrblob-7.2.2 {
  execsql {
    CREATE TABLE t2(a INTEGER PRIMARY KEY, b);        -- root@page4
  }
  seek $::b 0
  read $::b
} $::data
do_test incrblob-7.2.3 {
  close $::b
  execsql {
    SELECT rootpage FROM sqlite_master;
  }
} {3 4}

set ::otherdata "[string range $::data 0 1000][string range $::data 1001 end]"
do_test incrblob-7.3.1 {
  execsql {
    INSERT INTO t2 VALUES(456, $::otherdata);
  }
  set ::b [db incrblob -readonly t2 b 456]
  fconfigure $::b -translation binary
  read $::b
} $::otherdata
do_test incrblob-7.3.2 {
  expr [file size test.db]/1024
} 30
do_test incrblob-7.3.3 {
  execsql {
    DELETE FROM t1 WHERE a = 123;
    PRAGMA INCREMENTAL_VACUUM(0);
  }
  seek $::b 0
  read $::b
} $::otherdata

# Attempt to write on a read-only blob.  Make sure the error code
# gets set.  Ticket #2464.
#
do_test incrblob-7.4 {
  set rc [catch {sqlite3_blob_write $::b 10 HELLO} msg]
  lappend rc $msg
} {1 SQLITE_READONLY}
do_test incrblob-7.5 {
  sqlite3_errcode db
} {SQLITE_READONLY}
do_test incrblob-7.6 {
  sqlite3_errmsg db
} {attempt to write a readonly database}

# Test that if either the "offset" or "amount" arguments to
# sqlite3_blob_write() are less than zero, SQLITE_ERROR is returned.
# 
do_test incrblob-8.1 {
  execsql { INSERT INTO t1 VALUES(314159, 'sqlite') }
  set ::b [db incrblob t1 b 314159]
  fconfigure $::b -translation binary
  set rc [catch {sqlite3_blob_write $::b 10 HELLO -1} msg]
  lappend rc $msg
} {1 SQLITE_ERROR}
do_test incrblob-8.2 {
  sqlite3_errcode db
} {SQLITE_ERROR}
do_test incrblob-8.3 {
  set rc [catch {sqlite3_blob_write $::b -1 HELLO 5} msg]
  lappend rc $msg
} {1 SQLITE_ERROR}
do_test incrblob-8.4 {
  sqlite3_errcode db
} {SQLITE_ERROR}
do_test incrblob-8.5 {
  execsql {SELECT b FROM t1 WHERE a = 314159}
} {sqlite}
do_test incrblob-8.6 {
  set rc [catch {sqlite3_blob_write $::b 0 etilqs 6} msg]
  lappend rc $msg
} {0 {}}
do_test incrblob-8.7 {
  execsql {SELECT b FROM t1 WHERE a = 314159}
} {etilqs}

# The following test case exposes an instance in the blob code where
# an error message was set using a call similar to sqlite3_mprintf(zErr),
# where zErr is an arbitrary string. This is no good if the string contains
# characters that can be mistaken for printf() formatting directives.
#
do_test incrblob-9.1 {
  list [catch { db incrblob t1 "A tricky column name %s%s" 1 } msg] $msg
} {1 {no such column: "A tricky column name %s%s"}}


finish_test
