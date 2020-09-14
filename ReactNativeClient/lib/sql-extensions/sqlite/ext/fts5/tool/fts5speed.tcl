

set Q {
  {1   "SELECT count(*) FROM t1 WHERE t1 MATCH 'enron'"}
  {25  "SELECT count(*) FROM t1 WHERE t1 MATCH 'hours'"}
  {300 "SELECT count(*) FROM t1 WHERE t1 MATCH 'acid'"}
  {100 "SELECT count(*) FROM t1 WHERE t1 MATCH 'loaned OR mobility OR popcore OR sunk'"}
  {100 "SELECT count(*) FROM t1 WHERE t1 MATCH 'enron AND myapps'"}
  {1   "SELECT count(*) FROM t1 WHERE t1 MATCH 'en* AND my*'"}

  {1   "SELECT count(*) FROM t1 WHERE t1 MATCH 'c:t*'"}
  {1   "SELECT count(*) FROM t1 WHERE t1 MATCH 'a:t* OR b:t* OR c:t* OR d:t* OR e:t* OR f:t* OR g:t*'"}
  {1   "SELECT count(*) FROM t1 WHERE t1 MATCH 'a:t*'"}
  {2   "SELECT count(*) FROM t1 WHERE t1 MATCH 'c:the'"}

  {2   "SELECT count(*) FROM t1 WHERE t1 MATCH 'd:holmes OR e:holmes OR f:holmes OR g:holmes'" }
  {2   "SELECT count(*) FROM t1 WHERE t1 MATCH 'd:holmes AND e:holmes AND f:holmes AND g:holmes'" }
  {4   "SELECT count(*) FROM t1 WHERE t1 MATCH 'd:holmes NOT e:holmes'" }
}

proc usage {} {
  global Q
  puts stderr "Usage: $::argv0 DATABASE QUERY"
  puts stderr ""
  for {set i 1} {$i <= [llength $Q]} {incr i} {
    puts stderr "       $i. [lindex $Q [expr $i-1]]"
  }
  puts stderr ""
  exit -1
}


set nArg [llength $argv]
if {$nArg!=2 && $nArg!=3} usage
set database [lindex $argv 0]
set iquery [lindex $argv 1]
if {$iquery<1 || $iquery>[llength $Q]} usage
set nRepeat 0
if {$nArg==3} { set nRepeat [lindex $argv 2] }


sqlite3 db $database
catch { load_static_extension db fts5 }

incr iquery -1
set sql [lindex $Q $iquery 1]
if {$nRepeat==0} {
  set nRepeat [lindex $Q $iquery 0]
}

puts "sql:     $sql"
puts "nRepeat: $nRepeat"
if {[regexp matchinfo $sql]} {
  sqlite3_fts5_register_matchinfo db
  db eval $sql 
} else {
  puts "result:  [db eval $sql]"
}

for {set i 1} {$i < $nRepeat} {incr i} {
  db eval $sql
}


