import request from 'supertest';
import { AlertStatus } from '@prisma/client';
import { app } from '@/app';
import { prisma } from '@/config/db';
import { env } from '@/config/env';

const ranges = {
  humidity: { min: 10, max: 20 },
  ph: { min: 5, max: 7 },
  salinity: { min: 0, max: 2 },
  soilTemp: { min: 15, max: 30 },
  ambientTemp: { min: 10, max: 35 },
};

describe('ingesta y gestión de alertas', () => {
  let nodeId: string;
  let deviceId: string;
  let cropId: string;
  let stateId: string;
  let userId: string;
  let accessToken: string;

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
      data: { name: `Cultivo alertas ${Date.now()}`, ranges },
    });
    cropId = crop.id;
    const state = await prisma.cropState.create({
      data: { cropId, name: 'Etapa vigente', order: 1, isActive: true, ranges },
    });
    stateId = state.id;
    deviceId = `TEST-INGEST-${Date.now()}`;
    const node = await prisma.node.create({
      data: { deviceId, name: 'Nodo de ingesta', cropId, stateId },
    });
    nodeId = node.id;
    await prisma.systemConfig.upsert({
      where: { key: 'alertSeverityThresholds' },
      update: { value: { warning: 5, critical: 15 } },
      create: { key: 'alertSeverityThresholds', value: { warning: 5, critical: 15 } },
    });
  });

  afterAll(async () => {
    if (nodeId) {
      await prisma.alert.deleteMany({ where: { nodeId } });
      await prisma.reading.deleteMany({ where: { nodeId } });
      await prisma.node.deleteMany({ where: { id: nodeId } });
    }
    if (stateId) await prisma.cropState.deleteMany({ where: { id: stateId } });
    if (cropId) await prisma.crop.deleteMany({ where: { id: cropId } });
    if (userId) await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.$disconnect();
  });

  function sendReading(humidity: number) {
    return request(app).post('/api/ingest').set('x-api-key', env.INGEST_API_KEY).send({
      deviceId,
      humidity,
      ph: 6,
      salinity: 1,
      soilTemp: 22,
      ambientTemp: 25,
    });
  }

  it('protege la ingesta con API key y valida las lecturas', async () => {
    const unauthorized = await request(app).post('/api/ingest').send({});
    expect(unauthorized.status).toBe(401);

    const invalid = await request(app)
      .post('/api/ingest')
      .set('x-api-key', env.INGEST_API_KEY)
      .send({ deviceId, humidity: 'húmedo' });
    expect(invalid.status).toBe(400);

    const accepted = await sendReading(15);
    expect(accepted.status).toBe(201);
    expect(accepted.body.reading).toMatchObject({ nodeId, humidity: 15 });
    expect(accepted.body.alerts).toHaveLength(0);
    await expect(prisma.node.findUniqueOrThrow({ where: { id: nodeId } })).resolves.toMatchObject({
      status: 'ONLINE',
    });
  });

  it('clasifica desviaciones, evita duplicados abiertos y emite acciones de estado', async () => {
    const info = await sendReading(20.2);
    expect(info.status).toBe(201);
    expect(info.body.alerts).toHaveLength(1);
    expect(info.body.alerts[0].severity).toBe('INFO');
    const alertId = info.body.alerts[0].id as string;

    const duplicate = await sendReading(21);
    expect(duplicate.body.alerts).toHaveLength(0);

    const read = await request(app)
      .patch(`/api/alerts/${alertId}/read`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(read.status).toBe(200);
    expect(read.body.alert.status).toBe(AlertStatus.LEIDA);

    const silenced = await request(app)
      .patch(`/api/alerts/${alertId}/silence`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(silenced.status).toBe(200);
    expect(silenced.body.alert.status).toBe(AlertStatus.SILENCIADA);

    const closed = await request(app)
      .patch(`/api/alerts/${alertId}/close`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(closed.status).toBe(200);
    expect(closed.body.alert.status).toBe(AlertStatus.CERRADA);

    const warning = await sendReading(21);
    expect(warning.body.alerts[0].severity).toBe('ADVERTENCIA');
    await prisma.alert.update({
      where: { id: warning.body.alerts[0].id },
      data: { status: AlertStatus.CERRADA },
    });
    const critical = await sendReading(22);
    expect(critical.body.alerts[0].severity).toBe('CRITICA');

    const filtered = await request(app)
      .get('/api/alerts?severity=CRITICA&status=ACTIVA')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.alerts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: critical.body.alerts[0].id })]),
    );
  });
});
