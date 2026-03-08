const Customer = require('../models/Customer');
const CONSTANTS = require('../utils/constants');
const ERROR_MESSAGES = require('../utils/errorMessages');



// Helper function to create an Error object
function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// GET /api/customers?page=1&limit=20 - returns paginated list of customers
async function getCustomers(req, res, next) {
    try {
        const page = parseInt(req.query.page) || CONSTANTS.DEFAULT_PAGE_NUMBER;
        const limit = parseInt(req.query.limit) || CONSTANTS.DEFAULT_PAGE_SIZE;
        const skip = (page - 1) * limit;

        if (page < 1 || limit < 1) {
            return next(httpError(400, ERROR_MESSAGES.INVALID_PAGE_PARAMS));
        }

        if (limit > CONSTANTS.MAX_PAGE_SIZE) {
            return next(httpError(400, ERROR_MESSAGES.LIMIT_TOO_LARGE));
        }

        const [customers, total] = await Promise.all([
            Customer.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Customer.countDocuments()
        ]);

        res.json({
            data: customers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        })

    } catch (err) {
        next(err);
    }
}

// GET /api/customers/:id - returns a single customer by ID
async function getCustomerById(req, res, next) {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return next(httpError(404, ERROR_MESSAGES.CUSTOMER_NOT_FOUND));
        res.json(customer);

    } catch (err) {
        if (err.name === 'CastError') return next(httpError(400, ERROR_MESSAGES.INVALID_CUSTOMER_ID));
        next(err);
    }
}


// PUT /api/customers/:id - updates a customer by ID
async function updateCustomerById(req, res, next) {
    try {
        const incomingFields = Object.keys(req.body || {});
        const unknownFields = incomingFields.filter((f) => !CONSTANTS.ALLOWED_UPDATE_FIELDS.has(f));

        if (incomingFields.length === 0) {
            return next(httpError(400, ERROR_MESSAGES.NO_UPDATE_FIELDS));
        }

        if (unknownFields.length > 0) {
            return next(httpError(400, ERROR_MESSAGES.UNKNOWN_UPDATE_FIELDS));
        }

        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
                omitUndefined: true,
                strict: 'throw',
            }
        );

        if (!customer) return next(httpError(404, ERROR_MESSAGES.CUSTOMER_NOT_FOUND));
        res.json(customer);

    } catch (err) {
        if (err.name === 'CastError') return next(httpError(400, ERROR_MESSAGES.INVALID_CUSTOMER_ID));
        if (err.code === 11000) return next(httpError(409, ERROR_MESSAGES.DUPLICATE_EMAIL));
        if (err.name === 'ValidationError' || err.name === 'StrictModeError') {
            return next(httpError(400, err.message));
        }
        next(err);
    }
}

// DELETE /api/customers/:id - deletes a customer by ID
async function deleteCustomerById(req, res, next) {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) return next(httpError(404, ERROR_MESSAGES.CUSTOMER_NOT_FOUND));
        res.status(204).send();

    } catch (err) {
        if (err.name === 'CastError') return next(httpError(400, ERROR_MESSAGES.INVALID_CUSTOMER_ID));
        next(err);
    }
}

module.exports = { getCustomers, getCustomerById, updateCustomerById, deleteCustomerById };  