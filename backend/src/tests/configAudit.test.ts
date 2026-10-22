import request from 'supertest';
import { AlertSeverity, NodeStatus } from '@prisma/client';
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

describe('configuración y auditoría', () => {
  let userId: string;
  let accessToken: string;
  let cropId: string;
  let stateId: string;
  let nodeId: string;
  let defaultNodeId: string;
  let createdUserId: string;
  let uniqueAction: string;
  let originalThresholds: unknown;
  let hadThresholdConfig = false;
  let originalSettings: unknown;
  let hadSettingsConfig = false;

  beforeAll(async () => {
    if (!env.DEMO_SEED_PASSWORD) throw new Error('DEMO_SEED_PASSWORD no está configurada.');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@agrosense.local' } });
    userId = user.id;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: env.DEMO_SEED_PASSWORD });
    expect(login.status).toBe(200);
    accessToken = login.body.accessToken;

    const [thresholdRecord, settingsRecord] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'alertSeverityThresholds' } }),
      prisma.systemConfig.findUnique({ where: { key: 'systemSettings' } }),
    ]);
    hadThresholdConfig = Boolean(thresholdRecord);
    originalThresholds = thresholdRecord?.value;
    hadSettingsConfig = Boolean(settingsRecord);
    originalSettings = settingsRecord?.value;

    const crop = await prisma.crop.create({
      data: { name: `Cultivo config ${Date.now()}`, ranges },
    });
    cropId = crop.id;
    const state = await prisma.cropState.create({
      data: { cropId, name: 'Estado config', order: 1, isActive: true, ranges },
    });
    stateId = state.id;
    const node = await prisma.node.create({
      data: {
        deviceId: `TEST-CONFIG-${Date.now()}`,
        name: 'Nodo configuración',
        cropId,
        stateId,
        status: NodeStatus.OFFLINE,
      },
    });
    nodeId = node.id;
    uniqueAction = `AUDIT_FILTER_TEST_${Date.now()}`;
  });

  afterAll(async () => {
    if (nodeId) {
      await prisma.alert.deleteMany({ where: { nodeId } });
      await prisma.reading.deleteMany({ where: { nodeId } });
      await prisma.node.deleteMany({ where: { id: nodeId } });
    }
    if (defaultNodeId) await prisma.node.deleteMany({ where: { id: defaultNodeId } });
    await prisma.node.deleteMany({
      where: { deviceId: { startsWith: 'TEST-CONFIG-DEFAULT-' } },
    });
    if (stateId) await prisma.cropState.deleteMany({ where: { id: stateId } });
    if (cropId) await prisma.crop.deleteMany({ where: { id: cropId } });
    if (createdUserId) await prisma.user.deleteMany({ where: { id: createdUserId } });
    if (uniqueAction) await prisma.auditLog.deleteMany({ where: { action: uniqueAction } });
    if (hadThresholdConfig) {
      await prisma.systemConfig.upsert({
        where: { key: 'alertSeverityThresholds' },
        create: { key: 'alertSeverityThresholds', value: originalThresholds as object },
        update: { value: originalThresholds as object },
      });
    } else {
      await prisma.systemConfig.deleteMany({ where: { key: 'alertSeverityThresholds' } });
    }
    if (hadSettingsConfig) {
      await prisma.systemConfig.upsert({
        where: { key: 'systemSettings' },
        create: { key: 'systemSettings', value: originalSettings as object },
        update: { value: originalSettings as object },
      });
    } else {
      await prisma.systemConfig.deleteMany({ where: { key: 'systemSettings' } });
    }
    if (userId) await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.$disconnect();
  });

  function configPayload() {
    return {
      severityThresholds: {
        humidity: { warning: 10, critical: 30 },
        ph: { warning: 5, critical: 15 },
        salinity: { warning: 5, critical: 15 },
        soilTemp: { warning: 5, critical: 15 },
        ambientTemp: { warning: 5, critical: 15 },
      },
      system: {
        defaultSamplingFrequency: 120,
        units: {
          humidity: '%',
          ph: 'pH',
          salinity: 'dS/m',
          soilTemp: '°C',
          ambientTemp: '°C',
        },
        timeZone: 'UTC',
        language: 'es',
      },
    };
  }

  it('administra la configuración con permisos y valida los umbrales', async () => {
    const unauthorized = await request(app).get('/api/config');
    expect(unauthorized.status).toBe(401);

    const initial = await request(app)
      .get('/api/config')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(initial.status).toBe(200);
    expect(initial.body.severityThresholds.humidity).toEqual({
      warning: 5,
      critical: 15,
    });

    const invalid = await request(app)
      .put('/api/config')
      .send({
        severityThresholds: {
          humidity: { warning: 20, critical: 10 },
        },
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalid.status).toBe(400);

    const updated = await request(app)
      .put('/api/config')
      .send(configPayload())
      .set('Authorization', `Bearer ${accessToken}`);
    expect(updated.status).toBe(200);
    expect(updated.body.system).toMatchObject({
      defaultSamplingFrequency: 120,
      timeZone: 'UTC',
    });
    expect(updated.body.severityThresholds.humidity).toEqual({
      warning: 10,
      critical: 30,
    });

    const newNode = await request(app)
      .post('/api/nodes')
      .send({
        deviceId: `TEST-CONFIG-DEFAULT-${Date.now()}`,
        name: 'Nodo frecuencia configurada',
        cropId: null,
        stateId: null,
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(newNode.status).toBe(201);
    defaultNodeId = newNode.body.node.id;
    expect(newNode.body.node.samplingFreq).toBe(120);
    await prisma.node.delete({ where: { id: newNode.body.node.id } });
  });

  it('los umbrales configurados cambian la severidad de las alertas', async () => {
    const updated = await request(app)
      .put('/api/config')
      .send(configPayload())
      .set('Authorization', `Bearer ${accessToken}`);
    expect(updated.status).toBe(200);

    const ingestion = await request(app)
      .post('/api/ingest')
      .set('x-api-key', env.INGEST_API_KEY)
      .send({
        deviceId: (await prisma.node.findUniqueOrThrow({ where: { id: nodeId } })).deviceId,
        humidity: 44,
        ph: 6,
        salinity: 1,
        soilTemp: 22,
        ambientTemp: 24,
      });
    expect(ingestion.status).toBe(201);
    const alert = await prisma.alert.findFirstOrThrow({ where: { nodeId } });
    expect(alert.severity).toBe(AlertSeverity.ADVERTENCIA);
  });

  it('registra acciones críticas y filtra la auditoría con paginación', async () => {
    const userEmail = `audit-${Date.now()}@agrosense.local`;
    const requestStartedAt = new Date();
    const createdUser = await request(app)
      .post('/api/users')
      .send({
        name: 'Usuario auditoría',
        email: userEmail,
        role: 'CONSULTA',
        password: 'TestPassword2026!',
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(createdUser.status).toBe(201);
    createdUserId = createdUser.body.user.id;
    await prisma.auditLog.create({
      data: {
        userId,
        action: uniqueAction,
        entity: 'ConfigTest',
        entityId: nodeId,
        changes: { test: true },
      },
    });

    let middlewareAudit = null;
    for (let attempt = 0; attempt < 10 && !middlewareAudit; attempt += 1) {
      middlewareAudit = await prisma.auditLog.findFirst({
        where: {
          action: 'USER_CREATED',
          userId,
          entityId: null,
          timestamp: { gte: requestStartedAt },
        },
      });
      if (!middlewareAudit) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(middlewareAudit).not.toBeNull();
    expect(middlewareAudit?.changes).toMatchObject({
      method: 'POST',
      path: '/',
      statusCode: 201,
    });

    const filtered = await request(app)
      .get('/api/audit')
      .query({ action: uniqueAction, entity: 'ConfigTest', userId, page: 1, pageSize: 1 })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body).toMatchObject({ total: 1, page: 1, pageSize: 1 });
    expect(filtered.body.items[0]).toMatchObject({
      action: uniqueAction,
      entity: 'ConfigTest',
      user: { id: userId },
    });

    const invalidDates = await request(app)
      .get('/api/audit')
      .query({ from: '2026-10-22T00:00:00.000Z', to: '2026-10-20T00:00:00.000Z' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidDates.status).toBe(400);
  });
});
