# 2012 August 6
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
set ::testprefix index5

do_test 1.1 {
  if {[permutation]=="memsubsys1"} {
    execsql { PRAGMA auto_vacuum = 0; }
  }
  execsql {
    PRAGMA page_size = 1024;
    CREATE TABLE t1(x);
    BEGIN;
  }
  for {set i 0} {$i < 100000} {incr i} {
    execsql { INSERT INTO t1 VALUES(randstr(100,100)) }
  }
  execsql COMMIT
  execsql { 
    CREATE INDEX i1 ON t1(x);
    DROP INDEX I1;
    PRAGMA main.page_size;
  }
} {1024}

db close
testvfs tvfs
tvfs filter xWrite
tvfs script write_cb
proc write_cb {xCall file handle iOfst args} {
  if {[file tail $file]=="test.db"} {
    lappend ::write_list [expr $iOfst/1024 + 1]
  }
}

do_test 1.2 {
  sqlite3 db test.db -vfs tvfs
  set ::write_list [list]
  execsql { CREATE INDEX i1 ON t1(x) }
} {}

do_test 1.3 {
  set nForward 0
  set nBackward 0
  set nNoncont 0
  set iPrev [lindex $::write_list 0]
  for {set i 1} {$i < [llength $::write_list]} {incr i} {
    set iNext [lindex $::write_list $i]
    if {$iNext==($iPrev+1)} {
      incr nForward
    } elseif {$iNext==($iPrev-1)} { 
      incr nBackward 
    } else {
      incr nNoncont
    }
    set iPrev $iNext
  }
  if {0} {
    puts -nonewline \
        " (forward=$nForward, back=$nBackward, noncontiguous=$nNoncont)"
  }

  expr {$nForward > 2*($nBackward + $nNoncont)}
} {1}
db close
tvfs delete

finish_test
