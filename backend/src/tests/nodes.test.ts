import request from 'supertest';
import { UserRole } from '@prisma/client';
import { app } from '@/app';
import { prisma } from '@/config/db';
import { env } from '@/config/env';

describe('gestión de nodos', () => {
  let adminToken: string;
  let operatorToken: string;
  let consultationToken: string;
  let adminId: string;
  let operatorId: string;
  let consultationId: string;
  let createdNodeId: string | undefined;
  let generatedDeviceId: string;

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
    expect(adminLogin.body.user.role).toBe(UserRole.ADMIN);
    expect(operatorLogin.body.user.role).toBe(UserRole.OPERADOR);
    expect(consultationLogin.body.user.role).toBe(UserRole.CONSULTA);
    adminToken = adminLogin.body.accessToken;
    operatorToken = operatorLogin.body.accessToken;
    consultationToken = consultationLogin.body.accessToken;
    generatedDeviceId = `TEST-NODE-${Date.now()}`;
  });

  afterAll(async () => {
    if (createdNodeId) {
      await prisma.reading.deleteMany({ where: { nodeId: createdNodeId } });
      await prisma.alert.deleteMany({ where: { nodeId: createdNodeId } });
      await prisma.node.deleteMany({ where: { id: createdNodeId } });
      await prisma.auditLog.deleteMany({ where: { entityId: createdNodeId } });
    }
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminId, operatorId, consultationId] } },
    });
    await prisma.$disconnect();
  });

  it('lista nodos, filtra resultados y expone opciones de cultivo/estado', async () => {
    const listed = await request(app)
      .get('/api/nodes?search=Nodo%20Norte&status=OFFLINE')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ deviceId: 'AGRO-DEMO-001', status: 'OFFLINE' }),
      ]),
    );
    expect(listed.body.nodes).toHaveLength(1);

    const options = await request(app)
      .get('/api/nodes/options')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(options.status).toBe(200);
    expect(options.body.crops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Maíz', states: expect.any(Array) }),
      ]),
    );

    const invalidFilter = await request(app)
      .get('/api/nodes?status=UNKNOWN')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(invalidFilter.status).toBe(400);
  });

  it('permite a operador crear y reubicar nodos, valida asignación y registra auditoría', async () => {
    const created = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        deviceId: generatedDeviceId,
        name: 'Nodo de pruebas',
        notes: 'Equipo temporal',
        posX: 35,
        posY: 45,
        samplingFreq: 120,
      });
    expect(created.status).toBe(201);
    expect(created.body.node).toMatchObject({
      deviceId: generatedDeviceId,
      name: 'Nodo de pruebas',
      notes: 'Equipo temporal',
      posX: 35,
      posY: 45,
      samplingFreq: 120,
    });
    createdNodeId = created.body.node.id;

    const duplicate = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        deviceId: generatedDeviceId,
        name: 'Duplicado',
        posX: 50,
        posY: 50,
        samplingFreq: 300,
      });
    expect(duplicate.status).toBe(409);

    const outOfBounds = await request(app)
      .patch(`/api/nodes/${createdNodeId}/position`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ posX: 110, posY: 50 });
    expect(outOfBounds.status).toBe(400);

    const moved = await request(app)
      .patch(`/api/nodes/${createdNodeId}/position`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ posX: 72, posY: 28 });
    expect(moved.status).toBe(200);
    expect(moved.body.node).toMatchObject({ posX: 72, posY: 28 });

    const updated = await request(app)
      .put(`/api/nodes/${createdNodeId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Nodo de pruebas actualizado', notes: 'Ajuste de configuración' });
    expect(updated.status).toBe(200);
    expect(updated.body.node).toMatchObject({
      name: 'Nodo de pruebas actualizado',
      notes: 'Ajuste de configuración',
    });

    const [maize, tomato] = await Promise.all([
      prisma.crop.findUniqueOrThrow({ where: { name: 'Maíz' }, include: { states: true } }),
      prisma.crop.findUniqueOrThrow({ where: { name: 'Tomate' }, include: { states: true } }),
    ]);
    const mismatchedState = await request(app)
      .patch(`/api/nodes/${createdNodeId}/assign`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ cropId: maize.id, stateId: tomato.states[0].id });
    expect(mismatchedState.status).toBe(400);

    const assigned = await request(app)
      .patch(`/api/nodes/${createdNodeId}/assign`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ cropId: maize.id, stateId: maize.states[0].id });
    expect(assigned.status).toBe(200);
    expect(assigned.body.node).toMatchObject({
      cropId: maize.id,
      stateId: maize.states[0].id,
      crop: { name: 'Maíz' },
      state: { name: maize.states[0].name },
    });

    const auditEntries = await prisma.auditLog.count({
      where: { entity: 'Node', entityId: createdNodeId },
    });
    expect(auditEntries).toBe(4);
  });

  it('permite consulta de solo lectura y bloquea borrado si existen lecturas', async () => {
    if (!createdNodeId) throw new Error('El nodo de prueba no fue creado.');
    const readOnly = await request(app)
      .get('/api/nodes')
      .set('Authorization', `Bearer ${consultationToken}`);
    expect(readOnly.status).toBe(200);

    const forbidden = await request(app)
      .put(`/api/nodes/${createdNodeId}`)
      .set('Authorization', `Bearer ${consultationToken}`)
      .send({ name: 'Cambio no permitido' });
    expect(forbidden.status).toBe(403);

    await prisma.reading.create({
      data: {
        nodeId: createdNodeId,
        humidity: 40,
        ph: 6.5,
        salinity: 1,
        soilTemp: 20,
        ambientTemp: 22,
      },
    });
    const blockedDelete = await request(app)
      .delete(`/api/nodes/${createdNodeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blockedDelete.status).toBe(409);
    expect(blockedDelete.body.message).toContain('1 lectura');

    await prisma.reading.deleteMany({ where: { nodeId: createdNodeId } });
    const deleted = await request(app)
      .delete(`/api/nodes/${createdNodeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(204);
    const auditEntries = await prisma.auditLog.count({
      where: { entity: 'Node', entityId: createdNodeId },
    });
    expect(auditEntries).toBe(5);
    await prisma.auditLog.deleteMany({ where: { entity: 'Node', entityId: createdNodeId } });
    createdNodeId = undefined;
  });
});
