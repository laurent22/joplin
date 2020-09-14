# 2012 August 7
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#
# Tests for the secure_delete pragma.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix securedel2

# Generate 1000 pseudo-random 64-bit blobs.
#
for {set i 1} {$i <= 1000} {incr i} {
  set aBlob($i) [string range [db one {SELECT quote(randomblob(8))}] 2 end-1]
}

proc detect_blob_prepare {zFile} {
  set nByte [file size $zFile]
  set ::detect_blob_data [hexio_read $zFile 0 $nByte]
}

proc detect_blob {zFile iBlob} {
  if {$zFile != ""} { detect_blob_prepare $zFile }
  string match "*$::aBlob($iBlob)*" $::detect_blob_data
}

do_test 1.1 {
  execsql { PRAGMA secure_delete = 1 }
  execsql { PRAGMA auto_vacuum = 0 }
  execsql { CREATE TABLE t1(x, y) }
  for {set i 1} {$i <= 1000} {incr i} {
    set x "X'[string repeat $aBlob($i) 1]'"
    set y "X'[string repeat $aBlob($i) 500]'"
    execsql "INSERT INTO t1 VALUES($x, $y)"
  }
} {}

do_test         1.2   { detect_blob test.db 1 } {1}

forcecopy test.db test.db.bak
do_execsql_test 1.3.1 { PRAGMA secure_delete = 0 } {0}
do_execsql_test 1.3.2 { DELETE FROM t1 WHERE rowid = 1 }
do_test         1.3.3 { detect_blob test.db 1 } {1}

db close
forcecopy test.db.bak test.db
sqlite3 db test.db
do_execsql_test 1.4.1 { PRAGMA secure_delete = 1 } {1}
do_execsql_test 1.4.2 { DELETE FROM t1 WHERE rowid = 1 }
do_test         1.4.3 { detect_blob test.db 1 } {0}

do_execsql_test 1.5.1 { DELETE FROM t1 WHERE rowid>850 } {}
do_test 1.5.2 { 
  set n 0
  detect_blob_prepare test.db
  for {set i 851} {$i <= 1000} {incr i 5} {
    incr n [detect_blob {} $i]
  }
  set n
} {0}

db close
sqlite3 db test.db
do_test 1.6.1 { 
  execsql {
    PRAGMA cache_size = 200;
    PRAGMA secure_delete = 1;
    CREATE TABLE t2(x);
    SELECT * FROM t1;
  }
  for {set i 100} {$i < 5000} {incr i} {
    execsql { INSERT INTO t2 VALUES(randomblob($i)) }
  }
  execsql { DELETE FROM t1 }
} {}

do_test 1.6.2 { 
  set n 0
  detect_blob_prepare test.db
  for {set i 2} {$i <= 850} {incr i 5} {
    incr n [detect_blob {} $i]
  }
  set n
} {0}

finish_test
