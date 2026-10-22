import request from 'supertest';
import { AlertSeverity, AlertStatus, NodeStatus } from '@prisma/client';
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

describe('dashboard', () => {
  let userId: string;
  let accessToken: string;
  let cropId: string;
  let nodeIds: string[] = [];

  beforeAll(async () => {
    if (!env.DEMO_SEED_PASSWORD) throw new Error('DEMO_SEED_PASSWORD no está configurada.');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@agrosense.local' } });
    userId = user.id;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: env.DEMO_SEED_PASSWORD });
    expect(login.status).toBe(200);
    accessToken = login.body.accessToken;

    const crop = await prisma.crop.create({
      data: { name: `Cultivo dashboard ${Date.now()}`, ranges },
    });
    cropId = crop.id;
    const firstNode = await prisma.node.create({
      data: {
        deviceId: `TEST-DASHBOARD-A-${Date.now()}`,
        name: 'Nodo dashboard A',
        cropId,
        status: NodeStatus.ONLINE,
      },
    });
    const secondNode = await prisma.node.create({
      data: {
        deviceId: `TEST-DASHBOARD-B-${Date.now()}`,
        name: 'Nodo dashboard B',
        cropId,
        status: NodeStatus.ONLINE,
      },
    });
    nodeIds = [firstNode.id, secondNode.id];
    const now = Date.now();
    await prisma.reading.createMany({
      data: [
        {
          nodeId: firstNode.id,
          humidity: 10,
          ph: 6,
          salinity: 0.5,
          soilTemp: 20,
          ambientTemp: 22,
          timestamp: new Date(now - 60 * 60 * 1000),
        },
        {
          nodeId: firstNode.id,
          humidity: 20,
          ph: 6.2,
          salinity: 0.5,
          soilTemp: 20,
          ambientTemp: 22,
          timestamp: new Date(now - 10 * 60 * 1000),
        },
        {
          nodeId: secondNode.id,
          humidity: 30,
          ph: 7,
          salinity: 1.5,
          soilTemp: 30,
          ambientTemp: 30,
          timestamp: new Date(now - 5 * 60 * 1000),
        },
      ],
    });
    await prisma.alert.create({
      data: {
        nodeId: secondNode.id,
        variable: 'humidity',
        value: 50,
        rangeMin: 20,
        rangeMax: 40,
        severity: AlertSeverity.CRITICA,
        status: AlertStatus.ACTIVA,
        message: 'Humedad crítica de prueba',
      },
    });
  });

  afterAll(async () => {
    if (nodeIds.length) {
      await prisma.alert.deleteMany({ where: { nodeId: { in: nodeIds } } });
      await prisma.reading.deleteMany({ where: { nodeId: { in: nodeIds } } });
      await prisma.node.deleteMany({ where: { id: { in: nodeIds } } });
    }
    if (cropId) await prisma.crop.deleteMany({ where: { id: cropId } });
    if (userId) await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.$disconnect();
  });

  it('requiere sesión válida y valida filtros de periodo e identificadores', async () => {
    const unauthorized = await request(app).get('/api/dashboard');
    expect(unauthorized.status).toBe(401);

    const invalidPeriod = await request(app)
      .get('/api/dashboard?period=90d')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidPeriod.status).toBe(400);

    const invalidNode = await request(app)
      .get('/api/dashboard?nodeId=invalid')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidNode.status).toBe(400);
  });

  it('agrega últimos KPIs por nodo, serie temporal, alertas y filtros', async () => {
    const response = await request(app)
      .get(`/api/dashboard?cropId=${cropId}&period=24h`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.nodeCount).toBe(2);
    expect(response.body.nodesWithReadings).toBe(2);
    expect(response.body.kpis).toMatchObject({
      humidity: { value: 25, unit: '%' },
      ph: { value: 6.6, unit: 'pH' },
      salinity: { value: 1, unit: 'dS/m' },
      soilTemp: { value: 25, unit: '°C' },
      ambientTemp: { value: 26, unit: '°C' },
    });
    expect(response.body.series.humidity.length).toBeGreaterThan(0);
    expect(response.body.semaphore.counts).toMatchObject({
      optimal: 1,
      critical: 1,
      warning: 0,
      offline: 0,
    });
    expect(response.body.alerts).toEqual([
      expect.objectContaining({ nodeId: nodeIds[1], severity: 'CRITICA' }),
    ]);
    expect(response.body.activeAlertCount).toBe(1);

    const filtered = await request(app)
      .get(`/api/dashboard?nodeId=${nodeIds[0]}&cropId=${cropId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.nodeCount).toBe(1);
    expect(filtered.body.kpis.humidity.value).toBe(20);
    expect(filtered.body.activeAlertCount).toBe(0);
  });
});
