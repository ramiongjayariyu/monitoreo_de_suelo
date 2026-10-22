import request from 'supertest';
import { app } from '@/app';

describe('documentación OpenAPI', () => {
  it('expone la especificación OpenAPI y la interfaz Swagger', async () => {
    const specification = await request(app).get('/api/docs/openapi.json');
    expect(specification.status).toBe(200);
    expect(specification.body.openapi).toBe('3.1.0');
    expect(specification.body.paths['/ingest'].post.security).toEqual([{ ingestApiKey: [] }]);
    expect(specification.body.paths['/reports/share/{token}'].get).toBeDefined();

    const swagger = await request(app).get('/api/docs/');
    expect(swagger.status).toBe(200);
    expect(swagger.text).toContain('Swagger UI');
  });
});
