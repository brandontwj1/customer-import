const CONSTANTS = Object.freeze({
    DEFAULT_PAGE_SIZE: 20,
    DEFAULT_PAGE_NUMBER: 1,
    MAX_PAGE_SIZE: 100,
    ALLOWED_UPDATE_FIELDS: new Set([
        'full_name',
        'email',
        'date_of_birth',
        'timezone'
    ]),
    EXPECTED_COLUMNS: ['full_name', 'email', 'date_of_birth', 'timezone'],
    VALID_TIMEZONES: new Set(Intl.supportedValuesOf('timeZone')),
    EMAIL_REGEX: /^\S+@\S+\.\S+$/,
    ISO_DATE_REGEX_DASHED: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    ISO_DATE_REGEX: /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/
});

module.exports = CONSTANTS;