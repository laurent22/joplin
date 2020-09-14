

#--------------------------------------------------------------------------
# This script contains several sub-programs used to test FTS3/FTS4 
# performance. It does not run the queries directly, but generates SQL
# scripts that can be run using the shell tool.
#
# The following cases are tested:
#
#   1. Inserting documents into an FTS3 table.
#   2. Optimizing an FTS3 table (i.e. "INSERT INTO t1 VALUES('optimize')").
#   3. Deleting documents from an FTS3 table.
#   4. Querying FTS3 tables.
#

# Number of tokens in vocabulary. And number of tokens in each document.
#
set VOCAB_SIZE  2000
set DOC_SIZE     100

set NUM_INSERTS 100000
set NUM_SELECTS 1000

# Force everything in this script to be deterministic.
#
expr {srand(0)}

proc usage {} {
  puts stderr "Usage: $::argv0 <rows> <selects>"
  exit -1
}

proc sql {sql} {
  puts $::fd $sql
}


# Return a list of $nWord randomly generated tokens each between 2 and 10
# characters in length.
#
proc build_vocab {nWord} {
  set ret [list]
  set chars [list a b c d e f g h i j k l m n o p q r s t u v w x y z]
  for {set i 0} {$i<$nWord} {incr i} {
    set len [expr {int((rand()*9.0)+2)}]
    set term ""
    for {set j 0} {$j<$len} {incr j} {
      append term [lindex $chars [expr {int(rand()*[llength $chars])}]]
    }
    lappend ret $term
  }
  set ret
}

proc select_term {} {
  set n [llength $::vocab]
  set t [expr int(rand()*$n*3)]
  if {$t>=2*$n} { set t [expr {($t-2*$n)/100}] }
  if {$t>=$n} { set t [expr {($t-$n)/10}] }
  lindex $::vocab $t
}

proc select_doc {nTerm} {
  set ret [list]
  for {set i 0} {$i<$nTerm} {incr i} {
    lappend ret [select_term]
  }
  set ret
}

proc test_1 {nInsert} {
  sql "PRAGMA synchronous = OFF;"
  sql "DROP TABLE IF EXISTS t1;"
  sql "CREATE VIRTUAL TABLE t1 USING fts4;"
  for {set i 0} {$i < $nInsert} {incr i} {
    set doc [select_doc $::DOC_SIZE]
    sql "INSERT INTO t1 VALUES('$doc');"
  }
}

proc test_2 {} {
  sql "INSERT INTO t1(t1) VALUES('optimize');"
}

proc test_3 {nSelect} {
  for {set i 0} {$i < $nSelect} {incr i} {
    sql "SELECT count(*) FROM t1 WHERE t1 MATCH '[select_term]';"
  }
}

proc test_4 {nSelect} {
  for {set i 0} {$i < $nSelect} {incr i} {
    sql "SELECT count(*) FROM t1 WHERE t1 MATCH '[select_term] [select_term]';"
  }
}

if {[llength $argv]!=0} usage

set ::vocab [build_vocab $::VOCAB_SIZE]

set ::fd [open fts3speed_insert.sql w]
test_1 $NUM_INSERTS
close $::fd

set ::fd [open fts3speed_select.sql w]
test_3 $NUM_SELECTS
close $::fd

set ::fd [open fts3speed_select2.sql w]
test_4 $NUM_SELECTS
close $::fd

set ::fd [open fts3speed_optimize.sql w]
test_2
close $::fd

puts "Success. Created files:"
puts "  fts3speed_insert.sql"
puts "  fts3speed_select.sql"
puts "  fts3speed_select2.sql"
puts "  fts3speed_optimize.sql"

