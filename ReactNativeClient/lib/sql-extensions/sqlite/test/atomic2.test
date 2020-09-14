# 2018-07-15
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
# focus of this file is testing that if an IO error is encountered
# as part of an atomic F2FS commit, an attempt is made to commit the
# transaction using a legacy journal commit.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set ::testprefix atomic2

db close
if {[atomic_batch_write test.db]==0} {
  puts "No f2fs atomic-batch-write support. Skipping tests..."
  finish_test
  return
}

reset_db

do_execsql_test 1.0 {
  CREATE TABLE t1(x, y);
  CREATE INDEX i1x ON t1(x);
  CREATE INDEX i2x ON t1(y);

  WITH s(i) AS ( SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<100 )
  INSERT INTO t1 SELECT randomblob(400), randomblob(400) FROM s;
}

set setup [list \
  -injectstart at_injectstart \
  -injectstop  at_injectstop  \
]

set ::at_fail  0
set ::at_nfail 0

proc at_injectstart {iFail} {
  set ::at_fail $iFail
  set ::at_nfail 0
}
proc at_injectstop {} {
  set ::at_fail 0
  return $::at_nfail
}

proc at_vfs_callback {method file z args} {
  if {$::at_fail>0} {
    incr ::at_fail -1
    if {$::at_fail==0} {
      incr ::at_nfail
      return SQLITE_IOERR
    } elseif {$method=="xFileControl" && $z=="COMMIT_ATOMIC_WRITE"} {
      set ::at_fail 0
    }
  }
  return SQLITE_OK
}

testvfs tvfs -default 1
tvfs script at_vfs_callback
tvfs filter {xFileControl xWrite}

faultsim_save_and_close

do_one_faultsim_test 2.0 {*}$setup -prep {
  faultsim_restore_and_reopen
} -body {
  execsql {
    WITH s(i) AS ( SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<100 )
    INSERT INTO t1 SELECT randomblob(400), randomblob(400) FROM s;
  }
} -test {
  faultsim_test_result {0 {}}

  set res [execsql {SELECT count(*) FROM t1; PRAGMA integrity_check}]
  if {$res!="200 ok"} {
    error "expected {200 ok}, got $res"
  }
}

db close
tvfs delete

finish_test
