CREATE UNIQUE INDEX uq_organizations_single_parent_office
    ON organizations ((TRUE))
    WHERE parent_id IS NULL;
