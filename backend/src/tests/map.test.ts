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

describe('mapa de nodos', () => {
  let userId: string;
  let accessToken: string;
  let cropId: string;
  let stateId: string;
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
      data: { name: `Cultivo mapa ${Date.now()}`, ranges },
    });
    cropId = crop.id;
    const state = await prisma.cropState.create({
      data: { cropId, name: 'Estado mapa', order: 1, isActive: true, ranges },
    });
    stateId = state.id;
    const [onlineNode, offlineNode] = await Promise.all([
      prisma.node.create({
        data: {
          deviceId: `TEST-MAP-ONLINE-${Date.now()}`,
          name: 'Nodo crítico mapa',
          cropId,
          stateId,
          posX: 26,
          posY: 37,
          status: NodeStatus.ONLINE,
        },
      }),
      prisma.node.create({
        data: {
          deviceId: `TEST-MAP-OFFLINE-${Date.now()}`,
          name: 'Nodo sin lectura mapa',
          cropId,
          stateId,
          posX: 75,
          posY: 68,
          status: NodeStatus.OFFLINE,
        },
      }),
    ]);
    nodeIds = [onlineNode.id, offlineNode.id];
    await prisma.reading.create({
      data: {
        nodeId: onlineNode.id,
        humidity: 50,
        ph: 6,
        salinity: 1,
        soilTemp: 22,
        ambientTemp: 24,
      },
    });
    await prisma.alert.create({
      data: {
        nodeId: onlineNode.id,
        variable: 'humidity',
        value: 50,
        rangeMin: 20,
        rangeMax: 40,
        severity: AlertSeverity.CRITICA,
        status: AlertStatus.ACTIVA,
        message: 'Humedad crítica de prueba.',
      },
    });
  });

  afterAll(async () => {
    if (nodeIds.length) {
      await prisma.alert.deleteMany({ where: { nodeId: { in: nodeIds } } });
      await prisma.reading.deleteMany({ where: { nodeId: { in: nodeIds } } });
      await prisma.node.deleteMany({ where: { id: { in: nodeIds } } });
    }
    if (stateId) await prisma.cropState.deleteMany({ where: { id: stateId } });
    if (cropId) await prisma.crop.deleteMany({ where: { id: cropId } });
    if (userId) await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.$disconnect();
  });

  it('requiere autenticación y valida filtros de mapa', async () => {
    const unauthorized = await request(app).get('/api/nodes/map');
    expect(unauthorized.status).toBe(401);

    const invalid = await request(app)
      .get('/api/nodes/map?alertLevel=URGENTE')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalid.status).toBe(400);
  });

  it('calcula estado, lecturas y alertas; filtra por cultivo, etapa, conexión y nivel', async () => {
    const listed = await request(app)
      .get('/api/nodes/map')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: nodeIds[0],
          posX: 26,
          posY: 37,
          mapStatus: 'critical',
          alertLevel: 'CRITICA',
          readings: [expect.objectContaining({ humidity: 50 })],
          alerts: [expect.objectContaining({ message: 'Humedad crítica de prueba.' })],
        }),
        expect.objectContaining({
          id: nodeIds[1],
          mapStatus: 'offline',
          alertLevel: 'NONE',
          readings: [],
        }),
      ]),
    );

    const filtered = await request(app)
      .get(`/api/nodes/map?cropId=${cropId}&state=${stateId}&alertLevel=CRITICA`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.nodes).toHaveLength(1);
    expect(filtered.body.nodes[0]).toMatchObject({
      id: nodeIds[0],
      state: { id: stateId },
      mapStatus: 'critical',
    });

    const offline = await request(app)
      .get('/api/nodes/map?connection=OFFLINE&alertLevel=NONE')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(offline.status).toBe(200);
    expect(offline.body.nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: nodeIds[1], mapStatus: 'offline' })]),
    );
  });
});
