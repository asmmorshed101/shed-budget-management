import api from "../api/axios";

export const getFiscalYears = async () => {
  const response = await api.get("/fiscal-years");
  return response.data;
};

export const createFiscalYear = async (data) => {
  const response = await api.post("/fiscal-years", data);
  return response.data;
};

export const updateFiscalYear = async (id, data) => {
  const response = await api.put(`/fiscal-years/${id}`, data);
  return response.data;
};

export const activateFiscalYear = async (id) => {
  const response = await api.patch(`/fiscal-years/${id}/activate`);
  return response.data;
};