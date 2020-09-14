# 2010 March 10
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
# Tests for the sqlite3_db_status() function
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix dbstatus

ifcapable !compound {
  finish_test
  return
}

# Memory statistics must be enabled for this test.
db close
sqlite3_shutdown
sqlite3_config_memstatus 1
sqlite3_config_uri 1
sqlite3_initialize
sqlite3 db test.db


# Make sure sqlite3_db_config() and sqlite3_db_status are working.
#
unset -nocomplain PAGESZ
unset -nocomplain BASESZ
do_test dbstatus-1.1 {
  db close
  sqlite3 db :memory:
  db eval {
    CREATE TABLE t1(x);
  }
  set sz1 [lindex [sqlite3_db_status db SQLITE_DBSTATUS_CACHE_USED 0] 1]
  db eval {
    CREATE TABLE t2(y);
  }
  set sz2 [lindex [sqlite3_db_status db SQLITE_DBSTATUS_CACHE_USED 0] 1]
  set ::PAGESZ [expr {$sz2-$sz1}]
  set ::BASESZ [expr {$sz1-$::PAGESZ}]
  expr {$::PAGESZ>1024 && $::PAGESZ<1300}
} {1}
do_test dbstatus-1.2 {
  db eval {
    INSERT INTO t1 VALUES(zeroblob(9000));
  }
  lindex [sqlite3_db_status db SQLITE_DBSTATUS_CACHE_USED 0] 1
} [expr {$BASESZ + 10*$PAGESZ}]


proc lookaside {db} {
  expr { $::lookaside_buffer_size *
    [lindex [sqlite3_db_status $db SQLITE_DBSTATUS_LOOKASIDE_USED 0] 1]
  }
}

ifcapable stat4 {
  set STAT3 1
} else {
  set STAT3 0
}

#---------------------------------------------------------------------------
# Run the dbstatus-2 and dbstatus-3 tests with several of different
# lookaside buffer sizes.
#
foreach ::lookaside_buffer_size {0 64 120} {
  ifcapable malloc_usable_size break

  # Do not run any of these tests if there is SQL configured to run
  # as part of the [sqlite3] command. This prevents the script from
  # configuring the size of the lookaside buffer after [sqlite3] has
  # returned.
  if {[presql] != ""} break

  #-------------------------------------------------------------------------
  # Tests for SQLITE_DBSTATUS_SCHEMA_USED.
  #
  # Each test in the following block works as follows. Each test uses a
  # different database schema.
  #
  #   1. Open a connection to an empty database. Disable statement caching.
  #
  #   2. Execute the SQL to create the database schema. Measure the total 
  #      heap and lookaside memory allocated by SQLite, and the memory 
  #      allocated for the database schema according to sqlite3_db_status().
  #
  #   3. Drop all tables in the database schema. Measure the total memory 
  #      and the schema memory again.
  #
  #   4. Repeat step 2.
  #
  #   5. Repeat step 3.
  #
  # Then test that:
  #
  #   a) The difference in schema memory quantities in steps 2 and 3 is the
  #      same as the difference in total memory in steps 2 and 3.
  #
  #   b) Step 4 reports the same amount of schema and total memory used as
  #      in step 2.
  #
  #   c) Step 5 reports the same amount of schema and total memory used as
  #      in step 3.
  #
  foreach {tn schema} { 
    1 { CREATE TABLE t1(a, b) }
    2 { CREATE TABLE t1(a PRIMARY KEY, b REFERENCES t1, c UNIQUE) }
    3 {
      CREATE TABLE t1(a, b);
      CREATE INDEX i1 ON t1(a, b);
    }
    4 {
      CREATE TABLE t1(a, b);
      CREATE TABLE t2(c, d);
      CREATE TRIGGER AFTER INSERT ON t1 BEGIN
        INSERT INTO t2 VALUES(new.a, new.b);
        SELECT * FROM t1, t2 WHERE a=c AND b=d GROUP BY b HAVING a>5 ORDER BY a;
      END;
    }
    5 {
      CREATE TABLE t1(a, b);
      CREATE TABLE t2(c, d);
      CREATE VIEW v1 AS SELECT * FROM t1 UNION SELECT * FROM t2;
    }
    6k {
      CREATE TABLE t1(a, b);
      CREATE INDEX i1 ON t1(a);
      CREATE INDEX i2 ON t1(a,b);
      CREATE INDEX i3 ON t1(b,b);
      INSERT INTO t1 VALUES(randomblob(20), randomblob(25));
      INSERT INTO t1 SELECT randomblob(20), randomblob(25) FROM t1;
      INSERT INTO t1 SELECT randomblob(20), randomblob(25) FROM t1;
      INSERT INTO t1 SELECT randomblob(20), randomblob(25) FROM t1;
      ANALYZE;
    }
    7 {
      CREATE TABLE t1(a, b);
      CREATE TABLE t2(c, d);
      CREATE VIEW v1 AS 
        SELECT * FROM t1 
        UNION 
        SELECT * FROM t2
        UNION ALL
        SELECT c||b, d||a FROM t2 LEFT OUTER JOIN t1 GROUP BY c, d
        ORDER BY 1, 2
      ;
      CREATE TRIGGER tr1 INSTEAD OF INSERT ON v1 BEGIN
        SELECT * FROM v1;
        UPDATE t1 SET a=5, b=(SELECT c FROM t2);
      END;
      SELECT * FROM v1;
    }
    8x {
      CREATE TABLE t1(a, b, UNIQUE(a, b));
      CREATE VIRTUAL TABLE t2 USING echo(t1);
    }
  } {
    set tn "$::lookaside_buffer_size-$tn"
  
    # Step 1.
    db close
    forcedelete test.db
    sqlite3 db test.db
    sqlite3_db_config_lookaside db 0 $::lookaside_buffer_size 500
    db cache size 0

    catch { register_echo_module db }
    ifcapable !vtab { if {[string match *x $tn]} continue }
  
    # Step 2.
    execsql $schema
    set nAlloc1  [lindex [sqlite3_status SQLITE_STATUS_MEMORY_USED 0] 1]
    incr nAlloc1 [lookaside db]
    set nSchema1 [lindex [sqlite3_db_status db SQLITE_DBSTATUS_SCHEMA_USED 0] 1]
  
    # Step 3.
    drop_all_tables
    set nAlloc2  [lindex [sqlite3_status SQLITE_STATUS_MEMORY_USED 0] 1]
    incr nAlloc2 [lookaside db]
    set nSchema2 [lindex [sqlite3_db_status db SQLITE_DBSTATUS_SCHEMA_USED 0] 1]
  
    # Step 4.
    execsql $schema
    set nAlloc3  [lindex [sqlite3_status SQLITE_STATUS_MEMORY_USED 0] 1]
    incr nAlloc3 [lookaside db]
    set nSchema3 [lindex [sqlite3_db_status db SQLITE_DBSTATUS_SCHEMA_USED 0] 1]
    
    # Step 5.
    drop_all_tables
    set nAlloc4  [lindex [sqlite3_status SQLITE_STATUS_MEMORY_USED 0] 1]
    incr nAlloc4 [lookaside db]
    set nSchema4 [lindex [sqlite3_db_status db SQLITE_DBSTATUS_SCHEMA_USED 0] 1]
    set nFree [expr {$nAlloc1-$nAlloc2}]
    
    # Tests for which the test name ends in an "k" report slightly less
    # memory than is actually freed when all schema items are finalized.
    # This is because memory allocated by KeyInfo objects is no longer
    # counted as "schema memory".
    #
    # Tests for which the test name ends in an "x" report slightly less
    # memory than is actually freed when all schema items are finalized.
    # This is because memory allocated by virtual table implementations
    # for any reason is not counted as "schema memory".
    #
    # Additionally, in auto-vacuum mode, dropping tables and indexes causes
    # the page-cache to shrink. So the amount of memory freed is always
    # much greater than just that reported by DBSTATUS_SCHEMA_USED in this
    # case.
    #
    # Some of the memory used for sqlite_stat4 is unaccounted for by
    # dbstatus.
    #
    # Finally, on osx the estimate of memory used by the schema may be
    # slightly low. 
    #
    if {[string match *k $tn]
         || [string match *x $tn] || $AUTOVACUUM
         || ([string match *y $tn] && $STAT3)
         || ($::tcl_platform(os) == "Darwin")
    } {
      do_test dbstatus-2.$tn.ax { expr {($nSchema1-$nSchema2)<=$nFree} } 1
    } else {
      do_test dbstatus-2.$tn.a { expr {$nSchema1-$nSchema2} } $nFree
    }
  
    do_test dbstatus-2.$tn.b { list $nAlloc1 $nSchema1 } "$nAlloc3 $nSchema3"
    do_test dbstatus-2.$tn.c { list $nAlloc2 $nSchema2 } "$nAlloc4 $nSchema4"
  }
  
  #-------------------------------------------------------------------------
  # Tests for SQLITE_DBSTATUS_STMT_USED.
  #
  # Each test in the following block works as follows. Each test uses a
  # different database schema.
  #
  #   1. Open a connection to an empty database. Initialized the database
  #      schema.
  #
  #   2. Prepare a bunch of SQL statements. Measure the total heap and 
  #      lookaside memory allocated by SQLite, and the memory allocated 
  #      for the prepared statements according to sqlite3_db_status().
  #
  #   3. Finalize all prepared statements. Measure the total memory 
  #      and the prepared statement memory again.
  #
  #   4. Repeat step 2.
  #
  #   5. Repeat step 3.
  #
  # Then test that:
  #
  #   a) The difference in schema memory quantities in steps 2 and 3 is the
  #      same as the difference in total memory in steps 2 and 3.
  #
  #   b) Step 4 reports the same amount of schema and total memory used as
  #      in step 2.
  #
  #   c) Step 5 reports the same amount of schema and total memory used as
  #      in step 3.
  #
  foreach {tn schema statements} { 
    1 { CREATE TABLE t1(a, b) } {
      SELECT * FROM t1;
      INSERT INTO t1 VALUES(1, 2);
      INSERT INTO t1 SELECT * FROM t1;
      UPDATE t1 SET a=5;
      DELETE FROM t1;
    }
    2 {
      PRAGMA recursive_triggers = 1;
      CREATE TABLE t1(a, b);
      CREATE TRIGGER tr1 AFTER INSERT ON t1 WHEN (new.a>0) BEGIN
        INSERT INTO t1 VALUES(new.a-1, new.b);
      END;
    } {
      INSERT INTO t1 VALUES(5, 'x');
    } 
    3 {
      PRAGMA recursive_triggers = 1;
      CREATE TABLE t1(a, b);
      CREATE TABLE t2(a, b);
      CREATE TRIGGER tr1 AFTER INSERT ON t1 WHEN (new.a>0) BEGIN
        INSERT INTO t2 VALUES(new.a-1, new.b);
      END;
      CREATE TRIGGER tr2 AFTER INSERT ON t1 WHEN (new.a>0) BEGIN
        INSERT INTO t1 VALUES(new.a-1, new.b);
      END;
    } {
      INSERT INTO t1 VALUES(10, 'x');
    } 
    4 {
      CREATE TABLE t1(a, b);
    } {
      SELECT count(*) FROM t1 WHERE upper(a)='ABC';
    }
    5x {
      CREATE TABLE t1(a, b UNIQUE);
      CREATE VIRTUAL TABLE t2 USING echo(t1);
    } {
      SELECT count(*) FROM t2;
      SELECT * FROM t2 WHERE b>5;
      SELECT * FROM t2 WHERE b='abcdefg';
    }
  } {
    set tn "$::lookaside_buffer_size-$tn"

    # Step 1.
    db close
    forcedelete test.db
    sqlite3 db test.db
    sqlite3_db_config_lookaside db 0 $::lookaside_buffer_size 500
    db cache size 1000

    catch { register_echo_module db }
    ifcapable !vtab { if {[string match *x $tn]} continue }
  
    execsql $schema
    db cache flush
  
    # Step 2.
    execsql $statements
    set nAlloc1  [lindex [sqlite3_status SQLITE_STATUS_MEMORY_USED 0] 1]
    incr nAlloc1 [lookaside db]
    set nStmt1   [lindex [sqlite3_db_status db SQLITE_DBSTATUS_STMT_USED 0] 1]
    execsql $statements
  
    # Step 3.
    db cache flush
    set nAlloc2  [lindex [sqlite3_status SQLITE_STATUS_MEMORY_USED 0] 1]
    incr nAlloc2 [lookaside db]
    set nStmt2   [lindex [sqlite3_db_status db SQLITE_DBSTATUS_STMT_USED 0] 1]
    
    # Step 3.
    execsql $statements
    set nAlloc3  [lindex [sqlite3_status SQLITE_STATUS_MEMORY_USED 0] 1]
    incr nAlloc3 [lookaside db]
    set nStmt3   [lindex [sqlite3_db_status db SQLITE_DBSTATUS_STMT_USED 0] 1]
    execsql $statements
  
    # Step 4.
    db cache flush
    set nAlloc4  [lindex [sqlite3_status SQLITE_STATUS_MEMORY_USED 0] 1]
    incr nAlloc4 [lookaside db]
    set nStmt4 [lindex [sqlite3_db_status db SQLITE_DBSTATUS_STMT_USED 0] 1]
  
    set nFree [expr {$nAlloc1-$nAlloc2}]

    do_test dbstatus-3.$tn.a { expr $nStmt2 } {0}

    # Tests for which the test name ends in an "x" report slightly less
    # memory than is actually freed when all statements are finalized.
    # This is because a small amount of memory allocated by a virtual table
    # implementation using sqlite3_mprintf() is technically considered
    # external and so is not counted as "statement memory".
    #
#puts "$nStmt1 $nFree"
    if {[string match *x $tn]} {
      do_test dbstatus-3.$tn.bx { expr $nStmt1<=$nFree }  {1}
    } else {
      do_test dbstatus-3.$tn.b { expr $nStmt1==$nFree } {1}
    }

    do_test dbstatus-3.$tn.c { list $nAlloc1 $nStmt1 } [list $nAlloc3 $nStmt3]
    do_test dbstatus-3.$tn.d { list $nAlloc2 $nStmt2 } [list $nAlloc4 $nStmt4]
  }
}

#-------------------------------------------------------------------------
# The following tests focus on DBSTATUS_CACHE_USED_SHARED
#
ifcapable shared_cache {
  if {([permutation]=="memsys3"
      || [permutation]=="memsys5"
      || $::tcl_platform(os)=="Linux") && ![sqlite3 -has-codec]} {
    proc do_cacheused_test {tn db res} {
      set cu [sqlite3_db_status $db SQLITE_DBSTATUS_CACHE_USED 0]
      set pcu [sqlite3_db_status $db SQLITE_DBSTATUS_CACHE_USED_SHARED 0]
      set cu [lindex $cu 1]
      set pcu [lindex $pcu 1]
      uplevel [list do_test $tn [list list $cu $pcu] "#/$res/"]
    }
    reset_db
    sqlite3 db file:test.db?cache=shared
  
    do_execsql_test 4.0 {
      PRAGMA auto_vacuum=NONE;
      CREATE TABLE t1(a, b, c);
      INSERT INTO t1 VALUES(1, 2, 3);
    }
    do_cacheused_test 4.0.1 db { 4568 4568 }
    do_execsql_test 4.1 {
      CREATE TEMP TABLE tt(a, b, c);
      INSERT INTO tt VALUES(1, 2, 3);
    }
    do_cacheused_test 4.1.1 db { 9000 9000 }
  
    sqlite3 db2 file:test.db?cache=shared
    do_cacheused_test 4.2.1 db2 { 4568 2284 }
    do_cacheused_test 4.2.2 db { 9000 6716 }
    db close
    do_cacheused_test 4.2.3 db2 { 4568 4568 }
    sqlite3 db file:test.db?cache=shared
    do_cacheused_test 4.2.4 db2 { 4568 2284 }
    db2 close
  }
}

#-------------------------------------------------------------------------
# Test that passing an out-of-range value to sqlite3_stmt_status does
# not cause a crash.
reset_db
do_execsql_test 5.0 {
  CREATE TABLE t1(x, y);
  INSERT INTO t1 VALUES(1, 2);
  INSERT INTO t1 VALUES(3, 4);
}

do_test 5.1 {
  set ::stmt [sqlite3_prepare db "SELECT * FROM t1" -1 dummy]
  sqlite3_step $::stmt
  sqlite3_step $::stmt
  sqlite3_step $::stmt
  sqlite3_reset $::stmt
} {SQLITE_OK}

ifcapable api_armor {
  do_test 5.2 { sqlite3_stmt_status $::stmt -1 0 } 0
}
do_test 5.3 { sqlite3_stmt_status $::stmt  0 0 } 0
do_test 5.4 { 
  expr [sqlite3_stmt_status $::stmt 99 0]>0 
} 1
foreach {tn id res} {
  1 SQLITE_STMTSTATUS_MEMUSED 1
  2 SQLITE_STMTSTATUS_FULLSCAN_STEP 1
  3 SQLITE_STMTSTATUS_SORT 0
  4 SQLITE_STMTSTATUS_AUTOINDEX 0
  5 SQLITE_STMTSTATUS_VM_STEP 1
  6 SQLITE_STMTSTATUS_REPREPARE 0
  7 SQLITE_STMTSTATUS_RUN 1
} {
if {$tn==2} breakpoint
  do_test 5.5.$tn { expr [sqlite3_stmt_status $::stmt $id 0]>0 } $res
}

sqlite3_finalize $::stmt
finish_test
