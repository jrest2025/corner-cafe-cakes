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

## Not changed (not chosen)

- The 15 dates.
- The 6 customer profiles.
- The 45 sheet records awaiting review.
- The locks: refusing impossible dates, tablets updating themselves, duplicate and test guards, and dating payments for
  orders entered later.
