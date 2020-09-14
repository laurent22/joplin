# 2011 January 28
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

if {[permutation] == "inmemory_journal"} {
  finish_test
  return
}

# Create a database with page-size 2048 bytes that uses 2 pages. Populate
# it so that if the page-size is changed to 1024 bytes and the db vacuumed, 
# the new db size is 3 pages.
#
do_test pagerfault3-pre1 {
  execsql {
    PRAGMA auto_vacuum = 0;
    PRAGMA page_size = 2048;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randomblob(1200));
    PRAGMA page_count;
  }
} {2}
do_test pagerfault3-pre2 {
  faultsim_save_and_close
  faultsim_restore_and_reopen
  execsql { 
    PRAGMA page_size = 1024;
    VACUUM;
    PRAGMA page_count;
  }
} {3}

# Now do the page-size change and VACUUM with IO error injection. When
# an IO error is injected into the final xSync() of the commit, the pager
# will have to extend the db file from 3072 to 4096 byts when rolling
# back the hot-journal file. This is a special case in pager_truncate().
#
do_faultsim_test pagerfault3-1 -faults ioerr-transient -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { 
    PRAGMA page_size = 1024;
    VACUUM;
  }
} -test {
  faultsim_test_result {0 {}} 
  faultsim_integrity_check
}

finish_test
