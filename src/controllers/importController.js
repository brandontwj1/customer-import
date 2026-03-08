const multer = require('multer');
const { Types } = require('mongoose');
const ImportJob = require('../models/ImportJob');
const { logger } = require('../middleware/logger');
const ERROR_MESSAGES = require('../utils/errorMessages');
const CONSTANTS = require('../utils/constants');
const importQueue = require('../queues/importQueue')

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/import - accepts multipart form-data with a CSV file, returns import job _id immediately
async function uploadCSV(req, res, next) {
    logger.info('Received file upload request');
    let job;
    try {
        if (!req.file) {
            logger.warn('Upload request rejected: missing file in multipart form-data');
            return res.status(400).json({
                error: ERROR_MESSAGES.NO_FILE_UPLOADED,
            });
        }

        job = await ImportJob.create({
            filename: req.file.originalname,
            status: 'pending',
        });

        logger.info('Created import job', { jobId: String(job._id), filename: job.filename });

        // Add the job to the import queue with the CSV buffer
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

        if (!Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: ERROR_MESSAGES.INVALID_IMPORT_ID });
        }

        const job = await ImportJob.findById(id);

        if (!job) {
            logger.warn('Import result requested for unknown _id', { id });
            return res.status(404).json({ error: ERROR_MESSAGES.IMPORT_JOB_NOT_FOUND });
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
            return res.status(400).json({ error: ERROR_MESSAGES.INVALID_PAGE_PARAMS });
        }

        if (limit > CONSTANTS.MAX_PAGE_SIZE) {
            return res.status(400).json({ error: ERROR_MESSAGES.LIMIT_TOO_LARGE });
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