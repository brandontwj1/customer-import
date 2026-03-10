const multer = require('multer');
const { Types } = require('mongoose');
const ImportJob = require('../models/ImportJob');
const { logger } = require('../middleware/logger');
const ERROR_MESSAGES = require('../utils/errorMessages');
const CONSTANTS = require('../utils/constants');
const importQueue = require('../queues/importQueue')

const upload = multer({ storage: multer.memoryStorage() });

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// POST /api/import - accepts multipart form-data with a CSV file, returns import job _id immediately, enqueues the file for processing
async function uploadCSV(req, res, next) {
    logger.info('Received file upload request');
    let job;
    try {
        if (!req.file) {
            logger.warn('Upload request rejected: missing file in multipart form-data');
            next(httpError(400, ERROR_MESSAGES.NO_FILE_UPLOADED));
            return;
        }

        job = await ImportJob.create({
            filename: req.file.originalname,
            status: 'pending',
        });

        logger.info('Created import job', { jobId: String(job._id), filename: job.filename });

        // Queue payloads should stay JSON-serializable, so convert Buffer to a plain number array.
        await importQueue.add({
            importJobId: String(job._id),
            csvBuffer: Array.from(req.file.buffer)
        });

        return res.status(202).json({ id: job._id });
    } catch (err) {
        logger.error('Unexpected error in uploadCSV', { error: err.message, stack: err.stack });
        if (job?._id) {
            await ImportJob.findByIdAndUpdate(job._id, {
                status: 'failed',
                failureReason: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
            });
        }
        next(err);
    }
}

// GET /api/import/:id - retrieves the import job result by ID
async function getImportsById(req, res, next) {
    try {
        const { id } = req.params;

        // Reject invalid ids before querying MongoDB to avoid cast errors.
        if (!Types.ObjectId.isValid(id)) {
            next(httpError(400, ERROR_MESSAGES.INVALID_IMPORT_ID));
            return;
        }

        const job = await ImportJob.findById(id);

        if (!job) {
            logger.warn('Import result requested for unknown _id', { id });
            next(httpError(404, ERROR_MESSAGES.IMPORT_JOB_NOT_FOUND));
            return;
        }

        logger.info('Fetching import result for job', { id: String(job._id) });
        return res.json(job);
    } catch (err) {
        logger.error('Unexpected error in getImportResult', { error: err.message, stack: err.stack });
        next(err);
    }
}

// GET /api/import - retrieves a paginated list of import jobs
async function getImports(req, res, next) {
    try {
        const page = parseInt(req.query.page) || CONSTANTS.DEFAULT_PAGE_NUMBER;
        const limit = parseInt(req.query.limit) || CONSTANTS.DEFAULT_PAGE_SIZE;
        const skip = (page - 1) * limit;

        if (page < 1 || limit < 1) {
            next(httpError(400, ERROR_MESSAGES.INVALID_PAGE_PARAMS));
            return;
        }

        if (limit > CONSTANTS.MAX_PAGE_SIZE) {
            next(httpError(400, ERROR_MESSAGES.LIMIT_TOO_LARGE));
            return;
        }

        const [importJobs, total] = await Promise.all([
            ImportJob.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            ImportJob.countDocuments()
        ]);

        res.json({
            data: importJobs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        })

    } catch (err) {
        next(err);
    }
}

module.exports = { upload, uploadCSV, getImportsById, getImports };