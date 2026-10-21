# The Service Hub's voice: a gentle colleague (21 October 2026)

Roneel, 12:08 PM: "humanise it .. the language. like a gentle colleague guiding you along so that you don't miss anything
or helps you get the information you need". He chose the whole app, with practice mode using the same words.

## How it speaks
- **Says what to do, then why, in one breath.** "Tap your name first, so the kitchen knows who took the order."
- **Asks the customer, not the form.** "Ask which day they need it, then tap the date." It does not say "Choose the date".
- **Says "we", "they" and "you".** Not "the user" or "the customer record".
- **Uses short sentences and everyday words.** No codes, field names or system terms.
- **Keeps warnings calm and specific.** "They still owe money. Take the balance before you hand it over."
- **Avoids question marks inside step messages.** The order flow joins messages with ". ".

## Where the words live

**`build/staff_voice.py`** (the `SAY` list): every changed sentence in the app, with how often it appears. Each one is asserted, so a change in the app shows up at build time. It covers:
- step messages;
- tips;
- the saved screen;
- order notes;
- the order flow's outline patterns, which follow the new words.

**`src/staff.voice.js`** (`CCVoice.say`) gives friendlier versions of messages that come back from the database. For example, "Enter a mobile number, for example 912 3456." becomes a sentence a colleague would say.

**`src/staff.voice.css`** gives each New order step a line under its title. For example, "Start with the customer. Type their mobile number first: if they've ordered before, their details come up." Old orders get their own lines ("Copy the customer's details from the slip.").

**`src/staff.finish-flow.js`** holds the finish step's words:
- "Read it back to the customer"
- "Tap what they paid today"
- "How did they pay?"
- "Did they agree?"

**`src/staff.practice-guide.js`** holds practice mode's guided tasks, in the same voice.

## Adding new words
Write them the way a kind, experienced colleague would say them at the counter. Read them out loud. If a new person
would still have to ask "what does that mean?", say it more plainly.
