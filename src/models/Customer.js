const { Schema, model } = require('mongoose');

function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
}

function isValidEmail(v) {
    if (v == null) return true; 
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(v);
}

function isPastDate(v) {
    if (v == null) return true;
    return v instanceof Date && !Number.isNaN(v.getTime()) && v < new Date();
}

function isValidTimezone(tz) {
    if (tz == null) return true;
    return Intl.supportedValuesOf("timeZone").includes(tz);
}

const customerSchema = new Schema(
    {
        full_name: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: isNonEmptyString,
                message: 'Full name must be a non-empty string'
            }
        },

        email: {
            type: String,
            unique: true, // Ensure email uniqueness at the database level
            lowercase: true,
            trim: true,
            validate: {
                validator: isValidEmail,
                message: 'Invalid email format'
            }
        },

        date_of_birth: {
            type: Date,
            validate: {
                validator: isPastDate,
                message: 'Date of birth must be in the past'
            }
        },

        timezone: {
            type: String,
            trim: true,
            validate: {
                validator: isValidTimezone,
                message: 'Invalid IANA timezone identifier'
            }
        }
    },
    { timestamps: true }
);

module.exports = model('Customer', customerSchema);