# 2013-05-23
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
ifcapable !mmap||!vtab {
  finish_test
  return
}
source $testdir/lock_common.tcl
set testprefix mmap3

# A codec shuts down memory-mapped I/O
if {[nonzero_reserved_bytes]} {finish_test; return;}

do_test mmap3-1.0 {
  load_static_extension db wholenumber
  db eval {
    PRAGMA mmap_size=100000;
    CREATE TABLE t1(x, y);
    CREATE VIRTUAL TABLE nums USING wholenumber;
    INSERT INTO t1 SELECT value, randomblob(value) FROM nums
                    WHERE value BETWEEN 1 and 1000;
    SELECT sum(x), sum(length(y)) from t1;
    PRAGMA mmap_size;
  }
} {100000 500500 500500 100000}
do_test mmap3-1.2 {
  db eval {
    PRAGMA mmap_size=50000;
    CREATE TABLE t2(a,b);
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;
    PRAGMA quick_check;
    PRAGMA mmap_size;
  }
} {50000 nums t1 t2 ok 50000}
do_test mmap3-1.3 {
  db eval {
    PRAGMA mmap_size=250000;
    DROP TABLE t2;
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;
    PRAGMA quick_check;
    PRAGMA mmap_size;
  }
} {250000 nums t1 ok 250000}
do_test mmap3-1.4 {
  db eval {SELECT x FROM t1 WHERE +x BETWEEN 10 AND 15} {
    db eval {PRAGMA mmap_size=150000}
  }
  db eval {
    PRAGMA quick_check;
    PRAGMA mmap_size;
  }
} {ok 250000}
do_test mmap3-1.5 {
  db eval {SELECT x FROM t1 WHERE +x BETWEEN 10 AND 15} {
    db eval {PRAGMA mmap_size=0}
  }
  db eval {
    PRAGMA quick_check;
    PRAGMA mmap_size;
  }
} {ok 250000}
do_test mmap3-1.6 {
  db eval {SELECT x FROM t1 WHERE +x BETWEEN 10 AND 15} {
    set x [db one {PRAGMA mmap_size}]
  }
  set x [concat $x [db eval {
    PRAGMA quick_check;
    PRAGMA mmap_size;
  }]]
} {250000 ok 250000}
do_test mmap3-1.7 {
  db eval {
    PRAGMA mmap_size(0);
    CREATE TABLE t3(a,b,c);
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;
    PRAGMA quick_check;
    PRAGMA mmap_size;
  }
} {0 nums t1 t3 ok 0}
do_test mmap3-1.8 {
  db eval {SELECT x FROM t1 WHERE +x BETWEEN 10 AND 15} {
    db eval {PRAGMA mmap_size=75000}
  }
  db eval {
    PRAGMA quick_check;
    PRAGMA mmap_size;
  }
} {ok 75000}

finish_test
