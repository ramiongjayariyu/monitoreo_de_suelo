import request from 'supertest';
import { NodeStatus } from '@prisma/client';
import { app } from '@/app';
import { prisma } from '@/config/db';
import { env } from '@/config/env';
import { aggregateReadings, pearsonCorrelation } from '@/services/historyService';

describe('historial de lecturas', () => {
  let userId: string;
  let accessToken: string;
  let nodeIds: string[] = [];
  let readingTimestamps: Date[] = [];

  beforeAll(async () => {
    if (!env.DEMO_SEED_PASSWORD) throw new Error('DEMO_SEED_PASSWORD no está configurada.');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@agrosense.local' } });
    userId = user.id;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: env.DEMO_SEED_PASSWORD });
    expect(login.status).toBe(200);
    accessToken = login.body.accessToken;

    const [firstNode, secondNode] = await Promise.all([
      prisma.node.create({
        data: {
          deviceId: `TEST-HISTORY-A-${Date.now()}`,
          name: 'Nodo historial A',
          status: NodeStatus.ONLINE,
        },
      }),
      prisma.node.create({
        data: {
          deviceId: `TEST-HISTORY-B-${Date.now()}`,
          name: 'Nodo historial B',
          status: NodeStatus.ONLINE,
        },
      }),
    ]);
    nodeIds = [firstNode.id, secondNode.id];
    const timestamp = new Date();
    timestamp.setUTCDate(timestamp.getUTCDate() - 1);
    timestamp.setUTCHours(10, 5, 0, 0);
    const later = new Date(timestamp);
    later.setUTCMinutes(30);
    readingTimestamps = [timestamp, later];
    await prisma.reading.createMany({
      data: [
        {
          nodeId: firstNode.id,
          humidity: 10,
          ph: 5,
          salinity: 0.2,
          soilTemp: 20,
          ambientTemp: 22,
          timestamp,
        },
        {
          nodeId: firstNode.id,
          humidity: 30,
          ph: 7,
          salinity: 0.6,
          soilTemp: 24,
          ambientTemp: 26,
          timestamp: later,
        },
        {
          nodeId: secondNode.id,
          humidity: 40,
          ph: 6,
          salinity: 0.8,
          soilTemp: 26,
          ambientTemp: 28,
          timestamp,
        },
      ],
    });
  });

  afterAll(async () => {
    if (nodeIds.length) {
      await prisma.reading.deleteMany({ where: { nodeId: { in: nodeIds } } });
      await prisma.node.deleteMany({ where: { id: { in: nodeIds } } });
    }
    if (userId) await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.$disconnect();
  });

  it('agrega por hora, día y semana; calcula correlación de Pearson', () => {
    const readings = [
      { timestamp: new Date('2026-10-20T10:05:00.000Z'), value: 10 },
      { timestamp: new Date('2026-10-20T10:30:00.000Z'), value: 30 },
      { timestamp: new Date('2026-10-21T11:00:00.000Z'), value: 40 },
    ];
    expect(aggregateReadings(readings, 'hour')).toMatchObject([
      { value: 20, count: 2 },
      { value: 40, count: 1 },
    ]);
    expect(aggregateReadings(readings, 'day')).toHaveLength(2);
    expect(aggregateReadings(readings, 'week')).toHaveLength(1);
    expect(
      pearsonCorrelation([
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
      ]),
    ).toBe(1);
    expect(
      pearsonCorrelation([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]),
    ).toBeNull();
  });

  it('requiere autenticación y rechaza variables o rangos inválidos', async () => {
    const unauthorized = await request(app).get('/api/history');
    expect(unauthorized.status).toBe(401);

    const invalidVariable = await request(app)
      .get('/api/history')
      .query({ nodeId: nodeIds[0], variable: 'pressure' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidVariable.status).toBe(400);

    const invalidRange = await request(app)
      .get('/api/history')
      .query({
        nodeId: nodeIds[0],
        variable: 'humidity',
        from: '2026-10-22T00:00:00.000Z',
        to: '2026-10-20T00:00:00.000Z',
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidRange.status).toBe(400);

    const invalidCorrelation = await request(app)
      .get('/api/history/correlation')
      .query({ nodeId: nodeIds[0], varA: 'ph', varB: 'ph' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invalidCorrelation.status).toBe(400);
  });

  it('filtra series por fechas, compara nodos y calcula correlaciones', async () => {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 3);
    const to = new Date();
    const series = await request(app)
      .get('/api/history')
      .query({
        nodeId: nodeIds[0],
        variable: 'humidity',
        granularity: 'hour',
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(series.status).toBe(200);
    expect(series.body.node.name).toBe('Nodo historial A');
    expect(series.body.points).toEqual([expect.objectContaining({ value: 20, count: 2 })]);

    const filteredSeries = await request(app)
      .get('/api/history')
      .query({
        nodeId: nodeIds[0],
        variable: 'humidity',
        granularity: 'hour',
        from: new Date(readingTimestamps[1].getTime() - 60_000).toISOString(),
        to: new Date(readingTimestamps[1].getTime() + 60_000).toISOString(),
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(filteredSeries.status).toBe(200);
    expect(filteredSeries.body.points).toEqual([expect.objectContaining({ value: 30, count: 1 })]);

    const compared = await request(app)
      .get('/api/history/compare')
      .query({
        nodeIds: nodeIds.join(','),
        variable: 'humidity',
        granularity: 'hour',
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(compared.status).toBe(200);
    expect(compared.body.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: nodeIds[0],
          points: [expect.objectContaining({ value: 20 })],
        }),
        expect.objectContaining({
          nodeId: nodeIds[1],
          points: [expect.objectContaining({ value: 40 })],
        }),
      ]),
    );

    const correlation = await request(app)
      .get('/api/history/correlation')
      .query({
        nodeId: nodeIds[0],
        varA: 'humidity',
        varB: 'ph',
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(correlation.status).toBe(200);
    expect(correlation.body).toMatchObject({
      coefficient: 1,
      sampleCount: 2,
      variables: { varA: 'humidity', varB: 'ph' },
    });
  });
});
