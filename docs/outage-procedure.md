# Corner Café cakes: what to do when the staff app is down

The cake order system keeps a complete copy of every order in a Google Sheet called **Corner Café Cake Orders Backup**, in the owner's Google Drive. It copies every minute, by itself. Nobody needs to export anything.

## Who can open it

- Managers only. It holds customer mobile numbers and allergies.
- Never share it with a public link, and never download copies onto shared computers.

## When the staff app is down

1. Open **Corner Café Cake Orders Backup** from Google Drive.
2. Look at the **Backup Health** tab first:
   - **Last successful copy** is the time of the last copy. Anything taken or changed after that time is not in the Sheet.
   - **Check against the order system** should say **Matches** for every tab.
3. Use the tabs:

| Tab | Use it for |
|---|---|
| Upcoming Production | Every cake still to make, by date and time, with the writing, candles, allergies, kitchen instructions and delivery details |
| All Cake Orders | Finding any order, including the ones imported from the old order sheets |
| Payments | What each order costs, the deposit, what has been paid and what is still owed |
| Change History | Every change to an order: who, when, why, and the old and new values |

4. Do not type in those four tabs. They are rewritten every minute and anything typed there is lost.

## Taking orders while it is down

- Write each new order, or each change to an existing order, on one line of the **Downtime orders** tab.
- Fill in: date and time written, your name, new order or change, the order number (for a change), customer, mobile, cake and size, collect or deliver with date and time, writing, allergies and notes, and any money taken.
- The Downtime orders tab is never overwritten.

## When the app is back

1. For each line in Downtime orders:
   - A new order: enter it in the staff app with **New order**.
   - A change: open the order and use **Change order**. Give the reason "Taken during outage".
   - Money taken: record it on the order with **Record payment**.
2. Type the order number in **Entered in the app as** on that line.
3. A manager checks that every line has an order number, then writes their name in **Checked by**.
4. Within a minute, the new orders appear in the copied tabs. Check Backup Health says Matches.

## If the backup itself stops

- Administrators are emailed when the Sheet has not copied for 30 minutes, and again when it works again.
- To fix it: open the Sheet, then the **Cake backup** menu, then **Copy now**.
- If it says the access code is wrong: an administrator copies the code from the staff app (Settings, Backup and business continuity) and uses **Cake backup**, then **Change the access code**.
- If it still fails: in the Sheet open **Extensions**, then **Apps Script**, then **Triggers**, and check that **sync** runs every minute.

## Other copies of the data

- **Supabase daily backups** of the whole database (owner's Supabase account).
- **Copies inside the database** for restoring individual records. See restore-guide.md.
- **Deleted orders** stay in the database, hidden, and an administrator can restore them from Settings.
