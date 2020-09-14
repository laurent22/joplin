# 2006 September 14
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS3 module.
#
# $Id: fts3ac.test,v 1.1 2007/08/20 17:38:42 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

# Create a table of sample email data.   The data comes from email
# archives of Enron executives that was published as part of the
# litigation against that company.
#
do_test fts3ac-1.1 {
  db eval {
    CREATE VIRTUAL TABLE email USING fts3([from],[to],subject,body);
    BEGIN TRANSACTION;
INSERT INTO email([from],[to],subject,body) VALUES('savita.puthigai@enron.com', 'traders.eol@enron.com, traders.eol@enron.com', 'EnronOnline- Change to Autohedge', 'Effective Monday, October 22, 2001 the following changes will be made to the Autohedge functionality on EnronOnline.

The volume on the hedge will now respect the minimum volume and volume increment settings on the parent product. See rules below: 

?	If the transaction volume on the child is less than half of the parent''s minimum volume no hedge will occur.
?	If the transaction volume on the child is more than half the parent''s minimum volume but less than half the volume increment on the parent, the hedge will volume will be the parent''s minimum volume.
?	For all other volumes, the same rounding rules will apply based on the volume increment on the parent product.

Please see example below:

Parent''s Settings:
Minimum: 	5000
Increment:  1000

Volume on Autohedge transaction			Volume Hedged
1      - 2499							0
2500 - 5499							5000
5500 - 6499							6000');
INSERT INTO email([from],[to],subject,body) VALUES('dana.davis@enron.com', 'laynie.east@enron.com, lisa.king@enron.com, lisa.best@enron.com,', 'Leaving Early', 'FYI:  
If it''s ok with everyone''s needs, I would like to leave @4pm. If you think 
you will need my assistance past the 4 o''clock hour just let me know;  I''ll 
be more than willing to stay.');
INSERT INTO email([from],[to],subject,body) VALUES('enron_update@concureworkplace.com', 'louise.kitchen@enron.com', '<<Concur Expense Document>> - CC02.06.02', 'The following expense report is ready for approval:

Employee Name: Christopher F. Calger
Status last changed by: Mollie E. Gustafson Ms
Expense Report Name: CC02.06.02
Report Total: $3,972.93
Amount Due Employee: $3,972.93


To approve this expense report, click on the following link for Concur Expense.
http://expensexms.enron.com');
INSERT INTO email([from],[to],subject,body) VALUES('jeff.duff@enron.com', 'julie.johnson@enron.com', 'Work request', 'Julie,

Could you print off the current work request report by 1:30 today?

Gentlemen,

I''d like to review this today at 1:30 in our office.  Also, could you provide 
me with your activity reports so I can have Julie enter this information.

JD');
INSERT INTO email([from],[to],subject,body) VALUES('v.weldon@enron.com', 'gary.l.carrier@usa.dupont.com, scott.joyce@bankofamerica.com', 'Enron News', 'This could turn into something big.... 
http://biz.yahoo.com/rf/010129/n29305829.html');
INSERT INTO email([from],[to],subject,body) VALUES('mark.haedicke@enron.com', 'paul.simons@enron.com', 'Re: First Polish Deal!', 'Congrats!  Things seem to be building rapidly now on the Continent.  Mark');
INSERT INTO email([from],[to],subject,body) VALUES('e..carter@enron.com', 't..robinson@enron.com', 'FW: Producers Newsletter 9-24-2001', '
The producer lumber pricing sheet.
 -----Original Message-----
From: 	Johnson, Jay  
Sent:	Tuesday, October 16, 2001 3:42 PM
To:	Carter, Karen E.
Subject:	FW: Producers Newsletter 9-24-2001



 -----Original Message-----
From: 	Daigre, Sergai  
Sent:	Friday, September 21, 2001 8:33 PM
Subject:	Producers Newsletter 9-24-2001

 ');
INSERT INTO email([from],[to],subject,body) VALUES('david.delainey@enron.com', 'kenneth.lay@enron.com', 'Greater Houston Partnership', 'Ken, in response to the letter from Mr Miguel San Juan, my suggestion would 
be to offer up the Falcon for their use; however, given the tight time frame 
and your recent visit with Mr. Fox that it would be difficult for either you 
or me to participate.

I spoke to Max and he agrees with this approach.

I hope this meets with your approval.

Regards
Delainey');
INSERT INTO email([from],[to],subject,body) VALUES('lachandra.fenceroy@enron.com', 'lindy.donoho@enron.com', 'FW: Bus Applications Meeting Follow Up', 'Lindy,

Here is the original memo we discussed earlier.  Please provide any information that you may have.

Your cooperation is greatly appreciated.

Thanks,

lachandra.fenceroy@enron.com
713.853.3884
877.498.3401 Pager

 -----Original Message-----
From: 	Bisbee, Joanne  
Sent:	Wednesday, September 26, 2001 7:50 AM
To:	Fenceroy, LaChandra
Subject:	FW: Bus Applications Meeting Follow Up

Lachandra, Please get with David Duff today and see what this is about.  Who are our TW accounting business users?

 -----Original Message-----
From: 	Koh, Wendy  
Sent:	Tuesday, September 25, 2001 2:41 PM
To:	Bisbee, Joanne
Subject:	Bus Applications Meeting Follow Up

Lisa brought up a TW change effective Nov 1.  It involves eliminating a turnback surcharge.  I have no other information, but you might check with the business folks for any system changes required.

Wendy');
INSERT INTO email([from],[to],subject,body) VALUES('danny.mccarty@enron.com', 'fran.fagan@enron.com', 'RE: worksheets', 'Fran,
    If Julie''s merit needs to be lump sum, just move it over to that column.  Also, send me Eric Gadd''s sheets as well.  Thanks.
Dan

 -----Original Message-----
From: 	Fagan, Fran  
Sent:	Thursday, December 20, 2001 11:10 AM
To:	McCarty, Danny
Subject:	worksheets

As discussed, attached are your sheets for bonus and merit.

Thanks,

Fran Fagan
Sr. HR Rep
713.853.5219


 << File: McCartyMerit.xls >>  << File: mccartyBonusCommercial_UnP.xls >> 

');
INSERT INTO email([from],[to],subject,body) VALUES('bert.meyers@enron.com', 'shift.dl-portland@enron.com', 'OCTOBER SCHEDULE', 'TEAM,

PLEASE SEND ME ANY REQUESTS THAT YOU HAVE FOR OCTOBER.  SO FAR I HAVE THEM FOR LEAF.  I WOULD LIKE TO HAVE IT DONE BY THE 15TH OF THE MONTH.  ANY QUESTIONS PLEASE GIVE ME A CALL.

BERT');
INSERT INTO email([from],[to],subject,body) VALUES('errol.mclaughlin@enron.com', 'john.arnold@enron.com, bilal.bajwa@enron.com, john.griffith@enron.com,', 'TRV Notification:  (NG - PROPT P/L - 09/27/2001)', 'The report named: NG - PROPT P/L <http://trv.corp.enron.com/linkFromExcel.asp?report_cd=11&report_name=NG+-+PROPT+P/L&category_cd=5&category_name=FINANCIAL&toc_hide=1&sTV1=5&TV1Exp=Y&current_efct_date=09/27/2001>, published as of 09/27/2001 is now available for viewing on the website.');
INSERT INTO email([from],[to],subject,body) VALUES('patrice.mims@enron.com', 'calvin.eakins@enron.com', 'Re: Small business supply assistance', 'Hi Calvin


I spoke with Rickey (boy, is he long-winded!!).  Gave him the name of our 
credit guy, Russell Diamond.

Thank for your help!');
INSERT INTO email([from],[to],subject,body) VALUES('legal <.hall@enron.com>', 'stephanie.panus@enron.com', 'Termination update', 'City of Vernon and Salt River Project terminated their contracts.  I will fax these notices to you.');
INSERT INTO email([from],[to],subject,body) VALUES('d..steffes@enron.com', 'richard.shapiro@enron.com', 'EES / ENA Government Affairs Staffing & Outside Services', 'Rick --

Here is the information on staffing and outside services.  Call if you need anything else.

Jim

 ');
INSERT INTO email([from],[to],subject,body) VALUES('gelliott@industrialinfo.com', 'pcopello@industrialinfo.com', 'ECAAR (Gavin), WSCC (Diablo Canyon), & NPCC (Seabrook)', 'Dear Power Outage Database Customer, 
Attached you will find an excel document. The outages contained within are forced or rescheduled outages. Your daily delivery will still contain these outages. 
In addition to the two excel documents, there is a dbf file that is formatted like your daily deliveries you receive nightly. This will enable you to load the data into your regular database. Any questions please let me know. Thanks. 
Greg Elliott 
IIR, Inc. 
713-783-5147 x 3481 
outages@industrialinfo.com 
THE INFORMATION CONTAINED IN THIS E-MAIL IS LEGALLY PRIVILEGED AND CONFIDENTIAL INFORMATION INTENDED ONLY FOR THE USE OF THE INDIVIDUAL OR ENTITY NAMED ABOVE.  YOU ARE HEREBY NOTIFIED THAT ANY DISSEMINATION, DISTRIBUTION, OR COPY OF THIS E-MAIL TO UNAUTHORIZED ENTITIES IS STRICTLY PROHIBITED. IF YOU HAVE RECEIVED THIS 
E-MAIL IN ERROR, PLEASE DELETE IT.
 - OUTAGE.dbf 
 - 111201R.xls 
 - 111201.xls ');
INSERT INTO email([from],[to],subject,body) VALUES('enron.announcements@enron.com', 'all_ena_egm_eim@enron.com', 'EWS Brown Bag', 'MARK YOUR LUNCH CALENDARS NOW !

You are invited to attend the EWS Brown Bag Lunch Series

Featuring:   RAY BOWEN, COO

Topic:  Enron Industrial Markets

Thursday, March 15, 2001
11:30 am - 12:30 pm
EB 5 C2


You bring your lunch,           Limited Seating
We provide drinks and dessert.          RSVP  x 3-9610');
INSERT INTO email([from],[to],subject,body) VALUES('chris.germany@enron.com', 'ingrid.immer@williams.com', 'Re: About St Pauls', 'Sounds good to me.  I bet this is next to the Warick?? Hotel.




"Immer, Ingrid" <Ingrid.Immer@Williams.com> on 12/21/2000 11:48:47 AM
To: "''chris.germany@enron.com''" <chris.germany@enron.com>
cc:  
Subject: About St Pauls




 <<About St Pauls.url>>  
? 
?http://www.stpaulshouston.org/about.html 

Chris, 

I like the looks of this place.? What do you think about going here Christmas 
eve?? They have an 11:00 a.m. service and a candlelight service at 5:00 p.m., 
among others.

Let me know.?? ii 

 - About St Pauls.url

');
INSERT INTO email([from],[to],subject,body) VALUES('nas@cpuc.ca.gov', 'skatz@sempratrading.com, kmccrea@sablaw.com, thompson@wrightlaw.com,', 'Reply Brief filed July 31, 2000', ' - CPUC01-#76371-v1-Revised_Reply_Brief__Due_today_7_31_.doc');
INSERT INTO email([from],[to],subject,body) VALUES('gascontrol@aglresources.com', 'dscott4@enron.com, lcampbel@enron.com', 'Alert Posted 10:00 AM November 20,2000: E-GAS Request Reminder', 'Alert Posted 10:00 AM November 20,2000: E-GAS Request Reminder
As discussed in the Winter Operations Meeting on Sept.29,2000, 
E-Gas(Emergency Gas) will not be offered this winter as a service from AGLC.  
Marketers and Poolers can receive gas via Peaking and IBSS nominations(daisy 
chain) from other marketers up to the 6 p.m. Same Day 2 nomination cycle.
');
INSERT INTO email([from],[to],subject,body) VALUES('dutch.quigley@enron.com', 'rwolkwitz@powermerchants.com', '', ' 

Here is a goody for you');
INSERT INTO email([from],[to],subject,body) VALUES('ryan.o''rourke@enron.com', 'k..allen@enron.com, randy.bhatia@enron.com, frank.ermis@enron.com,', 'TRV Notification:  (West VaR - 11/07/2001)', 'The report named: West VaR <http://trv.corp.enron.com/linkFromExcel.asp?report_cd=36&report_name=West+VaR&category_cd=2&category_name=WEST&toc_hide=1&sTV1=2&TV1Exp=Y&current_efct_date=11/07/2001>, published as of 11/07/2001 is now available for viewing on the website.');
INSERT INTO email([from],[to],subject,body) VALUES('mjones7@txu.com', 'cstone1@txu.com, ggreen2@txu.com, timpowell@txu.com,', 'Enron / HPL Actuals for July 10, 2000', 'Teco Tap       10.000 / Enron ; 110.000 / HPL IFERC

LS HPL LSK IC       30.000 / Enron
');
INSERT INTO email([from],[to],subject,body) VALUES('susan.pereira@enron.com', 'kkw816@aol.com', 'soccer practice', 'Kathy-

Is it safe to assume that practice is cancelled for tonight??

Susan Pereira');
INSERT INTO email([from],[to],subject,body) VALUES('mark.whitt@enron.com', 'barry.tycholiz@enron.com', 'Huber Internal Memo', 'Please look at this.  I didn''t know how deep to go with the desk.  Do you think this works.

 ');
INSERT INTO email([from],[to],subject,body) VALUES('m..forney@enron.com', 'george.phillips@enron.com', '', 'George,
Give me a call and we will further discuss opportunities on the 13st floor.

Thanks,
JMForney
3-7160');
INSERT INTO email([from],[to],subject,body) VALUES('brad.mckay@enron.com', 'angusmcka@aol.com', 'Re: (no subject)', 'not yet');
INSERT INTO email([from],[to],subject,body) VALUES('adam.bayer@enron.com', 'jonathan.mckay@enron.com', 'FW: Curve Fetch File', 'Here is the curve fetch file sent to me.  It has plenty of points in it.  If you give me a list of which ones you need we may be able to construct a secondary worksheet to vlookup the values.

adam
35227


 -----Original Message-----
From: 	Royed, Jeff  
Sent:	Tuesday, September 25, 2001 11:37 AM
To:	Bayer, Adam
Subject:	Curve Fetch File

Let me know if it works.   It may be required to have a certain version of Oracle for it to work properly.

 

Jeff Royed
Enron 
Energy Operations
Phone: 713-853-5295');
INSERT INTO email([from],[to],subject,body) VALUES('matt.smith@enron.com', 'yan.wang@enron.com', 'Report Formats', 'Yan,

The merged reports look great.  I believe the only orientation changes are to 
"unmerge" the following six reports:  

31 Keystone Receipts
15 Questar Pipeline
40 Rockies Production
22 West_2
23 West_3
25 CIG_WIC

The orientation of the individual reports should be correct.  Thanks.

Mat

PS.  Just a reminder to add the "*" by the title of calculated points.');
INSERT INTO email([from],[to],subject,body) VALUES('michelle.lokay@enron.com', 'jimboman@bigfoot.com', 'Egyptian Festival', '---------------------- Forwarded by Michelle Lokay/ET&S/Enron on 09/07/2000 
10:08 AM ---------------------------


"Karkour, Randa" <Randa.Karkour@COMPAQ.com> on 09/07/2000 09:01:04 AM
To: "''Agheb (E-mail)" <Agheb@aol.com>, "Leila Mankarious (E-mail)" 
<Leila_Mankarious@mhhs.org>, "''Marymankarious (E-mail)" 
<marymankarious@aol.com>, "Michelle lokay (E-mail)" <mlokay@enron.com>, "Ramy 
Mankarious (E-mail)" <Mankarious@aol.com>
cc:  

Subject: Egyptian Festival


 <<Egyptian Festival.url>>

 http://www.egyptianfestival.com/

 - Egyptian Festival.url
');
INSERT INTO email([from],[to],subject,body) VALUES('errol.mclaughlin@enron.com', 'sherry.dawson@enron.com', 'Urgent!!! --- New EAST books', 'This has to be done..................................

Thanks
---------------------- Forwarded by Errol McLaughlin/Corp/Enron on 12/20/2000 
08:39 AM ---------------------------
   
	
	
	From:  William Kelly @ ECT                           12/20/2000 08:31 AM
	

To: Kam Keiser/HOU/ECT@ECT, Darron C Giron/HOU/ECT@ECT, David 
Baumbach/HOU/ECT@ECT, Errol McLaughlin/Corp/Enron@ENRON
cc: Kimat Singla/HOU/ECT@ECT, Kulvinder Fowler/NA/Enron@ENRON, Kyle R 
Lilly/HOU/ECT@ECT, Jeff Royed/Corp/Enron@ENRON, Alejandra 
Chavez/NA/Enron@ENRON, Crystal Hyde/HOU/ECT@ECT 

Subject: New EAST books

We have new book names in TAGG for our intramonth portfolios and it is 
extremely important that any deal booked to the East is communicated quickly 
to someone on my team.  I know it will take some time for the new names to 
sink in and I do not want us to miss any positions or P&L.  

Thanks for your help on this.

New:
Scott Neal :         East Northeast
Dick Jenkins:     East Marketeast

WK 
');
INSERT INTO email([from],[to],subject,body) VALUES('david.forster@enron.com', 'eol.wide@enron.com', 'Change to Stack Manager', 'Effective immediately, there is a change to the Stack Manager which will 
affect any Inactive Child.

An inactive Child with links to Parent products will not have their 
calculated prices updated until the Child product is Activated.

When the Child Product is activated, the price will be recalculated and 
updated BEFORE it is displayed on the web.

This means that if you are inputting a basis price on a Child product, you 
will not see the final, calculated price until you Activate the product, at 
which time the customer will also see it.

If you have any questions, please contact the Help Desk on:

Americas: 713 853 4357
Europe: + 44 (0) 20 7783 7783
Asia/Australia: +61 2 9229 2300

Dave');
INSERT INTO email([from],[to],subject,body) VALUES('vince.kaminski@enron.com', 'jhh1@email.msn.com', 'Re: Light reading - see pieces beginning on page 7', 'John,

I saw it. Very interesting.

Vince





"John H Herbert" <jhh1@email.msn.com> on 07/28/2000 08:38:08 AM
To: "Vince J Kaminski" <Vince_J_Kaminski@enron.com>
cc:  
Subject: Light reading - see pieces beginning on page 7


Cheers and have a nice weekend,


JHHerbert




 - gd000728.pdf



');
INSERT INTO email([from],[to],subject,body) VALUES('matthew.lenhart@enron.com', 'mmmarcantel@equiva.com', 'RE:', 'i will try to line up a pig for you ');
INSERT INTO email([from],[to],subject,body) VALUES('jae.black@enron.com', 'claudette.harvey@enron.com, chaun.roberts@enron.com, judy.martinez@enron.com,', 'Disaster Recovery Equipment', 'As a reminder...there are several pieces of equipment that are set up on the 30th Floor, as well as on our floor, for the Disaster Recovery Team.  PLEASE DO NOT TAKE, BORROW OR USE this equipment.  Should you need to use another computer system, other than yours, or make conference calls please work with your Assistant to help find or set up equipment for you to use.

Thanks for your understanding in this matter.

T.Jae Black
East Power Trading
Assistant to Kevin Presto
off. 713-853-5800
fax 713-646-8272
cell 713-539-4760');
INSERT INTO email([from],[to],subject,body) VALUES('eric.bass@enron.com', 'dale.neuner@enron.com', '5 X 24', 'Dale,

Have you heard anything more on the 5 X 24s?  We would like to get this 
product out ASAP.


Thanks,

Eric');
INSERT INTO email([from],[to],subject,body) VALUES('messenger@smartreminders.com', 'm..tholt@enron.com', '10% Coupon - PrintPal Printer Cartridges - 100% Guaranteed', '[IMAGE]
[IMAGE][IMAGE][IMAGE] 
Dear  SmartReminders Member,
       [IMAGE]         [IMAGE]        [IMAGE]     [IMAGE]    [IMAGE]    [IMAGE]        [IMAGE]      [IMAGE]     	


  
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

We respect  your privacy and are a Certified Participant of the BBBOnLine
 Privacy Program.  To be removed from future offers,click  here. 
SmartReminders.com  is a permission based service. To unsubscribe click  here .  ');
INSERT INTO email([from],[to],subject,body) VALUES('benjamin.rogers@enron.com', 'mark.bernstein@enron.com', '', 'The guy you are talking about left CIN under a "cloud of suspicion" sort of 
speak.  He was the one who got into several bad deals and PPA''s in California 
for CIN, thus he left on a bad note.  Let me know if you need more detail 
than that, I felt this was the type of info you were looking for.  Thanks!
Ben');
INSERT INTO email([from],[to],subject,body) VALUES('enron_update@concureworkplace.com', 'michelle.cash@enron.com', 'Expense Report Receipts Not Received', 'Employee Name: Michelle Cash
Report Name:   Houston Cellular 8-11-01
Report Date:   12/13/01
Report ID:     594D37C9ED2111D5B452
Submitted On:  12/13/01

You are only allowed 2 reports with receipts outstanding.  Your expense reports will not be paid until you meet this requirement.');
INSERT INTO email([from],[to],subject,body) VALUES('susan.mara@enron.com', 'ray.alvarez@enron.com, mark.palmer@enron.com, karen.denne@enron.com,', 'CAISO Emergency Motion -- to discontinue market-based rates for', 'FYI.  the latest broadside against the generators.

Sue Mara
Enron Corp.
Tel: (415) 782-7802
Fax:(415) 782-7854
----- Forwarded by Susan J Mara/NA/Enron on 06/08/2001 12:24 PM -----


	"Milner, Marcie" <MMilner@coral-energy.com> 06/08/2001 11:13 AM 	   To: "''smara@enron.com''" <smara@enron.com>  cc:   Subject: CAISO Emergency Motion	


Sue, did you see this emergency motion the CAISO filed today?  Apparently
they are requesting that FERC discontinue market-based rates immediately and
grant refunds plus interest on the difference between cost-based rates and
market revenues received back to May 2000.  They are requesting the
commission act within 14 days.  Have you heard anything about what they are
doing?

Marcie

http://www.caiso.com/docs/2001/06/08/200106081005526469.pdf 
');
INSERT INTO email([from],[to],subject,body) VALUES('fletcher.sturm@enron.com', 'eloy.escobar@enron.com', 'Re: General Brinks Position Meeting', 'Eloy,

Who is General Brinks?

Fletch');
INSERT INTO email([from],[to],subject,body) VALUES('nailia.dindarova@enron.com', 'richard.shapiro@enron.com', 'Documents for Mark Frevert (on EU developments and lessons from', 'Rick,

Here are the documents that Peter has prepared for Mark Frevert. 

Nailia
---------------------- Forwarded by Nailia Dindarova/LON/ECT on 25/06/2001 
16:36 ---------------------------


Nailia Dindarova
25/06/2001 15:36
To: Michael Brown/Enron@EUEnronXGate
cc: Ross Sankey/Enron@EUEnronXGate, Eric Shaw/ENRON@EUEnronXGate, Peter 
Styles/LON/ECT@ECT 

Subject: Documents for Mark Frevert (on EU developments and lessons from 
California)

Michael,


These are the documents that Peter promised to give to you for Mark Frevert. 
He has now handed them to him in person but asked me to transmit them 
electronically to you, as well as Eric and Ross.

Nailia





');
INSERT INTO email([from],[to],subject,body) VALUES('peggy.a.kostial@accenture.com', 'dave.samuels@enron.com', 'EOL-Accenture Deal Sheet', 'Dave -

Attached are our comments and suggested changes. Please call to review.

On the time line for completion, we have four critical steps to complete:
     Finalize market analysis to refine business case, specifically
     projected revenue stream
     Complete counterparty surveying, including targeting 3 CPs for letters
     of intent
     Review Enron asset base for potential reuse/ licensing
     Contract negotiations

Joe will come back to us with an updated time line, but it is my
expectation that we are still on the same schedule (we just begun week
three) with possibly a week or so slippage.....contract negotiations will
probably be the critical path.

We will send our cut at the actual time line here shortly. Thanks,

Peggy

(See attached file: accenture-dealpoints v2.doc)
 - accenture-dealpoints v2.doc ');
INSERT INTO email([from],[to],subject,body) VALUES('thomas.martin@enron.com', 'thomas.martin@enron.com', 'Re: Guadalupe Power Partners LP', '---------------------- Forwarded by Thomas A Martin/HOU/ECT on 03/20/2001 
03:49 PM ---------------------------


Thomas A Martin
10/11/2000 03:55 PM
To: Patrick Wade/HOU/ECT@ECT
cc:  
Subject: Re: Guadalupe Power Partners LP  

The deal is physically served at Oasis Waha or Oasis Katy and is priced at 
either HSC, Waha or Katytailgate GD at buyers option three days prior to 
NYMEX  close.

');
INSERT INTO email([from],[to],subject,body) VALUES('judy.townsend@enron.com', 'dan.junek@enron.com, chris.germany@enron.com', 'Columbia Distribution''s Capacity Available for Release - Sum', '---------------------- Forwarded by Judy Townsend/HOU/ECT on 03/09/2001 11:04 
AM ---------------------------


agoddard@nisource.com on 03/08/2001 09:16:57 AM
To: "        -         *Koch, Kent" <kkoch@nisource.com>, "        -         
*Millar, Debra" <dmillar@nisource.com>, "        -         *Burke, Lynn" 
<lburke@nisource.com>
cc: "        -         *Heckathorn, Tom" <theckathorn@nisource.com> 
Subject: Columbia Distribution''s Capacity Available for Release - Sum


Attached is Columbia Distribution''s notice of capacity available for release
for
the summer of 2001 (Apr. 2001 through Oct. 2001).

Please note that the deadline for bids is 3:00pm EST on March 20, 2001.

If you have any questions, feel free to contact any of the representatives
listed
at the bottom of the attachment.

Aaron Goddard




 - 2001Summer.doc
');
INSERT INTO email([from],[to],subject,body) VALUES('rhonda.denton@enron.com', 'tim.belden@enron.com, dana.davis@enron.com, genia.fitzgerald@enron.com,', 'Split Rock Energy LLC', 'We have received the executed EEI contract from this CP dated 12/12/2000.  
Copies will be distributed to Legal and Credit.');
INSERT INTO email([from],[to],subject,body) VALUES('kerrymcelroy@dwt.com', 'jack.speer@alcoa.com, crow@millernash.com, michaelearly@earthlink.net,', 'Oral Argument Request', ' - Oral Argument Request.doc');
INSERT INTO email([from],[to],subject,body) VALUES('mike.carson@enron.com', 'rlmichaelis@hormel.com', '', 'Did you come in town this wk end..... My new number at our house is : 
713-668-3712...... my cell # is 281-381-7332

the kid');
INSERT INTO email([from],[to],subject,body) VALUES('cooper.richey@enron.com', 'trycooper@hotmail.com', 'FW: Contact Info', '

-----Original Message-----
From: Punja, Karim 
Sent: Thursday, December 13, 2001 2:35 PM
To: Richey, Cooper
Subject: Contact Info


Cooper,

Its been a real pleasure working with you (even though it was for only a small amount of time)
I hope we can stay in touch.

Home# 234-0249
email: kpunja@hotmail.com

Take Care, 

Karim.
  ');
INSERT INTO email([from],[to],subject,body) VALUES('bjm30@earthlink.net', 'mcguinn.k@enron.com, mcguinn.ian@enron.com, mcguinn.stephen@enron.com,', 'email address change', 'Hello all.

I haven''t talked to many of you via email recently but I do want to give you
my new address for your email file:

    bjm30@earthlink.net

I hope all is well.

Brian McGuinn');
INSERT INTO email([from],[to],subject,body) VALUES('shelley.corman@enron.com', 'steve.hotte@enron.com', 'Flat Panels', 'Can you please advise what is going on with the flat panels that we had planned to distribute to our gas logistics team.  It was in the budget and we had the okay, but now I''m hearing there is some hold-up & the units are stored on 44.

Shelley');
INSERT INTO email([from],[to],subject,body) VALUES('sara.davidson@enron.com', 'john.schwartzenburg@enron.com, scott.dieball@enron.com, recipients@enron.com,', '2001 Enron Law Conference (Distribution List 2)', '    Enron Law Conference

San Antonio, Texas    May 2-4, 2001    Westin Riverwalk

                   See attached memo for more details!!


? Registration for the law conference this year will be handled through an 
Online RSVP Form on the Enron Law Conference Website at 
http://lawconference.corp.enron.com.  The website is still under construction 
and will not be available until Thursday, March 15, 2001.  

? We will send you another e-mail to confirm when the Law Conference Website 
is operational. 

? Please complete the Online RSVP Form as soon as it is available  and submit 
it no later than Friday, March 30th.  




');
INSERT INTO email([from],[to],subject,body) VALUES('tori.kuykendall@enron.com', 'heath.b.taylor@accenture.com', 'Re:', 'hey - thats funny about john - he definitely remembers him - i''ll call pat 
and let him know - we are coming on saturday - i just havent had a chance to 
call you guys back --  looking forward to it -- i probably need the 
directions again though');
INSERT INTO email([from],[to],subject,body) VALUES('darron.giron@enron.com', 'bryce.baxter@enron.com', 'Re: Feedback for Audrey Cook', 'Bryce,

I''ll get it done today.  

DG    3-9573


   
	
	
	From:  Bryce Baxter                           06/12/2000 07:15 PM
	

To: Darron C Giron/HOU/ECT@ECT
cc:  
Subject: Feedback for Audrey Cook

You were identified as a reviewer for Audrey Cook.  If possible, could you 
complete her feedback by end of business Wednesday?  It will really help me 
in the PRC process to have your input.  Thanks.

');
INSERT INTO email([from],[to],subject,body) VALUES('casey.evans@enron.com', 'stephanie.sever@enron.com', 'Gas EOL ID', 'Stephanie,

In conjunction with the recent movement of several power traders, they are changing the names of their gas books as well.  The names of the new gas books and traders are as follows:

PWR-NG-LT-SPP:  Mike Carson
PWR-NG-LT-SERC:  Jeff King

If you need to know their power desk to map their ID to their gas books, those desks are as follows:

EPMI-LT-SPP:  Mike Carson
EPMI-LT-SERC:  Jeff King

I will be in training this afternoon, but will be back when class is over.  Let me know if you have any questions.

Thanks for your help!
Casey');
INSERT INTO email([from],[to],subject,body) VALUES('darrell.schoolcraft@enron.com', 'david.roensch@enron.com, kimberly.watson@enron.com, michelle.lokay@enron.com,', 'Postings', 'Please see the attached.


ds


  

 ');
INSERT INTO email([from],[to],subject,body) VALUES('mcominsky@aol.com', 'cpatman@bracepatt.com, james_derrick@enron.com', 'Jurisprudence Luncheon', 'Carrin & Jim --

It was an honor and a pleasure to meet both of you yesterday.  I know we will
have fun working together on this very special event.

Jeff left the jurisprudence luncheon lists for me before he left on vacation.
 I wasn''t sure whether he transmitted them to you as well.  Would you please
advise me if you would like them sent to you?  I can email the MS Excel files
or I can fax the hard copies to you.   Please advise what is most convenient.

I plan to be in town through the holidays and can be reached by phone, email,
or cell phone at any time.  My cell phone number is 713/705-4829.

Thanks again for your interest in the ADL''s work.  Martin.

Martin B. Cominsky
Director, Southwest Region
Anti-Defamation League
713/627-3490, ext. 122
713/627-2011 (fax)
MCominsky@aol.com');
INSERT INTO email([from],[to],subject,body) VALUES('phillip.love@enron.com', 'todagost@utmb.edu, gbsonnta@utmb.edu', 'New President', 'I had a little bird put a word in my ear.  Is there any possibility for Ben 
Raimer to be Bush''s secretary of HHS?  Just curious about that infamous UTMB 
rumor mill.  Hope things are well, happy holidays.
PL');
INSERT INTO email([from],[to],subject,body) VALUES('marie.heard@enron.com', 'ehamilton@fna.com', 'ISDA Master Agreement', 'Erin:

Pursuant to your request, attached are the Schedule to the ISDA Master Agreement, together with Paragraph 13 to the ISDA Credit Support Annex.  Please let me know if you need anything else.  We look forward to hearing your comments.

Marie

Marie Heard
Senior Legal Specialist
Enron North America Corp.
Phone:  (713) 853-3907
Fax:  (713) 646-3490
marie.heard@enron.com

				 ');
INSERT INTO email([from],[to],subject,body) VALUES('andrea.ring@enron.com', 'beverly.beaty@enron.com', 'Re: Tennessee Buy - Louis Dreyfus', 'Beverly -  once again thanks so much for your help on this.

           

                                                                     ');
INSERT INTO email([from],[to],subject,body) VALUES('karolyn.criado@enron.com', 'j..bonin@enron.com, felicia.case@enron.com, b..clapp@enron.com,', 'Price List week of Oct. 8-9, 2001', '
Please contact me if you have any questions regarding last weeks prices.

Thank you,
Karolyn Criado
3-9441


 

');
INSERT INTO email([from],[to],subject,body) VALUES('kevin.presto@enron.com', 'edward.baughman@enron.com, billy.braddock@enron.com', 'Associated', 'Please begin working on filling our Associated short position in 02.   I would like to take this risk off the books.

In addition, please find out what a buy-out of VEPCO would cost us.   With Rogers transitioning to run our retail risk management, I would like to clean up our customer positions.

We also need to continue to explore a JEA buy-out.

Thanks.');
INSERT INTO email([from],[to],subject,body) VALUES('stacy.dickson@enron.com', 'gregg.penman@enron.com', 'RE: Constellation TC 5-7-01', 'Gregg, 

I am at home with a sick baby.  (Lots of fun!)  I will call you about this 
tomorrow.

Stacy');
INSERT INTO email([from],[to],subject,body) VALUES('joe.quenet@enron.com', 'dfincher@utilicorp.com', '', 'hey big guy.....check this out.....

 w ww.gorelieberman-2000.com/');
INSERT INTO email([from],[to],subject,body) VALUES('k..allen@enron.com', 'jacqestc@aol.com', '', 'Jacques,

I sent you a fax of Kevin Kolb''s comments on the release.  The payoff on the note would be $36,248 ($36090(principal) + $158 (accrued interest)).
This is assuming we wrap this up on Tuesday.  

Please email to confirm that their changes are ok so I can set up a meeting on Tuesday to reach closure.

Phillip');
INSERT INTO email([from],[to],subject,body) VALUES('kourtney.nelson@enron.com', 'mike.swerzbin@enron.com', 'Adjusted L/R Balance', 'Mike,

I placed the adjusted L/R Balance on the Enronwest site.  It is under the "Staff/Kourtney Nelson".  There are two links:  

1)  "Adj L_R" is the same data/format from the weekly strategy meeting. 
2)  "New Gen 2001_2002" link has all of the supply side info that is used to calculate the L/R balance
	-Please note the Data Flag column, a value of "3" indicates the project was cancelled, on hold, etc and is not included in the calc.  

Both of these sheets are interactive Excel spreadsheets and thus you can play around with the data as you please.  Also, James Bruce is working to get his gen report on the web.  That will help with your access to information on new gen.

Please let me know if you have any questions or feedback,

Kourtney



Kourtney Nelson
Fundamental Analysis 
Enron North America
(503) 464-8280
kourtney.nelson@enron.com');
INSERT INTO email([from],[to],subject,body) VALUES('d..thomas@enron.com', 'naveed.ahmed@enron.com', 'FW: Current Enron TCC Portfolio', '

-----Original Message-----
From: Grace, Rebecca M. 
Sent: Monday, December 17, 2001 9:44 AM
To: Thomas, Paul D.
Cc: Cashion, Jim; Allen, Thresa A.; May, Tom
Subject: RE: Current Enron TCC Portfolio


Paul,

I reviewed NY''s list.  I agree with all of their contracts numbers and mw amounts.

Call if you have any more questions.

Rebecca



 -----Original Message-----
From: 	Thomas, Paul D.  
Sent:	Monday, December 17, 2001 9:08 AM
To:	Grace, Rebecca M.
Subject:	FW: Current Enron TCC Portfolio

 << File: enrontccs.xls >> 
Rebecca,
Let me know if you see any differences.

Paul
X 3-0403
-----Original Message-----
From: Thomas, Paul D. 
Sent: Monday, December 17, 2001 9:04 AM
To: Ahmed, Naveed
Subject: FW: Current Enron TCC Portfolio




-----Original Message-----
From: Thomas, Paul D. 
Sent: Thursday, December 13, 2001 10:01 AM
To: Baughman, Edward D.
Subject: Current Enron TCC Portfolio


');
INSERT INTO email([from],[to],subject,body) VALUES('stephanie.panus@enron.com', 'william.bradford@enron.com, debbie.brackett@enron.com,', 'Coastal Merchant Energy/El Paso Merchant Energy', 'Coastal Merchant Energy, L.P. merged with and into El Paso Merchant Energy, 
L.P., effective February 1, 2001, with the surviving entity being El Paso 
Merchant Energy, L.P.  We currently have ISDA Master Agreements with both 
counterparties.  Please see the attached memo regarding the existing Masters 
and let us know which agreement should be terminated.

Thanks,
Stephanie
');
INSERT INTO email([from],[to],subject,body) VALUES('kam.keiser@enron.com', 'c..kenne@enron.com', 'RE: What about this too???', ' 

 -----Original Message-----
From: 	Kenne, Dawn C.  
Sent:	Wednesday, February 06, 2002 11:50 AM
To:	Keiser, Kam
Subject:	What about this too???


 << File: Netco Trader Matrix.xls >> 
 ');
INSERT INTO email([from],[to],subject,body) VALUES('chris.meyer@enron.com', 'joe.parks@enron.com', 'Centana', 'Talked to Chip.  We do need Cash Committe approval given the netting feature of your deal, which means Batch Funding Request.  Please update per my previous e-mail and forward.

Thanks

chris
x31666');
INSERT INTO email([from],[to],subject,body) VALUES('debra.perlingiere@enron.com', 'jworman@academyofhealth.com', '', 'Have a great weekend!   Happy Fathers Day!


Debra Perlingiere
Enron North America Corp.
1400 Smith Street, EB 3885
Houston, Texas 77002
dperlin@enron.com
Phone 713-853-7658
Fax  713-646-3490');
INSERT INTO email([from],[to],subject,body) VALUES('outlook.team@enron.com', '', 'Demo by Martha Janousek of Dashboard & Pipeline Profile / Julia  &', 'CALENDAR ENTRY:	APPOINTMENT

Description:
	Demo by Martha Janousek of Dashboard & Pipeline Profile / Julia  & Dir Rpts. - 4102

Date:		1/5/2001
Time:		9:00 AM - 10:00 AM (Central Standard Time)

Chairperson:	Outlook Migration Team

Detailed Description:');
INSERT INTO email([from],[to],subject,body) VALUES('diana.seifert@enron.com', 'mark.taylor@enron.com', 'Guest access Chile', 'Hello Mark,

Justin Boyd told me that your can help me with questions regarding Chile.
We got a request for guest access through MG.
The company is called Escondida and is a subsidiary of BHP Australia.

Please advise if I can set up a guest account or not.
F.Y.I.: MG is planning to put a "in w/h Chile" contract for Copper on-line as 
soon as Enron has done the due diligence for this country.
Thanks !


Best regards

Diana Seifert
EOL PCG');
INSERT INTO email([from],[to],subject,body) VALUES('enron_update@concureworkplace.com', 'mark.whitt@enron.com', '<<Concur Expense Document>> - 121001', 'The Approval status has changed on the following report:

Status last changed by: Barry L. Tycholiz
Expense Report Name: 121001
Report Total: $198.98
Amount Due Employee: $198.98
Amount Approved: $198.98
Amount Paid: $0.00
Approval Status: Approved
Payment Status: Pending


To review this expense report, click on the following link for Concur Expense.
http://expensexms.enron.com');
INSERT INTO email([from],[to],subject,body) VALUES('kevin.hyatt@enron.com', '', 'Technical Support', 'Outside the U.S., please refer to the list below:

Australia:
1800 678-515
support@palm-au.com

Canada:
1905 305-6530
support@palm.com

New Zealand:
0800 446-398
support@palm-nz.com

U.K.:
0171 867 0108
eurosupport@palm.3com.com

Please refer to the Worldwide Customer Support card for a complete technical support contact list.');
INSERT INTO email([from],[to],subject,body) VALUES('geoff.storey@enron.com', 'dutch.quigley@enron.com', 'RE:', 'duke contact?

 -----Original Message-----
From: 	Quigley, Dutch  
Sent:	Wednesday, October 31, 2001 10:14 AM
To:	Storey, Geoff
Subject:	RE: 

bp corp	Albert LaMore	281-366-4962

running the reports now


 -----Original Message-----
From: 	Storey, Geoff  
Sent:	Wednesday, October 31, 2001 10:10 AM
To:	Quigley, Dutch
Subject:	RE: 

give me a contact over there too
BP


 -----Original Message-----
From: 	Quigley, Dutch  
Sent:	Wednesday, October 31, 2001 9:42 AM
To:	Storey, Geoff
Subject:	

Coral	Jeff Whitnah	713-767-5374
Relaint	Steve McGinn	713-207-4000');
INSERT INTO email([from],[to],subject,body) VALUES('pete.davis@enron.com', 'pete.davis@enron.com', 'Start Date: 4/22/01; HourAhead hour: 3;  <CODESITE>', 'Start Date: 4/22/01; HourAhead hour: 3;  No ancillary schedules awarded.  
Variances detected.
Variances detected in Load schedule.

    LOG MESSAGES:

PARSING FILE -->> O:\Portland\WestDesk\California Scheduling\ISO Final 
Schedules\2001042203.txt

---- Load Schedule ----
$$$ Variance found in table tblLoads.
     Details: (Hour: 3 / Preferred:   1.92 / Final:   1.89)
  TRANS_TYPE: FINAL
  LOAD_ID: PGE4
  MKT_TYPE: 2
  TRANS_DATE: 4/22/01
  SC_ID: EPMI

');
INSERT INTO email([from],[to],subject,body) VALUES('john.postlethwaite@enron.com', 'john.zufferli@enron.com', 'Reference', 'John, hope things are going well up there for you. The big day is almost here for you and Jessica. I was wondering if I could use your name as a job reference if need be. I am just trying to get everything in order just in case something happens. 

John');
INSERT INTO email([from],[to],subject,body) VALUES('jeffrey.shankman@enron.com', 'lschiffm@jonesday.com', 'Re:', 'I saw you called on the cell this a.m.  Sorry I missed you.  (I was in the 
shower).  I have had a shitty week--I suspect my silence (not only to you, 
but others) after our phone call is a result of the week.  I''m seeing Glen at 
11:15....talk to you');
INSERT INTO email([from],[to],subject,body) VALUES('litebytz@enron.com', '', 'Lite Bytz RSVP', '
This week''s Lite Bytz presentation will feature the following TOOLZ speaker:

Richard McDougall
Solaris 8
Thursday, June 7, 2001

If you have not already signed up, please RSVP via email to litebytz@enron.com by the end of the day Tuesday, June 5, 2001.

*Remember: this is now a Brown Bag Event--so bring your lunch and we will provide cookies and drinks.

Click below for more details.

http://home.enron.com:84/messaging/litebytztoolzprint.jpg');
    COMMIT;
  }
} {}

###############################################################################
# Everything above just builds an interesting test database.  The actual
# tests come after this comment.
###############################################################################

do_test fts3ac-1.2 {
  execsql {
    SELECT rowid FROM email WHERE email MATCH 'mark'
  }
} {6 17 25 38 40 42 73 74}
do_test fts3ac-1.3 {
  execsql {
    SELECT rowid FROM email WHERE email MATCH 'susan'
  }
} {24 40}
do_test fts3ac-1.4 {
  execsql {
    SELECT rowid FROM email WHERE email MATCH 'mark susan'
  }
} {40}
do_test fts3ac-1.5 {
  execsql {
    SELECT rowid FROM email WHERE email MATCH 'susan mark'
  }
} {40}
do_test fts3ac-1.6 {
  execsql {
    SELECT rowid FROM email WHERE email MATCH '"mark susan"'
  }
} {}
do_test fts3ac-1.7 {
  execsql {
    SELECT rowid FROM email WHERE email MATCH 'mark -susan'
  }
} {6 17 25 38 42 73 74}
do_test fts3ac-1.8 {
  execsql {
    SELECT rowid FROM email WHERE email MATCH '-mark susan'
  }
} {24}
do_test fts3ac-1.9 {
  execsql {
    SELECT rowid FROM email WHERE email MATCH 'mark OR susan'
  }
} {6 17 24 25 38 40 42 73 74}

# Some simple tests of the automatic "offsets(email)" column.  In the sample
# data set above, only one message, number 20, contains the words
# "gas" and "reminder" in both body and subject.
#
do_test fts3ac-2.1 {
  execsql {
    SELECT rowid, offsets(email) FROM email
     WHERE email MATCH 'gas reminder'
  }
} {20 {2 0 42 3 2 1 54 8 3 0 42 3 3 1 54 8 3 0 129 3 3 0 143 3 3 0 240 3}}
do_test fts3ac-2.2 {
  execsql {
    SELECT rowid, offsets(email) FROM email
     WHERE email MATCH 'subject:gas reminder'
  }
} {20 {2 0 42 3 2 1 54 8 3 1 54 8}}
do_test fts3ac-2.3 {
  execsql {
    SELECT rowid, offsets(email) FROM email
     WHERE email MATCH 'body:gas reminder'
  }
} {20 {2 1 54 8 3 0 42 3 3 1 54 8 3 0 129 3 3 0 143 3 3 0 240 3}}
do_test fts3ac-2.4 {
  execsql {
    SELECT rowid, offsets(email) FROM email
     WHERE subject MATCH 'gas reminder'
  }
} {20 {2 0 42 3 2 1 54 8}}
do_test fts3ac-2.5 {
  execsql {
    SELECT rowid, offsets(email) FROM email
     WHERE body MATCH 'gas reminder'
  }
} {20 {3 0 42 3 3 1 54 8 3 0 129 3 3 0 143 3 3 0 240 3}}

# Document 32 contains 5 instances of the world "child".  But only
# 3 of them are paired with "product".  Make sure only those instances
# that match the phrase appear in the offsets(email) list.
#
do_test fts3ac-3.1 {
  execsql {
    SELECT rowid, offsets(email) FROM email
     WHERE body MATCH 'child product' AND +rowid=32
  }
} {32 {3 0 94 5 3 0 114 5 3 0 207 5 3 1 213 7 3 0 245 5 3 1 251 7 3 0 409 5 3 1 415 7 3 1 493 7}}
do_test fts3ac-3.2 {
  execsql {
    SELECT rowid, offsets(email) FROM email
     WHERE body MATCH '"child product"'
  }
} {32 {3 0 207 5 3 1 213 7 3 0 245 5 3 1 251 7 3 0 409 5 3 1 415 7}}

# Snippet generator tests
#
do_test fts3ac-4.1 {
  execsql {
    SELECT snippet(email) FROM email
     WHERE email MATCH 'subject:gas reminder'
  }
} {{Alert Posted 10:00 AM November 20,2000: E-<b>GAS</b> Request <b>Reminder</b>}}
do_test fts3ac-4.2 {
  execsql {
    SELECT snippet(email) FROM email
     WHERE email MATCH 'christmas candlelight'
  }
} {{<b>...</b>here <b>Christmas</b> 
eve?? They have an 11:00 a.m. service and a <b>candlelight</b> service<b>...</b>}}

do_test fts3ac-4.3 {
  execsql {
    SELECT snippet(email) FROM email
     WHERE email MATCH 'deal sheet potential reuse'
  }
} {{EOL-Accenture <b>Deal</b> <b>Sheet</b><b>...</b>asset base for <b>potential</b> <b>reuse</b>/ licensing
     Contract negotiations<b>...</b>}}
do_test fts3ac-4.4 {
  execsql {
    SELECT snippet(email,'<<<','>>>',' ') FROM email
     WHERE email MATCH 'deal sheet potential reuse'
  }
} {{EOL-Accenture <<<Deal>>> <<<Sheet>>> asset base for <<<potential>>> <<<reuse>>>/ licensing
     Contract negotiations }}
do_test fts3ac-4.5 {
  execsql {
    SELECT snippet(email,'<<<','>>>',' ') FROM email
     WHERE email MATCH 'first things'
  }
} {{Re: <<<First>>> Polish Deal! Congrats!  <<<Things>>> seem to be building rapidly now }}
do_test fts3ac-4.6 {
  execsql {
    SELECT snippet(email) FROM email
     WHERE email MATCH 'chris is here'
  }
} {{<b>...</b><b>chris</b>.germany@enron.com'" <<b>chris</b><b>...</b>bet this <b>is</b> next to<b>...</b>about going <b>here</b> Christmas 
eve<b>...</b>}}
do_test fts3ac-4.7 {
  execsql {
    SELECT snippet(email) FROM email
     WHERE email MATCH '"pursuant to"'
  }
} {{Erin:

<b>Pursuant</b> <b>to</b> your request, attached are the Schedule to the ISDA Master Agreement, together<b>...</b>}}
do_test fts3ac-4.8 {
  execsql {
    SELECT snippet(email) FROM email
     WHERE email MATCH 'ancillary load davis'
  }
} {{pete.<b>davis</b>@enron.com<b>...</b>3;  No <b>ancillary</b> schedules awarded<b>...</b>detected in <b>Load</b> schedule.

    LOG<b>...</b>}}

# Combinations of AND and OR operators:
#
do_test fts3ac-5.1 {
  execsql {
    SELECT snippet(email) FROM email
     WHERE email MATCH 'questar enron OR com'
  }
} {{matt.smith@<b>enron</b>.<b>com</b><b>...</b>31 Keystone Receipts
15 <b>Questar</b> Pipeline
40 Rockies<b>...</b>}}

do_test fts3ac-5.2 {
  execsql {
    SELECT snippet(email) FROM email
     WHERE email MATCH 'enron OR com questar'
  }
} {{matt.smith@<b>enron</b>.<b>com</b><b>...</b>31 Keystone Receipts
15 <b>Questar</b> Pipeline
40 Rockies<b>...</b>}}

#-------------------------------------------------------------------------
# Test a problem reported on the mailing list.
#
do_test fts3ac-6.1 {
  execsql {
    CREATE VIRTUAL TABLE ft USING fts3(one, two);
    INSERT INTO ft VALUES('', 'foo');
    INSERT INTO ft VALUES('foo', 'foo');
    SELECT offsets(ft) FROM ft WHERE ft MATCH 'foo';
  }
} {{1 0 0 3} {0 0 0 3 1 0 0 3}}
do_test fts3ac-6.2 {
  execsql {
    DELETE FROM ft WHERE one = 'foo';
    SELECT offsets(ft) FROM ft WHERE ft MATCH 'foo';
  }
} {{1 0 0 3}}

finish_test
