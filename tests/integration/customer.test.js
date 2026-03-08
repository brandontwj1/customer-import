const request = require('supertest');
const mongoose = require('mongoose');
require('./setup');

const app = require('../../src/app');
const Customer = require('../../src/models/Customer');
const ERROR_MESSAGES = require('../../src/utils/errorMessages');
const CONSTANTS = require('../../src/utils/constants');

const validCustomer = {
    full_name: 'Test User',
    email: 'testuser@example.com',
    date_of_birth: '1990-01-01',
    timezone: 'America/New_York',
};

describe('GET /api/customers', () => {

    test('returns 200 with empty data array when no customers exist', async () => {
        const res = await request(app).get('/api/customers');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.total).toBe(0);
    });

    test('returns customers after one is created', async () => {
        await Customer.create(validCustomer);
        const res = await request(app).get('/api/customers');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.total).toBe(1);
    });

    test('pagination shape is correct', async () => {
        const res = await request(app).get('/api/customers');
        expect(res.body).toMatchObject({
            data: expect.any(Array),
            total: expect.any(Number),
            page: expect.any(Number),
            limit: expect.any(Number),
            totalPages: expect.any(Number),
        });
    });

});

describe('GET /api/customers/:id', () => {

    test('returns 404 for a non-existent id', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/api/customers/${fakeId}`);
        expect(res.status).toBe(404);
        expect(res.body.error).toBe(ERROR_MESSAGES.CUSTOMER_NOT_FOUND);
    });

    test('returns the customer document for a valid id', async () => {
        const customer = await Customer.create(validCustomer);
        const res = await request(app).get(`/api/customers/${customer._id}`);
        expect(res.status).toBe(200);
        expect(res.body.full_name).toBe('Test User');
    });

});

describe('PUT /api/customers/:id', () => {

    test('updates a customer field', async () => {
        const customer = await Customer.create(validCustomer);
        const res = await request(app)
            .put(`/api/customers/${customer._id}`)
            .send({ full_name: 'Updated Name' });

        expect(res.status).toBe(200);
        expect(res.body.full_name).toBe('Updated Name');
    });

    test('returns 409 on duplicate email update', async () => {
        const c1 = await Customer.create(validCustomer);
        const c2 = await Customer.create({ ...validCustomer, email: 'other@example.com' });

        const res = await request(app)
            .put(`/api/customers/${c2._id}`)
            .send({ email: c1.email });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe(ERROR_MESSAGES.DUPLICATE_EMAIL);
    });

    test('returns 400 when unknown fields are provided', async () => {
        const customer = await Customer.create(validCustomer);
        const res = await request(app)
            .put(`/api/customers/${customer._id}`)
            .send({ unknown_field: 'value' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe(ERROR_MESSAGES.UNKNOWN_UPDATE_FIELDS);
    });

});

describe('DELETE /api/customers/:id', () => {

    test('deletes a customer and returns 204', async () => {
        const customer = await Customer.create(validCustomer);
        const res = await request(app).delete(`/api/customers/${customer._id}`);
        expect(res.status).toBe(204);
    });

    test('returns 404 when deleting a non-existent customer', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).delete(`/api/customers/${fakeId}`);
        expect(res.status).toBe(404);
        expect(res.body.error).toBe(ERROR_MESSAGES.CUSTOMER_NOT_FOUND);
    });

});