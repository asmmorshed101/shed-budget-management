ALTER TABLE project_expenditure_history
    ADD COLUMN expense_head_id BIGINT
        REFERENCES expense_heads(id);

ALTER TABLE office_expenditure_history
    ADD COLUMN expense_head_id BIGINT
        REFERENCES expense_heads(id);

CREATE INDEX idx_project_history_expense_head
    ON project_expenditure_history(expense_head_id);

CREATE INDEX idx_office_history_expense_head
    ON office_expenditure_history(expense_head_id);