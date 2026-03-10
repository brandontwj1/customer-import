const { validateRow, hasExpectedColumns } = require('../../src/services/csvService');
const ERROR_MESSAGES = require('../../src/utils/errorMessages');

const validRow = {
    full_name: 'Alice Smith',
    email: 'alice@example.com',
    date_of_birth: '1990-05-15',
    timezone: 'Australia/Sydney',
};

describe('hasExpectedColumns', () => {

    test('returns true for exact expected columns', () => {
        const header = ['full_name', 'email', 'date_of_birth', 'timezone'];
        expect(hasExpectedColumns(header)).toBe(true);
    });

    test('returns true for expected columns with extra whitespace', () => {
        const header = [' full_name ', ' email ', ' date_of_birth ', ' timezone '];
        expect(hasExpectedColumns(header)).toBe(true);
    });

    test('returns false if any expected column is missing', () => {
        const header = ['full_name', 'email', 'date_of_birth']; // missing timezone
        expect(hasExpectedColumns(header)).toBe(false);
    });

    test('returns false if there are extra columns', () => {
        const header = ['full_name', 'email', 'date_of_birth', 'timezone', 'extra_column'];
        expect(hasExpectedColumns(header)).toBe(false);
    });

    test('returns true if columns are in different order', () => {
        const header = ['email', 'full_name', 'timezone', 'date_of_birth'];
        expect(hasExpectedColumns(header)).toBe(true); // Order should not matter
    });

});

describe('validateRow', () => {

    test('returns empty array for a fully valid row', () => {
        expect(validateRow(validRow)).toEqual([]);
    });

    // --- full_name ---

    test('rejects empty full_name', () => {
        const errors = validateRow({ ...validRow, full_name: '' });
        expect(errors).toContain(ERROR_MESSAGES.INVALID_FULL_NAME);
    });

    test('rejects whitespace-only full_name', () => {
        const errors = validateRow({ ...validRow, full_name: '   ' });
        expect(errors).toContain(ERROR_MESSAGES.INVALID_FULL_NAME);
    });

    // --- email ---

    test('rejects email without @ symbol', () => {
        const errors = validateRow({ ...validRow, email: 'notanemail' });
        expect(errors).toContain(ERROR_MESSAGES.INVALID_EMAIL);
    });

    test('rejects email without domain extension', () => {
        const errors = validateRow({ ...validRow, email: 'user@nodomain' });
        expect(errors).toContain(ERROR_MESSAGES.INVALID_EMAIL);
    });

    test('accepts valid email', () => {
        const errors = validateRow({ ...validRow, email: 'user@domain.com' });
        expect(errors).not.toContain(ERROR_MESSAGES.INVALID_EMAIL);
    });

    // --- date_of_birth ---

    test('rejects non-date string', () => {
        const errors = validateRow({ ...validRow, date_of_birth: 'notadate' });
        expect(errors).toContain(ERROR_MESSAGES.INVALID_DATE_OF_BIRTH);
    });

    test('rejects future date_of_birth', () => {
        const errors = validateRow({ ...validRow, date_of_birth: '2099-01-01' });
        expect(errors).toContain(ERROR_MESSAGES.FUTURE_DATE_OF_BIRTH);
    });

    test('rejects invalid date string', () => {
        const errors = validateRow({ ...validRow, date_of_birth: '2099-02-30' });
        expect(errors).toContain(ERROR_MESSAGES.FUTURE_DATE_OF_BIRTH);
    });

    test('rejects invalid date format', () => {
        const errors = validateRow({ ...validRow, date_of_birth: '01/01/1990' });
        expect(errors).toContain(ERROR_MESSAGES.INVALID_DATE_OF_BIRTH);
    });

    test('accepts past date_of_birth', () => {
        const errors = validateRow({ ...validRow, date_of_birth: '1990-01-01' });
        expect(errors).not.toContain(ERROR_MESSAGES.FUTURE_DATE_OF_BIRTH);
    });

    test('accepts past date_of_birth with no dashes', () => {
        const errors = validateRow({ ...validRow, date_of_birth: '19900101' });
        expect(errors).not.toContain(ERROR_MESSAGES.FUTURE_DATE_OF_BIRTH);
    });

    // --- timezone ---

    test('accepts valid IANA timezone', () => {
        const errors = validateRow({ ...validRow, timezone: 'America/New_York' });
        expect(errors).not.toContain(ERROR_MESSAGES.INVALID_TIMEZONE);
    });

    // --- multiple errors at once ---

    test('returns all errors for a completely invalid row', () => {
        const errors = validateRow({
            full_name: '',
            email: 'notanemail',
            date_of_birth: '2099-01-01',
            timezone: 'InvalidZone',
        });
        expect(errors).toHaveLength(4);

        expect(errors).toContain(ERROR_MESSAGES.INVALID_FULL_NAME);
        expect(errors).toContain(ERROR_MESSAGES.INVALID_EMAIL);
        expect(errors).toContain(ERROR_MESSAGES.FUTURE_DATE_OF_BIRTH);
        expect(errors).toContain(ERROR_MESSAGES.INVALID_TIMEZONE);
    });

});