# Run this TCL script to generate thousands of test cases containing
# complicated expressions.
#
# The generated tests are intended to verify expression evaluation
# in SQLite against expression evaluation TCL.  
#

# Terms of the $intexpr list each contain two sub-terms.
#
#     *  An SQL expression template
#     *  The equivalent TCL expression
#
# EXPR is replaced by an integer subexpression.  BOOL is replaced
# by a boolean subexpression.
#
set intexpr {
  {11 wide(11)}
  {13 wide(13)}
  {17 wide(17)}
  {19 wide(19)}
  {a $a}
  {b $b}
  {c $c}
  {d $d}
  {e $e}
  {f $f}
  {t1.a $a}
  {t1.b $b}
  {t1.c $c}
  {t1.d $d}
  {t1.e $e}
  {t1.f $f}
  {(EXPR) (EXPR)}
  {{ -EXPR} {-EXPR}}
  {+EXPR +EXPR}
  {~EXPR ~EXPR}
  {EXPR+EXPR EXPR+EXPR}
  {EXPR-EXPR EXPR-EXPR}
  {EXPR*EXPR EXPR*EXPR}
  {EXPR+EXPR EXPR+EXPR}
  {EXPR-EXPR EXPR-EXPR}
  {EXPR*EXPR EXPR*EXPR}
  {EXPR+EXPR EXPR+EXPR}
  {EXPR-EXPR EXPR-EXPR}
  {EXPR*EXPR EXPR*EXPR}
  {{EXPR | EXPR} {EXPR | EXPR}}
  {(abs(EXPR)/abs(EXPR)) (abs(EXPR)/abs(EXPR))}
  {
    {case when BOOL then EXPR else EXPR end}
    {((BOOL)?EXPR:EXPR)}
  }
  {
    {case when BOOL then EXPR when BOOL then EXPR else EXPR end}
    {((BOOL)?EXPR:((BOOL)?EXPR:EXPR))}
  }
  {
    {case EXPR when EXPR then EXPR else EXPR end}
    {(((EXPR)==(EXPR))?EXPR:EXPR)}
  }
  {
    {(select AGG from t1)}
    {(AGG)}
  }
  {
    {coalesce((select max(EXPR) from t1 where BOOL),EXPR)}
    {[coalesce_subquery [expr {EXPR}] [expr {BOOL}] [expr {EXPR}]]}
  }
  {
    {coalesce((select EXPR from t1 where BOOL),EXPR)}
    {[coalesce_subquery [expr {EXPR}] [expr {BOOL}] [expr {EXPR}]]}
  }
}

# The $boolexpr list contains terms that show both an SQL boolean
# expression and its equivalent TCL.
#
set boolexpr {
  {EXPR=EXPR   ((EXPR)==(EXPR))}
  {EXPR<EXPR   ((EXPR)<(EXPR))}
  {EXPR>EXPR   ((EXPR)>(EXPR))}
  {EXPR<=EXPR  ((EXPR)<=(EXPR))}
  {EXPR>=EXPR  ((EXPR)>=(EXPR))}
  {EXPR<>EXPR  ((EXPR)!=(EXPR))}
  {
    {EXPR between EXPR and EXPR}
    {[betweenop [expr {EXPR}] [expr {EXPR}] [expr {EXPR}]]}
  }
  {
    {EXPR not between EXPR and EXPR}
    {(![betweenop [expr {EXPR}] [expr {EXPR}] [expr {EXPR}]])}
  }
  {
    {EXPR in (EXPR,EXPR,EXPR)}
    {([inop [expr {EXPR}] [expr {EXPR}] [expr {EXPR}] [expr {EXPR}]])}
  }
  {
    {EXPR not in (EXPR,EXPR,EXPR)}
    {(![inop [expr {EXPR}] [expr {EXPR}] [expr {EXPR}] [expr {EXPR}]])}
  }
  {
    {EXPR in (select EXPR from t1 union select EXPR from t1)}
    {[inop [expr {EXPR}] [expr {EXPR}] [expr {EXPR}]]}
  }
  {
    {EXPR in (select AGG from t1 union select AGG from t1)}
    {[inop [expr {EXPR}] [expr {AGG}] [expr {AGG}]]}
  }
  {
    {exists(select 1 from t1 where BOOL)}
    {(BOOL)}
  }
  {
    {not exists(select 1 from t1 where BOOL)}
    {!(BOOL)}
  }
  {{not BOOL}  !BOOL}
  {{BOOL and BOOL} {BOOL tcland BOOL}}
  {{BOOL or BOOL}  {BOOL || BOOL}}
  {{BOOL and BOOL} {BOOL tcland BOOL}}
  {{BOOL or BOOL}  {BOOL || BOOL}}
  {(BOOL) (BOOL)}
  {(BOOL) (BOOL)}
}

# Aggregate expressions
#
set aggexpr {
  {count(*) wide(1)}
  {{count(distinct EXPR)} {[one {EXPR}]}}
  {{cast(avg(EXPR) AS integer)} (EXPR)}
  {min(EXPR) (EXPR)}
  {max(EXPR) (EXPR)}
  {(AGG) (AGG)}
  {{ -AGG} {-AGG}}
  {+AGG +AGG}
  {~AGG ~AGG}
  {abs(AGG)  abs(AGG)}
  {AGG+AGG   AGG+AGG}
  {AGG-AGG   AGG-AGG}
  {AGG*AGG   AGG*AGG}
  {{AGG | AGG}  {AGG | AGG}}
  {
    {case AGG when AGG then AGG else AGG end}
    {(((AGG)==(AGG))?AGG:AGG)}
  }
}

# Convert a string containing EXPR, AGG, and BOOL into a string
# that contains nothing but X, Y, and Z.
#
proc extract_vars {a} {
  regsub -all {EXPR} $a X a
  regsub -all {AGG} $a Y a
  regsub -all {BOOL} $a Z a
  regsub -all {[^XYZ]} $a {} a
  return $a
}


# Test all templates to make sure the number of EXPR, AGG, and BOOL
# expressions match.
#
foreach term [concat $aggexpr $intexpr $boolexpr] {
  foreach {a b} $term break
  if {[extract_vars $a]!=[extract_vars $b]} {
    error "mismatch: $term"
  }
}

# Generate a random expression according to the templates given above.
# If the argument is EXPR or omitted, then an integer expression is
# generated.  If the argument is BOOL then a boolean expression is
# produced.
#
proc generate_expr {{e EXPR}} {
  set tcle $e
  set ne [llength $::intexpr]
  set nb [llength $::boolexpr]
  set na [llength $::aggexpr]
  set div 2
  set mx 50
  set i 0
  while {1} {
    set cnt 0
    set re [lindex $::intexpr [expr {int(rand()*$ne)}]]
    incr cnt [regsub {EXPR} $e [lindex $re 0] e]
    regsub {EXPR} $tcle [lindex $re 1] tcle
    set rb [lindex $::boolexpr [expr {int(rand()*$nb)}]]
    incr cnt [regsub {BOOL} $e [lindex $rb 0] e]
    regsub {BOOL} $tcle [lindex $rb 1] tcle
    set ra [lindex $::aggexpr [expr {int(rand()*$na)}]]
    incr cnt [regsub {AGG} $e [lindex $ra 0] e]
    regsub {AGG} $tcle [lindex $ra 1] tcle

    if {$cnt==0} break
    incr i $cnt

    set v1 [extract_vars $e]
    if {$v1!=[extract_vars $tcle]} {
      exit
    }

    if {$i+[string length $v1]>=$mx} {
      set ne [expr {$ne/$div}]
      set nb [expr {$nb/$div}]
      set na [expr {$na/$div}]
      set div 1
      set mx [expr {$mx*1000}]
    }
  }
  regsub -all { tcland } $tcle { \&\& } tcle
  return [list $e $tcle]
}

# Implementation of routines used to implement the IN and BETWEEN
# operators.
proc inop {lhs args} {
  foreach a $args {
    if {$a==$lhs} {return 1}
  }
  return 0
}
proc betweenop {lhs first second} {
  return [expr {$lhs>=$first && $lhs<=$second}]
}
proc coalesce_subquery {a b e} {
  if {$b} {
    return $a
  } else {
    return $e
  }
}
proc one {args} {
  return 1
}

# Begin generating the test script:
#
puts {# 2008 December 16
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file tests randomly generated SQL expressions.  The expressions
# are generated by a TCL script.  The same TCL script also computes the
# correct value of the expression.  So, from one point of view, this
# file verifies the expression evaluation logic of SQLite against the
# expression evaluation logic of TCL.
#
# An early version of this script is how bug #3541 was detected.
#
# $Id: randexpr1.tcl,v 1.1 2008/12/15 16:33:30 drh Exp $
set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Create test data
#
do_test randexpr1-1.1 {
  db eval {
    CREATE TABLE t1(a,b,c,d,e,f);
    INSERT INTO t1 VALUES(100,200,300,400,500,600);
    SELECT * FROM t1
  }
} {100 200 300 400 500 600}
}

# Test data for TCL evaluation.
#
set a [expr {wide(100)}]
set b [expr {wide(200)}]
set c [expr {wide(300)}]
set d [expr {wide(400)}]
set e [expr {wide(500)}]
set f [expr {wide(600)}]

# A procedure to generate a test case.
#
set tn 0
proc make_test_case {sql result} {
  global tn
  incr tn
  puts "do_test randexpr-2.$tn {\n  db eval {$sql}\n} {$result}"
}

# Generate many random test cases.
#
expr srand(0)
for {set i 0} {$i<1000} {incr i} {
  while {1} {
    foreach {sqle tcle} [generate_expr EXPR] break;
    if {[catch {expr $tcle} ans]} {
      #puts stderr [list $tcle]
      #puts stderr ans=$ans
      if {![regexp {divide by zero} $ans]} exit
      continue
    }
    set len [string length $sqle]
    if {$len<100 || $len>2000} continue
    if {[info exists seen($sqle)]} continue
    set seen($sqle) 1
    break
  }
  while {1} {
    foreach {sqlb tclb} [generate_expr BOOL] break;
    if {[catch {expr $tclb} bans]} {
      #puts stderr [list $tclb]
      #puts stderr bans=$bans
      if {![regexp {divide by zero} $bans]} exit
      continue
    }
    break
  }
  if {$bans} {
    make_test_case "SELECT $sqle FROM t1 WHERE $sqlb" $ans
    make_test_case "SELECT $sqle FROM t1 WHERE NOT ($sqlb)" {}
  } else {
    make_test_case "SELECT $sqle FROM t1 WHERE $sqlb" {}
    make_test_case "SELECT $sqle FROM t1 WHERE NOT ($sqlb)" $ans
  }
  if {[regexp { \| } $sqle]} {
    regsub -all { \| } $sqle { \& } sqle
    regsub -all { \| } $tcle { \& } tcle
    if {[catch {expr $tcle} ans]==0} {
      if {$bans} {
        make_test_case "SELECT $sqle FROM t1 WHERE $sqlb" $ans
      } else {
        make_test_case "SELECT $sqle FROM t1 WHERE NOT ($sqlb)" $ans
      }
    }
  }
}

# Terminate the test script
#
puts {finish_test}
