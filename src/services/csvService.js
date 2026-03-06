const VALID_TIMEZONES = new Set(Intl.supportedValuesOf('timeZone'));

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function validateRow(row) {
    const errorMsgs = [];

    // full_name: non-empty string (mirrors Customer.js isNonEmptyString)
    if (!row.full_name || row.full_name.trim().length === 0) {
        errorMsgs.push('full_name is required');
    }

    // email: valid format (mirrors Customer.js isValidEmail)
    if (row.email && !EMAIL_REGEX.test(row.email.trim())) {
        errorMsgs.push('invalid email format');
    }

    // date_of_birth: valid date, must be in the past (mirrors Customer.js isPastDate)
    if (row.date_of_birth) {
        const dob = new Date(row.date_of_birth);
        if (isNaN(dob.getTime())) {
            errorMsgs.push('date_of_birth is not a valid date');
        } else if (dob >= new Date()) {
            errorMsgs.push('date_of_birth must be in the past');
        }
    }

    // timezone: valid IANA identifier (mirrors Customer.js isValidTimezone)
    if (row.timezone && !VALID_TIMEZONES.has(row.timezone.trim())) {
        errorMsgs.push('invalid IANA timezone');
    }

    return errorMsgs; // [] = valid, non-empty = rejected
}

module.exports = { validateRow };