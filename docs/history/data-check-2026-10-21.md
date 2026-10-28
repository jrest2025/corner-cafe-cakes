# Phase one data check (20–21 October 2026)

Roneel, 11:38 PM: "lets keep this as phase one . lets make the data we have is not tainted .. tighten up the things in
this before we introduce any more models". The check only read the live database. Roneel then chose what to change.

## Already sound

- The old sheet history is kept separate from app orders.
- Deleted and test orders are left out of the figures.
- Dates and "today" use Fiji time; no database function uses the server's date.
- The backup sheet copies every minute.
- No customer list has been exported.

## Found

1. **Orders with impossible dates.** 15 orders typed in from paper (CC-1076 to CC-1090, counter login) have pickup dates
   in year 1 or 2.
   - 9 of them were typed after the 9:59 AM date-typing fix. Either the counter tablet was still on the old version, or
     the fix does not work with the iPad keyboard.
   - Their $863 counts as collected on 20 October, and their sales fall outside every period.
   - CC-1086 (Naz, 12" chocolate, "Ibrahim", $108) is the same cake as CC-1071 (collected 18 October).
   - CC-1089 and CC-1090 (Poonam, same message, $38 lemon custom and $54 cheesecake) may be one order entered twice.
2. **Test orders counted as real.** CC-1091 ("Roneel Singh Test"), CC-1092 (website test) and CC-1026 (cancelled
   "test", $190 bank transfer kept).
3. **Staff or test people in the customer list.** C-414, C-417, C-430, C-443, C-446 and C-475 hold 17 of the 67 current
   "yes to marketing" records.
4. **Smaller items.**
   - CC-1045 and CC-1068 are past pickup and still open.
   - 45 old sheet records have been waiting for a manager's review since 12 October (left out of the charts until then).
5. **Known limits of the old sheets** (no action): 96 custom cakes were never priced, and 148 walk-in "yes" answers need
   reconfirming.

Of the $1,927 shown as collected since launch, $874 came from normal orders.

## Changed (Roneel chose "Mark the 3 test orders")

- 21 October, 6:33 AM: CC-1091, CC-1092 and CC-1026 marked as test orders.
  - They are kept (not deleted), and each has a "marked_test" line in its history.
  - They are now left out of Analytics, the staff lists, the kitchen boards and the backup sheet.
  - The register updates the next time Analytics is opened.
- Effect on Analytics: "Collected" falls by $190, "Still owed" by $121, and orders and cakes by 2.
- Undo: set `is_test` back to false on those three orders and add an "unmarked_test" history line.

## Backdated orders: 12 pickup dates fixed (21 October, about 7:20 AM)

Roneel: "we entering backdated data at the moment. orers from previous months..".
- A run of the old app showed that typing a date loses the month as well as the year: it saves "January, year 2"
  whatever month was typed, and only the day number survives. So the 15 orders are not January orders.
- An earlier message here suggested January 2026. That was wrong, and nothing was changed on that basis.
- Most of the orders also carry a "Date of the birthday" that staff entered separately. It saved correctly, in October
  2026 on the same day number.

Roneel approved: "Yes, fix the 12".
- CC-1078, 1079, 1080, 1081, 1082, 1084, 1085, 1086, 1088, 1089, 1090 and 1093 now have their pickup date set to the
  birthday date on the order (4 to 20 October 2026).
  - Only orders whose day number matched were changed.
  - Each order's version went up by 1, and each has a `date_corrected` history line giving the old and new date.
  - No emails were sent and no kitchen slips changed.
- Still impossible, waiting for the paper slips: CC-1076, CC-1077, CC-1083 and CC-1087.
- Still to be decided by staff:
  - Naz: CC-1086 (11 October) and CC-1071 (18 October) are the same cake.
  - Poonam: CC-1089 and CC-1090 may be one order entered twice.
- CC-1093 (Alvin) arrived at 6:24 AM on 21 October with no "taken by" name, so the counter tablet was still running a
  version from before 20 October. It needs a refresh.
- Undo: set `required_date` back to the `from` value in each `date_corrected` history line.

## Not changed (not chosen)

- The 15 dates.
- The 6 customer profiles.
- The 45 sheet records awaiting review.
- The locks: refusing impossible dates, tablets updating themselves, duplicate and test guards, and dating payments for
  orders entered later.
  - Since covered by the old orders release (21 October, 11:08 AM, `docs/history/old-orders-2026-10-21.md`): impossible years
    are refused, every order is checked for one already in the system, and old orders are saved with the payment on the
    day it was paid. Still open: tablets updating themselves, and a test-order guard.
