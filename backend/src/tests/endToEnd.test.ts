import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/config/db';
import { env } from '@/config/env';

const ranges = {
  humidity: { min: 20, max: 40 },
  ph: { min: 5, max: 7 },
  salinity: { min: 0, max: 2 },
  soilTemp: { min: 15, max: 30 },
  ambientTemp: { min: 10, max: 35 },
};

describe('flujo integrado de monitoreo', () => {
  let userId: string | undefined;
  let accessToken: string;
  let cropId: string | undefined;
  let stateId: string | undefined;
  let nodeId: string | undefined;
  let createdAt: Date;

  beforeAll(async () => {
    if (!env.DEMO_SEED_PASSWORD) throw new Error('DEMO_SEED_PASSWORD no está configurada.');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@agrosense.local' } });
    userId = user.id;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: env.DEMO_SEED_PASSWORD });
    expect(login.status).toBe(200);
    accessToken = login.body.accessToken;
    createdAt = new Date();
  });

  afterAll(async () => {
    if (nodeId) {
      await prisma.alert.deleteMany({ where: { nodeId } });
      await prisma.reading.deleteMany({ where: { nodeId } });
      await prisma.node.deleteMany({ where: { id: nodeId } });
    }
    if (stateId) await prisma.cropState.deleteMany({ where: { id: stateId } });
    if (cropId) await prisma.crop.deleteMany({ where: { id: cropId } });
    if (userId) {
      await prisma.reportRecord.deleteMany({ where: { userId, createdAt: { gte: createdAt } } });
      await prisma.auditLog.deleteMany({
        where: {
          userId,
          timestamp: { gte: createdAt },
          entityId: { in: [cropId, stateId, nodeId].filter((id): id is string => Boolean(id)) },
        },
      });
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }
    await prisma.$disconnect();
  });

  it('recorre login, cultivo, etapa, nodo, ingesta, alerta, dashboard, mapa, historial y reporte', async () => {
    const crop = await request(app)
      .post('/api/crops')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Flujo E2E ${Date.now()}`, ranges });
    expect(crop.status).toBe(201);
    cropId = crop.body.crop.id;

    const state = await request(app)
      .post(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Crecimiento E2E', order: 1, ranges, isActive: true });
    expect(state.status).toBe(201);
    stateId = state.body.state.id;

    const node = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId: `TEST-E2E-${Date.now()}`,
        name: 'Nodo E2E',
        cropId,
        stateId,
      });
    expect(node.status).toBe(201);
    nodeId = node.body.node.id;

    const ingestion = await request(app)
      .post('/api/ingest')
      .set('x-api-key', env.INGEST_API_KEY)
      .send({
        deviceId: node.body.node.deviceId,
        humidity: 42,
        ph: 6,
        salinity: 1,
        soilTemp: 22,
        ambientTemp: 24,
      });
    expect(ingestion.status).toBe(201);

    const alerts = await request(app)
      .get('/api/alerts')
      .query({ nodeId, status: 'ACTIVA' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(alerts.status).toBe(200);
    expect(alerts.body.alerts).toEqual(
      expect.arrayContaining([expect.objectContaining({ variable: 'humidity' })]),
    );

    const dashboard = await request(app)
      .get(`/api/dashboard?cropId=${cropId}&period=24h`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.kpis.humidity.value).toBe(42);

    const map = await request(app)
      .get(`/api/nodes/map?cropId=${cropId}&state=${stateId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(map.status).toBe(200);
    expect(map.body.nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: nodeId, mapStatus: 'warning' })]),
    );

    const now = new Date();
    const history = await request(app)
      .get('/api/history')
      .query({
        nodeId,
        variable: 'humidity',
        from: new Date(now.getTime() - 60_000).toISOString(),
        to: new Date(now.getTime() + 60_000).toISOString(),
        granularity: 'hour',
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(history.status).toBe(200);
    expect(history.body.points).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 42 })]),
    );

    const report = await request(app)
      .get('/api/reports/general')
      .query({
        from: new Date(now.getTime() - 60_000).toISOString(),
        to: new Date(now.getTime() + 60_000).toISOString(),
        nodeIds: nodeId,
        cropIds: cropId,
        sections: 'summary,readings,alerts',
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(report.status).toBe(200);
    expect(report.body.summary).toMatchObject({ nodeCount: 1, readingCount: 1, alertCount: 1 });
  });
});
