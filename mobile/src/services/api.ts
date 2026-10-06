import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_TOKEN = '@transitlk_auth_token';
const STORAGE_KEY_USER = '@transitlk_auth_user';

// Determine the best API base URL depending on runtime environment
export function getApiBaseUrl(): string {
  // If explicitly specified in environment
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Web environment
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000/api';
    }
    return `http://${hostname}:4000/api`;
  }

  // Real Android device on the local Wi-Fi / hotspot
  // 172.20.10.2 is the developer machine IP
  return 'http://172.20.10.2:4000/api';
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

async function request(endpoint: string, options: RequestInit = {}): Promise<AuthResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

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

    // If local LAN IP fails on emulator, try Android emulator loopback 10.0.2.2 as fallback
    if (Platform.OS === 'android' && baseUrl.includes('172.20.10.2')) {
      try {
        const fallbackUrl = `http://10.0.2.2:4000/api${endpoint}`;
        const fallbackRes = await fetch(fallbackUrl, { ...options, headers });
        return await fallbackRes.json();
      } catch {
        // Fall through to error
      }
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
    if (token) {
      await request('/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
    } catch (e) {
      console.error('Failed to clear auth session:', e);
    }
  },
};
