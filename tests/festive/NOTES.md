# Festive page body rebuild: notes

Source: Webflow site 6a0afe25d2f1212db6f93a0e, page 6aaca8c097146d34bf7f120c (/festive), read-only via get_all_elements depth -1 on 14 October 2026.
Output: festive-body.html (inner body markup only; nav and footer component instances replaced with `<!--NAV-->` and `<!--FOOTER-->`).

## Element counts
- Total elements in the Designer tree: 463 (including Body and 2 component instances)
- Rendered into the fragment: 213 (including Body and the 2 placeholders)
- Omitted because visibility is false: 19 hidden roots (6 Section, 3 Paragraph, 1 Block, 1 Span, 8 FormInlineLabel) plus all their descendants

## Element types that could not be mapped
- None. All types encountered were mapped: Block, Section, Heading, Paragraph, Span, Strong, String, Link, Image, List, ListItem, DOM (details/summary), FormWrapper, FormForm, FormBlockLabel, FormTextInput, FormTextarea, FormCheckboxWrapper, FormCheckboxInput, FormInlineLabel, FormButton, FormSuccessMessage, FormErrorMessage.
- FormCheckboxWrapper was rendered as `label.w-checkbox`, FormCheckboxInput as `input.w-checkbox-input`, FormInlineLabel as `span.w-form-label` (all inline labels are hidden, so none appear), text inputs and textareas carry `w-input`, the submit carries `w-button`.

## Embeds
- The page has no HtmlEmbed elements. Nothing to read.

## Images
- Only one image is visible (hero). Source uses the -p-800 variant on cdn.prod.website-files.com:
  6acc9673968645fd9f597d40_Festive%20gingerbread%20houses%20and%20holiday%20treats%20(1)-p-800.png
- The other 9 images sit inside hidden sections and are omitted, so their asset URLs were not fetched.
- No srcset/sizes was generated (published Webflow output would include one).

## Form details read via get_settings
- Form name "Corner Cafe - Festive Season Enquiry", method get.
- Submit button text "Send my festive order", waiting text "Sending...".
- Required: Collection Date, Full Name, Phone. No placeholders are set on any input.

## Top-level structure (in order)
| Order | Element | Classes | DOM id | Visibility |
|---|---|---|---|---|
| 1 | Nav component "Corner Cafe Nav Clean" | — | — | placeholder |
| 2 | main | ccfest | festive-top | visible |
| 2.1 | section | ccfest-hero | — | visible |
| 2.2 | section | ccfest-intro | — | hidden (omitted) |
| 2.3 | section | ccfest-collection | collection | hidden (omitted) |
| 2.4 | section | ccfest-order-info | — | visible |
| 2.5 | section | ccfest-order | festive-order | visible |
| 2.6 | section | ccfest-gifting | gifting | hidden (omitted) |
| 2.7 | section | ccfest-corporate | — | hidden (omitted) |
| 2.8 | section | ccfest-catering | catering | hidden (omitted) |
| 2.9 | section | ccfest-faq | — | visible |
| 2.10 | section | ccfest-final-cta | — | hidden (omitted) |
| 3 | Footer component "Corner Cafe Footer" | — | — | placeholder |

## Issues spotted while mapping (for the audit)
- Hero link hrefs: the element `attributes.href` values are swapped relative to the actual pageSection link settings. The fragment uses the link settings (what Webflow publishes): "Order festive goodies" goes to #festive-order, "See the festive range" goes to #collection.
- "See the festive range" points to #collection, which is a hidden section, so on the published page that anchor goes nowhere.
- Hidden elements inside visible sections: hero image note span, kickers in order-info, order and FAQ sections, and the order contact note block.
- Nested labels: each product checkbox is a `label.w-checkbox` inside a `label` (FormBlockLabel), and the business and custom checkboxes likewise. This is invalid HTML nesting (label inside label) and can cause double-toggle or click-target issues; it is reproduced as-is.
- The company field label (`label.ccfest-label` "Company / organisation") has no `for` attribute and does not wrap its input.
