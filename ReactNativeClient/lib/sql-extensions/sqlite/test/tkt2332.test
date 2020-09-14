# 2007 May 3
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
# $Id: tkt2332.test,v 1.4 2007/09/12 17:01:45 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !incrblob||!tclvar {
  finish_test
  return
}

do_test tkt2332.1 {
  execsql {
    CREATE TABLE blobs (k INTEGER PRIMARY KEY, v BLOB);
    PRAGMA cache_size = 100;
  }
} {}

set ::iKey 1
foreach Len [list 10000 100000 1000000] {
  do_test tkt2332.$Len.1 {
    set val "[expr rand()][expr rand()][expr rand()][expr rand()][expr rand()]"
    set ::blobstr [string range \
      [string repeat $val [expr ($Len/[string length $val])+1]] 0 [expr $Len-1]
    ]

    db eval { INSERT INTO blobs VALUES($::iKey, zeroblob($Len)) }
  } {}

  do_test tkt2332.$Len.2 {
    execsql {
      SELECT length(v) FROM blobs WHERE k = $::iKey;
    }
  } $Len

  do_test tkt2332.$Len.3 {
    set ::fd [db incrblob blobs v $::iKey]
    puts -nonewline $::fd $::blobstr
    close $::fd
  } {}

  do_test tkt2332.$Len.4 {
    execsql { SELECT length(v) FROM blobs WHERE k = $::iKey; }
  } $Len

  do_test tkt2332.$Len.5 {
    lindex [execsql {SELECT v FROM blobs WHERE k = $::iKey}] 0
  } $::blobstr

  incr ::iKey
}

# Free memory:
unset ::blobstr

finish_test
