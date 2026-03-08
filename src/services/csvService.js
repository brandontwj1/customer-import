const CONSTANTS = require('../utils/constants');
const ERROR_MESSAGES = require('../utils/errorMessages');

function hasExpectedColumns(headerColumns) {
    if (!Array.isArray(headerColumns) || headerColumns.length !== CONSTANTS.EXPECTED_COLUMNS.length) {
        return false;
    }

    const normalized = headerColumns.map((col) => String(col).trim());
    return CONSTANTS.EXPECTED_COLUMNS.every((col) => normalized.includes(col));
}

function validateRow(row) {
    const errorMsgs = [];

    // full_name: non-empty string (mirrors Customer.js isNonEmptyString)
    if (!row.full_name || row.full_name.trim().length === 0) {
        errorMsgs.push(ERROR_MESSAGES.INVALID_FULL_NAME);
    }

    // email: valid format (mirrors Customer.js isValidEmail)
    if (row.email && !CONSTANTS.EMAIL_REGEX.test(row.email.trim())) {
        errorMsgs.push(ERROR_MESSAGES.INVALID_EMAIL);
    }

    // date_of_birth: valid date, must be in the past (mirrors Customer.js isPastDate)
    if (row.date_of_birth) {
        if (!CONSTANTS.ISO_DATE_REGEX_DASHED.test(row.date_of_birth.trim()) && !CONSTANTS.ISO_DATE_REGEX.test(row.date_of_birth.trim())) {
            errorMsgs.push(ERROR_MESSAGES.INVALID_DATE_OF_BIRTH);
        } else {
            const dob = new Date(row.date_of_birth);
            if (isNaN(dob.getTime())) {
                errorMsgs.push(ERROR_MESSAGES.INVALID_DATE_OF_BIRTH);
            } else if (dob >= new Date()) {
                errorMsgs.push(ERROR_MESSAGES.FUTURE_DATE_OF_BIRTH);
            }
        }
    }

    // timezone: valid IANA identifier (mirrors Customer.js isValidTimezone)
    if (row.timezone && !CONSTANTS.VALID_TIMEZONES.has(row.timezone.trim())) {
        errorMsgs.push(ERROR_MESSAGES.INVALID_TIMEZONE);
    }

    return errorMsgs; // [] = valid, non-empty = rejected
}

module.exports = { validateRow, hasExpectedColumns };