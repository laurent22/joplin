

proc loadfile {f} {
  set fd [open $f]
  set data [read $fd]
  close $fd
  return $data
}

set ::nRow 0
set ::nRowPerDot 1000

proc load_hierachy {dir} {
  foreach f [glob -nocomplain -dir $dir *] {
    if {$::O(limit) && $::nRow>=$::O(limit)} break
    if {[file isdir $f]} {
      load_hierachy $f
    } else {
      db eval { INSERT INTO t1 VALUES($f, loadfile($f)) }
      incr ::nRow

      if {$::O(trans) && ($::nRow % $::O(trans))==0} {
        db eval { COMMIT }
        db eval { INSERT INTO t1(t1) VALUES('integrity-check') }
        db eval { BEGIN }
      }

      if {($::nRow % $::nRowPerDot)==0} {
        puts -nonewline .
        if {($::nRow % (65*$::nRowPerDot))==0} { puts "" }
        flush stdout
      }

    }
  }
}

proc usage {} {
  puts stderr "Usage: $::argv0 ?SWITCHES? DATABASE PATH"
  puts stderr ""
  puts stderr "Switches are:"
  puts stderr "  -fts4        (use fts4 instead of fts5)"
  puts stderr "  -fts5        (use fts5)"
  puts stderr "  -porter      (use porter tokenizer)"
  puts stderr "  -delete      (delete the database file before starting)"
  puts stderr "  -limit N     (load no more than N documents)"
  puts stderr "  -automerge N (set the automerge parameter to N)"
  puts stderr "  -crisismerge N (set the crisismerge parameter to N)"
  puts stderr "  -prefix PREFIX (comma separated prefix= argument)"
  puts stderr "  -trans N     (commit after N inserts - 0 == never)"
  puts stderr "  -hashsize N  (set the fts5 hashsize parameter to N)"
  puts stderr "  -detail MODE (detail mode for fts5 tables)"
  exit 1
}

set O(vtab)       fts5
set O(tok)        ""
set O(limit)      0
set O(delete)     0
set O(automerge)  -1
set O(crisismerge)  -1
set O(prefix)     ""
set O(trans)      0
set O(hashsize)   -1
set O(detail)     full

if {[llength $argv]<2} usage
set nOpt [expr {[llength $argv]-2}]
for {set i 0} {$i < $nOpt} {incr i} {
  set arg [lindex $argv $i]
  switch -- [lindex $argv $i] {
    -fts4 {
      set O(vtab) fts4
    }

    -fts5 {
      set O(vtab) fts5
    }

    -porter {
      set O(tok) ", tokenize=porter"
    }

    -delete {
      set O(delete) 1
    }

    -limit {
      if { [incr i]>=$nOpt } usage
      set O(limit) [lindex $argv $i]
    }

    -trans {
      if { [incr i]>=$nOpt } usage
      set O(trans) [lindex $argv $i]
    }
    
    -automerge {
      if { [incr i]>=$nOpt } usage
      set O(automerge) [lindex $argv $i]
    }

    -crisismerge {
      if { [incr i]>=$nOpt } usage
      set O(crisismerge) [lindex $argv $i]
    }

    -prefix {
      if { [incr i]>=$nOpt } usage
      set O(prefix) [lindex $argv $i]
    }

    -hashsize {
      if { [incr i]>=$nOpt } usage
      set O(hashsize) [lindex $argv $i]
    }

    -detail {
      if { [incr i]>=$nOpt } usage
      set O(detail) [lindex $argv $i]
    }

    default {
      usage
    }
  }
}

set dbfile [lindex $argv end-1]
if {$O(delete)} { file delete -force $dbfile }
sqlite3 db $dbfile
catch { load_static_extension db fts5 }
db func loadfile loadfile
db eval "PRAGMA page_size=4096"

db eval BEGIN
  set pref ""
  if {$O(prefix)!=""} { set pref ", prefix='$O(prefix)'" }
  if {$O(vtab)=="fts5"} {
    append pref ", detail=$O(detail)"
  }
  catch {
    db eval "CREATE VIRTUAL TABLE t1 USING $O(vtab) (path, content$O(tok)$pref)"
    db eval "INSERT INTO t1(t1, rank) VALUES('pgsz', 4050);"
  }

  if {$O(hashsize)>=0} {
    catch {
      db eval "INSERT INTO t1(t1, rank) VALUES('hashsize', $O(hashsize));"
    }
  }


  if {$O(automerge)>=0} {
    if {$O(vtab) == "fts5"} {
      db eval { INSERT INTO t1(t1, rank) VALUES('automerge', $O(automerge)) }
    } else {
      db eval { INSERT INTO t1(t1) VALUES('automerge=' || $O(automerge)) }
    }
  }
  if {$O(crisismerge)>=0} {
    if {$O(vtab) == "fts5"} {
      db eval {INSERT INTO t1(t1, rank) VALUES('crisismerge', $O(crisismerge))}
    } else {
    }
  }
  load_hierachy [lindex $argv end]
db eval COMMIT
puts ""



