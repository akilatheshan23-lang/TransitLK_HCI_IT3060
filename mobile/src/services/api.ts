import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_TOKEN = '@transitlk_auth_token';
const STORAGE_KEY_USER = '@transitlk_auth_user';

// Determine the best API base URL depending on runtime environment
export function getApiBaseUrl(): string {
  // 1. Web environment (browser): ALWAYS use the current browser hostname
  // When browsing on localhost:8082, connects directly to localhost:4000/api
  // When browsing on LAN (e.g. 192.168.1.86:8082), connects to 192.168.1.86:4000/api
  // This prevents broken connections if the PC's local Wi-Fi IP changes.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || 'localhost';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000/api';
    }
    return `http://${hostname}:4000/api`;
  }

  // 2. Explicit environment variable
  let envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    if (!envUrl.endsWith('/api')) {
      envUrl = envUrl.replace(/\/+$/, '') + '/api';
    }
    return envUrl;
  }

  // 3. Android emulator fallback (10.0.2.2 connects to host PC localhost)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api';
  }

  return 'http://localhost:4000/api';
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'passenger' | 'authority' | 'bus_owner' | 'admin' | string;
  status?: 'pending' | 'approved' | 'rejected' | string;
  officerId?: string;
  department?: string;
  companyName?: string;
  busRegNumbers?: string;
  phone?: string;
  language?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  status?: string;
  user?: UserProfile;
  token?: string;
}

export interface BusSearchResult {
  id: string;
  busRegNumber: string;
  ownerName: string;
  companyName?: string;
  routeNumber: string;
  routeName: string;
  busType: string;
  fromStop: string;
  toStop: string;
  stopsBetween: number;
  totalSeats: number;
  availableSeats: number;
  fare: number;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  rating: number;
  features: string[];
  travelDate: string;
}

export interface LocationsResponse {
  success: boolean;
  count: number;
  locations: string[];
  message?: string;
}

export interface BusSearchResponse {
  success: boolean;
  from?: string;
  to?: string;
  date?: string;
  count?: number;
  buses?: BusSearchResult[];
  message?: string;
}

async function request(endpoint: string, options: RequestInit = {}): Promise<AuthResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!headers.Authorization) {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({
      success: false,
      message: `Invalid server response (${response.status})`,
    }));

    if (!response.ok) {
      return {
        success: false,
        status: data.status,
        message: data.message || `Request failed with status ${response.status}`,
      };
    }

    return data;
  } catch (error: any) {
    console.warn(`[API] Failed to fetch from ${url}:`, error.message);

    // Automatic fallbacks if initial host fails:
    if (Platform.OS === 'web' && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      try {
        const fallbackUrl = `http://localhost:4000/api${endpoint}`;
        const fallbackRes = await fetch(fallbackUrl, { ...options, headers });
        const fallbackData = await fallbackRes.json().catch(() => null);
        if (fallbackData) return fallbackData;
      } catch {}
    }

    if (Platform.OS === 'android' && !baseUrl.includes('10.0.2.2')) {
      try {
        const fallbackUrl = `http://10.0.2.2:4000/api${endpoint}`;
        const fallbackRes = await fetch(fallbackUrl, { ...options, headers });
        const fallbackData = await fallbackRes.json().catch(() => null);
        if (fallbackData) return fallbackData;
      } catch {}
    }

    return {
      success: false,
      message: `Could not connect to TransitLK backend (${baseUrl}). Please ensure backend is running.`,
    };
  }
}

export const api = {
  /**
   * Register a new passenger account in MongoDB
   */
  async register(payload: {
    name: string;
    email: string;
    password: string;
    language?: string;
  }): Promise<AuthResponse> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Sign in as a regular user (passenger)
   */
  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Continue with Google OAuth authentication
   */
  async googleLogin(payload: {
    email: string;
    name?: string;
    googleId?: string;
    avatarUrl?: string;
  }): Promise<AuthResponse> {
    return request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Register a new Authority Officer account (Requires Admin Approval)
   */
  async registerOfficer(payload: {
    name: string;
    email: string;
    officerId: string;
    department: string;
    phone?: string;
    password: string;
  }): Promise<AuthResponse> {
    return request('/auth/register-officer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Register a new Bus Fleet Owner account (Requires Admin Approval)
   */
  async registerBusOwner(payload: {
    name: string;
    email: string;
    companyName: string;
    busRegNumbers?: string;
    phone?: string;
    password: string;
  }): Promise<AuthResponse> {
    return request('/auth/register-owner', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Sign in as an Authority Officer
   */
  async officerLogin(payload: {
    officerId: string;
    password: string;
  }): Promise<AuthResponse> {
    return request('/auth/officer-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Sign in as a Bus Fleet Owner
   */
  async ownerLogin(payload: {
    ownerId: string;
    password: string;
  }): Promise<AuthResponse> {
    return request('/auth/owner-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Verify Admin Credentials & Authenticate for Admin Dashboard Website
   */
  async adminLogin(payload: {
    username: string;
    password: string;
  }): Promise<AuthResponse & { adminDashboardUrl?: string }> {
    return request('/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetch current user profile with active session token
   */
  async getMe(token: string): Promise<AuthResponse> {
    return request('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Invalidate session in MongoDB
   */
  async logout(token?: string): Promise<AuthResponse> {
    try {
      const activeToken = token || (await AsyncStorage.getItem(STORAGE_KEY_TOKEN));
      if (activeToken) {
        await request('/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });
      }
    } catch {
      // Continue clearing local storage even if backend revocation throws
    }
    await this.clearSession();
    return { success: true };
  },

  /**
   * Local storage helpers
   */
  async saveSession(token: string, user: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        globalThis.sessionStorage?.setItem('transitlk-session', token);
      }
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
  },

  async getSession(): Promise<{ token: string | null; user: UserProfile | null }> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
      const userStr = await AsyncStorage.getItem(STORAGE_KEY_USER);
      const user = userStr ? JSON.parse(userStr) : null;
      return { token, user };
    } catch {
      return { token: null, user: null };
    }
  },

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEY_USER);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        globalThis.sessionStorage?.removeItem('transitlk-session');
      }
    } catch (e) {
      console.error('Failed to clear auth session:', e);
    }
  },

  /**
   * Get all available route town stops (ordered and deduplicated from active bus routes)
   */
  async getLocations(): Promise<LocationsResponse> {
    const res = await request('/buses/locations', { method: 'GET' });
    return res as unknown as LocationsResponse;
  },

  /**
   * Search for buses from origin town to destination town
   */
  async searchBuses(params: {
    from: string;
    to: string;
    date?: string;
    time?: string;
  }): Promise<BusSearchResponse> {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to,
      ...(params.date ? { date: params.date } : {}),
      ...(params.time ? { time: params.time } : {}),
    }).toString();
    const res = await request(`/buses/search?${query}`, { method: 'GET' });
    return res as unknown as BusSearchResponse;
  },

  /**
   * Register a new bus by an approved owner
   */
  async registerBus(payload: {
    ownerId: string;
    busRegNumber: string;
    routeNumber: string;
    busType?: string;
    totalSeats?: number;
    baseFare?: number;
    departureTime?: string;
    arrivalTime?: string;
    customStops?: string[];
  }): Promise<{ success: boolean; message: string; bus?: any }> {
    const res = await request('/buses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res as any;
  },

  /**
   * Process simulated payment and issue unpredictable ticket from backend
   */
  async processPayment(params: {
    amount: number;
    method?: 'card' | 'wallet';
    idempotencyKey?: string;
    details?: {
      cardType?: string;
      last4?: string;
      cardholderName?: string;
    };
    routeData?: {
      id?: string;
      bus?: string;
      type?: string;
      from?: string;
      to?: string;
      fromTime?: string;
      departureTime?: string;
      date?: string;
    };
    ticketCount?: number;
  }): Promise<{
    success: boolean;
    mode: string;
    message: string;
    data: any;
    ticket: {
      _id: string;
      ticketId: string;
      verificationCode: string;
      amount: number;
      status: string;
      numberOfTickets: number;
      route: {
        bus: string;
        type: string;
        from: string;
        to: string;
        departureTime: string;
        date: string;
      };
      isDemo: boolean;
      issuedAt: string;
    };
    qrData: string;
  }> {
    const key = params.idempotencyKey || `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const res = await request('/payments/process', {
      method: 'POST',
      headers: {
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ ...params, idempotencyKey: key }),
    });
    return res as any;
  },

  /**
   * Conductor ticket verification and atomic redemption
   */
  async verifyTicket(
    params: {
      ticketId?: string;
      verificationCode?: string;
      qrData?: string;
    },
    token?: string
  ): Promise<{
    success: boolean;
    valid: boolean;
    status: string;
    message: string;
    ticket?: any;
  }> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await request('/payments/tickets/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    return res as any;
  },
};
