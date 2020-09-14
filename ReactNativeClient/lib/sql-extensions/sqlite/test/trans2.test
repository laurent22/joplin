# 2008 August 27
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
# This file implements regression tests for SQLite library.  The
# focus of this script is transactions
#
# $Id: trans2.test,v 1.1 2008/08/27 18:56:36 drh Exp $
#
set testdir [file dirname $argv0]
source $testdir/tester.tcl

# A procedure to scramble the elements of list $inlist into a random order.
#
proc scramble {inlist} {
  set y {}
  foreach x $inlist {
    lappend y [list [expr {rand()}] $x]
  }
  set y [lsort $y]
  set outlist {}
  foreach x $y {
    lappend outlist [lindex $x 1]
  }
  return $outlist
}

# Generate a UUID using randomness.
#
expr srand(1)
proc random_uuid {} {
  set u {}
  for {set i 0} {$i<5} {incr i} {
    append u [format %06x [expr {int(rand()*16777216)}]]
  }
  return $u
}

# Compute hashes on the u1 and u2 fields of the sample data.
#
proc hash1 {} {
  global data
  set x ""
  foreach rec [lsort -integer -index 0 $data] {
    append x [lindex $rec 1]
  }
  return [md5 $x]
}
proc hash2 {} {
  global data
  set x ""
  foreach rec [lsort -integer -index 0 $data] {
    append x [lindex $rec 3]
  }
  return [md5 $x]
}

# Create the initial data set
#
unset -nocomplain data i max_rowid todel n rec max1 id origres newres
unset -nocomplain inssql modsql s j z
set data {}
for {set i 0} {$i<400} {incr i} {
  set rec [list $i [random_uuid] [expr {int(rand()*5000)+1000}] [random_uuid]]
  lappend data $rec
}
set max_rowid [expr {$i-1}]

# Create the T1 table used to hold test data.  Populate that table with
# the initial data set and check hashes to make sure everything is correct.
#
do_test trans2-1.1 {
  execsql {
    PRAGMA cache_size=100;
    CREATE TABLE t1(
      id INTEGER PRIMARY KEY,
      u1 TEXT UNIQUE,
      z BLOB NOT NULL,
      u2 TEXT UNIQUE
    );
  }
  foreach rec [scramble $data] {
    foreach {id u1 z u2} $rec break
    db eval {INSERT INTO t1 VALUES($id,$u1,zeroblob($z),$u2)}
  }
  db eval {SELECT md5sum(u1), md5sum(u2) FROM t1 ORDER BY id}
} [list [hash1] [hash2]]

# Repeat the main test loop multiple times.
#
for {set i 2} {$i<=30} {incr i} {
  # Delete one row out of every 10 in the database.  This will add
  # many pages to the freelist.
  #
  set todel {}
  set n [expr {[llength $data]/10}]
  set data [scramble $data]
  foreach rec [lrange $data 0 $n] {
    lappend todel [lindex $rec 0]
  }
  set data [lrange $data [expr {$n+1}] end]
  set max1 [lindex [lindex $data 0] 0]
  foreach rec $data {
    set id [lindex $rec 0]
    if {$id>$max1} {set max1 $id}
  }
  set origres [list [hash1] [hash2]]
  do_test trans2-$i.1 {
    db eval "DELETE FROM t1 WHERE id IN ([join $todel ,])"
    db eval {SELECT md5sum(u1), md5sum(u2) FROM t1 ORDER BY id}
  } $origres
  integrity_check trans2-$i.2

  # Begin a transaction and insert many new records.
  #
  set newdata {}
  foreach id $todel {
    set rec [list $id [random_uuid] \
                      [expr {int(rand()*5000)+1000}] [random_uuid]]
    lappend newdata $rec
    lappend data $rec
  }
  for {set j 1} {$j<50} {incr j} {
    set id [expr {$max_rowid+$j}]
    lappend todel $id
    set rec [list $id [random_uuid] \
                      [expr {int(rand()*5000)+1000}] [random_uuid]]
    lappend newdata $rec
    lappend data $rec
  }
  set max_rowid [expr {$max_rowid+$j-1}]
  set modsql {}
  set inssql {}
  set newres [list [hash1] [hash2]]
  do_test trans2-$i.3 {
    db eval BEGIN
    foreach rec [scramble $newdata] {
      foreach {id u1 z u2} $rec break
      set s "INSERT INTO t1 VALUES($id,'$u1',zeroblob($z),'$u2');"
      append modsql $s\n
      append inssql $s\n
      db eval $s
    }
    db eval {SELECT md5sum(u1), md5sum(u2) FROM t1 ORDER BY id}
  } $newres
  integrity_check trans2-$i.4

  # Do a large update that aborts do to a constraint failure near
  # the end.  This stresses the statement journal mechanism.
  #
  do_test trans2-$i.10 {
    catchsql {
      UPDATE t1 SET u1=u1||'x',
          z = CASE WHEN id<$max_rowid
                   THEN zeroblob((random()&65535)%5000 + 1000) END;
    }
  } {1 {NOT NULL constraint failed: t1.z}}
  do_test trans2-$i.11 {
    db eval {SELECT md5sum(u1), md5sum(u2) FROM t1 ORDER BY id}
  } $newres

  # Delete all of the newly inserted records.  Verify that the database
  # is back to its original state.
  #
  do_test trans2-$i.20 {
    set s "DELETE FROM t1 WHERE id IN ([join $todel ,]);"
    append modsql $s\n
    db eval $s
    db eval {SELECT md5sum(u1), md5sum(u2) FROM t1 ORDER BY id}
  } $origres

  # Do another large update that aborts do to a constraint failure near
  # the end.  This stresses the statement journal mechanism.
  #
  do_test trans2-$i.30 {
    catchsql {
      UPDATE t1 SET u1=u1||'x',
          z = CASE WHEN id<$max1
                   THEN zeroblob((random()&65535)%5000 + 1000) END;
    }
  } {1 {NOT NULL constraint failed: t1.z}}
  do_test trans2-$i.31 {
    db eval {SELECT md5sum(u1), md5sum(u2) FROM t1 ORDER BY id}
  } $origres

  # Redo the inserts
  #
  do_test trans2-$i.40 {
    db eval $inssql
    append modsql $inssql
    db eval {SELECT md5sum(u1), md5sum(u2) FROM t1 ORDER BY id}
  } $newres

  # Rollback the transaction.  Verify that the content is restored.
  #
  do_test trans2-$i.90 {
    db eval ROLLBACK
    db eval {SELECT md5sum(u1), md5sum(u2) FROM t1 ORDER BY id}
  } $origres
  integrity_check trans2-$i.91

  # Repeat all the changes, but this time commit.
  #
  do_test trans2-$i.92 {
    db eval BEGIN
    catchsql {
      UPDATE t1 SET u1=u1||'x',
          z = CASE WHEN id<$max1
                   THEN zeroblob((random()&65535)%5000 + 1000) END;
    }
    db eval $modsql
    catchsql {
      UPDATE t1 SET u1=u1||'x',
          z = CASE WHEN id<$max1
                   THEN zeroblob((random()&65535)%5000 + 1000) END;
    }
    db eval COMMIT
    db eval {SELECT md5sum(u1), md5sum(u2) FROM t1 ORDER BY id}
  } $newres
  integrity_check trans2-$i.93
}

unset -nocomplain data i max_rowid todel n rec max1 id origres newres
unset -nocomplain inssql modsql s j z
finish_test
