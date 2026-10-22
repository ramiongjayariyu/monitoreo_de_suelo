import request from 'supertest';
import { NodeStatus } from '@prisma/client';
import { app } from '@/app';
import { prisma } from '@/config/db';
import { env } from '@/config/env';
import { ReportService } from '@/services/reportService';

describe('reportes', () => {
  let userId: string;
  let accessToken: string;
  let cropId: string;
  let nodeIds: string[] = [];
  let createdAfter: Date;

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
      data: {
        name: `Cultivo reportes ${Date.now()}`,
        ranges: {
          humidity: { min: 20, max: 40 },
          ph: { min: 5, max: 7 },
          salinity: { min: 0, max: 2 },
          soilTemp: { min: 15, max: 30 },
          ambientTemp: { min: 10, max: 35 },
        },
      },
    });
    cropId = crop.id;
    const [nodeA, nodeB] = await Promise.all([
      prisma.node.create({
        data: {
          deviceId: `TEST-REPORT-A-${Date.now()}`,
          name: 'Nodo reporte A',
          cropId,
          status: NodeStatus.ONLINE,
        },
      }),
      prisma.node.create({
        data: {
          deviceId: `TEST-REPORT-B-${Date.now()}`,
          name: 'Nodo reporte B',
          cropId,
          status: NodeStatus.ONLINE,
        },
      }),
    ]);
    nodeIds = [nodeA.id, nodeB.id];
    const timestamp = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.reading.create({
      data: {
        nodeId: nodeA.id,
        humidity: 35,
        ph: 6.4,
        salinity: 1.2,
        soilTemp: 24,
        ambientTemp: 27,
        timestamp,
      },
    });
    await prisma.alert.create({
      data: {
        nodeId: nodeA.id,
        variable: 'humidity',
        value: 45,
        rangeMin: 20,
        rangeMax: 40,
        severity: 'CRITICA',
        status: 'ACTIVA',
        message: 'Alerta de prueba para reporte',
        createdAt: timestamp,
      },
    });
    createdAfter = new Date();
  });

  afterAll(async () => {
    if (userId) {
      await prisma.reportRecord.deleteMany({
        where: { userId, createdAt: { gte: createdAfter } },
      });
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }
    if (nodeIds.length) {
      await prisma.alert.deleteMany({ where: { nodeId: { in: nodeIds } } });
      await prisma.reading.deleteMany({ where: { nodeId: { in: nodeIds } } });
      await prisma.node.deleteMany({ where: { id: { in: nodeIds } } });
    }
    if (cropId) await prisma.crop.deleteMany({ where: { id: cropId } });
    await prisma.$disconnect();
  });

  function validFilters() {
    return {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(Date.now() + 60_000).toISOString(),
      nodeIds: nodeIds[0],
      cropIds: cropId,
      sections: 'summary,readings,alerts',
    };
  }

  it('valida autorización, filtros, fechas y secciones', async () => {
    const unauthenticated = await request(app).get('/api/reports/general').query(validFilters());
    expect(unauthenticated.status).toBe(401);

    const invalid = await request(app)
      .get('/api/reports/general')
      .query({ ...validFilters(), sections: 'other' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalid.status).toBe(400);

    const tooLong = await request(app)
      .get('/api/reports/general')
      .query({
        ...validFilters(),
        from: new Date(Date.now() - 367 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(tooLong.status).toBe(400);
  });

  it('previsualiza los datos aplicando filtros por nodo y cultivo', async () => {
    const response = await request(app)
      .get('/api/reports/general')
      .query(validFilters())
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({
      nodeCount: 1,
      readingCount: 1,
      alertCount: 1,
      averages: { humidity: 35, ph: 6.4 },
      severityCounts: { CRITICA: 1 },
    });
    expect(response.body.readings[0].nodeId).toBe(nodeIds[0]);
    expect(response.body.nodes[0].crop.id).toBe(cropId);
  });

  it.each([
    ['pdf', 'application/pdf'],
    ['excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ] as const)('genera archivo %s', async (format, contentType) => {
    const response = await request(app)
      .get('/api/reports/export')
      .query({ ...validFilters(), format })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain(contentType);
    expect(response.headers['content-disposition']).toContain(format === 'pdf' ? '.pdf' : '.xlsx');
    expect(Number(response.headers['content-length'])).toBeGreaterThan(100);
  });

  it('genera contenidos binarios válidos de PDF y Excel', async () => {
    const service = new ReportService();
    const filters = {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(Date.now() + 60_000).toISOString(),
      nodeIds: [nodeIds[0]],
      cropIds: [cropId],
      sections: { summary: true, readings: true, alerts: true },
    };
    const pdf = await service.createExport(filters, 'pdf', userId);
    const excel = await service.createExport(filters, 'excel', userId);
    expect(pdf.content.subarray(0, 4).toString()).toBe('%PDF');
    expect(excel.content.subarray(0, 2).toString()).toBe('PK');
  });

  it('crea enlaces temporales de descarga, los sirve sin sesión y lista el historial', async () => {
    const share = await request(app)
      .post('/api/reports/share')
      .send({ ...validFilters(), format: 'pdf' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(share.status).toBe(201);
    expect(share.body.token).toMatch(/^[\w-]{40,60}$/);

    const download = await request(app).get(`/api/reports/share/${share.body.token}`);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('application/pdf');
    expect(Number(download.headers['content-length'])).toBeGreaterThan(100);

    const history = await request(app)
      .get('/api/reports/history')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(history.status).toBe(200);
    expect(history.body.reports.length).toBeGreaterThan(0);

    const expired = await request(app).get(`/api/reports/share/${'x'.repeat(48)}`);
    expect(expired.status).toBe(404);
  });
});
