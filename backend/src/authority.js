import { Router } from 'express';
import { z } from 'zod';
import { newToken, tokenHash } from './auth.js';

const incidentSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(3).max(500),
  route: z.string().trim().min(1).max(40),
  severity: z.enum(['low', 'medium', 'high'])
}).strict();

const incidentUpdateSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().min(3).max(500).optional(),
  route: z.string().trim().min(1).max(40).optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum([
    'open',
    'acknowledged',
    'resolved'
  ]).optional()
}).strict();

export function authorityRouter(store, authenticate) {
  const router = Router();

  function officerOnly(req, res, next) {
    if (req.user?.role !== 'officer') {
      return res.status(403).json({
        error: 'Authority Officer access required.'
      });
    }

    next();
  }

  router.use(
    '/authority',
    authenticate,
    officerOnly
  );

  // DASHBOARD OVERVIEW
  router.get(
    '/authority/overview',
    async (_req, res) => {
      const incidents =
        await store.listAuthorityIncidents();

      const openIncidents = incidents.filter(
        incident => incident.status !== 'resolved'
      ).length;

      res.json({
        source: 'demonstration',
        generatedAt: new Date().toISOString(),

        metrics: {
          monthlyRevenue: 2400000,
          activeBuses: 324,
          totalBuses: 361,
          onTimePerformance: 87,
          utilization: 72,
          digitalAdoption: 64,
          openIncidents
        },

        networkStatus:
          incidents.some(
            incident =>
              incident.status !== 'resolved' &&
              incident.severity === 'high'
          )
            ? 'Attention required'
            : 'Operational',

        routes: [
          {
            route: '100',
            from: 'Panadura',
            to: 'Pettah',
            status: 'On-time',
            buses: 42,
            performance: 92
          },
          {
            route: '120',
            from: 'Horana',
            to: 'Colombo',
            status: 'Minor delays',
            buses: 36,
            performance: 84
          },
          {
            route: '138',
            from: 'Homagama',
            to: 'Pettah',
            status: 'Delayed',
            buses: 31,
            performance: 76
          },
          {
            route: '177',
            from: 'Kaduwela',
            to: 'Kollupitiya',
            status: 'On-time',
            buses: 28,
            performance: 90
          }
        ]
      });
    }
  );

  // NETWORK MONITORING
  router.get(
    '/authority/network',
    async (_req, res) => {
      res.json({
        updatedAt: new Date().toISOString(),

        services: [
          {
            id: 'bus-network',
            name: 'Bus network',
            status: 'operational',
            coverage: 94
          },
          {
            id: 'ticketing',
            name: 'Digital ticketing',
            status: 'operational',
            coverage: 88
          },
          {
            id: 'gps',
            name: 'Vehicle GPS',
            status: 'degraded',
            coverage: 81
          },
          {
            id: 'passenger-app',
            name: 'Passenger services',
            status: 'operational',
            coverage: 97
          }
        ]
      });
    }
  );

  // USER SUMMARY
  router.get(
    '/authority/users',
    async (_req, res) => {
      const summary =
        await store.getAuthorityUserSummary();

      res.json({ summary });
    }
  );

  // INCIDENT LIST
  router.get(
    '/authority/incidents',
    async (_req, res) => {
      const incidents =
        await store.listAuthorityIncidents();

      res.json({ incidents });
    }
  );

  // CREATE INCIDENT
  router.post(
    '/authority/incidents',
    async (req, res) => {
      const result =
        incidentSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: 'Enter valid incident details.'
        });
      }

      const incident =
        await store.createAuthorityIncident(
          String(req.user._id),
          req.user.name,
          result.data
        );

      res.status(201).json({ incident });
    }
  );

  // EDIT / ACKNOWLEDGE / RESOLVE INCIDENT
router.patch(
  '/authority/incidents/:id',
  async (req, res) => {
    const result =
      incidentUpdateSchema.safeParse(req.body);

    if (
      !result.success ||
      Object.keys(result.data).length === 0
    ) {
      return res.status(400).json({
        error: 'Enter valid incident changes.'
      });
    }

    const currentIncident =
      await store.findAuthorityIncident(
        req.params.id
      );

    if (!currentIncident) {
      return res.status(404).json({
        error: 'Incident not found.'
      });
    }

    const changesIncidentDetails =
      result.data.title !== undefined ||
      result.data.description !== undefined ||
      result.data.route !== undefined ||
      result.data.severity !== undefined;

    const officerId =
      String(req.user._id);

    if (
      changesIncidentDetails &&
      currentIncident.createdBy !== officerId
    ) {
      return res.status(403).json({
        error:
          'Only the officer who created this incident can edit its details.'
      });
    }

    const incident =
      await store.updateAuthorityIncident(
        officerId,
        req.params.id,
        result.data,
        changesIncidentDetails
      );

    if (!incident) {
      return res.status(404).json({
        error: 'Incident not found.'
      });
    }

    res.json({ incident });
  }
);

  // DELETE INCIDENT - CREATOR ONLY
router.delete(
  '/authority/incidents/:id',
  async (req, res) => {
    const currentIncident =
      await store.findAuthorityIncident(
        req.params.id
      );

    if (!currentIncident) {
      return res.status(404).json({
        error: 'Incident not found.'
      });
    }

    const officerId =
      String(req.user._id);

    if (
      currentIncident.createdBy !== officerId
    ) {
      return res.status(403).json({
        error:
          'Only the officer who created this incident can delete it.'
      });
    }

    const deleted =
      await store.deleteAuthorityIncident(
        officerId,
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        error: 'Incident not found.'
      });
    }

    res.status(204).end();
  }
);

  // SHORT-LIVED TOKEN FOR WEB AUTHORITY DASHBOARD
  router.post(
    '/authority/web-session',
    async (req, res) => {
      const token = newToken();

      await store.createSession({
        tokenHash: tokenHash(token),
        userId: String(req.user._id),
        expiresAt: new Date(
          Date.now() + 15 * 60 * 1000
        )
      });

      res.json({
        token,
        expiresInMinutes: 15
      });
    }
  );

  return router;
}