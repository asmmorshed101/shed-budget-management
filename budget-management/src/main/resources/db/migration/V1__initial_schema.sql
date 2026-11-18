CREATE TABLE fiscal_years (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT ck_fiscal_year_dates
    CHECK (end_date > start_date)
);


CREATE TABLE organization_types (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_bn VARCHAR(150)
);


CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES organizations(id),
    organization_type_id SMALLINT NOT NULL
        REFERENCES organization_types(id),

    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    name_bn VARCHAR(255) NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE budget_types (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_bn VARCHAR(150) NOT NULL
);


CREATE TABLE budget_sources (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    name_bn VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE
);


-- Initial data

INSERT INTO organization_types (code, name, name_bn)
VALUES
('MINISTRY', 'Ministry', 'মন্ত্রণালয়'),
('DIRECTORATE', 'Directorate', 'অধিদপ্তর'),
('AGENCY', 'Agency', 'সংস্থা'),
('UNIVERSITY', 'University', 'বিশ্ববিদ্যালয়');


INSERT INTO budget_types (code, name, name_bn)
VALUES
('OPERATIONAL', 'Operational Budget', 'পরিচালন বাজেট'),
('DEVELOPMENT', 'Development Budget', 'উন্নয়ন বাজেট');


INSERT INTO budget_sources (code, name, name_bn)
VALUES
('REVENUE', 'Revenue', 'রাজস্ব'),
('ADP', 'Annual Development Programme', 'বার্ষিক উন্নয়ন কর্মসূচি'),
('ADB', 'Asian Development Bank', 'এশীয় উন্নয়ন ব্যাংক'),
('OWN_FUND', 'Own Fund', 'নিজস্ব অর্থায়ন');