const bearer = [{ bearerAuth: [] }];
const json = (description: string, schemaName?: string) => ({
  required: true,
  description,
  content: {
    'application/json': {
      schema: schemaName
        ? { $ref: `#/components/schemas/${schemaName}` }
        : { type: 'object', additionalProperties: true },
    },
  },
});

function operation(
  summary: string,
  tags: string[],
  options: {
    public?: boolean;
    ingestKey?: boolean;
    body?: string;
    bodySchema?: string;
    query?: Array<{ name: string; description: string; schema?: Record<string, unknown> }>;
    path?: Array<{ name: string; description: string }>;
  } = {},
) {
  return {
    summary,
    tags,
    ...(options.public ? {} : { security: options.ingestKey ? [{ ingestApiKey: [] }] : bearer }),
    ...(options.path
      ? {
          parameters: options.path.map((parameter) => ({
            ...parameter,
            in: 'path',
            required: true,
            schema: { type: 'string' },
          })),
        }
      : {}),
    ...(options.query
      ? {
          parameters: [
            ...(options.path
              ? options.path.map((parameter) => ({
                  ...parameter,
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                }))
              : []),
            ...options.query.map((parameter) => ({
              ...parameter,
              in: 'query',
              required: false,
              schema: parameter.schema ?? { type: 'string' },
            })),
          ],
        }
      : {}),
    ...(options.body ? { requestBody: json(options.body, options.bodySchema) } : {}),
    responses: {
      '200': { description: 'Solicitud procesada correctamente.' },
      '201': { description: 'Recurso creado correctamente.' },
      '204': { description: 'Solicitud procesada sin contenido.' },
      '400': { description: 'Solicitud inválida o parámetros fuera de rango.' },
      '401': { description: 'Autenticación requerida o credenciales inválidas.' },
      '403': { description: 'El rol autenticado no tiene permiso para esta operación.' },
      '404': { description: 'Recurso no encontrado.' },
      '409': { description: 'Conflicto con el estado o los datos existentes.' },
      '500': { description: 'Error inesperado del servidor.' },
    },
  };
}

const idPath = [{ name: 'id', description: 'Identificador CUID del recurso.' }];
const reportQuery = [
  { name: 'from', description: 'Fecha inicial ISO 8601.' },
  { name: 'to', description: 'Fecha final ISO 8601.' },
  { name: 'nodeIds', description: 'Identificadores de nodo separados por coma.' },
  { name: 'cropIds', description: 'Identificadores de cultivo separados por coma.' },
  { name: 'sections', description: 'Secciones: summary, readings y alerts.' },
];

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'AgroSense API',
    version: '1.0.0',
    description:
      'API REST para monitoreo de suelo, administración de cultivos y nodos, alertas, historial, reportes, configuración y auditoría. Las rutas protegidas requieren un token Bearer obtenido en /api/auth/login.',
  },
  servers: [{ url: '/api', description: 'API del servidor actual' }],
  tags: [
    { name: 'Salud' },
    { name: 'Autenticación' },
    { name: 'Ingesta' },
    { name: 'Alertas' },
    { name: 'Dashboard' },
    { name: 'Historial' },
    { name: 'Cultivos y estados' },
    { name: 'Nodos' },
    { name: 'Reportes' },
    { name: 'Configuración' },
    { name: 'Auditoría' },
    { name: 'Usuarios' },
  ],
  paths: {
    '/health': {
      get: operation('Comprueba el servicio y la conexión con PostgreSQL.', ['Salud'], {
        public: true,
      }),
    },
    '/auth/login': {
      post: operation('Inicia sesión y devuelve tokens y perfil público.', ['Autenticación'], {
        public: true,
        body: 'Correo, contraseña y código 2FA opcional.',
        bodySchema: 'LoginRequest',
      }),
    },
    '/auth/refresh': {
      post: operation('Rota un refresh token válido.', ['Autenticación'], {
        public: true,
        body: 'Refresh token vigente.',
        bodySchema: 'RefreshTokenRequest',
      }),
    },
    '/auth/logout': {
      post: operation('Revoca un refresh token.', ['Autenticación'], {
        public: true,
        body: 'Refresh token a revocar.',
        bodySchema: 'RefreshTokenRequest',
      }),
    },
    '/auth/forgot-password': {
      post: operation('Solicita recuperación de contraseña (requiere SMTP).', ['Autenticación'], {
        public: true,
        body: 'Correo de la cuenta.',
        bodySchema: 'EmailRequest',
      }),
    },
    '/auth/reset-password': {
      post: operation('Restablece la contraseña con un token de recuperación.', ['Autenticación'], {
        public: true,
        body: 'Token de recuperación y nueva contraseña.',
        bodySchema: 'ResetPasswordRequest',
      }),
    },
    '/auth/profile': {
      get: operation('Consulta el perfil autenticado.', ['Autenticación']),
      patch: operation('Actualiza el nombre y correo del perfil.', ['Autenticación'], {
        body: 'Nombre y correo.',
        bodySchema: 'ProfileRequest',
      }),
    },
    '/auth/change-password': {
      post: operation('Cambia la contraseña del perfil autenticado.', ['Autenticación'], {
        body: 'Contraseña actual y nueva.',
        bodySchema: 'ChangePasswordRequest',
      }),
    },
    '/auth/2fa/setup': {
      post: operation('Inicia la configuración de autenticación de dos factores.', [
        'Autenticación',
      ]),
    },
    '/auth/2fa/verify': {
      post: operation('Verifica y activa 2FA.', ['Autenticación'], {
        body: 'Código TOTP de seis dígitos.',
        bodySchema: 'TwoFactorVerifyRequest',
      }),
    },
    '/auth/2fa/disable': {
      post: operation('Desactiva 2FA tras verificar contraseña y código.', ['Autenticación'], {
        body: 'Contraseña y código TOTP.',
        bodySchema: 'TwoFactorDisableRequest',
      }),
    },
    '/ingest': {
      post: operation('Ingiere una lectura y evalúa alertas.', ['Ingesta'], {
        ingestKey: true,
        body: 'deviceId, humidity, ph, salinity, soilTemp, ambientTemp y timestamp/battery opcionales.',
        bodySchema: 'IngestRequest',
      }),
    },
    '/alerts': {
      get: operation('Lista alertas con filtros.', ['Alertas'], {
        query: [
          { name: 'status', description: 'Estado de la alerta.' },
          { name: 'severity', description: 'Severidad de la alerta.' },
          { name: 'nodeId', description: 'Filtra por nodo.' },
          {
            name: 'page',
            description: 'Número de página.',
            schema: { type: 'integer', minimum: 1 },
          },
        ],
      }),
    },
    '/alerts/{id}/read': {
      patch: operation('Marca una alerta como leída.', ['Alertas'], { path: idPath }),
    },
    '/alerts/{id}/silence': {
      patch: operation('Silencia una alerta.', ['Alertas'], { path: idPath }),
    },
    '/alerts/{id}/close': { patch: operation('Cierra una alerta.', ['Alertas'], { path: idPath }) },
    '/dashboard': {
      get: operation('Obtiene KPIs, tendencias, semáforo y resumen de alertas.', ['Dashboard'], {
        query: [
          { name: 'nodeId', description: 'Filtra por nodo.' },
          { name: 'cropId', description: 'Filtra por cultivo.' },
          { name: 'period', description: 'Periodo: 24h, 7d o 30d.' },
        ],
      }),
    },
    '/history': {
      get: operation('Consulta lecturas históricas agregadas.', ['Historial'], {
        query: [
          { name: 'nodeId', description: 'Nodo de consulta.' },
          { name: 'variable', description: 'Variable de suelo.' },
          { name: 'from', description: 'Fecha inicial ISO 8601.' },
          { name: 'to', description: 'Fecha final ISO 8601.' },
          { name: 'granularity', description: 'Granularidad: hour, day o week.' },
        ],
      }),
    },
    '/history/compare': {
      get: operation('Compara series de lecturas de varios nodos.', ['Historial'], {
        query: [
          { name: 'nodeIds', description: 'Hasta diez identificadores de nodo.' },
          { name: 'variable', description: 'Variable a comparar.' },
          { name: 'from', description: 'Fecha inicial ISO 8601.' },
          { name: 'to', description: 'Fecha final ISO 8601.' },
        ],
      }),
    },
    '/history/correlation': {
      get: operation('Calcula correlación de Pearson entre variables.', ['Historial'], {
        query: [
          { name: 'nodeIds', description: 'Identificadores de nodos.' },
          { name: 'variables', description: 'Variables a correlacionar.' },
          { name: 'from', description: 'Fecha inicial ISO 8601.' },
          { name: 'to', description: 'Fecha final ISO 8601.' },
        ],
      }),
    },
    '/crops': {
      get: operation('Lista cultivos.', ['Cultivos y estados'], {
        query: [{ name: 'search', description: 'Búsqueda por nombre.' }],
      }),
      post: operation('Crea un cultivo con rangos de referencia.', ['Cultivos y estados'], {
        body: 'Nombre, descripción opcional y rangos de las cinco variables.',
        bodySchema: 'CreateCropRequest',
      }),
    },
    '/crops/{id}': {
      put: operation('Actualiza un cultivo.', ['Cultivos y estados'], {
        path: idPath,
        body: 'Campos editables del cultivo.',
        bodySchema: 'CropRequest',
      }),
      delete: operation('Elimina un cultivo sin dependencias.', ['Cultivos y estados'], {
        path: idPath,
      }),
    },
    '/crops/{id}/states': {
      get: operation('Lista etapas de un cultivo.', ['Cultivos y estados'], { path: idPath }),
      post: operation('Crea una etapa para un cultivo.', ['Cultivos y estados'], {
        path: idPath,
        body: 'Nombre, orden y rangos de referencia.',
        bodySchema: 'CreateCropStateRequest',
      }),
    },
    '/crops/states/{id}': {
      put: operation('Actualiza una etapa.', ['Cultivos y estados'], {
        path: idPath,
        body: 'Campos editables de la etapa.',
        bodySchema: 'CropStateRequest',
      }),
      delete: operation('Elimina una etapa no activa ni asignada.', ['Cultivos y estados'], {
        path: idPath,
      }),
    },
    '/crops/states/{id}/activate': {
      patch: operation('Activa una etapa de cultivo.', ['Cultivos y estados'], { path: idPath }),
    },
    '/nodes': {
      get: operation('Lista nodos con filtros.', ['Nodos'], {
        query: [
          { name: 'cropId', description: 'Filtra por cultivo.' },
          { name: 'stateId', description: 'Filtra por etapa.' },
          { name: 'status', description: 'Conexión ONLINE u OFFLINE.' },
        ],
      }),
      post: operation('Crea un nodo.', ['Nodos'], {
        body: 'Identificador de dispositivo, nombre y asignaciones opcionales.',
        bodySchema: 'CreateNodeRequest',
      }),
    },
    '/nodes/options': { get: operation('Lista opciones para formularios de nodos.', ['Nodos']) },
    '/nodes/map': {
      get: operation('Lista nodos con datos para el mapa.', ['Nodos'], {
        query: [
          { name: 'cropId', description: 'Filtra por cultivo.' },
          { name: 'stateId', description: 'Filtra por etapa.' },
          { name: 'connection', description: 'ONLINE u OFFLINE.' },
          { name: 'alertLevel', description: 'INFO, ADVERTENCIA, CRITICA o NONE.' },
        ],
      }),
    },
    '/nodes/{id}': {
      put: operation('Actualiza un nodo.', ['Nodos'], {
        path: idPath,
        body: 'Campos editables del nodo.',
        bodySchema: 'NodeRequest',
      }),
      delete: operation('Elimina un nodo sin lecturas ni alertas.', ['Nodos'], { path: idPath }),
    },
    '/nodes/{id}/position': {
      patch: operation('Guarda la posición del nodo en el mapa.', ['Nodos'], {
        path: idPath,
        body: 'posX y posY entre 0 y 100.',
        bodySchema: 'NodePositionRequest',
      }),
    },
    '/nodes/{id}/assign': {
      patch: operation('Asigna un nodo a un cultivo y etapa.', ['Nodos'], {
        path: idPath,
        body: 'cropId y stateId (CUID o null).',
        bodySchema: 'NodeAssignmentRequest',
      }),
    },
    '/reports/general': {
      get: operation('Previsualiza un reporte filtrado.', ['Reportes'], { query: reportQuery }),
    },
    '/reports/export': {
      get: operation('Genera un reporte PDF o Excel.', ['Reportes'], {
        query: [...reportQuery, { name: 'format', description: 'Formato pdf o excel.' }],
      }),
    },
    '/reports/history': {
      get: operation('Lista reportes generados por el usuario.', ['Reportes']),
    },
    '/reports/share': {
      post: operation('Genera un enlace temporal de descarga.', ['Reportes'], {
        body: 'Filtros de reporte y formato.',
        bodySchema: 'ReportShareRequest',
      }),
    },
    '/reports/share/{token}': {
      get: operation('Descarga un reporte con token temporal.', ['Reportes'], {
        public: true,
        path: [{ name: 'token', description: 'Token de acceso temporal.' }],
      }),
    },
    '/config': {
      get: operation('Consulta la configuración del sistema (solo administrador).', [
        'Configuración',
      ]),
      put: operation(
        'Actualiza umbrales y ajustes del sistema (solo administrador).',
        ['Configuración'],
        {
          body: 'Umbrales por variable y ajustes del sistema.',
          bodySchema: 'SystemConfigUpdate',
        },
      ),
    },
    '/audit': {
      get: operation('Consulta registros de auditoría (solo administrador).', ['Auditoría'], {
        query: [
          { name: 'userId', description: 'Filtra por usuario.' },
          { name: 'action', description: 'Filtra por acción.' },
          { name: 'entity', description: 'Filtra por entidad.' },
          { name: 'from', description: 'Fecha inicial ISO 8601.' },
          { name: 'to', description: 'Fecha final ISO 8601.' },
          { name: 'page', description: 'Número de página.' },
          { name: 'pageSize', description: 'Elementos por página.' },
        ],
      }),
    },
    '/users': {
      get: operation('Lista usuarios (solo administrador).', ['Usuarios']),
      post: operation('Crea un usuario (solo administrador).', ['Usuarios'], {
        body: 'Nombre, correo, rol y contraseña.',
        bodySchema: 'CreateUserRequest',
      }),
    },
    '/users/{id}': {
      put: operation('Actualiza un usuario (solo administrador).', ['Usuarios'], {
        path: idPath,
        body: 'Campos editables del usuario.',
        bodySchema: 'UpdateUserRequest',
      }),
      delete: operation('Desactiva un usuario (solo administrador).', ['Usuarios'], {
        path: idPath,
      }),
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      ingestApiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
          twoFactorCode: { type: 'string', pattern: '^\\d{6}$' },
        },
        additionalProperties: false,
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string', minLength: 1 } },
        additionalProperties: false,
      },
      EmailRequest: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
        additionalProperties: false,
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string', minLength: 32 },
          newPassword: { type: 'string', minLength: 12 },
        },
        additionalProperties: false,
      },
      ProfileRequest: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
        },
        additionalProperties: false,
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 12 },
        },
        additionalProperties: false,
      },
      TwoFactorVerifyRequest: {
        type: 'object',
        required: ['token'],
        properties: { token: { type: 'string', pattern: '^\\d{6}$' } },
        additionalProperties: false,
      },
      TwoFactorDisableRequest: {
        type: 'object',
        required: ['password', 'token'],
        properties: {
          password: { type: 'string', minLength: 1 },
          token: { type: 'string', pattern: '^\\d{6}$' },
        },
        additionalProperties: false,
      },
      SoilRanges: {
        type: 'object',
        required: ['humidity', 'ph', 'salinity', 'soilTemp', 'ambientTemp'],
        properties: {
          humidity: { $ref: '#/components/schemas/MeasurementRange' },
          ph: { $ref: '#/components/schemas/MeasurementRange' },
          salinity: { $ref: '#/components/schemas/MeasurementRange' },
          soilTemp: { $ref: '#/components/schemas/MeasurementRange' },
          ambientTemp: { $ref: '#/components/schemas/MeasurementRange' },
        },
        additionalProperties: false,
      },
      MeasurementRange: {
        type: 'object',
        required: ['min', 'max'],
        properties: {
          min: { type: 'number' },
          max: { type: 'number' },
        },
      },
      CropRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          description: { type: ['string', 'null'], maxLength: 500 },
          ranges: { $ref: '#/components/schemas/SoilRanges' },
        },
        additionalProperties: false,
      },
      CropStateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          order: { type: 'integer', minimum: 1 },
          isActive: { type: 'boolean' },
          ranges: { $ref: '#/components/schemas/SoilRanges' },
        },
        additionalProperties: false,
      },
      IngestRequest: {
        type: 'object',
        required: ['deviceId', 'humidity', 'ph', 'salinity', 'soilTemp', 'ambientTemp'],
        properties: {
          deviceId: { type: 'string', minLength: 1, maxLength: 100 },
          humidity: { type: 'number' },
          ph: { type: 'number' },
          salinity: { type: 'number' },
          soilTemp: { type: 'number' },
          ambientTemp: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
          battery: { type: ['number', 'null'], minimum: 0, maximum: 100 },
        },
        additionalProperties: false,
      },
      NodeRequest: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', minLength: 1, maxLength: 100 },
          name: { type: 'string', minLength: 2, maxLength: 100 },
          notes: { type: ['string', 'null'], maxLength: 1000 },
          posX: { type: 'number', minimum: 0, maximum: 100 },
          posY: { type: 'number', minimum: 0, maximum: 100 },
          samplingFreq: { type: 'integer', minimum: 5, maximum: 86400 },
          cropId: { type: ['string', 'null'] },
          stateId: { type: ['string', 'null'] },
        },
        additionalProperties: false,
      },
      NodePositionRequest: {
        type: 'object',
        required: ['posX', 'posY'],
        properties: {
          posX: { type: 'number', minimum: 0, maximum: 100 },
          posY: { type: 'number', minimum: 0, maximum: 100 },
        },
        additionalProperties: false,
      },
      NodeAssignmentRequest: {
        type: 'object',
        required: ['cropId', 'stateId'],
        properties: {
          cropId: { type: ['string', 'null'] },
          stateId: { type: ['string', 'null'] },
        },
        additionalProperties: false,
      },
      ReportShareRequest: {
        type: 'object',
        required: ['from', 'to', 'format'],
        properties: {
          from: { type: 'string', format: 'date-time' },
          to: { type: 'string', format: 'date-time' },
          nodeIds: { type: 'string', description: 'CUID separados por coma.' },
          cropIds: { type: 'string', description: 'CUID separados por coma.' },
          sections: { type: 'string', description: 'Secciones separadas por coma.' },
          format: { enum: ['pdf', 'excel'] },
        },
        additionalProperties: false,
      },
      CreateCropRequest: {
        allOf: [
          { $ref: '#/components/schemas/CropRequest' },
          { type: 'object', required: ['name', 'ranges'] },
        ],
      },
      CreateCropStateRequest: {
        allOf: [
          { $ref: '#/components/schemas/CropStateRequest' },
          { type: 'object', required: ['name', 'order', 'ranges'] },
        ],
      },
      CreateNodeRequest: {
        allOf: [
          { $ref: '#/components/schemas/NodeRequest' },
          { type: 'object', required: ['deviceId', 'name'] },
        ],
      },
      SystemConfigUpdate: {
        type: 'object',
        properties: {
          severityThresholds: { type: 'object', additionalProperties: true },
          system: { type: 'object', additionalProperties: true },
        },
        additionalProperties: false,
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'role', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          role: { enum: ['ADMIN', 'OPERADOR', 'CONSULTA'] },
          password: { type: 'string', minLength: 12 },
        },
        additionalProperties: false,
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          role: { enum: ['ADMIN', 'OPERADOR', 'CONSULTA'] },
          active: { type: 'boolean' },
          password: { type: 'string', minLength: 12 },
        },
        additionalProperties: false,
      },
    },
  },
} as const;
