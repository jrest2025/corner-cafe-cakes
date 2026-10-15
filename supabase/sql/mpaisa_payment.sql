-- M-PAiSA as a payment method (the Vodafone Fiji mobile wallet), next to Cash, EFTPOS and Bank transfer.
-- Additive only: one new value in the list of payment methods. Existing payments are unchanged.
-- Every payment function already accepts any value in this list, so nothing else needs to change.
alter type public.payment_method add value if not exists 'mpaisa' after 'bank_transfer';
