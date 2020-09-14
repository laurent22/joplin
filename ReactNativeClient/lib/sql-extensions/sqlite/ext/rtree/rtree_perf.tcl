
set testdir [file join [file dirname $argv0] .. .. test]
source $testdir/tester.tcl

ifcapable !rtree {
  finish_test
  return
}

set NROW   10000
set NQUERY   500

puts "Generating $NROW rows of data..."
set data [list]
for {set ii 0} {$ii < $NROW} {incr ii} {
  set x1 [expr {rand()*1000}]
  set x2 [expr {$x1+rand()*50}]
  set y1 [expr {rand()*1000}]
  set y2 [expr {$y1+rand()*50}]
  lappend data $x1 $x2 $y1 $y2
}
puts "Finished generating data"


set sql1 {CREATE TABLE btree(ii INTEGER PRIMARY KEY, x1, x2, y1, y2)}
set sql2 {CREATE VIRTUAL TABLE rtree USING rtree(ii, x1, x2, y1, y2)}
puts "Creating tables:"
puts "  $sql1"
puts "  $sql2"
db eval $sql1
db eval $sql2

db eval "pragma cache_size=100"

puts -nonewline "Inserting into btree... "
flush stdout
set btree_time [time {db transaction {
  set ii 1
  foreach {x1 x2 y1 y2} $data {
    db eval {INSERT INTO btree VALUES($ii, $x1, $x2, $y1, $y2)}
    incr ii
  }
}}]
puts "$btree_time"

puts -nonewline "Inserting into rtree... "
flush stdout
set rtree_time [time {db transaction {
  set ii 1
  foreach {x1 x2 y1 y2} $data {
    incr ii
    db eval {INSERT INTO rtree VALUES($ii, $x1, $x2, $y1, $y2)}
  }
}}]
puts "$rtree_time"


puts -nonewline "Selecting from btree... "
flush stdout
set btree_select_time [time {
  foreach {x1 x2 y1 y2} [lrange $data 0 [expr $NQUERY*4-1]] {
    db eval {SELECT * FROM btree WHERE x1<$x1 AND x2>$x2 AND y1<$y1 AND y2>$y2}
 }
}]
puts "$btree_select_time"

puts -nonewline "Selecting from rtree... "
flush stdout
set rtree_select_time [time {
  foreach {x1 x2 y1 y2} [lrange $data 0 [expr $NQUERY*4-1]] {
    db eval {SELECT * FROM rtree WHERE x1<$x1 AND x2>$x2 AND y1<$y1 AND y2>$y2}
  }
}]
puts "$rtree_select_time"
