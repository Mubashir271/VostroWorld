import api from './service';

export const getMISDashboard = async (branchId: number) => {
    const response = await api.get(
        `/v1/MISReport/get?bId=${branchId}`
    );
    return response.data;
};

export const getPackageCategories = async () => {
  const res = await api.get('/v1/package-categories');
  return res.data;
};