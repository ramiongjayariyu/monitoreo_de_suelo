import request from 'supertest';
import { UserRole } from '@prisma/client';
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

describe('gestión de cultivos', () => {
  let adminToken: string;
  let operatorToken: string;
  let consultationToken: string;
  let adminId: string;
  let operatorId: string;
  let consultationId: string;
  let createdCropId: string | undefined;
  const cropName = `Cultivo de prueba ${Date.now()}`;

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
  });

  afterAll(async () => {
    if (createdCropId) {
      await prisma.node.updateMany({
        where: { cropId: createdCropId },
        data: { cropId: null, stateId: null },
      });
      await prisma.cropState.deleteMany({ where: { cropId: createdCropId } });
      await prisma.crop.deleteMany({ where: { id: createdCropId } });
      await prisma.auditLog.deleteMany({ where: { entityId: createdCropId } });
    }
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminId, operatorId, consultationId] } },
    });
    await prisma.$disconnect();
  });

  it('lista cultivos con conteos y rangos base, valida roles y filtros', async () => {
    const listed = await request(app)
      .get('/api/crops?search=Maíz')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body.crops).toHaveLength(1);
    expect(listed.body.crops[0]).toMatchObject({
      name: 'Maíz',
      _count: { nodes: 2, states: 4 },
      ranges: { humidity: { min: 25, max: 40 } },
    });

    const forbidden = await request(app)
      .post('/api/crops')
      .set('Authorization', `Bearer ${consultationToken}`)
      .send({ name: cropName, ranges: validRanges });
    expect(forbidden.status).toBe(403);

    const invalidFilter = await request(app)
      .get('/api/crops?other=value')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(invalidFilter.status).toBe(400);
  });

  it('crea, valida, edita y elimina cultivos con auditoría', async () => {
    const invalid = await request(app)
      .post('/api/crops')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        name: cropName,
        ranges: { ...validRanges, ph: { min: 7, max: 5 } },
      });
    expect(invalid.status).toBe(400);
    expect(invalid.body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'ranges.ph' })]),
    );

    const created = await request(app)
      .post('/api/crops')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: cropName, description: 'Cultivo temporal', ranges: validRanges });
    expect(created.status).toBe(201);
    expect(created.body.crop).toMatchObject({
      name: cropName,
      description: 'Cultivo temporal',
      ranges: validRanges,
      _count: { nodes: 0, states: 0 },
    });
    createdCropId = created.body.crop.id;

    const duplicate = await request(app)
      .post('/api/crops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: cropName, ranges: validRanges });
    expect(duplicate.status).toBe(409);

    const updatedRanges = { ...validRanges, humidity: { min: 25, max: 45 } };
    const updated = await request(app)
      .put(`/api/crops/${createdCropId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: `${cropName} editado`, ranges: updatedRanges });
    expect(updated.status).toBe(200);
    expect(updated.body.crop).toMatchObject({
      name: `${cropName} editado`,
      ranges: updatedRanges,
    });

    const auditEntries = await prisma.auditLog.count({
      where: { entity: 'Crop', entityId: createdCropId },
    });
    expect(auditEntries).toBe(2);

    const deleted = await request(app)
      .delete(`/api/crops/${createdCropId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(204);
    const finalAuditEntries = await prisma.auditLog.count({
      where: { entity: 'Crop', entityId: createdCropId },
    });
    expect(finalAuditEntries).toBe(3);
    await prisma.auditLog.deleteMany({ where: { entity: 'Crop', entityId: createdCropId } });
    createdCropId = undefined;
  });

  it('bloquea eliminación si el cultivo tiene nodos o estados asociados', async () => {
    const tomato = await prisma.crop.findUniqueOrThrow({ where: { name: 'Tomate' } });
    const response = await request(app)
      .delete(`/api/crops/${tomato.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('asociados');

    const missing = await request(app)
      .put('/api/crops/cmissing0000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'No existe' });
    expect(missing.status).toBe(404);
  });
});
