import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/config/db';
import { env } from '@/config/env';

const validRanges = {
  humidity: { min: 20, max: 40 },
  ph: { min: 5, max: 7 },
  salinity: { min: 0, max: 2 },
  soilTemp: { min: 15, max: 30 },
  ambientTemp: { min: 10, max: 35 },
};

describe('gestión de estados del cultivo', () => {
  let adminToken: string;
  let operatorToken: string;
  let consultationToken: string;
  let adminId: string;
  let operatorId: string;
  let consultationId: string;
  let cropId: string;
  let associatedNodeId: string | undefined;
  let activeStateId: string | undefined;
  let secondStateId: string | undefined;
  let associatedStateId: string | undefined;

  beforeAll(async () => {
    if (!env.DEMO_SEED_PASSWORD) throw new Error('DEMO_SEED_PASSWORD no está configurada.');
    const [admin, operator, consultation] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'admin@agrosense.local' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'operador@agrosense.local' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'consulta@agrosense.local' } }),
    ]);
    adminId = admin.id;
    operatorId = operator.id;
    consultationId = consultation.id;
    const [adminLogin, operatorLogin, consultationLogin] = await Promise.all([
      request(app)
        .post('/api/auth/login')
        .send({ email: admin.email, password: env.DEMO_SEED_PASSWORD }),
      request(app)
        .post('/api/auth/login')
        .send({ email: operator.email, password: env.DEMO_SEED_PASSWORD }),
      request(app)
        .post('/api/auth/login')
        .send({ email: consultation.email, password: env.DEMO_SEED_PASSWORD }),
    ]);
    expect(adminLogin.status).toBe(200);
    expect(operatorLogin.status).toBe(200);
    expect(consultationLogin.status).toBe(200);
    adminToken = adminLogin.body.accessToken;
    operatorToken = operatorLogin.body.accessToken;
    consultationToken = consultationLogin.body.accessToken;

    const crop = await prisma.crop.create({
      data: { name: `Cultivo estados ${Date.now()}`, ranges: validRanges },
    });
    cropId = crop.id;
  });

  afterAll(async () => {
    if (associatedNodeId) await prisma.node.deleteMany({ where: { id: associatedNodeId } });
    if (cropId) await prisma.cropState.deleteMany({ where: { cropId } });
    if (cropId) await prisma.crop.deleteMany({ where: { id: cropId } });
    if (cropId) await prisma.auditLog.deleteMany({ where: { entityId: cropId } });
    for (const id of [activeStateId, secondStateId, associatedStateId]) {
      if (id) await prisma.auditLog.deleteMany({ where: { entityId: id } });
    }
    if (adminId && operatorId && consultationId) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: [adminId, operatorId, consultationId] } },
      });
    }
    await prisma.$disconnect();
  });

  it('lista cronológicamente, valida roles, campos, rangos y orden único', async () => {
    const initial = await request(app)
      .get(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${consultationToken}`);
    expect(initial.status).toBe(200);
    expect(initial.body.crop.id).toBe(cropId);
    expect(initial.body.states).toEqual([]);
    const adminRead = await request(app)
      .get(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRead.status).toBe(200);

    const forbidden = await request(app)
      .post(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${consultationToken}`)
      .send({ name: 'Vivero', order: 1, ranges: validRanges });
    expect(forbidden.status).toBe(403);

    const invalidRanges = await request(app)
      .post(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Vivero', order: 1, ranges: { ...validRanges, ph: { min: 7, max: 5 } } });
    expect(invalidRanges.status).toBe(400);

    const active = await request(app)
      .post(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Vivero', order: 1, ranges: validRanges, isActive: true });
    expect(active.status).toBe(201);
    expect(active.body.state).toMatchObject({ name: 'Vivero', order: 1, isActive: true });
    activeStateId = active.body.state.id;

    const second = await request(app)
      .post(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Crecimiento', order: 2, ranges: validRanges });
    expect(second.status).toBe(201);
    secondStateId = second.body.state.id;

    const duplicateOrder = await request(app)
      .post(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Fructificación', order: 2, ranges: validRanges });
    expect(duplicateOrder.status).toBe(409);

    const updated = await request(app)
      .put(`/api/crops/states/${secondStateId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ order: 3, ranges: { ...validRanges, humidity: { min: 25, max: 45 } } });
    expect(updated.status).toBe(200);
    expect(updated.body.state).toMatchObject({
      order: 3,
      ranges: { humidity: { min: 25, max: 45 } },
    });
  });

  it('activa un único estado, registra auditoría y bloquea eliminaciones dependientes', async () => {
    if (!activeStateId || !secondStateId)
      throw new Error('Los estados de prueba no fueron creados.');

    const activate = await request(app)
      .patch(`/api/crops/states/${secondStateId}/activate`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(activate.status).toBe(200);
    expect(activate.body.state.isActive).toBe(true);
    expect(await prisma.cropState.count({ where: { cropId, isActive: true } })).toBe(1);
    expect(
      await prisma.cropState.findUniqueOrThrow({ where: { id: activeStateId } }),
    ).toMatchObject({ isActive: false });

    const activeDelete = await request(app)
      .delete(`/api/crops/states/${secondStateId}`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(activeDelete.status).toBe(409);

    const associated = await request(app)
      .post(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Fructificación', order: 2, ranges: validRanges });
    expect(associated.status).toBe(201);
    associatedStateId = associated.body.state.id;
    const node = await prisma.node.create({
      data: {
        deviceId: `TEST-STATE-${Date.now()}`,
        name: 'Nodo asignado a estado',
        cropId,
        stateId: associatedStateId,
        posX: 30,
        posY: 40,
        samplingFreq: 300,
      },
    });
    associatedNodeId = node.id;

    const associatedDelete = await request(app)
      .delete(`/api/crops/states/${associatedStateId}`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(associatedDelete.status).toBe(409);
    expect(associatedDelete.body.message).toContain('nodo');
    await expect(
      prisma.node.findUniqueOrThrow({ where: { id: associatedNodeId } }),
    ).resolves.toMatchObject({ stateId: associatedStateId });

    const unassociatedDelete = await request(app)
      .delete(`/api/crops/states/${activeStateId}`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(unassociatedDelete.status).toBe(204);

    const states = await request(app)
      .get(`/api/crops/${cropId}/states`)
      .set('Authorization', `Bearer ${consultationToken}`);
    expect(states.body.states.map((state: { order: number }) => state.order)).toEqual([2, 3]);
    expect(
      await prisma.auditLog.count({ where: { entity: 'CropState', entityId: secondStateId } }),
    ).toBe(3);
  });
});
