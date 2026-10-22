import 'dotenv/config';
import { hash } from 'bcrypt';
import { Prisma, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const rangeSet = (
  humidity: [number, number],
  ph: [number, number],
  salinity: [number, number],
  soilTemp: [number, number],
  ambientTemp: [number, number],
): Prisma.InputJsonValue => ({
  humidity: { min: humidity[0], max: humidity[1] },
  ph: { min: ph[0], max: ph[1] },
  salinity: { min: salinity[0], max: salinity[1] },
  soilTemp: { min: soilTemp[0], max: soilTemp[1] },
  ambientTemp: { min: ambientTemp[0], max: ambientTemp[1] },
});

async function main(): Promise<void> {
  const demoPassword = process.env.DEMO_SEED_PASSWORD;

  if (!demoPassword || demoPassword.length < 12) {
    throw new Error(
      'Configura DEMO_SEED_PASSWORD (mínimo 12 caracteres) en .env para cargar la demo.',
    );
  }

  const passwordHash = await hash(demoPassword, 12);
  const userData = [
    { email: 'admin@agrosense.local', name: 'Administración AgroSense', role: UserRole.ADMIN },
    { email: 'operador@agrosense.local', name: 'Operación AgroSense', role: UserRole.OPERADOR },
    { email: 'consulta@agrosense.local', name: 'Consulta AgroSense', role: UserRole.CONSULTA },
  ] as const;

  for (const user of userData) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash, active: true },
      create: { ...user, passwordHash },
    });
  }

  const crops = [
    {
      name: 'Maíz',
      description: 'Cultivo de demostración de maíz.',
      ranges: [
        rangeSet([25, 40], [5.5, 7], [0, 2], [18, 30], [15, 35]),
        rangeSet([30, 45], [5.5, 7], [0, 2], [20, 32], [18, 36]),
        rangeSet([35, 50], [5.8, 7.2], [0, 2], [20, 30], [18, 34]),
        rangeSet([25, 40], [5.5, 7], [0, 2], [18, 28], [15, 32]),
      ],
    },
    {
      name: 'Tomate',
      description: 'Cultivo de demostración de tomate.',
      ranges: [
        rangeSet([30, 45], [5.5, 6.8], [0, 2], [18, 28], [16, 32]),
        rangeSet([35, 50], [5.5, 6.8], [0, 2], [20, 30], [18, 34]),
        rangeSet([40, 55], [5.8, 6.8], [0, 2], [20, 28], [18, 32]),
        rangeSet([30, 45], [5.5, 6.8], [0, 2], [18, 27], [16, 30]),
      ],
    },
  ] as const;

  const statesByCrop = new Map<string, string[]>();
  const stateNames = ['Siembra', 'Crecimiento', 'Floración', 'Cosecha'];

  for (const cropData of crops) {
    const crop = await prisma.crop.upsert({
      where: { name: cropData.name },
      update: { description: cropData.description, ranges: cropData.ranges[0] },
      create: {
        name: cropData.name,
        description: cropData.description,
        ranges: cropData.ranges[0],
      },
    });
    const stateIds: string[] = [];

    for (const [index, name] of stateNames.entries()) {
      const state = await prisma.cropState.upsert({
        where: { cropId_name: { cropId: crop.id, name } },
        update: {
          order: index + 1,
          isActive: index === 1,
          ranges: cropData.ranges[index],
        },
        create: {
          cropId: crop.id,
          name,
          order: index + 1,
          isActive: index === 1,
          ranges: cropData.ranges[index],
        },
      });
      stateIds.push(state.id);
    }

    statesByCrop.set(crop.name, stateIds);
  }

  const maizeStates = statesByCrop.get('Maíz');
  const tomatoStates = statesByCrop.get('Tomate');

  if (!maizeStates || !tomatoStates) {
    throw new Error('No se pudieron preparar los estados de los cultivos de demostración.');
  }

  const nodes = [
    {
      deviceId: 'AGRO-DEMO-001',
      name: 'Nodo Norte',
      cropName: 'Maíz',
      stateId: maizeStates[1],
      posX: 25,
      posY: 30,
    },
    {
      deviceId: 'AGRO-DEMO-002',
      name: 'Nodo Centro',
      cropName: 'Maíz',
      stateId: maizeStates[1],
      posX: 50,
      posY: 50,
    },
    {
      deviceId: 'AGRO-DEMO-003',
      name: 'Nodo Sur',
      cropName: 'Tomate',
      stateId: tomatoStates[1],
      posX: 75,
      posY: 70,
    },
  ] as const;

  for (const node of nodes) {
    const crop = await prisma.crop.findUniqueOrThrow({ where: { name: node.cropName } });
    await prisma.node.upsert({
      where: { deviceId: node.deviceId },
      update: {
        name: node.name,
        cropId: crop.id,
        stateId: node.stateId,
        posX: node.posX,
        posY: node.posY,
      },
      create: {
        deviceId: node.deviceId,
        name: node.name,
        cropId: crop.id,
        stateId: node.stateId,
        posX: node.posX,
        posY: node.posY,
      },
    });
  }

  const configEntries = [
    { key: 'timezone', value: 'America/Mexico_City' },
    {
      key: 'units',
      value: { humidity: '%', ph: 'pH', salinity: 'dS/m', soilTemp: '°C', ambientTemp: '°C' },
    },
    { key: 'alertSeverityThresholds', value: { warning: 5, critical: 15 } },
  ] as const;

  for (const entry of configEntries) {
    await prisma.systemConfig.upsert({
      where: { key: entry.key },
      update: { value: entry.value },
      create: entry,
    });
  }

  console.info('Datos locales de demostración cargados.');
}

main()
  .catch((error: unknown) => {
    console.error('No se pudieron cargar los datos de demostración.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
