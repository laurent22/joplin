# A Tk console widget for SQLite.  Invoke sqlitecon::create with a window name,
# a prompt string, a title to set a new top-level window, and the SQLite
# database handle.  For example:
#
#     sqlitecon::create .sqlcon {sql:- } {SQL Console} db
#
# A toplevel window is created that allows you to type in SQL commands to
# be processed on the spot.
#
# A limited set of dot-commands are supported:
#
#     .table
#     .schema ?TABLE?
#     .mode list|column|multicolumn|line
#     .exit
#
# In addition, a new SQL function named "edit()" is created.  This function
# takes a single text argument and returns a text result.  Whenever the
# the function is called, it pops up a new toplevel window containing a
# text editor screen initialized to the argument.  When the "OK" button
# is pressed, whatever revised text is in the text editor is returned as
# the result of the edit() function.  This allows text fields of SQL tables
# to be edited quickly and easily as follows:
#
#    UPDATE table1 SET dscr = edit(dscr) WHERE rowid=15;
#


# Create a namespace to work in
#
namespace eval ::sqlitecon {
  # do nothing
}

# Create a console widget named $w.  The prompt string is $prompt.
# The title at the top of the window is $title.  The database connection
# object is $db
#
proc sqlitecon::create {w prompt title db} {
  upvar #0 $w.t v
  if {[winfo exists $w]} {destroy $w}
  if {[info exists v]} {unset v}
  toplevel $w
  wm title $w $title
  wm iconname $w $title
  frame $w.mb -bd 2 -relief raised
  pack $w.mb -side top -fill x
  menubutton $w.mb.file -text File -menu $w.mb.file.m
  menubutton $w.mb.edit -text Edit -menu $w.mb.edit.m
  pack $w.mb.file $w.mb.edit -side left -padx 8 -pady 1
  set m [menu $w.mb.file.m -tearoff 0]
  $m add command -label {Close} -command "destroy $w"
  sqlitecon::create_child $w $prompt $w.mb.edit.m
  set v(db) $db
  $db function edit ::sqlitecon::_edit
}

# This routine creates a console as a child window within a larger
# window.  It also creates an edit menu named "$editmenu" if $editmenu!="".
# The calling function is responsible for posting the edit menu.
#
proc sqlitecon::create_child {w prompt editmenu} {
  upvar #0 $w.t v
  if {$editmenu!=""} {
    set m [menu $editmenu -tearoff 0]
    $m add command -label Cut -command "sqlitecon::Cut $w.t"
    $m add command -label Copy -command "sqlitecon::Copy $w.t"
    $m add command -label Paste -command "sqlitecon::Paste $w.t"
    $m add command -label {Clear Screen} -command "sqlitecon::Clear $w.t"
    $m add separator
    $m add command -label {Save As...} -command "sqlitecon::SaveFile $w.t"
    catch {$editmenu config -postcommand "sqlitecon::EnableEditMenu $w"}
  }
  scrollbar $w.sb -orient vertical -command "$w.t yview"
  pack $w.sb -side right -fill y
  text $w.t -font fixed -yscrollcommand "$w.sb set"
  pack $w.t -side right -fill both -expand 1
  bindtags $w.t Sqlitecon
  set v(editmenu) $editmenu
  set v(history) 0
  set v(historycnt) 0
  set v(current) -1
  set v(prompt) $prompt
  set v(prior) {}
  set v(plength) [string length $v(prompt)]
  set v(x) 0
  set v(y) 0
  set v(mode) column
  set v(header) on
  $w.t mark set insert end
  $w.t tag config ok -foreground blue
  $w.t tag config err -foreground red
  $w.t insert end $v(prompt)
  $w.t mark set out 1.0
  after idle "focus $w.t"
}

bind Sqlitecon <1> {sqlitecon::Button1 %W %x %y}
bind Sqlitecon <B1-Motion> {sqlitecon::B1Motion %W %x %y}
bind Sqlitecon <B1-Leave> {sqlitecon::B1Leave %W %x %y}
bind Sqlitecon <B1-Enter> {sqlitecon::cancelMotor %W}
bind Sqlitecon <ButtonRelease-1> {sqlitecon::cancelMotor %W}
bind Sqlitecon <KeyPress> {sqlitecon::Insert %W %A}
bind Sqlitecon <Left> {sqlitecon::Left %W}
bind Sqlitecon <Control-b> {sqlitecon::Left %W}
bind Sqlitecon <Right> {sqlitecon::Right %W}
bind Sqlitecon <Control-f> {sqlitecon::Right %W}
bind Sqlitecon <BackSpace> {sqlitecon::Backspace %W}
bind Sqlitecon <Control-h> {sqlitecon::Backspace %W}
bind Sqlitecon <Delete> {sqlitecon::Delete %W}
bind Sqlitecon <Control-d> {sqlitecon::Delete %W}
bind Sqlitecon <Home> {sqlitecon::Home %W}
bind Sqlitecon <Control-a> {sqlitecon::Home %W}
bind Sqlitecon <End> {sqlitecon::End %W}
bind Sqlitecon <Control-e> {sqlitecon::End %W}
bind Sqlitecon <Return> {sqlitecon::Enter %W}
bind Sqlitecon <KP_Enter> {sqlitecon::Enter %W}
bind Sqlitecon <Up> {sqlitecon::Prior %W}
bind Sqlitecon <Control-p> {sqlitecon::Prior %W}
bind Sqlitecon <Down> {sqlitecon::Next %W}
bind Sqlitecon <Control-n> {sqlitecon::Next %W}
bind Sqlitecon <Control-k> {sqlitecon::EraseEOL %W}
bind Sqlitecon <<Cut>> {sqlitecon::Cut %W}
bind Sqlitecon <<Copy>> {sqlitecon::Copy %W}
bind Sqlitecon <<Paste>> {sqlitecon::Paste %W}
bind Sqlitecon <<Clear>> {sqlitecon::Clear %W}

# Insert a single character at the insertion cursor
#
proc sqlitecon::Insert {w a} {
  $w insert insert $a
  $w yview insert
}

# Move the cursor one character to the left
#
proc sqlitecon::Left {w} {
  upvar #0 $w v
  scan [$w index insert] %d.%d row col
  if {$col>$v(plength)} {
    $w mark set insert "insert -1c"
  }
}

# Erase the character to the left of the cursor
#
proc sqlitecon::Backspace {w} {
  upvar #0 $w v
  scan [$w index insert] %d.%d row col
  if {$col>$v(plength)} {
    $w delete {insert -1c}
  }
}

# Erase to the end of the line
#
proc sqlitecon::EraseEOL {w} {
  upvar #0 $w v
  scan [$w index insert] %d.%d row col
  if {$col>=$v(plength)} {
    $w delete insert {insert lineend}
  }
}

# Move the cursor one character to the right
#
proc sqlitecon::Right {w} {
  $w mark set insert "insert +1c"
}

# Erase the character to the right of the cursor
#
proc sqlitecon::Delete w {
  $w delete insert
}

# Move the cursor to the beginning of the current line
#
proc sqlitecon::Home w {
  upvar #0 $w v
  scan [$w index insert] %d.%d row col
  $w mark set insert $row.$v(plength)
}

# Move the cursor to the end of the current line
#
proc sqlitecon::End w {
  $w mark set insert {insert lineend}
}

# Add a line to the history
#
proc sqlitecon::addHistory {w line} {
  upvar #0 $w v
  if {$v(historycnt)>0} {
    set last [lindex $v(history) [expr $v(historycnt)-1]]
    if {[string compare $last $line]} {
      lappend v(history) $line
      incr v(historycnt)
    }
  } else {
    set v(history) [list $line]
    set v(historycnt) 1
  }
  set v(current) $v(historycnt)
}

# Called when "Enter" is pressed.  Do something with the line
# of text that was entered.
#
proc sqlitecon::Enter w {
  upvar #0 $w v
  scan [$w index insert] %d.%d row col
  set start $row.$v(plength)
  set line [$w get $start "$start lineend"]
  $w insert end \n
  $w mark set out end
  if {$v(prior)==""} {
    set cmd $line
  } else {
    set cmd $v(prior)\n$line
  }
  if {[string index $cmd 0]=="." || [$v(db) complete $cmd]} {
    regsub -all {\n} [string trim $cmd] { } cmd2
    addHistory $w $cmd2
    set rc [catch {DoCommand $w $cmd} res]
    if {![winfo exists $w]} return
    if {$rc} {
      $w insert end $res\n err
    } elseif {[string length $res]>0} {
      $w insert end $res\n ok
    }
    set v(prior) {}
    $w insert end $v(prompt)
  } else {
    set v(prior) $cmd
    regsub -all {[^ ]} $v(prompt) . x
    $w insert end $x
  }
  $w mark set insert end
  $w mark set out {insert linestart}
  $w yview insert
}

# Execute a single SQL command.  Pay special attention to control
# directives that begin with "."
#
# The return value is the text output from the command, properly
# formatted.
#
proc sqlitecon::DoCommand {w cmd} {
  upvar #0 $w v
  set mode $v(mode)
  set header $v(header)
  if {[regexp {^(\.[a-z]+)} $cmd all word]} {
    if {$word==".mode"} {
      regexp {^.[a-z]+ +([a-z]+)} $cmd all v(mode)
      return {}
    } elseif {$word==".exit"} {
      destroy [winfo toplevel $w]
      return {}
    } elseif {$word==".header"} {
      regexp {^.[a-z]+ +([a-z]+)} $cmd all v(header)
      return {}
    } elseif {$word==".tables"} {
      set mode multicolumn
      set cmd {SELECT name FROM sqlite_master WHERE type='table'
               UNION ALL
               SELECT name FROM sqlite_temp_master WHERE type='table'}
      $v(db) eval {PRAGMA database_list} {
         if {$name!="temp" && $name!="main"} {
            append cmd "UNION ALL SELECT name FROM $name.sqlite_master\
                        WHERE type='table'"
         }
      }
      append cmd  { ORDER BY 1}
    } elseif {$word==".fullschema"} {
      set pattern %
      regexp {^.[a-z]+ +([^ ]+)} $cmd all pattern
      set mode list
      set header 0
      set cmd "SELECT sql FROM sqlite_master WHERE tbl_name LIKE '$pattern'
               AND sql NOT NULL UNION ALL SELECT sql FROM sqlite_temp_master
               WHERE tbl_name LIKE '$pattern' AND sql NOT NULL"
      $v(db) eval {PRAGMA database_list} {
         if {$name!="temp" && $name!="main"} {
            append cmd " UNION ALL SELECT sql FROM $name.sqlite_master\
                        WHERE tbl_name LIKE '$pattern' AND sql NOT NULL"
         }
      }
    } elseif {$word==".schema"} {
      set pattern %
      regexp {^.[a-z]+ +([^ ]+)} $cmd all pattern
      set mode list
      set header 0
      set cmd "SELECT sql FROM sqlite_master WHERE name LIKE '$pattern'
               AND sql NOT NULL UNION ALL SELECT sql FROM sqlite_temp_master
               WHERE name LIKE '$pattern' AND sql NOT NULL"
      $v(db) eval {PRAGMA database_list} {
         if {$name!="temp" && $name!="main"} {
            append cmd " UNION ALL SELECT sql FROM $name.sqlite_master\
                        WHERE name LIKE '$pattern' AND sql NOT NULL"
         }
      }
    } else {
      return \
        ".exit\n.mode line|list|column\n.schema ?TABLENAME?\n.tables"
    }
  }
  set res {}
  if {$mode=="list"} {
    $v(db) eval $cmd x {
      set sep {}
      foreach col $x(*) {
        append res $sep$x($col)
        set sep |
      }
      append res \n
    }
    if {[info exists x(*)] && $header} {
      set sep {}
      set hdr {}
      foreach col $x(*) {
        append hdr $sep$col
        set sep |
      }
      set res $hdr\n$res
    }
  } elseif {[string range $mode 0 2]=="col"} {
    set y {}
    $v(db) eval $cmd x {
      foreach col $x(*) {
        if {![info exists cw($col)] || $cw($col)<[string length $x($col)]} {
           set cw($col) [string length $x($col)]
        }
        lappend y $x($col)
      }
    }
    if {[info exists x(*)] && $header} {
      set hdr {}
      set ln {}
      set dash ---------------------------------------------------------------
      append dash ------------------------------------------------------------
      foreach col $x(*) {
        if {![info exists cw($col)] || $cw($col)<[string length $col]} {
           set cw($col) [string length $col]
        }
        lappend hdr $col
        lappend ln [string range $dash 1 $cw($col)]
      }
      set y [concat $hdr $ln $y]
    }
    if {[info exists x(*)]} {
      set format {}
      set arglist {}
      set arglist2 {}
      set i 0
      foreach col $x(*) {
        lappend arglist x$i
        append arglist2 " \$x$i"
        incr i
        append format "  %-$cw($col)s"
      }
      set format [string trimleft $format]\n
      if {[llength $arglist]>0} {
        foreach $arglist $y "append res \[format [list $format] $arglist2\]"
      }
    }
  } elseif {$mode=="multicolumn"} {
    set y [$v(db) eval $cmd]
    set max 0
    foreach e $y {
      if {$max<[string length $e]} {set max [string length $e]}
    }
    set ncol [expr {int(80/($max+2))}]
    if {$ncol<1} {set ncol 1}
    set nelem [llength $y]
    set nrow [expr {($nelem+$ncol-1)/$ncol}]
    set format "%-${max}s"
    for {set i 0} {$i<$nrow} {incr i} {
      set j $i
      while 1 {
        append res [format $format [lindex $y $j]]
        incr j $nrow
        if {$j>=$nelem} break
        append res {  }
      }
      append res \n
    }
  } else {
    $v(db) eval $cmd x {
      foreach col $x(*) {append res "$col = $x($col)\n"}
      append res \n
    }
  }
  return [string trimright $res]
}

# Change the line to the previous line
#
proc sqlitecon::Prior w {
  upvar #0 $w v
  if {$v(current)<=0} return
  incr v(current) -1
  set line [lindex $v(history) $v(current)]
  sqlitecon::SetLine $w $line
}

# Change the line to the next line
#
proc sqlitecon::Next w {
  upvar #0 $w v
  if {$v(current)>=$v(historycnt)} return
  incr v(current) 1
  set line [lindex $v(history) $v(current)]
  sqlitecon::SetLine $w $line
}

# Change the contents of the entry line
#
proc sqlitecon::SetLine {w line} {
  upvar #0 $w v
  scan [$w index insert] %d.%d row col
  set start $row.$v(plength)
  $w delete $start end
  $w insert end $line
  $w mark set insert end
  $w yview insert
}

# Called when the mouse button is pressed at position $x,$y on
# the console widget.
#
proc sqlitecon::Button1 {w x y} {
  global tkPriv
  upvar #0 $w v
  set v(mouseMoved) 0
  set v(pressX) $x
  set p [sqlitecon::nearestBoundry $w $x $y]
  scan [$w index insert] %d.%d ix iy
  scan $p %d.%d px py
  if {$px==$ix} {
    $w mark set insert $p
  }
  $w mark set anchor $p
  focus $w
}

# Find the boundry between characters that is nearest
# to $x,$y
#
proc sqlitecon::nearestBoundry {w x y} {
  set p [$w index @$x,$y]
  set bb [$w bbox $p]
  if {![string compare $bb ""]} {return $p}
  if {($x-[lindex $bb 0])<([lindex $bb 2]/2)} {return $p}
  $w index "$p + 1 char"
}

# This routine extends the selection to the point specified by $x,$y
#
proc sqlitecon::SelectTo {w x y} {
  upvar #0 $w v
  set cur [sqlitecon::nearestBoundry $w $x $y]
  if {[catch {$w index anchor}]} {
    $w mark set anchor $cur
  }
  set anchor [$w index anchor]
  if {[$w compare $cur != $anchor] || (abs($v(pressX) - $x) >= 3)} {
    if {$v(mouseMoved)==0} {
      $w tag remove sel 0.0 end
    }
    set v(mouseMoved) 1
  }
  if {[$w compare $cur < anchor]} {
    set first $cur
    set last anchor
  } else {
    set first anchor
    set last $cur
  }
  if {$v(mouseMoved)} {
    $w tag remove sel 0.0 $first
    $w tag add sel $first $last
    $w tag remove sel $last end
    update idletasks
  }
}

# Called whenever the mouse moves while button-1 is held down.
#
proc sqlitecon::B1Motion {w x y} {
  upvar #0 $w v
  set v(y) $y
  set v(x) $x
  sqlitecon::SelectTo $w $x $y
}

# Called whenever the mouse leaves the boundries of the widget
# while button 1 is held down.
#
proc sqlitecon::B1Leave {w x y} {
  upvar #0 $w v
  set v(y) $y
  set v(x) $x
  sqlitecon::motor $w
}

# This routine is called to automatically scroll the window when
# the mouse drags offscreen.
#
proc sqlitecon::motor w {
  upvar #0 $w v
  if {![winfo exists $w]} return
  if {$v(y)>=[winfo height $w]} {
    $w yview scroll 1 units
  } elseif {$v(y)<0} {
    $w yview scroll -1 units
  } else {
    return
  }
  sqlitecon::SelectTo $w $v(x) $v(y)
  set v(timer) [after 50 sqlitecon::motor $w]
}

# This routine cancels the scrolling motor if it is active
#
proc sqlitecon::cancelMotor w {
  upvar #0 $w v
  catch {after cancel $v(timer)}
  catch {unset v(timer)}
}

# Do a Copy operation on the stuff currently selected.
#
proc sqlitecon::Copy w {
  if {![catch {set text [$w get sel.first sel.last]}]} {
     clipboard clear -displayof $w
     clipboard append -displayof $w $text
  }
}

# Return 1 if the selection exists and is contained
# entirely on the input line.  Return 2 if the selection
# exists but is not entirely on the input line.  Return 0
# if the selection does not exist.
#
proc sqlitecon::canCut w {
  set r [catch {
    scan [$w index sel.first] %d.%d s1x s1y
    scan [$w index sel.last] %d.%d s2x s2y
    scan [$w index insert] %d.%d ix iy
  }]
  if {$r==1} {return 0}
  if {$s1x==$ix && $s2x==$ix} {return 1}
  return 2
}

# Do a Cut operation if possible.  Cuts are only allowed
# if the current selection is entirely contained on the
# current input line.
#
proc sqlitecon::Cut w {
  if {[sqlitecon::canCut $w]==1} {
    sqlitecon::Copy $w
    $w delete sel.first sel.last
  }
}

# Do a paste opeation.
#
proc sqlitecon::Paste w {
  if {[sqlitecon::canCut $w]==1} {
    $w delete sel.first sel.last
  }
  if {[catch {selection get -displayof $w -selection CLIPBOARD} topaste]
    && [catch {selection get -displayof $w -selection PRIMARY} topaste]} {
    return
  }
  if {[info exists ::$w]} {
    set prior 0
    foreach line [split $topaste \n] {
      if {$prior} {
        sqlitecon::Enter $w
        update
      }
      set prior 1
      $w insert insert $line
    }
  } else {
    $w insert insert $topaste
  }
}

# Enable or disable entries in the Edit menu
#
proc sqlitecon::EnableEditMenu w {
  upvar #0 $w.t v
  set m $v(editmenu)
  if {$m=="" || ![winfo exists $m]} return
  switch [sqlitecon::canCut $w.t] {
    0 {
      $m entryconf Copy -state disabled
      $m entryconf Cut -state disabled
    }
    1 {
      $m entryconf Copy -state normal
      $m entryconf Cut -state normal
    }
    2 {
      $m entryconf Copy -state normal
      $m entryconf Cut -state disabled
    }
  }
}

# Prompt the user for the name of a writable file.  Then write the
# entire contents of the console screen to that file.
#
proc sqlitecon::SaveFile w {
  set types {
    {{Text Files}  {.txt}}
    {{All Files}    *}
  }
  set f [tk_getSaveFile -filetypes $types -title "Write Screen To..."]
  if {$f!=""} {
    if {[catch {open $f w} fd]} {
      tk_messageBox -type ok -icon error -message $fd
    } else {
      puts $fd [string trimright [$w get 1.0 end] \n]
      close $fd
    }
  }
}

# Erase everything from the console above the insertion line.
#
proc sqlitecon::Clear w {
  $w delete 1.0 {insert linestart}
}

# An in-line editor for SQL
#
proc sqlitecon::_edit {origtxt {title {}}} {
  for {set i 0} {[winfo exists .ed$i]} {incr i} continue
  set w .ed$i
  toplevel $w
  wm protocol $w WM_DELETE_WINDOW "$w.b.can invoke"
  wm title $w {Inline SQL Editor}
  frame $w.b
  pack $w.b -side bottom -fill x
  button $w.b.can -text Cancel -width 6 -command [list set ::$w 0]
  button $w.b.ok -text OK -width 6 -command [list set ::$w 1]
  button $w.b.cut -text Cut -width 6 -command [list ::sqlitecon::Cut $w.t]
  button $w.b.copy -text Copy -width 6 -command [list ::sqlitecon::Copy $w.t]
  button $w.b.paste -text Paste -width 6 -command [list ::sqlitecon::Paste $w.t]
  set ::$w {}
  pack $w.b.cut $w.b.copy $w.b.paste $w.b.can $w.b.ok\
     -side left -padx 5 -pady 5 -expand 1
  if {$title!=""} {
    label $w.title -text $title
    pack $w.title -side top -padx 5 -pady 5
  }
  text $w.t -bg white -fg black -yscrollcommand [list $w.sb set]
  pack $w.t -side left -fill both -expand 1
  scrollbar $w.sb -orient vertical -command [list $w.t yview]
  pack $w.sb -side left -fill y
  $w.t insert end $origtxt

  vwait ::$w

  if {[set ::$w]} {
    set txt [string trimright [$w.t get 1.0 end]]
  } else {
    set txt $origtxt
  }
  destroy $w
  return $txt
}
