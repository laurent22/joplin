# 2011 August 08
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl

ifcapable !mergesort {
  finish_test
  return
}

set testprefix indexfault

# Set up the custom fault-injector. This is further configured by using
# different values for $::custom_filter and different implementations
# of Tcl proc [xCustom] for each test case.
#
proc install_custom_faultsim {} {
  set ::FAULTSIM(custom)            [list      \
    -injectinstall   custom_injectinstall    \
    -injectstart     custom_injectstart      \
    -injectstop      custom_injectstop       \
    -injecterrlist   {{1 {disk I/O error}}}  \
    -injectuninstall custom_injectuninstall  \
  ]
  proc custom_injectinstall {} {
    testvfs shmfault -default true
    shmfault filter $::custom_filter
    shmfault script xCustom
  }
  proc custom_injectuninstall {} {
    catch {db  close}
    catch {db2 close}
    shmfault delete
  }
  set ::custom_ifail -1
  set ::custom_nfail -1
  proc custom_injectstart {iFail} {
    set ::custom_ifail $iFail
    set ::custom_nfail 0
  }
  proc custom_injectstop {} {
    set ::custom_ifail -1
    return $::custom_nfail
  }
}
proc uninstall_custom_faultsim {} {
  unset -nocomplain ::FAULTSIM(custom)
}


#-------------------------------------------------------------------------
# These tests - indexfault-1.* - Build an index on a smallish table with
# all different kinds of fault-injection. The CREATE INDEX is run once
# with default options and once with a 50KB soft-heap-limit.
#
do_execsql_test 1.0 {
  BEGIN;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(202));
    INSERT INTO t1 SELECT randomblob(202) FROM t1;     --     2
    INSERT INTO t1 SELECT randomblob(202) FROM t1;     --     4
    INSERT INTO t1 SELECT randomblob(202) FROM t1;     --     8
    INSERT INTO t1 SELECT randomblob(202) FROM t1;     --    16
    INSERT INTO t1 SELECT randomblob(202) FROM t1;     --    32
    INSERT INTO t1 SELECT randomblob(202) FROM t1;     --    64
    INSERT INTO t1 SELECT randomblob(202) FROM t1;     --   128
    INSERT INTO t1 SELECT randomblob(202) FROM t1;     --   256
  COMMIT;
}
faultsim_save_and_close

do_faultsim_test 1.1 -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { CREATE INDEX i1 ON t1(x) }
  faultsim_test_result {0 {}} 
  faultsim_integrity_check
}
ifcapable memorymanage {
  set soft_limit [sqlite3_soft_heap_limit 50000]
  do_faultsim_test 2.1 -prep {
    faultsim_restore_and_reopen
  } -body {
    execsql { CREATE INDEX i1 ON t1(x) }
    faultsim_test_result {0 {}} 
  }
  sqlite3_soft_heap_limit $soft_limit
}

#-------------------------------------------------------------------------
# These are similar to the indexfault-1.* tests, except they create an
# index with more than one column.
#
sqlite3 db test.db
do_execsql_test 2.0 {
  BEGIN;
    DROP TABLE IF EXISTS t1;
    CREATE TABLE t1(t,u,v,w,x,y,z);
    INSERT INTO t1 VALUES(
      randomblob(30), randomblob(30), randomblob(30), randomblob(30),
      randomblob(30), randomblob(30), randomblob(30)
    );
    INSERT INTO t1 SELECT 
      randomblob(30), randomblob(30), randomblob(30), randomblob(30),
      randomblob(30), randomblob(30), randomblob(30) FROM t1;         -- 2
    INSERT INTO t1 SELECT 
      randomblob(30), randomblob(30), randomblob(30), randomblob(30),
      randomblob(30), randomblob(30), randomblob(30) FROM t1;         -- 4
    INSERT INTO t1 SELECT 
      randomblob(30), randomblob(30), randomblob(30), randomblob(30),
      randomblob(30), randomblob(30), randomblob(30) FROM t1;         -- 8
    INSERT INTO t1 SELECT 
      randomblob(30), randomblob(30), randomblob(30), randomblob(30),
      randomblob(30), randomblob(30), randomblob(30) FROM t1;         -- 16
    INSERT INTO t1 SELECT 
      randomblob(30), randomblob(30), randomblob(30), randomblob(30),
      randomblob(30), randomblob(30), randomblob(30) FROM t1;         -- 32
    INSERT INTO t1 SELECT 
      randomblob(30), randomblob(30), randomblob(30), randomblob(30),
      randomblob(30), randomblob(30), randomblob(30) FROM t1;         -- 64
    INSERT INTO t1 SELECT 
      randomblob(30), randomblob(30), randomblob(30), randomblob(30),
      randomblob(30), randomblob(30), randomblob(30) FROM t1;         -- 128
  COMMIT;
}
faultsim_save_and_close

do_faultsim_test 2.1 -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { CREATE INDEX i1 ON t1(t,u,v,w,x,y,z) }
  faultsim_test_result {0 {}} 
  faultsim_integrity_check
}
ifcapable memorymanage {
  set soft_limit [sqlite3_soft_heap_limit 50000]
  do_faultsim_test 2.2 -prep {
    faultsim_restore_and_reopen
  } -body {
    execsql { CREATE INDEX i1 ON t1(t,u,v,w,x,y,z) }
    faultsim_test_result {0 {}} 
  }
  sqlite3_soft_heap_limit $soft_limit
}

#-------------------------------------------------------------------------
# The following tests - indexfault-2.* - all attempt to build a index
# on table t1 in the main database with injected IO errors. Individual
# test cases work as follows:
#
#   3.1: IO errors injected into xOpen() calls.
#   3.2: As 7.1, but with a low (50KB) soft-heap-limit.
#
#   3.3: IO errors injected into the first 200 write() calls made on the
#        second temporary file.
#   3.4: As 7.3, but with a low (50KB) soft-heap-limit.
#
#   3.5: After a certain amount of data has been read from the main database
#        file (and written into the temporary b-tree), sqlite3_release_memory()
#        is called to free as much memory as possible. This causes the temp
#        b-tree to be flushed to disk. So that before its contents can be 
#        transfered to a PMA they must be read back from disk - creating extra
#        opportunities for IO errors.
#
install_custom_faultsim

# Set up a table to build indexes on. Save the setup using the 
# [faultsim_save_and_close] mechanism.
# 
sqlite3 db test.db
do_execsql_test 3.0 {
  BEGIN;
    DROP TABLE IF EXISTS t1;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(11000));
    INSERT INTO t1 SELECT randomblob(11001) FROM t1;     --     2
    INSERT INTO t1 SELECT randomblob(11002) FROM t1;     --     4
    INSERT INTO t1 SELECT randomblob(11003) FROM t1;     --     8
    INSERT INTO t1 SELECT randomblob(11004) FROM t1;     --    16
    INSERT INTO t1 SELECT randomblob(11005) FROM t1;     --    32
    INSERT INTO t1 SELECT randomblob(11006) FROM t1;     --    64
    INSERT INTO t1 SELECT randomblob(11007) FROM t1;     --   128
    INSERT INTO t1 SELECT randomblob(11008) FROM t1;     --   256
    INSERT INTO t1 SELECT randomblob(11009) FROM t1;     --   512
  COMMIT;
}
faultsim_save_and_close

set ::custom_filter xOpen
proc xCustom {args} {
  incr ::custom_ifail -1
  if {$::custom_ifail==0} {
    incr ::custom_nfail
    return "SQLITE_IOERR"
  }
  return "SQLITE_OK"
}
do_faultsim_test 3.1 -faults custom -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { CREATE INDEX i1 ON t1(x) }
  faultsim_test_result {0 {}} 
}
ifcapable memorymanage {
  set soft_limit [sqlite3_soft_heap_limit 50000]
  do_faultsim_test 3.2 -faults custom -prep {
    faultsim_restore_and_reopen
  } -body {
    execsql { CREATE INDEX i1 ON t1(x) }
    faultsim_test_result {0 {}} 
  }
  sqlite3_soft_heap_limit $soft_limit
}

set ::custom_filter {xOpen xWrite}
proc xCustom {method args} {
  if {$method == "xOpen"} {
    if {[lindex $args 0] == ""} {
      incr ::nTmpOpen 1
      if {$::nTmpOpen == 3} { return "failme" }
    }
    return "SQLITE_OK"
  }
  if {$::custom_ifail<200 && [lindex $args 1] == "failme"} {
    incr ::custom_ifail -1
    if {$::custom_ifail==0} {
      incr ::custom_nfail
      return "SQLITE_IOERR"
    }
  }
  return "SQLITE_OK"
}

do_faultsim_test 3.3 -faults custom -prep {
  faultsim_restore_and_reopen
  set ::nTmpOpen 0
} -body {
  execsql { CREATE INDEX i1 ON t1(x) }
  faultsim_test_result {0 {}} 
}

ifcapable memorymanage {
  set soft_limit [sqlite3_soft_heap_limit 50000]
  do_faultsim_test 3.4 -faults custom -prep {
    faultsim_restore_and_reopen
    set ::nTmpOpen 0
  } -body {
    execsql { CREATE INDEX i1 ON t1(x) }
    faultsim_test_result {0 {}} 
  }
  sqlite3_soft_heap_limit $soft_limit
}

uninstall_custom_faultsim

#-------------------------------------------------------------------------
# Test 4: After a certain amount of data has been read from the main database
# file (and written into the temporary b-tree), sqlite3_release_memory() is
# called to free as much memory as possible. This causes the temp b-tree to be
# flushed to disk. So that before its contents can be transfered to a PMA they
# must be read back from disk - creating extra opportunities for IO errors.
# 
install_custom_faultsim

catch { db close }
forcedelete test.db
sqlite3 db test.db

do_execsql_test 4.0 {
  BEGIN;
    DROP TABLE IF EXISTS t1;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(11000));
    INSERT INTO t1 SELECT randomblob(11001) FROM t1;     --     2
    INSERT INTO t1 SELECT randomblob(11002) FROM t1;     --     4
    INSERT INTO t1 SELECT randomblob(11003) FROM t1;     --     8
    INSERT INTO t1 SELECT randomblob(11004) FROM t1;     --    16
    INSERT INTO t1 SELECT randomblob(11005) FROM t1;     --    32
    INSERT INTO t1 SELECT randomblob(11005) FROM t1;     --    64
  COMMIT;
}
faultsim_save_and_close

testvfs tvfs 
tvfs script xRead
tvfs filter xRead
set ::nRead 0
proc xRead {method file args} {
  if {[file tail $file] == "test.db"} { incr ::nRead }
}

do_test 4.1 {
  sqlite3 db test.db -vfs tvfs
  execsql { CREATE INDEX i1 ON t1(x) }
} {}

db close
tvfs delete

set ::custom_filter xRead
proc xCustom {method file args} {
  incr ::nReadCall
  if {$::nReadCall >= ($::nRead/5)} {
    if {$::nReadCall == ($::nRead/5)} {
      set nByte [sqlite3_release_memory [expr 64*1024*1024]]
      sqlite3_soft_heap_limit 20000
    }
    if {$file == ""} {
      incr ::custom_ifail -1
      if {$::custom_ifail==0} {
        incr ::custom_nfail
        return "SQLITE_IOERR"
      }
    }
  }
  return "SQLITE_OK"
}

do_faultsim_test 4.2 -faults custom -prep {
  faultsim_restore_and_reopen
  set ::nReadCall 0
  sqlite3_soft_heap_limit 0
} -body {
  execsql { CREATE INDEX i1 ON t1(x) }
  faultsim_test_result {0 {}} 
}

do_faultsim_test 5 -prep {
  reset_db
} -body {
  execsql { 
 CREATE TABLE reallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallylongname(a PRIMARY KEY) WITHOUT ROWID;
  }
} -test {
  faultsim_test_result {0 {}} 
}

uninstall_custom_faultsim

finish_test
