# 2005 December 30
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
# The focus of the tests in this file are IO errors that occur in a shared
# cache context. What happens to connection B if one connection A encounters
# an IO-error whilst reading or writing the file-system?
#
# $Id: shared_err.test,v 1.24 2008/10/12 00:27:54 shane Exp $

proc skip {args} {}


set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
db close

ifcapable !shared_cache||!subquery {
  finish_test
  return
}

set ::enable_shared_cache [sqlite3_enable_shared_cache 1]

do_ioerr_test shared_ioerr-1 -tclprep {
  sqlite3 db2 test.db
  execsql {
    PRAGMA read_uncommitted = 1;
    CREATE TABLE t1(a,b,c);
    BEGIN;
    SELECT * FROM sqlite_master;
  } db2
} -sqlbody {
  SELECT * FROM sqlite_master;
  INSERT INTO t1 VALUES(1,2,3);
  BEGIN TRANSACTION;
  INSERT INTO t1 VALUES(1,2,3);
  INSERT INTO t1 VALUES(4,5,6);
  ROLLBACK;
  SELECT * FROM t1;
  BEGIN TRANSACTION;
  INSERT INTO t1 VALUES(1,2,3);
  INSERT INTO t1 VALUES(4,5,6);
  COMMIT;
  SELECT * FROM t1;
  DELETE FROM t1 WHERE a<100;
} -cleanup {
  do_test shared_ioerr-1.$n.cleanup.1 {
    set res [catchsql {
      SELECT * FROM t1;
    } db2]
    set possible_results [list               \
      "1 {disk I/O error}"                   \
      "0 {1 2 3}"                            \
      "0 {1 2 3 1 2 3 4 5 6}"                \
      "0 {1 2 3 1 2 3 4 5 6 1 2 3 4 5 6}"    \
      "0 {}"                                 \
      "1 {database disk image is malformed}" \
    ]
    set rc [expr [lsearch -exact $possible_results $res] >= 0]
    if {$rc != 1} {
      puts ""
      puts "Result: $res"
    }
    set rc
  } {1}

  # The "database disk image is malformed" is a special case that can
  # occur if an IO error occurs during a rollback in the {SELECT * FROM t1}
  # statement above. This test is to make sure there is no real database
  # corruption.
  db2 close
  do_test shared_ioerr-1.$n.cleanup.2 {
    execsql {pragma integrity_check} db
  } {ok}
}

do_ioerr_test shared_ioerr-2 -tclprep {
  sqlite3 db2 test.db
  execsql {
    PRAGMA read_uncommitted = 1;
    BEGIN;
    CREATE TABLE t1(a, b);
    INSERT INTO t1(oid) VALUES(NULL);
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    INSERT INTO t1(oid) SELECT NULL FROM t1;
    UPDATE t1 set a = oid, b = 'abcdefghijklmnopqrstuvwxyz0123456789';
    CREATE INDEX i1 ON t1(a);
    COMMIT;
    BEGIN;
    SELECT * FROM sqlite_master;
  } db2
} -tclbody {
  set ::residx 0
  execsql {DELETE FROM t1 WHERE 0 = (a % 2);}
  incr ::residx

  # When this transaction begins the table contains 512 entries. The
  # two statements together add 512+146 more if it succeeds. 
  # (1024/7==146)
  execsql {BEGIN;}
  execsql {INSERT INTO t1 SELECT a+1, b FROM t1;}
  execsql {INSERT INTO t1 SELECT 'string' || a, b FROM t1 WHERE 0 = (a%7);}
  execsql {COMMIT;}

  incr ::residx
} -cleanup {
  catchsql ROLLBACK
  do_test shared_ioerr-2.$n.cleanup.1 {
    set res [catchsql {
      SELECT max(a), min(a), count(*) FROM (SELECT a FROM t1 order by a);
    } db2]
    set possible_results [list \
      {0 {1024 1 1024}}        \
      {0 {1023 1 512}}         \
      {0 {string994 1 1170}}   \
    ]
    set idx [lsearch -exact $possible_results $res]
    set success [expr {$idx==$::residx || $res=="1 {disk I/O error}"}]
    if {!$success} {
      puts ""
      puts "Result: \"$res\" ($::residx)"
    }
    set success
  } {1}
  db2 close
}

# This test is designed to provoke an IO error when a cursor position is
# "saved" (because another cursor is going to modify the underlying table). 
# 
do_ioerr_test shared_ioerr-3 -tclprep {
  sqlite3 db2 test.db
  execsql {
    PRAGMA read_uncommitted = 1;
    PRAGMA cache_size = 10;
    BEGIN;
    CREATE TABLE t1(a, b, UNIQUE(a, b));
  } db2
  for {set i 0} {$i < 200} {incr i} {
    set a [string range [string repeat "[format %03d $i]." 5] 0 end-1]

    set b [string repeat $i 2000]
    execsql {INSERT INTO t1 VALUES($a, $b)} db2
  }
  execsql {COMMIT} db2
  set ::DB2 [sqlite3_connection_pointer db2]
  set ::STMT [sqlite3_prepare $::DB2 "SELECT a FROM t1 ORDER BY a" -1 DUMMY]
  sqlite3_step $::STMT       ;# Cursor points at 000.000.000.000
  sqlite3_step $::STMT       ;# Cursor points at 001.001.001.001

} -tclbody {
  execsql {
    BEGIN;
    INSERT INTO t1 VALUES('201.201.201.201.201', NULL);
    UPDATE t1 SET a = '202.202.202.202.202' WHERE a LIKE '201%';
    COMMIT;
  }
} -cleanup {
  set ::steprc  [sqlite3_step $::STMT]
  set ::column  [sqlite3_column_text $::STMT 0]
  set ::finalrc [sqlite3_finalize $::STMT]

  # There are three possible outcomes here (assuming persistent IO errors):
  #
  # 1. If the [sqlite3_step] did not require any IO (required pages in
  #    the cache), then the next row ("002...") may be retrieved 
  #    successfully.
  #
  # 2. If the [sqlite3_step] does require IO, then [sqlite3_step] returns
  #    SQLITE_ERROR and [sqlite3_finalize] returns IOERR.
  #
  # 3. If, after the initial IO error, SQLite tried to rollback the
  #    active transaction and a second IO error was encountered, then
  #    statement $::STMT will have been aborted. This means [sqlite3_stmt]
  #    returns SQLITE_ABORT, and the statement cursor does not move. i.e.
  #    [sqlite3_column] still returns the current row ("001...") and
  #    [sqlite3_finalize] returns SQLITE_OK.
  #

  do_test shared_ioerr-3.$n.cleanup.1 {
    expr {
      $::steprc eq "SQLITE_ROW" || 
      $::steprc eq "SQLITE_ERROR" ||
      $::steprc eq "SQLITE_ABORT" 
    }
  } {1}
  do_test shared_ioerr-3.$n.cleanup.2 {
    expr {
      ($::steprc eq "SQLITE_ROW" && $::column eq "002.002.002.002.002") ||
      ($::steprc eq "SQLITE_ERROR" && $::column eq "") ||
      ($::steprc eq "SQLITE_ABORT" && $::column eq "001.001.001.001.001") 
    }
  } {1}
  do_test shared_ioerr-3.$n.cleanup.3 {
    expr {
      ($::steprc eq "SQLITE_ROW" && $::finalrc eq "SQLITE_OK") ||
      ($::steprc eq "SQLITE_ERROR" && $::finalrc eq "SQLITE_IOERR") ||
      ($::steprc eq "SQLITE_ERROR" && $::finalrc eq "SQLITE_ABORT")
    }
  } {1}

# db2 eval {select * from sqlite_master}
  db2 close
}

# This is a repeat of the previous test except that this time we
# are doing a reverse-order scan of the table when the cursor is
# "saved".
# 
do_ioerr_test shared_ioerr-3rev -tclprep {
  sqlite3 db2 test.db
  execsql {
    PRAGMA read_uncommitted = 1;
    PRAGMA cache_size = 10;
    BEGIN;
    CREATE TABLE t1(a, b, UNIQUE(a, b));
  } db2
  for {set i 0} {$i < 200} {incr i} {
    set a [string range [string repeat "[format %03d $i]." 5] 0 end-1]

    set b [string repeat $i 2000]
    execsql {INSERT INTO t1 VALUES($a, $b)} db2
  }
  execsql {COMMIT} db2
  set ::DB2 [sqlite3_connection_pointer db2]
  set ::STMT [sqlite3_prepare $::DB2 \
           "SELECT a FROM t1 ORDER BY a DESC" -1 DUMMY]
  sqlite3_step $::STMT       ;# Cursor points at 199.199.199.199.199
  sqlite3_step $::STMT       ;# Cursor points at 198.198.198.198.198

} -tclbody {
  execsql {
    BEGIN;
    INSERT INTO t1 VALUES('201.201.201.201.201', NULL);
    UPDATE t1 SET a = '202.202.202.202.202' WHERE a LIKE '201%';
    COMMIT;
  }
} -cleanup {
  set ::steprc  [sqlite3_step $::STMT]
  set ::column  [sqlite3_column_text $::STMT 0]
  set ::finalrc [sqlite3_finalize $::STMT]

  # There are three possible outcomes here (assuming persistent IO errors):
  #
  # 1. If the [sqlite3_step] did not require any IO (required pages in
  #    the cache), then the next row ("002...") may be retrieved 
  #    successfully.
  #
  # 2. If the [sqlite3_step] does require IO, then [sqlite3_step] returns
  #    SQLITE_ERROR and [sqlite3_finalize] returns IOERR.
  #
  # 3. If, after the initial IO error, SQLite tried to rollback the
  #    active transaction and a second IO error was encountered, then
  #    statement $::STMT will have been aborted. This means [sqlite3_stmt]
  #    returns SQLITE_ABORT, and the statement cursor does not move. i.e.
  #    [sqlite3_column] still returns the current row ("001...") and
  #    [sqlite3_finalize] returns SQLITE_OK.
  #

  do_test shared_ioerr-3rev.$n.cleanup.1 {
    expr {
      $::steprc eq "SQLITE_ROW" || 
      $::steprc eq "SQLITE_ERROR" ||
      $::steprc eq "SQLITE_ABORT" 
    }
  } {1}
  do_test shared_ioerr-3rev.$n.cleanup.2 {
    expr {
      ($::steprc eq "SQLITE_ROW" && $::column eq "197.197.197.197.197") ||
      ($::steprc eq "SQLITE_ERROR" && $::column eq "") ||
      ($::steprc eq "SQLITE_ABORT" && $::column eq "198.198.198.198.198") 
    }
  } {1}
  do_test shared_ioerr-3rev.$n.cleanup.3 {
    expr {
      ($::steprc eq "SQLITE_ROW" && $::finalrc eq "SQLITE_OK") ||
      ($::steprc eq "SQLITE_ERROR" && $::finalrc eq "SQLITE_IOERR") ||
      ($::steprc eq "SQLITE_ERROR" && $::finalrc eq "SQLITE_ABORT")
    }
  } {1}

# db2 eval {select * from sqlite_master}
  db2 close
}

# Provoke a malloc() failure when a cursor position is being saved. This
# only happens with index cursors (because they malloc() space to save the
# current key value). It does not happen with tables, because an integer
# key does not require a malloc() to store. 
#
# The library should return an SQLITE_NOMEM to the caller. The query that
# owns the cursor (the one for which the position is not saved) should
# continue unaffected.
# 
do_malloc_test shared_err-4 -tclprep {
  sqlite3 db2 test.db
  execsql {
    PRAGMA read_uncommitted = 1;
    BEGIN;
    CREATE TABLE t1(a, b, UNIQUE(a, b));
  } db2
  for {set i 0} {$i < 5} {incr i} {
    set a [string repeat $i 10]
    set b [string repeat $i 2000]
    execsql {INSERT INTO t1 VALUES($a, $b)} db2
  }
  execsql {COMMIT} db2
  set ::DB2 [sqlite3_connection_pointer db2]
  set ::STMT [sqlite3_prepare $::DB2 "SELECT a FROM t1 ORDER BY a" -1 DUMMY]
  sqlite3_step $::STMT       ;# Cursor points at 0000000000
  sqlite3_step $::STMT       ;# Cursor points at 1111111111
} -tclbody {
  execsql {
    INSERT INTO t1 VALUES(6, NULL);
  }
} -cleanup {
  do_test shared_malloc-4.$::n.cleanup.1 {
    set ::rc [sqlite3_step $::STMT]
    expr {$::rc=="SQLITE_ROW" || $::rc=="SQLITE_ERROR"}
  } {1}
  if {$::rc=="SQLITE_ROW"} {
    do_test shared_malloc-4.$::n.cleanup.2 {
      sqlite3_column_text $::STMT 0
    } {2222222222}
  }
  do_test shared_malloc-4.$::n.cleanup.3 {
   set rc [sqlite3_finalize $::STMT]
   expr {$rc=="SQLITE_OK" || $rc=="SQLITE_ABORT" ||
         $rc=="SQLITE_NOMEM" || $rc=="SQLITE_IOERR"}
  } {1}
# db2 eval {select * from sqlite_master}
  db2 close
}

do_malloc_test shared_err-5 -tclbody {
  db close
  sqlite3 dbX test.db
  sqlite3 dbY test.db
  dbX close
  dbY close
} -cleanup {
  catch {dbX close}
  catch {dbY close}
}

do_malloc_test shared_err-6 -tclbody {
  catch {db close}
  ifcapable deprecated {
    sqlite3_thread_cleanup
  }
  sqlite3_enable_shared_cache 0
} -cleanup {
  sqlite3_enable_shared_cache 1
}

# As of 3.5.0, sqlite3_enable_shared_cache can be called at
# any time and from any thread
#do_test shared_err-misuse-7.1 {
#  sqlite3 db test.db
#  catch {
#    sqlite3_enable_shared_cache 0
#  } msg
#  set msg
#} {bad parameter or other API misuse}

# Again provoke a malloc() failure when a cursor position is being saved, 
# this time during a ROLLBACK operation by some other handle. 
#
# The library should return an SQLITE_NOMEM to the caller. The query that
# owns the cursor (the one for which the position is not saved) should
# be aborted.
# 
set ::aborted 0
do_malloc_test shared_err-8 -tclprep {
  sqlite3 db2 test.db
  execsql {
    PRAGMA read_uncommitted = 1;
    BEGIN;
    CREATE TABLE t1(a, b, UNIQUE(a, b));
  } db2
  for {set i 0} {$i < 2} {incr i} {
    set a [string repeat $i 10]
    set b [string repeat $i 2000]
    execsql {INSERT INTO t1 VALUES($a, $b)} db2
  }
  execsql {COMMIT} db2
  execsql BEGIN
  execsql ROLLBACK
  set ::DB2 [sqlite3_connection_pointer db2]
  set ::STMT [sqlite3_prepare $::DB2 "SELECT a FROM t1 ORDER BY a" -1 DUMMY]
  sqlite3_step $::STMT       ;# Cursor points at 0000000000
  sqlite3_step $::STMT       ;# Cursor points at 1111111111
} -tclbody {
  execsql {
    BEGIN;
    INSERT INTO t1 VALUES(6, NULL);
    ROLLBACK}
} -cleanup {
  # UPDATE: As of [5668], if the rollback fails SQLITE_CORRUPT is returned. 
  # So these tests have been updated to expect SQLITE_CORRUPT and its
  # associated English language error message.
  #
  do_test shared_malloc-8.$::n.cleanup.1 {
    set res [catchsql {SELECT a FROM t1} db2]
    set ans [lindex $res 1]
    if {[lindex $res 0]} {
       set r [expr {
         $ans=="disk I/O error" ||
         $ans=="out of memory" ||
         $ans=="database disk image is malformed"
       }]
    } else {
       set r [expr {[lrange $ans 0 1]=="0000000000 1111111111"}]
    }
  } {1}
  do_test shared_malloc-8.$::n.cleanup.2 {
    set rc1 [sqlite3_step $::STMT]
    set rc2 [sqlite3_finalize $::STMT]
    if {$rc2=="SQLITE_ABORT"} {
      incr ::aborted
    }
    expr {
      ($rc1=="SQLITE_DONE" && $rc2=="SQLITE_OK") || 
      ($rc1=="SQLITE_ERROR" && $rc2=="SQLITE_ABORT") ||
      ($rc1=="SQLITE_ERROR" && $rc2=="SQLITE_NOMEM") ||
      ($rc1=="SQLITE_ERROR" && $rc2=="SQLITE_IOERR") ||
      ($rc1=="SQLITE_ERROR" && $rc2=="SQLITE_CORRUPT")
    }
  } {1}
  db2 close
}

# When this test case was written, OOM errors in write statements would 
# cause transaction rollback, which would trip cursors in other statements,
# aborting them. This no longer happens.
#
do_test shared_malloc-8.X {
  # Test that one or more queries were aborted due to the malloc() failure.
  # expr $::aborted>=1
  expr $::aborted==0
} {1}

# This test is designed to catch a specific bug that was present during
# development of 3.5.0. If a malloc() failed while setting the page-size,
# a buffer (Pager.pTmpSpace) was being freed. This could cause a seg-fault
# later if another connection tried to use the pager.
#
# This test will crash 3.4.2.
#
do_malloc_test shared_err-9 -tclprep {
  sqlite3 db2 test.db
} -sqlbody {
  PRAGMA page_size = 4096;
  PRAGMA page_size = 1024;
} -cleanup {
  db2 eval {
    CREATE TABLE abc(a, b, c);
    BEGIN;
    INSERT INTO abc VALUES(1, 2, 3);
    ROLLBACK;
  }     
  db2 close
}     

catch {db close}
catch {db2 close}
do_malloc_test shared_err-10 -tclprep {
  sqlite3 db test.db
  sqlite3 db2 test.db
  
  db eval { SELECT * FROM sqlite_master }
  db2 eval { 
    BEGIN;
    CREATE TABLE abc(a, b, c);
  }
} -tclbody {
  catch {db eval {SELECT * FROM sqlite_master}}
  error 1
} -cleanup {
  execsql { SELECT * FROM sqlite_master }
}

do_malloc_test shared_err-11 -tclprep {
  sqlite3 db test.db
  sqlite3 db2 test.db
  
  db eval { SELECT * FROM sqlite_master }
  db2 eval { 
    BEGIN;
    CREATE TABLE abc(a, b, c);
  }
} -tclbody {
  catch {db eval {SELECT * FROM sqlite_master}}
  catch {sqlite3_errmsg16 db}
  error 1
} -cleanup {
  execsql { SELECT * FROM sqlite_master }
}

catch {db close}
catch {db2 close}

do_malloc_test shared_err-12 -sqlbody {
  CREATE TABLE abc(a, b, c);
  INSERT INTO abc VALUES(1, 2, 3);
}

catch {db close}
catch {db2 close}
sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
