ALTER TABLE project_expenditure_history
    DROP CONSTRAINT IF EXISTS uq_project_report_date;

ALTER TABLE office_expenditure_history
    DROP CONSTRAINT IF EXISTS uq_office_report_date;

CREATE INDEX IF NOT EXISTS idx_project_history_project_date_id
    ON project_expenditure_history(project_id, report_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_office_history_allocation_date_id
    ON office_expenditure_history(office_budget_allocation_id, report_date DESC, id DESC);
