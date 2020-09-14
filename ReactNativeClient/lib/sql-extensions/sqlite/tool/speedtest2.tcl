#!/usr/bin/tclsh
#
# Run this script using TCLSH to do a speed comparison between
# various versions of SQLite and PostgreSQL and MySQL
#

# Run a test
#
set cnt 1
proc runtest {title} {
  global cnt
  set sqlfile test$cnt.sql
  puts "<h2>Test $cnt: $title</h2>"
  incr cnt
  set fd [open $sqlfile r]
  set sql [string trim [read $fd [file size $sqlfile]]]
  close $fd
  set sx [split $sql \n]
  set n [llength $sx]
  if {$n>8} {
    set sql {}
    for {set i 0} {$i<3} {incr i} {append sql [lindex $sx $i]<br>\n}
    append sql  "<i>... [expr {$n-6}] lines omitted</i><br>\n"
    for {set i [expr {$n-3}]} {$i<$n} {incr i} {
      append sql [lindex $sx $i]<br>\n
    }
  } else {
    regsub -all \n [string trim $sql] <br> sql
  }
  puts "<blockquote>"
  puts "$sql"
  puts "</blockquote><table border=0 cellpadding=0 cellspacing=0>"
  set format {<tr><td>%s</td><td align="right">&nbsp;&nbsp;&nbsp;%.3f</td></tr>}
  set delay 1000
  exec sync; after $delay;
  set t [time "exec psql drh <$sqlfile" 1]
  set t [expr {[lindex $t 0]/1000000.0}]
  puts [format $format PostgreSQL: $t]
  exec sync; after $delay;
  set t [time "exec mysql -f drh <$sqlfile" 1]
  set t [expr {[lindex $t 0]/1000000.0}]
  puts [format $format MySQL: $t]
#  set t [time "exec ./sqlite232 s232.db <$sqlfile" 1]
#  set t [expr {[lindex $t 0]/1000000.0}]
#  puts [format $format {SQLite 2.3.2:} $t]
#  set t [time "exec ./sqlite-100 s100.db <$sqlfile" 1]
#  set t [expr {[lindex $t 0]/1000000.0}]
#  puts [format $format {SQLite 2.4 (cache=100):} $t]
  exec sync; after $delay;
  set t [time "exec ./sqlite240 s2k.db <$sqlfile" 1]
  set t [expr {[lindex $t 0]/1000000.0}]
  puts [format $format {SQLite 2.4:} $t]
  exec sync; after $delay;
  set t [time "exec ./sqlite240 sns.db <$sqlfile" 1]
  set t [expr {[lindex $t 0]/1000000.0}]
  puts [format $format {SQLite 2.4 (nosync):} $t]
#  set t [time "exec ./sqlite-t1 st1.db <$sqlfile" 1]
#  set t [expr {[lindex $t 0]/1000000.0}]
#  puts [format $format {SQLite 2.4 (test):} $t]
  puts "</table>"
}

# Initialize the environment
#
expr srand(1)
catch {exec /bin/sh -c {rm -f s*.db}}
set fd [open clear.sql w]
puts $fd {
  drop table t1;
  drop table t2;
}
close $fd
catch {exec psql drh <clear.sql}
catch {exec mysql drh <clear.sql}
set fd [open 2kinit.sql w]
puts $fd {
  PRAGMA default_cache_size=2000;
  PRAGMA default_synchronous=on;
}
close $fd
exec ./sqlite240 s2k.db <2kinit.sql
exec ./sqlite-t1 st1.db <2kinit.sql
set fd [open nosync-init.sql w]
puts $fd {
  PRAGMA default_cache_size=2000;
  PRAGMA default_synchronous=off;
}
close $fd
exec ./sqlite240 sns.db <nosync-init.sql
set ones {zero one two three four five six seven eight nine
          ten eleven twelve thirteen fourteen fifteen sixteen seventeen
          eighteen nineteen}
set tens {{} ten twenty thirty forty fifty sixty seventy eighty ninety}
proc number_name {n} {
  if {$n>=1000} {
    set txt "[number_name [expr {$n/1000}]] thousand"
    set n [expr {$n%1000}]
  } else {
    set txt {}
  }
  if {$n>=100} {
    append txt " [lindex $::ones [expr {$n/100}]] hundred"
    set n [expr {$n%100}]
  }
  if {$n>=20} {
    append txt " [lindex $::tens [expr {$n/10}]]"
    set n [expr {$n%10}]
  }
  if {$n>0} {
    append txt " [lindex $::ones $n]"
  }
  set txt [string trim $txt]
  if {$txt==""} {set txt zero}
  return $txt
}


set fd [open test$cnt.sql w]
puts $fd "BEGIN;"
puts $fd "CREATE TABLE t1(a INTEGER, b INTEGER, c VARCHAR(100));"
for {set i 1} {$i<=25000} {incr i} {
  set r [expr {int(rand()*500000)}]
  puts $fd "INSERT INTO t1 VALUES($i,$r,'[number_name $r]');"
}
puts $fd "COMMIT;"
close $fd
runtest {25000 INSERTs in a transaction}


set fd [open test$cnt.sql w]
puts $fd "DELETE FROM t1;"
close $fd
runtest {DELETE everything}


set fd [open test$cnt.sql w]
puts $fd "BEGIN;"
for {set i 1} {$i<=25000} {incr i} {
  set r [expr {int(rand()*500000)}]
  puts $fd "INSERT INTO t1 VALUES($i,$r,'[number_name $r]');"
}
puts $fd "COMMIT;"
close $fd
runtest {25000 INSERTs in a transaction}


set fd [open test$cnt.sql w]
puts $fd "DELETE FROM t1;"
close $fd
runtest {DELETE everything}


set fd [open test$cnt.sql w]
puts $fd "BEGIN;"
for {set i 1} {$i<=25000} {incr i} {
  set r [expr {int(rand()*500000)}]
  puts $fd "INSERT INTO t1 VALUES($i,$r,'[number_name $r]');"
}
puts $fd "COMMIT;"
close $fd
runtest {25000 INSERTs in a transaction}


set fd [open test$cnt.sql w]
puts $fd "DELETE FROM t1;"
close $fd
runtest {DELETE everything}


set fd [open test$cnt.sql w]
puts $fd "BEGIN;"
for {set i 1} {$i<=25000} {incr i} {
  set r [expr {int(rand()*500000)}]
  puts $fd "INSERT INTO t1 VALUES($i,$r,'[number_name $r]');"
}
puts $fd "COMMIT;"
close $fd
runtest {25000 INSERTs in a transaction}


set fd [open test$cnt.sql w]
puts $fd "DELETE FROM t1;"
close $fd
runtest {DELETE everything}


set fd [open test$cnt.sql w]
puts $fd "BEGIN;"
for {set i 1} {$i<=25000} {incr i} {
  set r [expr {int(rand()*500000)}]
  puts $fd "INSERT INTO t1 VALUES($i,$r,'[number_name $r]');"
}
puts $fd "COMMIT;"
close $fd
runtest {25000 INSERTs in a transaction}


set fd [open test$cnt.sql w]
puts $fd "DELETE FROM t1;"
close $fd
runtest {DELETE everything}


set fd [open test$cnt.sql w]
puts $fd {DROP TABLE t1;}
close $fd
runtest {DROP TABLE}
