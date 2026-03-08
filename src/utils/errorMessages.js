const CONSTANTS = require('./constants');

const ERROR_MESSAGES = Object.freeze({
    CUSTOMER_NOT_FOUND: 'Customer not found',
    DUPLICATE_EMAIL: 'Email already exists in the database.',
    FUTURE_DATE_OF_BIRTH: 'date_of_birth must be in the past',
    IMPORT_JOB_NOT_FOUND: 'Import job not found',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    INVALID_CSV_COLUMNS: `CSV must contain exactly these columns: ${CONSTANTS.EXPECTED_COLUMNS.join(', ')}`,
    INVALID_CSV_FORMAT: 'Invalid CSV format',
    INVALID_CUSTOMER_ID: 'Invalid customer ID',
    INVALID_IMPORT_ID: 'Invalid import job ID',
    INVALID_FULL_NAME: 'full_name must be a non-empty string',
    INVALID_DATE_OF_BIRTH: 'date_of_birth is not a valid date',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_PAGE_PARAMS: 'Page and limit must be a positive integer',
    INVALID_TIMEZONE: 'Invalid IANA timezone',
    LIMIT_TOO_LARGE: `Limit must not exceed ${CONSTANTS.MAX_PAGE_SIZE}`,
    NO_DATE_OF_BIRTH: 'date_of_birth is required',
    NO_FILE_UPLOADED: 'No file uploaded',
    NO_UPDATE_FIELDS: 'No fields provided for update',
    UNKNOWN_UPDATE_FIELDS: 'Unknown field(s) provided for update',
});

module.exports = ERROR_MESSAGES;