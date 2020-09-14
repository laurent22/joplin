# 2016 February 04
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
# This file tests the effect of the mmap() or mremap() system calls 
# returning an error on the library. 
#
# If either mmap() or mremap() fails, SQLite should log an error 
# message, then continue accessing the database using read() and 
# write() exclusively.
# 
set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !mmap {
  finish_test
  return
}
source $testdir/lock_common.tcl
set testprefix mmap4

# Return a Tcl script that registers a user-defined scalar function 
# named rblob() with database handle $dbname. The function returns a
# sequence of pseudo-random blobs based on seed value $seed.
#
proc register_rblob_code {dbname seed} {
  return [subst -nocommands {
    set ::rcnt $seed
    proc rblob {n} {
      set ::rcnt [expr (([set ::rcnt] << 3) + [set ::rcnt] + 456) & 0xFFFFFFFF]
      set str [format %.8x [expr [set ::rcnt] ^ 0xbdf20da3]]
      string range [string repeat [set str] [expr [set n]/4]] 1 [set n]
    }
    $dbname func rblob rblob
  }]
}

#-------------------------------------------------------------------------
# Test various mmap_size settings.
#
foreach {tn1 mmap1 mmap2} {
     1 6144       167773
     2 18432      140399
     3 43008      401302
     4 92160      253899
     5 190464          2
     6 387072     752431
     7 780288     291143
     8 1566720    594306
     9 3139584    829137
     10 6285312   793963
     11 12576768 1015590
} {
  do_multiclient_test tn {
    sql1 {
      CREATE TABLE t1(a PRIMARY KEY);
      CREATE TABLE t2(x);
      INSERT INTO t2 VALUES('');
    }

    code1 [register_rblob_code db  0]
    code2 [register_rblob_code db2 444]

    sql1 "PRAGMA mmap_size = $mmap1"
    sql2 "PRAGMA mmap_size = $mmap2"

    do_test $tn1.$tn {
      for {set i 1} {$i <= 100} {incr i} {
        if {$i % 2} {
          set c1 sql1
            set c2 sql2
        } else {
          set c1 sql2
            set c2 sql1
        }

        $c1 {
          INSERT INTO t1 VALUES( rblob(5000) );
          UPDATE t2 SET x = (SELECT md5sum(a) FROM t1);
        }

        set res [$c2 {
            SELECT count(*) FROM t1;
            SELECT x == (SELECT md5sum(a) FROM t1) FROM t2;
            PRAGMA integrity_check;
        }]
        if {$res != [list $i 1 ok]} {
          do_test $tn1.$tn.$i {
            set ::res
          } [list $i 1 ok]
        }
      }
      set res 1
    } {1}
  }
}

finish_test
