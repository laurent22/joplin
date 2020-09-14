This folder contains extensions and utility programs intended to analyze
live database files, detect problems, and possibly fix them.

As SQLite is being used on larger and larger databases, database sizes
are growing into the terabyte range.  At that size, hardware malfunctions
and/or cosmic rays will occasionally corrupt a database file.  Detecting 
problems and fixing errors a terabyte-sized databases can take hours or days,
and it is undesirable to take applications that depend on the databases 
off-line for such a long time.
The utilities in the folder are intended to provide mechanisms for
detecting and fixing problems in large databases while those databases
are in active use.

The utilities and extensions in this folder are experimental and under
active development at the time of this writing (2017-10-12).  If and when
they stabilize, this README will be updated to reflect that fact.
