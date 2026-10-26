-- Preserve existing invoices. If duplicates exist, this fails rather than deleting data.
CREATE UNIQUE INDEX `invoices_contract_id_billing_month_key` ON `invoices`(`contract_id`, `billing_month`);
DROP INDEX `invoices_contract_id_billing_month_idx` ON `invoices`;
