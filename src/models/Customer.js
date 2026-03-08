const { Schema, model } = require('mongoose');
const CONSTANTS = require('../utils/constants');
const ERROR_MESSAGES = require('../utils/errorMessages');

function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
}

function isValidEmail(v) {
    if (v == null) return true; 
    return CONSTANTS.EMAIL_REGEX.test(v);
}

function isPastDate(v) {
    if (v == null) return true;
    return v instanceof Date && !Number.isNaN(v.getTime()) && v < new Date();
}

function isValidTimezone(tz) {
    if (tz == null) return true;
    return CONSTANTS.VALID_TIMEZONES.has(tz);
}

const customerSchema = new Schema(
    {
        full_name: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: isNonEmptyString,
                message: ERROR_MESSAGES.INVALID_FULL_NAME
            }
        },

        email: {
            type: String,
            unique: true, // Ensure email uniqueness at the database level
            lowercase: true,
            trim: true,
            validate: {
                validator: isValidEmail,
                message: ERROR_MESSAGES.INVALID_EMAIL
            }
        },

        date_of_birth: {
            type: Date,
            validate: {
                validator: isPastDate,
                message: ERROR_MESSAGES.FUTURE_DATE_OF_BIRTH
            }
        },

        timezone: {
            type: String,
            trim: true,
            validate: {
                validator: isValidTimezone,
                message: ERROR_MESSAGES.INVALID_TIMEZONE
            }
        }
    },
    { timestamps: true }
);

module.exports = model('Customer', customerSchema);