import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Configure response interceptor to support standardized API responses
api.interceptors.response.use(
  (response) => {
    // If the response is in our standardized format, unwrap it automatically!
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      if (response.data.success) {
        return {
          ...response,
          data: response.data.data,
        };
      } else {
        const error = new Error(response.data.message || "Request failed");
        (error as any).response = response;
        return Promise.reject(error);
      }
    }
    return response;
  },
  (error) => {
    // Standardize error messaging for React Query catches
    if (
      error.response?.data &&
      typeof error.response.data === "object" &&
      "success" in error.response.data
    ) {
      error.message = error.response.data.message || error.message;
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const { data } = await api.post("/login", credentials);
    return data;
  },
  logout: async () => {
    const { data } = await api.post("/logout");
    return data;
  },
  getMe: async () => {
    const { data } = await api.get("/me");
    return data;
  },
  register: async (details: any) => {
    const { data } = await api.post("/register", details);
    return data;
  },
  updateProfile: async (updates: any) => {
    const { data } = await api.put("/profile", updates);
    return data;
  },
};

// Goals API
export const goalsApi = {
  getGoals: async () => {
    const { data } = await api.get("/goals");
    return data;
  },
  createGoal: async (goal: any) => {
    const { data } = await api.post("/goals", goal);
    return data;
  },
  updateGoal: async (id: string, goal: any) => {
    const { data } = await api.put(`/goals/${id}`, goal);
    return data;
  },
  deleteGoal: async (id: string) => {
    const { data } = await api.delete(`/goals/${id}`);
    return data;
  },
};

// Approvals API
export const approvalsApi = {
  approveGoal: async (id: string, feedback?: string) => {
    const { data } = await api.post(`/goals/${id}/approve`, { feedback });
    return data;
  },
  rejectGoal: async (id: string, feedback: string) => {
    const { data } = await api.post(`/goals/${id}/reject`, { feedback });
    return data;
  },
  requestRework: async (id: string, feedback: string) => {
    const { data } = await api.post(`/goals/${id}/rework`, { feedback });
    return data;
  },
  completeGoal: async (id: string) => {
    const { data } = await api.post(`/goals/${id}/complete`, {});
    return data;
  },
};

// Check-ins API
export const checkinsApi = {
  getCheckins: async (goalId?: string) => {
    const { data } = await api.get("/checkins", { params: { goalId } });
    return data;
  },
  createCheckin: async (checkin: any) => {
    const { data } = await api.post("/checkins", checkin);
    return data;
  },
};

// Analytics API
export const analyticsApi = {
  getEmployeeAnalytics: async () => {
    const { data } = await api.get("/analytics/employee");
    return data;
  },
  getManagerAnalytics: async () => {
    const { data } = await api.get("/analytics/manager");
    return data;
  },
  getAdminAnalytics: async () => {
    const { data } = await api.get("/analytics/admin");
    return data;
  },
};

// Audit API
export const auditApi = {
  getLogs: async () => {
    const { data } = await api.get("/audit-logs");
    return data;
  },
};

// Notifications API
export const notificationsApi = {
  getNotifications: async () => {
    const { data } = await api.get("/notifications");
    return data;
  },
  markAsRead: async (id: string) => {
    const { data } = await api.post(`/notifications/read`, { id });
    return data;
  },
  markRead: async () => {
    const { data } = await api.post(`/notifications/read`, {});
    return data;
  },
};

// Check-in Windows API
export const checkinWindowsApi = {
  getWindowsStatus: async () => {
    const { data } = await api.get("/checkin-windows");
    return data;
  },
};

// Comments API
export const commentsApi = {
  getComments: async (entityType: string, entityId: string) => {
    const { data } = await api.get("/comments", { params: { entityType, entityId } });
    return data;
  },
  createComment: async (payload: { entityType: string; entityId: string; message: string }) => {
    const { data } = await api.post("/comments", payload);
    return data;
  },
};

// Shared Goals API
export const sharedGoalsApi = {
  createSharedGoal: async (sharedGoal: any) => {
    const { data } = await api.post("/goals/shared", sharedGoal);
    return data;
  },
};

// Admin Windows API
export const adminApi = {
  getQuarterOverrides: async () => {
    const { data } = await api.get("/admin/quarter-overrides");
    return data;
  },
  updateQuarterOverrides: async (payload: { quarter: string; isOpen: boolean }) => {
    const { data } = await api.post("/admin/quarter-overrides", payload);
    return data;
  },
  getUsers: async () => {
    const { data } = await api.get("/admin/users");
    return data;
  },
  updateUser: async (id: string, payload: any) => {
    const { data } = await api.put(`/admin/users/${id}`, payload);
    return data;
  },
};

// Team API
export const teamApi = {
  getTeamMembers: async () => {
    const { data } = await api.get("/team/members");
    return data;
  },
};
