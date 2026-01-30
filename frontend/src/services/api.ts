import axios from 'axios';
import type { 
  Token, User, Grant, GrantCreate, Client, ClientCreate, ClientUser,
  Match, MatchGenerate, Application, ApplicationCreate, ApplicationEvent,
  Cause, ApplicantType, Province, EligibilityFlag, MatchStatus, ApplicationStage,
  ClientInvite, InviteInfo, SubscriptionStatus, Prices, CheckoutResponse, BillingPortalResponse,
  SavedGrant, PortalStats, PublicSignupRequest,
  ManagedServiceRequest, ManagedServiceRequestCreate
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: async (email: string, password: string): Promise<Token> => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const { data } = await api.post<Token>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },
  register: async (userData: { email: string; password: string; name?: string }): Promise<User> => {
    const { data } = await api.post<User>('/auth/register', userData);
    return data;
  },
  // Public signup for self-service users
  signup: async (signupData: PublicSignupRequest): Promise<{ message: string; user_id: string; client_id: string }> => {
    const { data } = await api.post('/auth/signup', signupData);
    return data;
  },
};

// Users
export const usersApi = {
  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/users/me');
    return data;
  },
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>('/users/');
    return data;
  },
  getById: async (id: string): Promise<User> => {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },
  create: async (userData: { email: string; password: string; name?: string; role?: 'admin' | 'staff' | 'client' }): Promise<User> => {
    const { data } = await api.post<User>('/users/', userData);
    return data;
  },
  update: async (id: string, userData: { email?: string; name?: string; role?: string; is_active?: boolean }): Promise<User> => {
    const { data } = await api.patch<User>(`/users/${id}`, userData);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

// Lookups
export const lookupsApi = {
  getCauses: async (): Promise<Cause[]> => {
    const { data } = await api.get<Cause[]>('/lookups/causes');
    return data;
  },
  getApplicantTypes: async (): Promise<ApplicantType[]> => {
    const { data } = await api.get<ApplicantType[]>('/lookups/applicant-types');
    return data;
  },
  getProvinces: async (): Promise<Province[]> => {
    const { data } = await api.get<Province[]>('/lookups/provinces');
    return data;
  },
  getEligibilityFlags: async (): Promise<EligibilityFlag[]> => {
    const { data } = await api.get<EligibilityFlag[]>('/lookups/eligibility-flags');
    return data;
  },
};

// Grants
export const grantsApi = {
  getAll: async (params?: Record<string, string>): Promise<Grant[]> => {
    const { data } = await api.get<Grant[]>('/grants/', { params });
    return data;
  },
  getById: async (id: string): Promise<Grant> => {
    const { data } = await api.get<Grant>(`/grants/${id}`);
    return data;
  },
  create: async (grant: GrantCreate): Promise<Grant> => {
    const { data } = await api.post<Grant>('/grants/', grant);
    return data;
  },
  update: async (id: string, grant: Partial<GrantCreate>): Promise<Grant> => {
    const { data } = await api.patch<Grant>(`/grants/${id}`, grant);
    return data;
  },
  verify: async (id: string, status: string = 'open'): Promise<Grant> => {
    const { data } = await api.post<Grant>(`/grants/${id}/verify?status=${status}`);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/grants/${id}`);
  },
};

// Clients
export const clientsApi = {
  getAll: async (params?: Record<string, string>): Promise<Client[]> => {
    const { data } = await api.get<Client[]>('/clients/', { params });
    return data;
  },
  getById: async (id: string): Promise<Client> => {
    const { data } = await api.get<Client>(`/clients/${id}`);
    return data;
  },
  create: async (client: ClientCreate): Promise<Client> => {
    const { data } = await api.post<Client>('/clients/', client);
    return data;
  },
  update: async (id: string, client: Partial<ClientCreate>): Promise<Client> => {
    const { data } = await api.patch<Client>(`/clients/${id}`, client);
    return data;
  },
  updateEligibility: async (id: string, eligibility: {
    cause_ids: string[];
    applicant_type_ids: string[];
    province_ids: string[];
    eligibility_flag_ids: string[];
  }): Promise<Client> => {
    const { data } = await api.patch<Client>(`/clients/${id}/eligibility`, eligibility);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`);
  },
  // Client Users
  getUsers: async (clientId: string): Promise<ClientUser[]> => {
    const { data } = await api.get<ClientUser[]>(`/clients/${clientId}/users`);
    return data;
  },
  createUser: async (clientId: string, userData: { email: string; name?: string; password: string; client_role?: string }): Promise<ClientUser> => {
    const { data } = await api.post<ClientUser>(`/clients/${clientId}/users`, userData);
    return data;
  },
  removeUser: async (clientId: string, userId: string): Promise<void> => {
    await api.delete(`/clients/${clientId}/users/${userId}`);
  },
  // Grant database access (staff override)
  updateGrantAccess: async (clientId: string, grantAccess: boolean): Promise<Client> => {
    const { data } = await api.patch<Client>(`/clients/${clientId}/grant-access`, { grant_db_access: grantAccess });
    return data;
  },
};

// Matches
export const matchesApi = {
  getAll: async (params?: { client_id?: string; status?: MatchStatus }): Promise<Match[]> => {
    const { data } = await api.get<Match[]>('/matches/', { params });
    return data;
  },
  generate: async (clientId: string): Promise<MatchGenerate[]> => {
    const { data } = await api.post<MatchGenerate[]>(`/matches/generate/${clientId}`);
    return data;
  },
  create: async (match: {
    client_id: string;
    grant_id: string;
    fit_score: number;
    fit_level: string;
    reasons: Record<string, unknown>;
    status: MatchStatus;
  }): Promise<Match> => {
    const { data } = await api.post<Match>('/matches/', match);
    return data;
  },
  update: async (id: string, update: { status?: MatchStatus; notes?: string }): Promise<Match> => {
    const { data } = await api.patch<Match>(`/matches/${id}`, update);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/matches/${id}`);
  },
};

// Applications
export const applicationsApi = {
  getAll: async (params?: { client_id?: string; stage?: ApplicationStage }): Promise<Application[]> => {
    const { data } = await api.get<Application[]>('/applications/', { params });
    return data;
  },
  getPipeline: async (): Promise<Record<string, number>> => {
    const { data } = await api.get<Record<string, number>>('/applications/pipeline');
    return data;
  },
  getById: async (id: string): Promise<Application> => {
    const { data } = await api.get<Application>(`/applications/${id}`);
    return data;
  },
  create: async (application: ApplicationCreate): Promise<Application> => {
    const { data } = await api.post<Application>('/applications/', application);
    return data;
  },
  update: async (id: string, update: Partial<Application>): Promise<Application> => {
    const { data } = await api.patch<Application>(`/applications/${id}`, update);
    return data;
  },
  addEvent: async (id: string, event: { event_type: string; note?: string }): Promise<ApplicationEvent> => {
    const { data } = await api.post<ApplicationEvent>(`/applications/${id}/events`, event);
    return data;
  },
  getEvents: async (id: string): Promise<ApplicationEvent[]> => {
    const { data } = await api.get<ApplicationEvent[]>(`/applications/${id}/events`);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/applications/${id}`);
  },
};

// Portal API (for client users)
export const portalApi = {
  getMyClient: async (): Promise<Client> => {
    const { data } = await api.get<Client>('/portal/my-client');
    return data;
  },
  getMyApplications: async (): Promise<Application[]> => {
    const { data } = await api.get<Application[]>('/portal/applications');
    return data;
  },
  getApplication: async (id: string): Promise<Application> => {
    const { data } = await api.get<Application>(`/portal/applications/${id}`);
    return data;
  },
  getApplicationEvents: async (id: string): Promise<ApplicationEvent[]> => {
    const { data } = await api.get<ApplicationEvent[]>(`/portal/applications/${id}/events`);
    return data;
  },
  // Grant Database (requires subscription)
  getGrants: async (params?: Record<string, string>): Promise<Grant[]> => {
    const { data } = await api.get<Grant[]>('/portal/grants', { params });
    return data;
  },
  getGrant: async (id: string): Promise<Grant> => {
    const { data } = await api.get<Grant>(`/portal/grants/${id}`);
    return data;
  },
  getMatchingGrants: async (): Promise<Grant[]> => {
    const { data } = await api.get<Grant[]>('/portal/grants/matches');
    return data;
  },
  // Saved Grants
  getSavedGrants: async (): Promise<SavedGrant[]> => {
    const { data } = await api.get('/portal/saved-grants/with-details');
    return data;
  },
  saveGrant: async (grantId: string, notes?: string): Promise<SavedGrant> => {
    const { data } = await api.post<SavedGrant>('/portal/saved-grants', { grant_id: grantId, notes });
    return data;
  },
  updateSavedGrant: async (savedId: string, notes: string): Promise<SavedGrant> => {
    const { data } = await api.patch<SavedGrant>(`/portal/saved-grants/${savedId}`, { notes });
    return data;
  },
  removeSavedGrant: async (savedId: string): Promise<void> => {
    await api.delete(`/portal/saved-grants/${savedId}`);
  },
  removeSavedGrantByGrant: async (grantId: string): Promise<void> => {
    await api.delete(`/portal/saved-grants/by-grant/${grantId}`);
  },
  // Profile
  updateEligibility: async (eligibility: {
    cause_ids: string[];
    applicant_type_ids: string[];
    province_ids: string[];
    eligibility_flag_ids: string[];
  }): Promise<Client> => {
    const { data } = await api.patch<Client>('/portal/profile/eligibility', eligibility);
    return data;
  },
  // Stats
  getStats: async (): Promise<PortalStats> => {
    const { data } = await api.get<PortalStats>('/portal/stats');
    return data;
  },
  // Get Expert Help (self-service only)
  requestManagedService: async (body: ManagedServiceRequestCreate): Promise<ManagedServiceRequest> => {
    const { data } = await api.post<ManagedServiceRequest>('/portal/request-managed-service', body);
    return data;
  },
  getMyManagedServiceRequests: async (): Promise<ManagedServiceRequest[]> => {
    const { data } = await api.get<ManagedServiceRequest[]>('/portal/request-managed-service/status');
    return data;
  },
};

// Subscription API
export const subscriptionApi = {
  getStatus: async (): Promise<SubscriptionStatus> => {
    const { data } = await api.get<SubscriptionStatus>('/subscriptions/status');
    return data;
  },
  getPrices: async (): Promise<Prices> => {
    const { data } = await api.get<Prices>('/subscriptions/prices');
    return data;
  },
  createCheckout: async (priceId: string, successUrl?: string, cancelUrl?: string): Promise<CheckoutResponse> => {
    const { data } = await api.post<CheckoutResponse>('/subscriptions/checkout', {
      price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return data;
  },
  createBillingPortal: async (returnUrl?: string): Promise<BillingPortalResponse> => {
    const { data } = await api.post<BillingPortalResponse>('/subscriptions/portal', {
      return_url: returnUrl,
    });
    return data;
  },
};

// Invites API
export const invitesApi = {
  getForClient: async (clientId: string): Promise<ClientInvite[]> => {
    const { data } = await api.get<ClientInvite[]>(`/invites/client/${clientId}`);
    return data;
  },
  create: async (clientId: string, invite: { email: string; name?: string; client_role?: string }): Promise<ClientInvite> => {
    const { data } = await api.post<ClientInvite>(`/invites/client/${clientId}`, invite);
    return data;
  },
  resend: async (inviteId: string): Promise<ClientInvite> => {
    const { data } = await api.post<ClientInvite>(`/invites/${inviteId}/resend`);
    return data;
  },
  delete: async (inviteId: string): Promise<void> => {
    await api.delete(`/invites/${inviteId}`);
  },
  // Public endpoints (no auth)
  verify: async (token: string): Promise<InviteInfo> => {
    const { data } = await api.get<InviteInfo>(`/invites/verify/${token}`);
    return data;
  },
  accept: async (token: string, password: string): Promise<{ message: string; email: string }> => {
    const { data } = await api.post<{ message: string; email: string }>('/invites/accept', { token, password });
    return data;
  },
};

// Managed Service Requests (staff only)
export const managedServiceRequestsApi = {
  list: async (status?: string): Promise<ManagedServiceRequest[]> => {
    const params = status ? { status } : {};
    const { data } = await api.get<ManagedServiceRequest[]>('/managed-service-requests/', { params });
    return data;
  },
  get: async (id: string): Promise<ManagedServiceRequest> => {
    const { data } = await api.get<ManagedServiceRequest>(`/managed-service-requests/${id}`);
    return data;
  },
  update: async (id: string, update: { status?: string; notes?: string }): Promise<ManagedServiceRequest> => {
    const { data } = await api.patch<ManagedServiceRequest>(`/managed-service-requests/${id}`, update);
    return data;
  },
};

export default api;
