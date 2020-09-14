#!sqlite3
#
# This is a visual test case for the geopoly virtual table.
#
# Run this script in the sqlite3 CLI, and redirect output into an
# HTML file.  This display the HTML in a webbrowser.
#

/* Test data.
** Lots of shapes to be displayed over a 1000x800 canvas.
*/
CREATE TEMP TABLE basis(name TEXT, jshape TEXT);
INSERT INTO basis(name,jshape) VALUES
  ('box-20','[[0,0],[20,0],[20,20],[0,20],[0,0]]'),
  ('house-70','[[0,0],[50,0],[50,50],[25,70],[0,50],[0,0]]'),
  ('line-40','[[0,0],[40,0],[40,5],[0,5],[0,0]]'),
  ('line-80','[[0,0],[80,0],[80,7],[0,7],[0,0]]'),
  ('arrow-50','[[0,0],[25,25],[0,50],[15,25],[0,0]]'),
  ('triangle-30','[[0,0],[30,0],[15,30],[0,0]]'),
  ('angle-30','[[0,0],[30,0],[30,30],[26,30],[26,4],[0,4],[0,0]]'),
  ('star-10','[[1,0],[5,2],[9,0],[7,4],[10,8],[7,7],[5,10],[3,7],[0,8],[3,4],[1,0]]');
CREATE TEMP TABLE xform(A,B,C,D,clr);
INSERT INTO xform(A,B,clr) VALUES
  (1,0,'black'),
  (0.707,0.707,'blue'),
  (0.5,0.866,'red'),
  (-0.866,0.5,'green');
CREATE TEMP TABLE xyoff(id1,id2,xoff,yoff,PRIMARY KEY(id1,id2,xoff,yoff))
  WITHOUT ROWID;
INSERT INTO xyoff VALUES(1,1,811,659);
INSERT INTO xyoff VALUES(1,1,235,550);
INSERT INTO xyoff VALUES(1,1,481,620);
INSERT INTO xyoff VALUES(1,1,106,494);
INSERT INTO xyoff VALUES(1,1,487,106);
INSERT INTO xyoff VALUES(1,1,817,595);
INSERT INTO xyoff VALUES(1,1,240,504);
INSERT INTO xyoff VALUES(1,1,806,457);
INSERT INTO xyoff VALUES(1,1,608,107);
INSERT INTO xyoff VALUES(1,1,768,662);
INSERT INTO xyoff VALUES(1,2,808,528);
INSERT INTO xyoff VALUES(1,2,768,528);
INSERT INTO xyoff VALUES(1,2,771,171);
INSERT INTO xyoff VALUES(1,2,275,671);
INSERT INTO xyoff VALUES(1,2,326,336);
INSERT INTO xyoff VALUES(1,2,690,688);
INSERT INTO xyoff VALUES(1,2,597,239);
INSERT INTO xyoff VALUES(1,2,317,528);
INSERT INTO xyoff VALUES(1,2,366,223);
INSERT INTO xyoff VALUES(1,2,621,154);
INSERT INTO xyoff VALUES(1,3,829,469);
INSERT INTO xyoff VALUES(1,3,794,322);
INSERT INTO xyoff VALUES(1,3,358,387);
INSERT INTO xyoff VALUES(1,3,184,444);
INSERT INTO xyoff VALUES(1,3,729,500);
INSERT INTO xyoff VALUES(1,3,333,523);
INSERT INTO xyoff VALUES(1,3,117,595);
INSERT INTO xyoff VALUES(1,3,496,201);
INSERT INTO xyoff VALUES(1,3,818,601);
INSERT INTO xyoff VALUES(1,3,541,343);
INSERT INTO xyoff VALUES(1,4,603,248);
INSERT INTO xyoff VALUES(1,4,761,649);
INSERT INTO xyoff VALUES(1,4,611,181);
INSERT INTO xyoff VALUES(1,4,607,233);
INSERT INTO xyoff VALUES(1,4,860,206);
INSERT INTO xyoff VALUES(1,4,310,231);
INSERT INTO xyoff VALUES(1,4,727,539);
INSERT INTO xyoff VALUES(1,4,660,661);
INSERT INTO xyoff VALUES(1,4,403,133);
INSERT INTO xyoff VALUES(1,4,619,331);
INSERT INTO xyoff VALUES(2,1,712,578);
INSERT INTO xyoff VALUES(2,1,567,313);
INSERT INTO xyoff VALUES(2,1,231,423);
INSERT INTO xyoff VALUES(2,1,490,175);
INSERT INTO xyoff VALUES(2,1,898,353);
INSERT INTO xyoff VALUES(2,1,589,483);
INSERT INTO xyoff VALUES(2,1,188,462);
INSERT INTO xyoff VALUES(2,1,720,106);
INSERT INTO xyoff VALUES(2,1,793,380);
INSERT INTO xyoff VALUES(2,1,154,396);
INSERT INTO xyoff VALUES(2,2,324,218);
INSERT INTO xyoff VALUES(2,2,120,327);
INSERT INTO xyoff VALUES(2,2,655,133);
INSERT INTO xyoff VALUES(2,2,516,603);
INSERT INTO xyoff VALUES(2,2,529,572);
INSERT INTO xyoff VALUES(2,2,481,212);
INSERT INTO xyoff VALUES(2,2,802,107);
INSERT INTO xyoff VALUES(2,2,234,509);
INSERT INTO xyoff VALUES(2,2,501,269);
INSERT INTO xyoff VALUES(2,2,349,553);
INSERT INTO xyoff VALUES(2,3,495,685);
INSERT INTO xyoff VALUES(2,3,897,372);
INSERT INTO xyoff VALUES(2,3,350,681);
INSERT INTO xyoff VALUES(2,3,832,257);
INSERT INTO xyoff VALUES(2,3,778,149);
INSERT INTO xyoff VALUES(2,3,683,426);
INSERT INTO xyoff VALUES(2,3,693,217);
INSERT INTO xyoff VALUES(2,3,746,317);
INSERT INTO xyoff VALUES(2,3,805,369);
INSERT INTO xyoff VALUES(2,3,336,585);
INSERT INTO xyoff VALUES(2,4,890,255);
INSERT INTO xyoff VALUES(2,4,556,565);
INSERT INTO xyoff VALUES(2,4,865,555);
INSERT INTO xyoff VALUES(2,4,230,293);
INSERT INTO xyoff VALUES(2,4,247,251);
INSERT INTO xyoff VALUES(2,4,730,563);
INSERT INTO xyoff VALUES(2,4,318,282);
INSERT INTO xyoff VALUES(2,4,220,431);
INSERT INTO xyoff VALUES(2,4,828,336);
INSERT INTO xyoff VALUES(2,4,278,525);
INSERT INTO xyoff VALUES(3,1,324,656);
INSERT INTO xyoff VALUES(3,1,625,362);
INSERT INTO xyoff VALUES(3,1,155,570);
INSERT INTO xyoff VALUES(3,1,267,433);
INSERT INTO xyoff VALUES(3,1,599,121);
INSERT INTO xyoff VALUES(3,1,873,498);
INSERT INTO xyoff VALUES(3,1,789,520);
INSERT INTO xyoff VALUES(3,1,656,378);
INSERT INTO xyoff VALUES(3,1,831,601);
INSERT INTO xyoff VALUES(3,1,256,471);
INSERT INTO xyoff VALUES(3,2,332,258);
INSERT INTO xyoff VALUES(3,2,305,463);
INSERT INTO xyoff VALUES(3,2,796,341);
INSERT INTO xyoff VALUES(3,2,830,229);
INSERT INTO xyoff VALUES(3,2,413,271);
INSERT INTO xyoff VALUES(3,2,269,140);
INSERT INTO xyoff VALUES(3,2,628,441);
INSERT INTO xyoff VALUES(3,2,747,643);
INSERT INTO xyoff VALUES(3,2,584,435);
INSERT INTO xyoff VALUES(3,2,784,314);
INSERT INTO xyoff VALUES(3,3,722,233);
INSERT INTO xyoff VALUES(3,3,815,421);
INSERT INTO xyoff VALUES(3,3,401,267);
INSERT INTO xyoff VALUES(3,3,451,650);
INSERT INTO xyoff VALUES(3,3,329,485);
INSERT INTO xyoff VALUES(3,3,878,370);
INSERT INTO xyoff VALUES(3,3,162,616);
INSERT INTO xyoff VALUES(3,3,844,183);
INSERT INTO xyoff VALUES(3,3,161,216);
INSERT INTO xyoff VALUES(3,3,176,676);
INSERT INTO xyoff VALUES(3,4,780,128);
INSERT INTO xyoff VALUES(3,4,566,121);
INSERT INTO xyoff VALUES(3,4,646,120);
INSERT INTO xyoff VALUES(3,4,223,557);
INSERT INTO xyoff VALUES(3,4,251,117);
INSERT INTO xyoff VALUES(3,4,139,209);
INSERT INTO xyoff VALUES(3,4,813,597);
INSERT INTO xyoff VALUES(3,4,454,538);
INSERT INTO xyoff VALUES(3,4,616,198);
INSERT INTO xyoff VALUES(3,4,210,159);
INSERT INTO xyoff VALUES(4,1,208,415);
INSERT INTO xyoff VALUES(4,1,326,665);
INSERT INTO xyoff VALUES(4,1,612,133);
INSERT INTO xyoff VALUES(4,1,537,513);
INSERT INTO xyoff VALUES(4,1,638,438);
INSERT INTO xyoff VALUES(4,1,808,269);
INSERT INTO xyoff VALUES(4,1,552,121);
INSERT INTO xyoff VALUES(4,1,100,189);
INSERT INTO xyoff VALUES(4,1,643,664);
INSERT INTO xyoff VALUES(4,1,726,378);
INSERT INTO xyoff VALUES(4,2,478,409);
INSERT INTO xyoff VALUES(4,2,497,507);
INSERT INTO xyoff VALUES(4,2,233,148);
INSERT INTO xyoff VALUES(4,2,587,237);
INSERT INTO xyoff VALUES(4,2,604,166);
INSERT INTO xyoff VALUES(4,2,165,455);
INSERT INTO xyoff VALUES(4,2,320,258);
INSERT INTO xyoff VALUES(4,2,353,496);
INSERT INTO xyoff VALUES(4,2,347,495);
INSERT INTO xyoff VALUES(4,2,166,622);
INSERT INTO xyoff VALUES(4,3,461,332);
INSERT INTO xyoff VALUES(4,3,685,278);
INSERT INTO xyoff VALUES(4,3,427,594);
INSERT INTO xyoff VALUES(4,3,467,346);
INSERT INTO xyoff VALUES(4,3,125,548);
INSERT INTO xyoff VALUES(4,3,597,680);
INSERT INTO xyoff VALUES(4,3,820,445);
INSERT INTO xyoff VALUES(4,3,144,330);
INSERT INTO xyoff VALUES(4,3,557,434);
INSERT INTO xyoff VALUES(4,3,254,315);
INSERT INTO xyoff VALUES(4,4,157,339);
INSERT INTO xyoff VALUES(4,4,249,220);
INSERT INTO xyoff VALUES(4,4,391,323);
INSERT INTO xyoff VALUES(4,4,589,429);
INSERT INTO xyoff VALUES(4,4,859,592);
INSERT INTO xyoff VALUES(4,4,337,680);
INSERT INTO xyoff VALUES(4,4,410,288);
INSERT INTO xyoff VALUES(4,4,636,596);
INSERT INTO xyoff VALUES(4,4,734,433);
INSERT INTO xyoff VALUES(4,4,559,549);
INSERT INTO xyoff VALUES(5,1,549,607);
INSERT INTO xyoff VALUES(5,1,584,498);
INSERT INTO xyoff VALUES(5,1,699,116);
INSERT INTO xyoff VALUES(5,1,525,524);
INSERT INTO xyoff VALUES(5,1,304,667);
INSERT INTO xyoff VALUES(5,1,302,232);
INSERT INTO xyoff VALUES(5,1,403,149);
INSERT INTO xyoff VALUES(5,1,824,403);
INSERT INTO xyoff VALUES(5,1,697,203);
INSERT INTO xyoff VALUES(5,1,293,689);
INSERT INTO xyoff VALUES(5,2,199,275);
INSERT INTO xyoff VALUES(5,2,395,393);
INSERT INTO xyoff VALUES(5,2,657,642);
INSERT INTO xyoff VALUES(5,2,200,655);
INSERT INTO xyoff VALUES(5,2,882,234);
INSERT INTO xyoff VALUES(5,2,483,565);
INSERT INTO xyoff VALUES(5,2,755,640);
INSERT INTO xyoff VALUES(5,2,810,305);
INSERT INTO xyoff VALUES(5,2,731,655);
INSERT INTO xyoff VALUES(5,2,466,690);
INSERT INTO xyoff VALUES(5,3,563,584);
INSERT INTO xyoff VALUES(5,3,491,117);
INSERT INTO xyoff VALUES(5,3,779,292);
INSERT INTO xyoff VALUES(5,3,375,637);
INSERT INTO xyoff VALUES(5,3,253,553);
INSERT INTO xyoff VALUES(5,3,797,514);
INSERT INTO xyoff VALUES(5,3,229,480);
INSERT INTO xyoff VALUES(5,3,257,194);
INSERT INTO xyoff VALUES(5,3,449,555);
INSERT INTO xyoff VALUES(5,3,849,630);
INSERT INTO xyoff VALUES(5,4,329,286);
INSERT INTO xyoff VALUES(5,4,640,197);
INSERT INTO xyoff VALUES(5,4,104,150);
INSERT INTO xyoff VALUES(5,4,438,272);
INSERT INTO xyoff VALUES(5,4,773,226);
INSERT INTO xyoff VALUES(5,4,441,650);
INSERT INTO xyoff VALUES(5,4,242,340);
INSERT INTO xyoff VALUES(5,4,301,435);
INSERT INTO xyoff VALUES(5,4,171,397);
INSERT INTO xyoff VALUES(5,4,541,619);
INSERT INTO xyoff VALUES(6,1,651,301);
INSERT INTO xyoff VALUES(6,1,637,137);
INSERT INTO xyoff VALUES(6,1,765,643);
INSERT INTO xyoff VALUES(6,1,173,296);
INSERT INTO xyoff VALUES(6,1,263,192);
INSERT INTO xyoff VALUES(6,1,791,302);
INSERT INTO xyoff VALUES(6,1,860,601);
INSERT INTO xyoff VALUES(6,1,780,445);
INSERT INTO xyoff VALUES(6,1,462,214);
INSERT INTO xyoff VALUES(6,1,802,207);
INSERT INTO xyoff VALUES(6,2,811,685);
INSERT INTO xyoff VALUES(6,2,533,531);
INSERT INTO xyoff VALUES(6,2,390,614);
INSERT INTO xyoff VALUES(6,2,260,580);
INSERT INTO xyoff VALUES(6,2,116,377);
INSERT INTO xyoff VALUES(6,2,860,458);
INSERT INTO xyoff VALUES(6,2,438,590);
INSERT INTO xyoff VALUES(6,2,604,562);
INSERT INTO xyoff VALUES(6,2,241,242);
INSERT INTO xyoff VALUES(6,2,667,298);
INSERT INTO xyoff VALUES(6,3,787,698);
INSERT INTO xyoff VALUES(6,3,868,521);
INSERT INTO xyoff VALUES(6,3,412,587);
INSERT INTO xyoff VALUES(6,3,640,131);
INSERT INTO xyoff VALUES(6,3,748,410);
INSERT INTO xyoff VALUES(6,3,257,244);
INSERT INTO xyoff VALUES(6,3,411,195);
INSERT INTO xyoff VALUES(6,3,464,356);
INSERT INTO xyoff VALUES(6,3,157,339);
INSERT INTO xyoff VALUES(6,3,434,505);
INSERT INTO xyoff VALUES(6,4,480,671);
INSERT INTO xyoff VALUES(6,4,519,228);
INSERT INTO xyoff VALUES(6,4,404,513);
INSERT INTO xyoff VALUES(6,4,120,538);
INSERT INTO xyoff VALUES(6,4,403,663);
INSERT INTO xyoff VALUES(6,4,477,677);
INSERT INTO xyoff VALUES(6,4,690,154);
INSERT INTO xyoff VALUES(6,4,606,498);
INSERT INTO xyoff VALUES(6,4,430,665);
INSERT INTO xyoff VALUES(6,4,499,273);
INSERT INTO xyoff VALUES(7,1,118,526);
INSERT INTO xyoff VALUES(7,1,817,522);
INSERT INTO xyoff VALUES(7,1,388,638);
INSERT INTO xyoff VALUES(7,1,181,265);
INSERT INTO xyoff VALUES(7,1,442,332);
INSERT INTO xyoff VALUES(7,1,475,282);
INSERT INTO xyoff VALUES(7,1,722,633);
INSERT INTO xyoff VALUES(7,1,104,394);
INSERT INTO xyoff VALUES(7,1,631,262);
INSERT INTO xyoff VALUES(7,1,372,392);
INSERT INTO xyoff VALUES(7,2,600,413);
INSERT INTO xyoff VALUES(7,2,386,223);
INSERT INTO xyoff VALUES(7,2,839,174);
INSERT INTO xyoff VALUES(7,2,293,410);
INSERT INTO xyoff VALUES(7,2,281,391);
INSERT INTO xyoff VALUES(7,2,859,387);
INSERT INTO xyoff VALUES(7,2,478,347);
INSERT INTO xyoff VALUES(7,2,646,690);
INSERT INTO xyoff VALUES(7,2,713,234);
INSERT INTO xyoff VALUES(7,2,199,588);
INSERT INTO xyoff VALUES(7,3,389,256);
INSERT INTO xyoff VALUES(7,3,349,542);
INSERT INTO xyoff VALUES(7,3,363,345);
INSERT INTO xyoff VALUES(7,3,751,302);
INSERT INTO xyoff VALUES(7,3,423,386);
INSERT INTO xyoff VALUES(7,3,267,444);
INSERT INTO xyoff VALUES(7,3,243,182);
INSERT INTO xyoff VALUES(7,3,453,658);
INSERT INTO xyoff VALUES(7,3,126,345);
INSERT INTO xyoff VALUES(7,3,120,472);
INSERT INTO xyoff VALUES(7,4,359,654);
INSERT INTO xyoff VALUES(7,4,339,516);
INSERT INTO xyoff VALUES(7,4,710,452);
INSERT INTO xyoff VALUES(7,4,810,560);
INSERT INTO xyoff VALUES(7,4,644,692);
INSERT INTO xyoff VALUES(7,4,826,327);
INSERT INTO xyoff VALUES(7,4,465,462);
INSERT INTO xyoff VALUES(7,4,310,456);
INSERT INTO xyoff VALUES(7,4,577,613);
INSERT INTO xyoff VALUES(7,4,502,555);
INSERT INTO xyoff VALUES(8,1,601,620);
INSERT INTO xyoff VALUES(8,1,372,683);
INSERT INTO xyoff VALUES(8,1,758,399);
INSERT INTO xyoff VALUES(8,1,485,552);
INSERT INTO xyoff VALUES(8,1,159,563);
INSERT INTO xyoff VALUES(8,1,536,303);
INSERT INTO xyoff VALUES(8,1,122,263);
INSERT INTO xyoff VALUES(8,1,836,435);
INSERT INTO xyoff VALUES(8,1,544,146);
INSERT INTO xyoff VALUES(8,1,270,277);
INSERT INTO xyoff VALUES(8,2,849,281);
INSERT INTO xyoff VALUES(8,2,563,242);
INSERT INTO xyoff VALUES(8,2,704,463);
INSERT INTO xyoff VALUES(8,2,102,165);
INSERT INTO xyoff VALUES(8,2,797,524);
INSERT INTO xyoff VALUES(8,2,612,426);
INSERT INTO xyoff VALUES(8,2,345,372);
INSERT INTO xyoff VALUES(8,2,820,376);
INSERT INTO xyoff VALUES(8,2,789,156);
INSERT INTO xyoff VALUES(8,2,321,466);
INSERT INTO xyoff VALUES(8,3,150,332);
INSERT INTO xyoff VALUES(8,3,136,152);
INSERT INTO xyoff VALUES(8,3,468,528);
INSERT INTO xyoff VALUES(8,3,409,192);
INSERT INTO xyoff VALUES(8,3,820,216);
INSERT INTO xyoff VALUES(8,3,847,249);
INSERT INTO xyoff VALUES(8,3,801,267);
INSERT INTO xyoff VALUES(8,3,181,670);
INSERT INTO xyoff VALUES(8,3,398,563);
INSERT INTO xyoff VALUES(8,3,439,576);
INSERT INTO xyoff VALUES(8,4,123,309);
INSERT INTO xyoff VALUES(8,4,190,496);
INSERT INTO xyoff VALUES(8,4,571,531);
INSERT INTO xyoff VALUES(8,4,290,255);
INSERT INTO xyoff VALUES(8,4,244,412);
INSERT INTO xyoff VALUES(8,4,264,596);
INSERT INTO xyoff VALUES(8,4,253,420);
INSERT INTO xyoff VALUES(8,4,847,536);
INSERT INTO xyoff VALUES(8,4,120,288);
INSERT INTO xyoff VALUES(8,4,331,639);

/* Create the geopoly object from test data above */
CREATE VIRTUAL TABLE geo1 USING geopoly(type,clr);
INSERT INTO geo1(_shape,type,clr)
  SELECT geopoly_xform(jshape,A,B,-B,A,xoff,yoff), basis.name, xform.clr
    FROM basis, xform, xyoff
   WHERE xyoff.id1=basis.rowid AND xyoff.id2=xform.rowid;


/* Query polygon */
CREATE TEMP TABLE querypoly(poly JSON, clr TEXT);
INSERT INTO querypoly(clr, poly) VALUES
  ('orange', '[[300,300],[400,350],[500,250],[480,500],[400,480],[300,550],[280,450],[320,400],[280,350],[300,300]]');

/* Generate the HTML */
.print '<html>'
.print '<h1>Everything</h1>'
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape, 
         printf('style="fill:none;stroke:%s;stroke-width:1"',clr)
       )
  FROM geo1;
SELECT geopoly_svg(poly, 
         printf('style="fill:%s;fill-opacity:0.5;"',clr)
       )
  FROM querypoly;
.print '</svg>'

.print '<h1>Overlap Query</h1>'
.print '<pre>'
.print 'SELECT *'
.print '  FROM geo1, querypoly'
.print ' WHERE geopoly_overlap(_shape, poly);'
.print 
EXPLAIN QUERY PLAN
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1, querypoly
 WHERE geopoly_overlap(_shape, poly);
.print '</pre>'
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1, querypoly
 WHERE geopoly_overlap(_shape, poly);
SELECT geopoly_svg(poly, 
         printf('style="fill:%s;fill-opacity:0.5;"',clr)
       )
  FROM querypoly;
.print '</svg>'

.print '<h1>Overlap Query And Result Bounding Box</h1>'
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1, querypoly
 WHERE geopoly_overlap(_shape, poly);
SELECT geopoly_svg(geopoly_bbox(poly),
         'style="fill:none;stroke:black;stroke-width:3"'
       )
  FROM querypoly;
SELECT geopoly_svg(poly, 
         printf('style="fill:%s;fill-opacity:0.5;"',clr)
       )
  FROM querypoly;
SELECT geopoly_svg(geopoly_group_bbox(_shape),
         'style="fill:none;stroke:red;stroke-width:3"'
       )
  FROM geo1, querypoly
 WHERE geopoly_overlap(_shape, poly);
.print '</svg>'

.print '<h1>Bounding-Box Overlap Query</h1>'
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       ),
       geopoly_svg(geopoly_bbox(_shape),
         'style="fill:none;stroke:black;stroke-width:1"'
       )
  FROM geo1, querypoly
 WHERE geopoly_overlap(geopoly_bbox(_shape), geopoly_bbox(poly));
SELECT geopoly_svg(poly, 
         printf('style="fill:%s;fill-opacity:0.5;"',clr)
       )
  FROM querypoly;
SELECT geopoly_svg(geopoly_bbox(poly),
         'style="fill:none;stroke:black;stroke-width:3"'
       )
  FROM querypoly;
.print '</svg>'

.print '<h1>Within Query</h1>'
.print '<pre>'
.print 'SELECT *'
.print '  FROM geo1, querypoly'
.print ' WHERE geopoly_within(_shape, poly);'
.print 
EXPLAIN QUERY PLAN
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1, querypoly
 WHERE geopoly_within(_shape, poly);
.print '</pre>'
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1, querypoly
 WHERE geopoly_within(_shape, poly);
SELECT geopoly_svg(poly, 
         printf('style="fill:%s;fill-opacity:0.5;"',clr)
       )
  FROM querypoly;
.print '</svg>'

.print '<h1>Bounding-Box WITHIN Query</h1>'
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       ),
       geopoly_svg(geopoly_bbox(_shape),
         'style="fill:none;stroke:black;stroke-width:1"'
       )
  FROM geo1, querypoly
 WHERE geopoly_within(geopoly_bbox(_shape), geopoly_bbox(poly));
SELECT geopoly_svg(poly, 
         printf('style="fill:%s;fill-opacity:0.5;"',clr)
       )
  FROM querypoly;
SELECT geopoly_svg(geopoly_bbox(poly),
         'style="fill:none;stroke:black;stroke-width:3"'
       )
  FROM querypoly;
.print '</svg>'

.print '<h1>Not Overlap Query</h1>'
.print '<pre>'
.print 'SELECT *'
.print '  FROM geo1, querypoly'
.print ' WHERE NOT geopoly_overlap(_shape, poly);'
.print 
EXPLAIN QUERY PLAN
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1, querypoly
 WHERE NOT geopoly_overlap(_shape, poly);
.print '</pre>'
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1, querypoly
 WHERE NOT geopoly_overlap(_shape, poly);
SELECT geopoly_svg(poly, 
         printf('style="fill:%s;fill-opacity:0.5;"',clr)
       )
  FROM querypoly;
.print '</svg>'

.print '<h1>Not Within Query</h1>'
.print '<pre>'
.print 'SELECT *'
.print '  FROM geo1, querypoly'
.print ' WHERE NOT geopoly_within(_shape, poly);'
.print 
EXPLAIN QUERY PLAN
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1, querypoly
 WHERE NOT geopoly_within(_shape, poly);
.print '</pre>'
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1, querypoly
 WHERE NOT geopoly_within(_shape, poly);
SELECT geopoly_svg(poly, 
         printf('style="fill:%s;fill-opacity:0.5;"',clr)
       )
  FROM querypoly;
.print '</svg>'

.print '<h1>Color-Change For Overlapping Elements</h1>'
BEGIN;
UPDATE geo1
   SET clr=CASE WHEN rowid IN (SELECT geo1.rowid FROM geo1, querypoly
                                WHERE geopoly_overlap(_shape,poly))
           THEN 'red' ELSE 'blue' END;
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1;
SELECT geopoly_svg(poly,'style="fill:none;stroke:black;stroke-width:2"')
  FROM querypoly;
ROLLBACK;
.print '</svg>'

.print '<h1>Color-Change And Move Overlapping Elements</h1>'
BEGIN;
UPDATE geo1
   SET clr=CASE WHEN rowid IN (SELECT geo1.rowid FROM geo1, querypoly
                                WHERE geopoly_overlap(_shape,poly))
           THEN 'red' ELSE '#76ccff' END;
UPDATE geo1
   SET _shape=geopoly_xform(_shape,1,0,0,1,300,0)
 WHERE geopoly_overlap(_shape,(SELECT poly FROM querypoly));
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1;
SELECT geopoly_svg(poly,'style="fill:none;stroke:black;stroke-width:2"')
  FROM querypoly;
--ROLLBACK;
.print '</svg>'


.print '<h1>Overlap With Translated Query Polygon</h1>'
UPDATE querypoly SET poly=geopoly_xform(poly,1,0,0,1,300,0);
.print '<svg width="1000" height="800" style="border:1px solid black">'
SELECT geopoly_svg(_shape,
         printf('style="fill:none;stroke:%s;stroke-width:1"',geo1.clr)
       )
  FROM geo1
 WHERE geopoly_overlap(_shape,(SELECT poly FROM querypoly));
SELECT geopoly_svg(poly,'style="fill:none;stroke:black;stroke-width:2"')
  FROM querypoly;
ROLLBACK;
.print '</svg>'

.print '<h1>Regular Polygons</h1>'
.print '<svg width="1000" height="200" style="border:1px solid black">'
SELECT geopoly_svg(geopoly_regular(100,100,40,3),'style="fill:none;stroke:red;stroke-width:1"');
SELECT geopoly_svg(geopoly_regular(200,100,40,4),'style="fill:none;stroke:orange;stroke-width:1"');
SELECT geopoly_svg(geopoly_regular(300,100,40,5),'style="fill:none;stroke:green;stroke-width:1"');
SELECT geopoly_svg(geopoly_regular(400,100,40,6),'style="fill:none;stroke:blue;stroke-width:1"');
SELECT geopoly_svg(geopoly_regular(500,100,40,7),'style="fill:none;stroke:purple;stroke-width:1"');
SELECT geopoly_svg(geopoly_regular(600,100,40,8),'style="fill:none;stroke:red;stroke-width:1"');
SELECT geopoly_svg(geopoly_regular(700,100,40,10),'style="fill:none;stroke:orange;stroke-width:1"');
SELECT geopoly_svg(geopoly_regular(800,100,40,20),'style="fill:none;stroke:green;stroke-width:1"');
SELECT geopoly_svg(geopoly_regular(900,100,40,30),'style="fill:none;stroke:blue;stroke-width:1"');
.print '</svg>'

.print '</html>'
