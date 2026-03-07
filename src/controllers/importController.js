const { parse } = require('csv-parse/sync');
const multer = require('multer');
const { Types } = require('mongoose');
const Customer = require('../models/Customer');
const ImportJob = require('../models/ImportJob');
const { validateRow } = require('../services/csvService');
const { logger } = require('../middleware/logger');

const upload = multer({ storage: multer.memoryStorage() });

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE_NUMBER = 1;
const MAX_PAGE_SIZE = 100;

const ERROR_MESSAGES = {
    INVALID_PAGE: 'Invalid page number. Must be a positive integer.',
    LIMIT_TOO_LARGE: `Limit exceeds maximum allowed value of ${MAX_PAGE_SIZE}.`,
    INVALID_CSV: 'Could not parse CSV file. Check that it is valid CSV with a header row.',
    IMPORT_JOB_NOT_FOUND: 'Import job not found.',
    EMAIL_IN_USE: 'Email already exists in the database.',
    NO_FILE_UPLOADED: 'No file uploaded. Use form-data with field name "file".',
};

// POST /api/import - accepts multipart form-data with a CSV file, returns import job _id immediately
async function uploadCSV(req, res, next) {
    logger.info('Received file upload request');
    try {
        if (!req.file) {
            logger.warn('Upload request rejected: missing file in multipart form-data');
            return res.status(400).json({
                error: ERROR_MESSAGES.NO_FILE_UPLOADED,
            });
        }

        const job = await ImportJob.create({
            filename: req.file.originalname,
            status: 'processing',
        });

        logger.info('Created import job', { jobId: String(job._id), filename: job.filename });

        // Parse the CSV buffer into row objects
        let records;
        try {
            records = parse(req.file.buffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
        } catch (parseErr) {
            logger.error('CSV parse failed', { jobId: String(job._id), error: parseErr.message });
            await ImportJob.findByIdAndUpdate(job._id, { status: 'failed' });
            return res.status(400).json({
                error: ERROR_MESSAGES.INVALID_CSV,
                id: job._id,
            });
        }

        logger.info('Processing import job records', { jobId: String(job._id), totalRecords: records.length });

        let successCount = 0;
        const rejectedRecords = [];

        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const rowNumber = i + 1; // 1-based (row 1 = first data row after header)

            // Validate the row with csvService
            const errorMsgs = validateRow(row);
            if (errorMsgs.length > 0) {
                rejectedRecords.push({ row: rowNumber, data: row, errorMsgs });
                continue;
            }

            // Save to MongoDB
            try {
                await Customer.create(
                    {
                        full_name: row.full_name.trim(),
                        email: row.email ? row.email.trim().toLowerCase() : undefined,
                        date_of_birth: row.date_of_birth ? new Date(row.date_of_birth) : undefined,
                        timezone: row.timezone ? row.timezone.trim() : undefined,
                    }
                );
                successCount++;
            } catch (dbErr) {
                // Code 11000 = duplicate key (email already exists in the customers collection)
                const reason = dbErr.code === 11000
                    ? ERROR_MESSAGES.EMAIL_IN_USE
                    : 'database error: ' + dbErr.message;
                rejectedRecords.push({ row: rowNumber, data: row, errorMsgs: [reason] });
            }
        }

        // Update the job with final results
        await ImportJob.findByIdAndUpdate(job._id, {
            status: 'completed',
            totalRecords: records.length,
            successCount,
            failedCount: rejectedRecords.length,
            rejectedRecords,
        });

        logger.info('Import job completed', {
            jobId: String(job._id),
            totalRecords: records.length,
            successCount,
            failedCount: rejectedRecords.length,
        });

        return res.status(202).json({ id: job._id });

    } catch (err) {
        logger.error('Unexpected error in uploadCSV', { error: err.message, stack: err.stack });
        next(err);
    }
}

// GET /api/import/:id - retrieves the import job result by ID
async function getImportsById(req, res, next) {
    try {
        const { id } = req.params;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: ERROR_MESSAGES.IMPORT_JOB_NOT_FOUND });
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
        const page = parseInt(req.query.page) || DEFAULT_PAGE_NUMBER;
        const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE;
        const skip = (page - 1) * limit;

        if (page < 1 || limit < 1) {
            return next(httpError(400, ERROR_MESSAGES.INVALID_PAGE));
        }

        if (limit > MAX_PAGE_SIZE) {
            return next(httpError(400, ERROR_MESSAGES.LIMIT_TOO_LARGE));
        }

        const [importJobs, total] = await Promise.all([
            ImportJob.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            ImportJob.countDocuments()
        ]);

        res.json({
            data: importJobs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })

    } catch (err) {
        next(err);
    }
}

module.exports = { upload, uploadCSV, getImportsById, getImports };