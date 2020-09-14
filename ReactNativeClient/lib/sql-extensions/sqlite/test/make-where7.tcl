#!/usr/bin/tclsh
#
# Run this script to generate randomized test cases for the where7.test
# script.  The output will need to be manually copied and pasted into
# the where7.test script.
#
puts "do_test where7-2.1 \173"
puts "  db eval \173"
puts "    CREATE TABLE t2(a INTEGER PRIMARY KEY,b,c,d,e,f,g);"
set NA 100
for {set a 1} {$a<=$NA} {incr a} {
  set b [expr {$a*11}]
  set div3 [expr {int(($a+2)/3)}]
  set c [expr {$div3*1001}]
  set d [expr {$a*1.001}]
  set e [expr {$div3*100.1}]
  set x [expr {$a%26}]
  set f [string range {abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz} \
           $x [expr {$x+8}]]
  set div5 [expr {int(($a+7)/5)}]
  set x [expr {$div5%26}]
  set g [string range {zyxwvutsrqponmlkjihgfedcbazyxwvutsrqponmlkjihgfedcba} \
           $x [expr {$x+6}]]
  puts "    INSERT INTO t2 VALUES($a,$b,$c,$d,$e,'$f','$g');"
  lappend fidx($f) $a
  lappend gidx($g) $a
  set gof($a) $g
  set fof($a) $f

  set expr "a=$a"
  set term($expr) $a
  set expr "((a BETWEEN [expr {$a-1}] AND [expr {$a+1}]) AND a!=$a)"
  set x {}
  if {$a>1} {set x [expr {$a-1}]}
  if {$a<$NA} {lappend x [expr {$a+1}]}
  set term($expr) $x
  set expr "b=$b"
  set term($expr) $a
  set expr "b=[expr {$a*11+3}]"
  set term($expr) {}
  set expr "c=$c"
  lappend term($expr) $a
  set expr "(d>=$a.0 AND d<[expr {$a+1.0}] AND d NOT NULL)"
  lappend term($expr) $a
  set expr "f='$f'"
  lappend term($expr) $a
  set expr \
     "(f GLOB '?[string range $f 1 4]*' AND f GLOB '[string range $f 0 3]*')"
  lappend term($expr) $a
  set expr "(g='$g' AND f GLOB '[string range $f 0 4]*')"
  lappend term($expr) $a
}
puts "    CREATE INDEX t2b ON t2(b);"
puts "    CREATE INDEX t2c ON t2(c);"
puts "    CREATE INDEX t2d ON t2(d);"
puts "    CREATE INDEX t2e ON t2(e);"
puts "    CREATE INDEX t2f ON t2(f);"
puts "    CREATE INDEX t2g ON t2(g);"
puts "    CREATE TABLE t3(a INTEGER PRIMARY KEY,b,c,d,e,f,g);"
puts "    INSERT INTO t3 SELECT * FROM t2;"
puts "    CREATE INDEX t3b ON t3(b,c);"
puts "    CREATE INDEX t3c ON t3(c,e);"
puts "    CREATE INDEX t3d ON t3(d,g);"
puts "    CREATE INDEX t3e ON t3(e,f,g);"
puts "    CREATE INDEX t3f ON t3(f,b,d,c);"
puts "    CREATE INDEX t3g ON t3(g,f);"

puts "  \175"
puts "\175 {}"

set term(b<0) {}
set term(1000000<b) {}
set term(c<=10) {}
set term(c>=[expr {int(($NA+2)/3)*1001+1}]) {}
set term(d<0.0) {}
set term(d>1e10) {}
set expr {e IS NULL}
set term($expr) {}
set expr {f IS NULL}
set term($expr) {}
set expr {g IS NULL}
set term($expr) {}

set NT 1000
set termlist [array names term]
set nterm [llength $termlist]
for {set i 2} {$i<=$NT+1} {incr i} {
  set n [expr {int(rand()*10)+2}]
  set w {}
  unset -nocomplain r
  for {set j 0} {$j<$n} {incr j} {
    set k [expr {int(rand()*$nterm)}]
    set t [lindex $termlist $k]
    lappend w $t
    foreach a $term($t) {
      set r($a) 1
    }
  }
  if {[info exists seen($w)]} {
    incr i -1
    continue
  }
  set seen($w) 1
  set result [lsort -int [array names r]]
  puts "do_test where7-2.$i.1 \173"
  puts "  count_steps_sort \173"
  puts "     SELECT a FROM t2"
  set wc [join $w "\n         OR "]
  puts "      WHERE $wc"
  puts "  \175"
  puts "\175 {$result scan 0 sort 0}"
  puts "do_test where7-2.$i.2 \173"
  puts "  count_steps_sort \173"
  puts "     SELECT a FROM t3"
  set wc [join $w "\n         OR "]
  puts "      WHERE $wc"
  puts "  \175"
  puts "\175 {$result scan 0 sort 0}"
}
puts "finish_test"
