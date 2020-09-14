# 2011 March 28
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

if {[llength [info commands test_syscall]]==0} {
  finish_test
  return
} 

set testprefix sysfault

set FAULTSIM(vfsfault-transient) [list             \
  -injectinstall   vfsfault_install                \
  -injectstart     vfsfault_injectstart_t          \
  -injectstop      vfsfault_injectstop             \
  -injecterrlist   {}                              \
  -injectuninstall {test_syscall uninstall}        \
]
set FAULTSIM(vfsfault-persistent) [list            \
  -injectinstall   vfsfault_install                \
  -injectstart     vfsfault_injectstart_p          \
  -injectstop      vfsfault_injectstop             \
  -injecterrlist   {}                              \
  -injectuninstall {test_syscall uninstall}        \
]

proc vfsfault_injectstart_t {iFail} { test_syscall fault $iFail 0 }
proc vfsfault_injectstart_p {iFail} { test_syscall fault $iFail 1 }
proc vfsfault_injectstop    {}      { test_syscall fault }

faultsim_save_and_close


set open_and_write_body {
  sqlite3 db test.db
  db eval {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 2);
    PRAGMA journal_mode = WAL;
    INSERT INTO t1 VALUES(3, 4);
    SELECT * FROM t1;
    CREATE TEMP TABLE t2(x);
    INSERT INTO t2 VALUES('y');
  }
}

proc vfsfault_install {} { test_syscall install {open getcwd} }
do_faultsim_test 1 -faults vfsfault-* -prep {
  faultsim_restore
} -body $open_and_write_body -test {
  faultsim_test_result {0 {wal 1 2 3 4}}       \
    {1 {unable to open database file}}         \
    {1 {attempt to write a readonly database}}
}

#-------------------------------------------------------------------------
# Errors in the fstat() function when opening and writing a file. Cases
# where fstat() fails and sets errno to ENOMEM and EOVERFLOW are both
# tested. EOVERFLOW is interpreted as meaning that a file on disk is
# too large to be opened by the OS.
#
foreach {tn errno errlist} {
  1 ENOMEM       {{disk I/O error}}
  2 EOVERFLOW    {{disk I/O error} {large file support is disabled}}
} {
  proc vfsfault_install {} { test_syscall install fstat }
  set errs [list]
  foreach e $errlist { lappend errs [list 1 $e] }
  do_faultsim_test 1.2.$tn -faults vfsfault-* -prep {
    faultsim_restore
  } -body "
    test_syscall errno fstat $errno
    $open_and_write_body 
  " -test "
    faultsim_test_result {0 {wal 1 2 3 4}} $errs
  "
}

#-------------------------------------------------------------------------
# Various errors in locking functions. 
#
foreach vfs {unix unix-excl} {
  foreach {tn errno errlist} {
    1 EAGAIN       {{database is locked} {disk I/O error}}
    2 ETIMEDOUT    {{database is locked} {disk I/O error}}
    3 EBUSY        {{database is locked} {disk I/O error}}
    4 EINTR        {{database is locked} {disk I/O error}}
    5 ENOLCK       {{database is locked} {disk I/O error}}
    6 EACCES       {{database is locked} {disk I/O error}}
    7 EPERM        {{access permission denied} {disk I/O error}}
    8 EDEADLK      {{disk I/O error}}
    9 ENOMEM       {{disk I/O error}}
  } {
    proc vfsfault_install {} { test_syscall install fcntl }
    set errs [list]
    foreach e $errlist { lappend errs [list 1 $e] }
  
    set body [string map [list %VFS% $vfs] {
      sqlite3 db test.db
      db eval {
        CREATE TABLE t1(a, b);
        INSERT INTO t1 VALUES(1, 2);
      }
      set fd [open test.db-journal w]
      puts $fd "hello world"
      close $fd
      sqlite3 db test.db -vfs %VFS%
      db eval {
        SELECT * FROM t1;
      }
    }]
  
    do_faultsim_test 1.3.$vfs.$tn -faults vfsfault-* -prep {
      faultsim_restore
    } -body "
      test_syscall errno fcntl $errno
      $body
    " -test "
      faultsim_test_result {0 {1 2}} $errs
    "
  }
}

#-------------------------------------------------------------------------
# Check that a single EINTR error does not affect processing.
#
proc vfsfault_install {} { 
  test_syscall reset
  test_syscall install {open ftruncate close read pread pread64 write fallocate}
}

forcedelete test.db test.db2
sqlite3 db test.db
do_test 2.setup {
  execsql {
    CREATE TABLE t1(a, b, c, PRIMARY KEY(a));
    INSERT INTO t1 VALUES('abc', 'def', 'ghi');
    ATTACH 'test.db2' AS 'aux';
    CREATE TABLE aux.t2(x);
    INSERT INTO t2 VALUES(1);
  }
  faultsim_save_and_close
} {}

do_faultsim_test 2.1 -faults vfsfault-transient -prep {
  catch { db close }
  faultsim_restore
} -body {
  test_syscall errno open      EINTR
  test_syscall errno ftruncate EINTR
  test_syscall errno close     EINTR
  test_syscall errno read      EINTR
  test_syscall errno pread     EINTR
  test_syscall errno pread64   EINTR
  test_syscall errno write     EINTR
  test_syscall errno fallocate EINTR

  sqlite3 db test.db
  file_control_chunksize_test db main 8192

  set res [db eval {
    ATTACH 'test.db2' AS 'aux';
    SELECT * FROM t1;
    PRAGMA journal_mode = truncate;
    BEGIN;
      INSERT INTO t1 VALUES('jkl', 'mno', 'pqr');
      INSERT INTO t1 VALUES(randomblob(10000), 0, 0);
      UPDATE t2 SET x = 2;
    COMMIT;
    DELETE FROM t1 WHERE length(a)>3;
    SELECT * FROM t1;
    SELECT * FROM t2;
  }]
  db close
  set res
} -test {
  faultsim_test_result {0 {abc def ghi truncate abc def ghi jkl mno pqr 2}}
}

do_faultsim_test 2.2 -faults vfsfault-* -prep {
  catch { db close }
  faultsim_restore
} -body {
  sqlite3 db test.db
  set res [db eval {
    ATTACH 'test.db2' AS 'aux';
    SELECT * FROM t1;
    PRAGMA journal_mode = truncate;
    BEGIN;
      INSERT INTO t1 VALUES('jkl', 'mno', 'pqr');
      UPDATE t2 SET x = 2;
    COMMIT;
    SELECT * FROM t1;
    SELECT * FROM t2;
  }]
  db close
  set res
} -test {
  faultsim_test_result {0 {abc def ghi truncate abc def ghi jkl mno pqr 2}} \
    {1 {unable to open database file}}                                      \
    {1 {unable to open database: test.db2}}                                 \
    {1 {attempt to write a readonly database}}                              \
    {1 {disk I/O error}}                                                  
}

#-------------------------------------------------------------------------

proc vfsfault_install {} { 
  test_syscall reset
  test_syscall install {fstat fallocate}
}
do_faultsim_test 3 -faults vfsfault-* -prep {
  faultsim_delete_and_reopen
  file_control_chunksize_test db main 8192
  execsql {
    PRAGMA synchronous=OFF;
    CREATE TABLE t1(a, b);
    BEGIN;
      SELECT * FROM t1;
  }
} -body {
  test_syscall errno fstat     EIO
  test_syscall errno fallocate EIO

  execsql {
    INSERT INTO t1 VALUES(randomblob(10000), randomblob(10000));
    SELECT length(a) + length(b) FROM t1;
    COMMIT;
  }
} -test {
  faultsim_test_result {0 20000}
}

#-------------------------------------------------------------------------
# Test errors in mmap().
#
proc vfsfault_install {} { 
  test_syscall reset
  test_syscall install {mmap}
}

faultsim_delete_and_reopen
execsql {
  CREATE TABLE t1(a, b);
  INSERT INTO t1 VALUES(1, 2);
}
faultsim_save_and_close

do_faultsim_test 4 -faults vfsfault-* -prep {
  faultsim_restore_and_reopen
  file_control_chunksize_test db main 8192
  execsql { 
    PRAGMA mmap_size = 1000000;
  }
} -body {
  test_syscall errno mmap     EACCES

  execsql {
    SELECT * FROM t1;
  }
} -test {
  faultsim_test_result {0 {1 2}} {1 {disk I/O error}}
}

finish_test
