# 2010 April 13
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
# focus of this file is testing the operation of "blocking-checkpoint"
# operations.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/wal_common.tcl
ifcapable !wal {finish_test ; return }
do_not_use_codec

set testprefix wal5

proc db_page_count  {{file test.db}} { expr [file size $file] / 1024 }
proc wal_page_count {{file test.db}} { wal_frame_count ${file}-wal 1024 }


# A checkpoint may be requested either using the C API or by executing
# an SQL PRAGMA command. To test both methods, all tests in this file are 
# run twice - once using each method to request checkpoints.
#
foreach {testprefix do_wal_checkpoint} {

  wal5-pragma {
    proc do_wal_checkpoint { dbhandle args } {
      array set a $args
      foreach key [array names a] {
        if {[lsearch {-mode -db} $key]<0} { error "unknown switch: $key" }
      }

      set sql "PRAGMA "
      if {[info exists a(-db)]} { append sql "$a(-db)." }
      append sql "wal_checkpoint"
      if {[info exists a(-mode)]} { append sql " = $a(-mode)" }

      uplevel [list $dbhandle eval $sql]
    }
  }

  wal5-capi {
    proc do_wal_checkpoint { dbhandle args } {
      set a(-mode) passive
      array set a $args
      foreach key [array names a] {
        if {[lsearch {-mode -db} $key]<0} { error "unknown switch: $key" }
      }

      set vals {restart full truncate}
      if {[lsearch -exact $vals $a(-mode)]<0} { set a(-mode) passive }

      set cmd [list sqlite3_wal_checkpoint_v2 $dbhandle $a(-mode)]
      if {[info exists a(-db)]} { lappend sql $a(-db) }

      uplevel $cmd
    }
  }
} {

  eval $do_wal_checkpoint

  do_multiclient_test tn {

    set ::nBusyHandler 0
    set ::busy_handler_script ""
    proc busyhandler {n} {
      incr ::nBusyHandler 
      eval $::busy_handler_script
      return 0
    }

    proc reopen_all {} {
      code1 {db close}
      code2 {db2 close}
      code3 {db3 close}

      code1 {sqlite3 db test.db}
      code2 {sqlite3 db2 test.db}
      code3 {sqlite3 db3 test.db}

      sql1  { PRAGMA synchronous = NORMAL }
      code1 { db busy busyhandler }
    }

    do_test 1.$tn.1 {
      reopen_all
      sql1 {
        PRAGMA page_size = 1024;
        PRAGMA auto_vacuum = 0;
        CREATE TABLE t1(x, y);
        PRAGMA journal_mode = WAL;
        INSERT INTO t1 VALUES(1, zeroblob(1200));
        INSERT INTO t1 VALUES(2, zeroblob(1200));
        INSERT INTO t1 VALUES(3, zeroblob(1200));
      }
      expr [file size test.db] / 1024
    } {2}

    # Have connection 2 grab a read-lock on the current snapshot.
    do_test 1.$tn.2 { sql2 { BEGIN; SELECT x FROM t1 } } {1 2 3}

    # Attempt a checkpoint.
    do_test 1.$tn.3 {
      code1 { do_wal_checkpoint db }
      list [db_page_count] [wal_page_count]
    } {5 9}

    # Write to the db again. The log cannot wrap because of the lock still
    # held by connection 2. The busy-handler has not yet been invoked.
    do_test 1.$tn.4 {
      sql1 { INSERT INTO t1 VALUES(4, zeroblob(1200)) }
      list [db_page_count] [wal_page_count] $::nBusyHandler
    } {5 12 0}

    # Now do a blocking-checkpoint. Set the busy-handler up so that connection
    # 2 releases its lock on the 6th invocation. The checkpointer should then
    # proceed to checkpoint the entire log file. Next write should go to the 
    # start of the log file.
    #
    set ::busy_handler_script { if {$n==5} { sql2 COMMIT } }
    do_test 1.$tn.5 {
      code1 { do_wal_checkpoint db -mode restart }
      list [db_page_count] [wal_page_count] $::nBusyHandler
    } {6 12 6}
    do_test 1.$tn.6 {
      set ::nBusyHandler 0
      sql1 { INSERT INTO t1 VALUES(5, zeroblob(1200)) }
      list [db_page_count] [wal_page_count] $::nBusyHandler
    } {6 12 0}

    do_test 1.$tn.7 {
      reopen_all
      list [db_page_count] [wal_page_count] $::nBusyHandler
    } [expr {[nonzero_reserved_bytes]?"/# # 0/":"7 0 0"}]

    do_test 1.$tn.8  { sql2 { BEGIN ; SELECT x FROM t1 } } {1 2 3 4 5}
    do_test 1.$tn.9  {
      sql1 { INSERT INTO t1 VALUES(6, zeroblob(1200)) }
      list [db_page_count] [wal_page_count] $::nBusyHandler
    } [expr {[nonzero_reserved_bytes]?"/# # #/":"7 5 0"}]
    do_test 1.$tn.10 { sql3 { BEGIN ; SELECT x FROM t1 } } {1 2 3 4 5 6}

    set ::busy_handler_script { 
      if {$n==5} { sql2 COMMIT } 
      if {$n==6} { set ::db_file_size [db_page_count] }
      if {$n==7} { sql3 COMMIT }
    }
    do_test 1.$tn.11 {
      code1 { do_wal_checkpoint db -mode restart }
      list [db_page_count] [wal_page_count] $::nBusyHandler
    } [expr {[nonzero_reserved_bytes]?"/# # #/":"10 5 8"}]
    do_test 1.$tn.12 { set ::db_file_size } 10
  }

  #-------------------------------------------------------------------------
  # This block of tests explores checkpoint operations on more than one 
  # database file.
  #
  proc setup_and_attach_aux {} {
    sql1 { ATTACH 'test.db2' AS aux }
    sql2 { ATTACH 'test.db2' AS aux }
    sql3 { ATTACH 'test.db2' AS aux }
    sql1 {
      PRAGMA aux.auto_vacuum = 0;
      PRAGMA main.auto_vacuum = 0;
      PRAGMA main.page_size=1024; PRAGMA main.journal_mode=WAL;
      PRAGMA aux.page_size=1024;  PRAGMA aux.journal_mode=WAL;
    }
  }

  proc file_page_counts {} {
    list [db_page_count  test.db ] \
         [wal_page_count test.db ] \
         [db_page_count  test.db2] \
         [wal_page_count test.db2]
  }

  # Test that executing "PRAGMA wal_checkpoint" checkpoints all attached
  # databases, not just the main db.  In capi mode, check that this is
  # true if a NULL pointer is passed to wal_checkpoint_v2() in place of a 
  # database name.
  do_multiclient_test tn {
    setup_and_attach_aux
    do_test 2.1.$tn.1 {
      sql1 {
        CREATE TABLE t1(a, b);
        INSERT INTO t1 VALUES(1, 2);
        CREATE TABLE aux.t2(a, b);
        INSERT INTO t2 VALUES(1, 2);
      }
    } {}
    do_test 2.2.$tn.2 { file_page_counts } {1 3 1 3}
    do_test 2.1.$tn.3 { code1 { do_wal_checkpoint db } } {0 3 3}
    do_test 2.1.$tn.4 { file_page_counts } {2 3 2 3}
  }

  do_multiclient_test tn {
    setup_and_attach_aux
    do_test 2.2.$tn.1 {
      execsql {
        CREATE TABLE t1(a, b);
        INSERT INTO t1 VALUES(1, 2);
        CREATE TABLE aux.t2(a, b);
        INSERT INTO t2 VALUES(1, 2);
        INSERT INTO t2 VALUES(3, 4);
      }
    } {}
    do_test 2.2.$tn.2 { file_page_counts } {1 3 1 4}
    do_test 2.2.$tn.3 { sql2 { BEGIN; SELECT * FROM t1 } } {1 2}
    do_test 2.2.$tn.4 { code1 { do_wal_checkpoint db -mode restart } } {1 3 3}
    do_test 2.2.$tn.5 { file_page_counts } {2 3 2 4}
  }

  do_multiclient_test tn {
    setup_and_attach_aux
    do_test 2.3.$tn.1 {
      execsql {
        CREATE TABLE t1(a, b);
        INSERT INTO t1 VALUES(1, 2);
        CREATE TABLE aux.t2(a, b);
        INSERT INTO t2 VALUES(1, 2);
      }
    } {}
    do_test 2.3.$tn.2 { file_page_counts } {1 3 1 3}
    do_test 2.3.$tn.3 { sql2 { BEGIN; SELECT * FROM t1 } } {1 2}
    do_test 2.3.$tn.4 { sql1 { INSERT INTO t1 VALUES(3, 4) } } {}
    do_test 2.3.$tn.5 { sql1 { INSERT INTO t2 VALUES(3, 4) } } {}
    do_test 2.3.$tn.6 { file_page_counts } {1 4 1 4}
    do_test 2.3.$tn.7 { code1 { do_wal_checkpoint db -mode full } } {1 4 3}

    # The checkpoint above only writes page 1 of the db file. The other
    # page (page 2) is locked by the read-transaction opened by the
    # [sql2] commmand above. So normally, the db is 1 page in size here.
    # However, in mmap() mode, the db is pre-allocated to 2 pages at the
    # start of the checkpoint, even though page 2 cannot be written.
    set nDb 2
    if {[permutation]!="mmap"} {set nDb 1}
    ifcapable !mmap {set nDb 1}
    do_test 2.3.$tn.8 { file_page_counts } [list $nDb 4 2 4]
  }

  # Check that checkpoints block on the correct locks. And respond correctly
  # if they cannot obtain those locks. There are three locks that a checkpoint
  # may block on (in the following order):
  #
  #   1. The writer lock: FULL and RESTART checkpoints block until any writer
  #      process releases its lock.
  #
  #   2. Readers using part of the log file. FULL and RESTART checkpoints block
  #      until readers using part (but not all) of the log file have finished.
  #
  #   3. Readers using any of the log file. After copying data into the
  #      database file, RESTART checkpoints block until readers using any part
  #      of the log file have finished.
  #
  # This test case involves running a checkpoint while there exist other 
  # processes holding all three types of locks.
  #
  foreach {tn1 checkpoint busy_on ckpt_expected expected} {
    1   PASSIVE   -   {0 3 3}   -
    2   TYPO      -   {0 3 3}   -

    3   FULL      -   {0 4 4}   2
    4   FULL      1   {1 3 3}   1
    5   FULL      2   {1 4 3}   2
    6   FULL      3   {0 4 4}   2

    7   RESTART   -   {0 4 4}   3
    8   RESTART   1   {1 3 3}   1
    9   RESTART   2   {1 4 3}   2
    10  RESTART   3   {1 4 4}   3

    11  TRUNCATE  -   {0 0 0}   3
    12  TRUNCATE  1   {1 3 3}   1
    13  TRUNCATE  2   {1 4 3}   2
    14  TRUNCATE  3   {1 4 4}   3

  } {
    do_multiclient_test tn {
      setup_and_attach_aux

      proc busyhandler {x} {
        set ::max_busyhandler $x
        if {$::busy_on!="-" && $x==$::busy_on} { return 1 }
        switch -- $x {
          1 { sql2 "COMMIT ; BEGIN ; SELECT * FROM t1" }
          2 { sql3 "COMMIT" }
          3 { sql2 "COMMIT" }
        }
        return 0
      }
      set ::max_busyhandler -

      do_test 2.4.$tn1.$tn.1 {
        sql1 {
          CREATE TABLE t1(a, b);
          INSERT INTO t1 VALUES(1, 2);
        }
        sql2 { BEGIN; INSERT INTO t1 VALUES(3, 4) }
        sql3 { BEGIN; SELECT * FROM t1 }
      } {1 2}

      do_test 2.4.$tn1.$tn.2 {
        code1 { db busy busyhandler }
        code1 { do_wal_checkpoint db -mode [string tolower $checkpoint] }
      } $ckpt_expected
      do_test 2.4.$tn1.$tn.3 { set ::max_busyhandler } $expected
    }
  }


  do_multiclient_test tn {

    code1 $do_wal_checkpoint
    code2 $do_wal_checkpoint
    code3 $do_wal_checkpoint
    
    do_test 3.$tn.1 {
      sql1 {
        PRAGMA auto_vacuum = 0;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = normal;
        CREATE TABLE t1(x, y);
      }

      sql2 { PRAGMA journal_mode }
      sql3 { PRAGMA journal_mode }
    } {wal}

    do_test 3.$tn.2 { code2 { do_wal_checkpoint db2 } } {0 2 2}

    do_test 3.$tn.3 { code2 { do_wal_checkpoint db2 } } {0 2 2}

    do_test 3.$tn.4 { code3 { do_wal_checkpoint db3 } } {0 2 2}

    code1 {db  close}
    code2 {db2 close}
    code3 {db3 close}

    code1 {sqlite3 db  test.db}
    code2 {sqlite3 db2 test.db}
    code3 {sqlite3 db3 test.db}

    do_test 3.$tn.5 { sql3 { PRAGMA journal_mode } } {wal}

    do_test 3.$tn.6 { code3 { do_wal_checkpoint db3 } } {0 0 0}
  }

  # Test SQLITE_CHECKPOINT_TRUNCATE.
  #
  do_multiclient_test tn {

    code1 $do_wal_checkpoint
    code2 $do_wal_checkpoint
    code3 $do_wal_checkpoint

    do_test 4.$tn.1 {
      sql1 {
        PRAGMA page_size = 1024;
        PRAGMA auto_vacuum = 0;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = normal;
        CREATE TABLE t1(x, y);
        CREATE INDEX i1 ON t1(x, y);
        INSERT INTO t1 VALUES(1, 2);
        INSERT INTO t1 VALUES(3, 4);
      }
      file size test.db-wal
    } [wal_file_size 8 1024]

    do_test 4.$tn.2 { do_wal_checkpoint db -mode truncate } {0 0 0}
    do_test 4.$tn.3 { file size test.db-wal } 0

    do_test 4.$tn.4 {
      sql2 { SELECT * FROM t1 }
    } {1 2 3 4}

    do_test 4.$tn.5 {
      sql2 { INSERT INTO t1 VALUES('a', 'b') }
      file size test.db-wal
    } [wal_file_size 2 1024]

  }
  
  # Test that FULL, RESTART and TRUNCATE callbacks block on other clients
  # and truncate the wal file as required even if the entire wal file has
  # already been checkpointed when they are invoked.
  #
  do_multiclient_test tn {

    code1 $do_wal_checkpoint
    code2 $do_wal_checkpoint
    code3 $do_wal_checkpoint

    do_test 5.$tn.1 {
      sql1 {
        PRAGMA page_size = 1024;
        PRAGMA auto_vacuum = 0;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = normal;
        CREATE TABLE t1(x, y);
        CREATE INDEX i1 ON t1(x, y);
        INSERT INTO t1 VALUES(1, 2);
        INSERT INTO t1 VALUES(3, 4);
        INSERT INTO t1 VALUES(5, 6);
      }
      file size test.db-wal
    } [wal_file_size 10 1024]

    do_test 5.$tn.2 { 
      sql2 { BEGIN; SELECT * FROM t1 }
    } {1 2 3 4 5 6}

    do_test 5.$tn.3 { do_wal_checkpoint db -mode passive } {0 10 10}

    do_test 5.$tn.4 { 
      sql3 { BEGIN; INSERT INTO t1 VALUES(7, 8); }
    } {}

    do_test 5.$tn.5 { do_wal_checkpoint db -mode passive  } {0 10 10}
    do_test 5.$tn.6 { do_wal_checkpoint db -mode full     } {1 10 10}

    do_test 5.$tn.7 { sql3 { ROLLBACK } } {}

    do_test 5.$tn.8 { do_wal_checkpoint db -mode full     } {0 10 10}
    do_test 5.$tn.9 { do_wal_checkpoint db -mode truncate } {1 10 10}

    do_test 5.$tn.10 { 
      file size test.db-wal
    } [wal_file_size 10 1024]

    proc xBusyHandler {n} { sql2 { COMMIT } ; return 0 }
    db busy xBusyHandler

    do_test 5.$tn.11 { do_wal_checkpoint db -mode truncate } {0 0 0}
    do_test 5.$tn.12 { file size test.db-wal } 0

    do_test 5.$tn.13 {
      sql1 {
        INSERT INTO t1 VALUES(7, 8);
        INSERT INTO t1 VALUES(9, 10);
        SELECT * FROM t1;
      }
    } {1 2 3 4 5 6 7 8 9 10}

    do_test 5.$tn.14 { 
      sql2 { BEGIN; SELECT * FROM t1 }
    } {1 2 3 4 5 6 7 8 9 10}

    proc xBusyHandler {n} { return 1 }
    do_test 5.$tn.15 { do_wal_checkpoint db -mode truncate } {1 4 4}
    do_test 5.$tn.16 { file size test.db-wal } [wal_file_size 4 1024]

    do_test 5.$tn.17 { do_wal_checkpoint db -mode restart } {1 4 4}

    proc xBusyHandler {n} { sql2 { COMMIT } ; return 0 }
    db busy xBusyHandler
    do_test 5.$tn.18 { do_wal_checkpoint db -mode restart } {0 4 4}
    do_test 5.$tn.19 { file size test.db-wal } [wal_file_size 4 1024]

    do_test 5.$tn.20 { do_wal_checkpoint db -mode truncate } {0 0 0}
    do_test 5.$tn.21 { file size test.db-wal } 0
  }

}


finish_test
