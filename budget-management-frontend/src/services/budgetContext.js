import api from "../api/axios";

const asArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export async function loadActiveMinistryContext() {
  const [fiscalYearResponse, organizationResponse] = await Promise.all([
    api.get("/fiscal-years"),
    api.get("/organizations"),
  ]);

  const fiscalYears = asArray(fiscalYearResponse.data);
  const organizations = asArray(organizationResponse.data);
  const activeFiscalYear = fiscalYears.find(
    (year) => year.isActive === true || year.active === true
  );

  if (!activeFiscalYear?.id) {
    throw new Error("No active fiscal year found. Please activate a fiscal year first.");
  }

  const activeOrganizations = organizations.filter(
    (organization) => organization.isActive !== false
  );
  const ministries = activeOrganizations.filter(
    (organization) => organization.organizationType?.code?.toUpperCase() === "MINISTRY"
  );
  const ministry =
    ministries.find((organization) => organization.code?.toUpperCase() === "SHED") ||
    ministries[0] ||
    activeOrganizations.find((organization) => organization.code?.toUpperCase() === "SHED");

  if (!ministry?.id) {
    throw new Error("Ministry not found. Create or activate the ministry in Office Management first.");
  }

  return { activeFiscalYear, fiscalYears, ministry, organizations };
}
