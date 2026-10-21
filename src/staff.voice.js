/* Corner Café Service Hub: the colleague voice (21 October 2026). See docs/staff-voice.md.
 * Roneel: "humanise it .. the language. like a gentle colleague guiding you along so that you dont miss anything or
 * helps you get the information you need". Words only: the same fields, rules, checks and saving.
 * The app's own wording is changed where it is written (build/staff_voice.py). This part rewords the messages that
 * come back from the database when a New order is not saved, so they read the same way.
 */
(function (global) {
  'use strict';
  if (global.CCVoice) return;
  var SAY = {
    'Enter a mobile number, for example 912 3456.': "That mobile number doesn't look right. Type it like 912 3456.",
    'Enter a name for the order.': "Add the customer's name, so we know whose cake it is.",
    'Check the email address.': "That email address doesn't look right. Check it with them, or leave it empty.",
    'That time has already passed.': 'That time has already passed. Choose a later time with them.',
    'Check the year of the pickup date.': 'Check the year on the pickup date.',
    'Check the year of the order date.': 'Check the year on the date they ordered.',
    'Choose a cake that is on sale.': 'That cake is not on sale any more. Choose another one with them.',
    'Your login cannot create orders.': 'Your login cannot take orders. Please ask a manager.'
  };
  function say(m) { var s = String(m == null ? '' : m); return Object.prototype.hasOwnProperty.call(SAY, s) ? SAY[s] : s; }
  global.CCVoice = { version: '2026-10-21-voice-v1', say: say };
})(window);
