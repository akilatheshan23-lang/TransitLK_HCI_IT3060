import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL, saveSession as saveSharedSession } from '../api';

const STORAGE_KEY_TOKEN = '@transitlk_auth_token';
const STORAGE_KEY_USER = '@transitlk_auth_user';

// Determine the best API base URL depending on runtime environment
export function getApiBaseUrl(): string {
  return `${API_BASE_URL}/api`;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'passenger' | 'authority' | 'bus_owner' | 'conductor' | 'admin' | string;
  status?: 'pending' | 'approved' | 'rejected' | string;
  officerId?: string;
  department?: string;
  companyName?: string;
  busRegNumbers?: string;
  employeeId?: string;
  assignedBus?: string;
  route?: string;
  phone?: string;
  language?: string;
  avatar?: string;
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
  routeStops?: string[];
  totalSeats: number;
  availableSeats: number;
  fare: number;
  departureTime: string;
  arrivalTime: string;
  departureMinutes?: number;
  arrivalMinutes?: number;
  duration: string;
  rating: number;
  features: string[];
  travelDate: string;
  travelDateIso?: string;
  scheduleStatus?: 'live_now' | 'upcoming';
  isLiveNow?: boolean;
  isUpcoming?: boolean;
  statusBadge?: string;
  progressPercent?: number;
  currentStop?: string;
  nextStop?: string;
  remainingMinutes?: number;
  departsInMinutes?: number;
  departsInText?: string;
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
  localTime?: string;
  localTimeMinutes?: number;
  startTime?: string;
  endTime?: string;
  filteredPastCount?: number;
  liveNowCount?: number;
  upcomingCount?: number;
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

    if (response.status === 204) return { success: true };
    const data = await response.json().catch(() => ({
      success: false,
      message: `Invalid server response (${response.status})`,
    }));

    if (!response.ok) {
      return {
        success: false,
        status: data.status,
        message: data.message || data.error || `Request failed with status ${response.status}`,
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
   * Sign in as an Authorized Conductor
   */
  async conductorLogin(payload: {
    conductorId: string;
    password: string;
  }): Promise<AuthResponse> {
    return request('/auth/conductor-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Register a new Conductor account
   */
  async registerConductor(payload: {
    name: string;
    email: string;
    employeeId: string;
    assignedBus?: string;
    route?: string;
    phone?: string;
    password: string;
  }): Promise<AuthResponse> {
    return request('/auth/register-conductor', {
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
    return request('/me', {
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
   * Update passenger profile (name, email, avatar icon)
   */
  async updateProfile(payload: {
    name?: string;
    email?: string;
    avatar?: string;
  }): Promise<AuthResponse> {
    const res = await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (res.success && res.user) {
      const { token } = await this.getSession();
      if (token) {
        await this.saveSession(token, res.user);
      }
    }
    return res;
  },

  /**
   * Permanently delete passenger account from database and clear local session
   */
  async deleteAccount(): Promise<AuthResponse> {
    const res = await request('/auth/account', {
      method: 'DELETE',
    });
    if (res.success) {
      await this.clearSession();
    }
    return res;
  },

  /**
   * Local storage helpers
   */
  async saveSession(token: string, user: UserProfile): Promise<void> {
    await saveSharedSession(token);
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
    await saveSharedSession(null);
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
   * Search for buses from origin town to destination town (filtered by local time & start/end time window)
   */
  async searchBuses(params: {
    from: string;
    to: string;
    date?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    localTime?: string;
    statusFilter?: 'all' | 'live_now' | 'upcoming';
  }): Promise<BusSearchResponse> {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to,
      ...(params.date ? { date: params.date } : {}),
      ...(params.time ? { time: params.time } : {}),
      ...(params.startTime ? { startTime: params.startTime } : {}),
      ...(params.endTime ? { endTime: params.endTime } : {}),
      ...(params.localTime ? { localTime: params.localTime } : {}),
      ...(params.statusFilter && params.statusFilter !== 'all' ? { statusFilter: params.statusFilter } : {}),
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

  /**
   * ==========================================
   * SAVED CARDS MANAGEMENT (Client Service)
   * With AsyncStorage fallback (@passenger_saved_cards)
   * ==========================================
   */
  async getSavedCards(): Promise<{ success: boolean; count: number; data: SavedCard[] }> {
    const STORAGE_KEY = '@passenger_saved_cards';
    try {
      const res: any = await request('/payments/cards', { method: 'GET' });
      if (res && res.success && Array.isArray(res.data)) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
        return res;
      }
    } catch (e) {
      console.warn('[Cards API] Remote fetch failed, using local offline store:', e);
    }

    // Offline / Local storage fallback
    try {
      const localStr = await AsyncStorage.getItem(STORAGE_KEY);
      if (localStr) {
        const localCards: SavedCard[] = JSON.parse(localStr);
        return { success: true, count: localCards.length, data: localCards };
      }
    } catch {}

    const defaultCards: SavedCard[] = [
      {
        id: 'card_demo_1',
        cardholderName: 'KAMAL PERERA',
        cardNumberMasked: '•••• •••• •••• 4242',
        last4: '4242',
        expiry: '12/28',
        cardType: 'visa',
        isDefault: true,
      },
      {
        id: 'card_demo_2',
        cardholderName: 'KAMAL PERERA',
        cardNumberMasked: '•••• •••• •••• 8888',
        last4: '8888',
        expiry: '09/27',
        cardType: 'mastercard',
        isDefault: false,
      },
    ];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCards));
    return { success: true, count: defaultCards.length, data: defaultCards };
  },

  async addSavedCard(cardData: {
    cardNumber: string;
    cardholderName: string;
    expiry: string;
    cardType?: string;
    isDefault?: boolean;
  }): Promise<{ success: boolean; message?: string; data: SavedCard }> {
    const STORAGE_KEY = '@passenger_saved_cards';
    let newCard: SavedCard | null = null;

    try {
      const res: any = await request('/payments/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
      });
      if (res && res.success && res.data) {
        newCard = res.data;
      }
    } catch (e) {
      console.warn('[Cards API] Remote add card failed, persisting locally:', e);
    }

    if (!newCard) {
      const cleanNum = cardData.cardNumber.replace(/\D/g, '');
      const last4 = cleanNum.slice(-4) || '1234';
      newCard = {
        id: `card_${Date.now()}`,
        cardholderName: cardData.cardholderName.trim().toUpperCase(),
        cardNumberMasked: `•••• •••• •••• ${last4}`,
        last4,
        expiry: cardData.expiry.trim(),
        cardType: (cardData.cardType || 'visa').toLowerCase(),
        isDefault: Boolean(cardData.isDefault),
      };
    }

    try {
      const existingStr = await AsyncStorage.getItem(STORAGE_KEY);
      let list: SavedCard[] = existingStr ? JSON.parse(existingStr) : [];
      if (newCard.isDefault) {
        list = list.map((c) => ({ ...c, isDefault: false }));
      }
      list.push(newCard);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}

    return { success: true, message: 'Card added successfully', data: newCard };
  },

  async updateSavedCard(
    id: string,
    cardData: {
      cardholderName?: string;
      expiry?: string;
      cardType?: string;
      isDefault?: boolean;
    }
  ): Promise<{ success: boolean; message?: string; data?: SavedCard }> {
    const STORAGE_KEY = '@passenger_saved_cards';
    let updatedCard: SavedCard | undefined;

    try {
      const res: any = await request(`/payments/cards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(cardData),
      });
      if (res && res.success && res.data) {
        updatedCard = res.data;
      }
    } catch (e) {
      console.warn('[Cards API] Remote update card failed, updating locally:', e);
    }

    try {
      const existingStr = await AsyncStorage.getItem(STORAGE_KEY);
      let list: SavedCard[] = existingStr ? JSON.parse(existingStr) : [];
      if (cardData.isDefault) {
        list = list.map((c) => ({ ...c, isDefault: false }));
      }
      list = list.map((c) => {
        if (c.id === id || (c._id && c._id === id)) {
          const mod = {
            ...c,
            ...(cardData.cardholderName ? { cardholderName: cardData.cardholderName.toUpperCase() } : {}),
            ...(cardData.expiry ? { expiry: cardData.expiry } : {}),
            ...(cardData.cardType ? { cardType: cardData.cardType.toLowerCase() } : {}),
            ...(typeof cardData.isDefault === 'boolean' ? { isDefault: cardData.isDefault } : {}),
          };
          updatedCard = mod;
          return mod;
        }
        return c;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}

    return { success: true, message: 'Card updated successfully', data: updatedCard };
  },

  async deleteSavedCard(id: string): Promise<{ success: boolean; message?: string }> {
    const STORAGE_KEY = '@passenger_saved_cards';
    try {
      await request(`/payments/cards/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[Cards API] Remote delete card failed, deleting locally:', e);
    }

    try {
      const existingStr = await AsyncStorage.getItem(STORAGE_KEY);
      if (existingStr) {
        let list: SavedCard[] = JSON.parse(existingStr);
        list = list.filter((c) => c.id !== id && c._id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch {}

    return { success: true, message: 'Card deleted successfully' };
  },
};

export interface SavedCard {
  id: string;
  _id?: string;
  cardholderName: string;
  cardNumberMasked: string;
  last4: string;
  expiry: string;
  cardType: string;
  isDefault?: boolean;
  userId?: string;
}
