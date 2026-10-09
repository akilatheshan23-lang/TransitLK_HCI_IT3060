import { api } from '../api';

export type AuthorityRoute = {
  route: string;
  from: string;
  to: string;
  status: string;
  buses: number;
  performance: number;
};

export type AuthorityOverview = {
  source: string;
  generatedAt: string;

  metrics: {
    monthlyRevenue: number;
    activeBuses: number;
    totalBuses: number;
    onTimePerformance: number;
    utilization: number;
    digitalAdoption: number;
    openIncidents: number;
  };

  networkStatus: string;
  routes: AuthorityRoute[];
};

export type AuthorityService = {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'offline';
  coverage: number;
};

export type AuthorityIncident = {
  id: string;
  title: string;
  description: string;
  route: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'acknowledged' | 'resolved';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export async function getAuthorityOverview() {
  return api<AuthorityOverview>(
    '/authority/overview'
  );
}

export async function getAuthorityNetwork() {
  return api<{
    updatedAt: string;
    services: AuthorityService[];
  }>('/authority/network');
}

export async function getAuthorityIncidents() {
  return api<{
    incidents: AuthorityIncident[];
  }>('/authority/incidents');
}

export async function createAuthorityIncident(data: {
  title: string;
  description: string;
  route: string;
  severity: 'low' | 'medium' | 'high';
}) {
  return api<{
    incident: AuthorityIncident;
  }>(
    '/authority/incidents',
    'POST',
    data
  );
}

export async function updateAuthorityIncident(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    route: string;
    severity: 'low' | 'medium' | 'high';
    status: 'open' | 'acknowledged' | 'resolved';
  }>
) {
  return api<{
    incident: AuthorityIncident;
  }>(
    `/authority/incidents/${id}`,
    'PATCH',
    data
  );
}

export async function deleteAuthorityIncident(
  id: string
) {
  return api<void>(
    `/authority/incidents/${id}`,
    'DELETE'
  );
}