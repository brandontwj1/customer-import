const request = require('supertest');
const path = require('path');
require('./setup');

const app = require('../../src/app');

const VALID_CSV_PATH = path.join(__dirname, '../fixtures/valid/valid_10_entries.csv');


describe('GET /api/import', () => {

    test('returns 200 with empty data array when no jobs exist', async () => {
        const res = await request(app).get('/api/import');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    test('response has the correct pagination shape', async () => {
        const res = await request(app).get('/api/import');
        expect(res.body).toMatchObject({
            data: expect.any(Array),
            total: expect.any(Number),
            page: expect.any(Number),
            limit: expect.any(Number),
            totalPages: expect.any(Number),
        });
    });

    test('page and limit query params are respected', async () => {
        const res = await request(app).get('/api/import?page=2&limit=3');
        expect(res.status).toBe(200);
        expect(res.body.page).toBe(2);
        expect(res.body.limit).toBe(3);
    });

});

describe('GET /api/import/:id', () => {

    test('returns 404 for a non-existent id', async () => {
        const res = await request(app).get('/api/import/000000000000000000000000');
        expect(res.status).toBe(404);
        expect(res.body.error).toBeDefined();
    });

    test('returns the completed job document for a valid id', async () => {
        const upload = await request(app)
            .post('/api/import')
            .attach('file', VALID_CSV_PATH);

        expect(upload.status).toBe(202);
        const { id } = upload.body;

        const result = await request(app).get(`/api/import/${id}`);
        expect(result.status).toBe(200);
        expect(result.body._id).toBeDefined();
        expect(result.body.status).toBe('pending');
    });

});

describe('POST /api/import', () => {


    // --- valid ---

    test('returns 202 with an id when a valid CSV is uploaded', async () => {
        const res = await request(app)
            .post('/api/import')
            .attach('file', VALID_CSV_PATH);

        expect(res.status).toBe(202);
        expect(res.body.id).toBeDefined();
        expect(typeof res.body.id).toBe('string');
    });

    test('returns 202 with and id when valid CSV with no date_of_birth is uploaded', async () => {
        const res = await request(app)
            .post('/api/import')
            .attach('file', path.join(__dirname, '../fixtures/valid/valid_missing_dob.csv'));
        expect(res.status).toBe(202);
        expect(res.body.id).toBeDefined();
        expect(typeof res.body.id).toBe('string');
    });

    test('returns 202 with and id when valid CSV with no email is uploaded', async () => {
        const res = await request(app)
            .post('/api/import')
            .attach('file', path.join(__dirname, '../fixtures/valid/valid_missing_email.csv'));
        expect(res.status).toBe(202);
        expect(res.body.id).toBeDefined();
        expect(typeof res.body.id).toBe('string');
    });

    test('returns 202 with and id when valid CSV with no timezone is uploaded', async () => {
        const res = await request(app)
            .post('/api/import')
            .attach('file', path.join(__dirname, '../fixtures/valid/valid_missing_timezone.csv'));
        expect(res.status).toBe(202);
        expect(res.body.id).toBeDefined();
        expect(typeof res.body.id).toBe('string');
    });


    // --- invalid ---

    test('returns 400 when no file is attached', async () => {
        const res = await request(app).post('/api/import');
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

});



