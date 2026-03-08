const { parse } = require('csv-parse/sync');
const multer = require('multer');
const { Types } = require('mongoose');
const Customer = require('../models/Customer');
const ImportJob = require('../models/ImportJob');
const { validateRow, hasExpectedColumns } = require('../services/csvService');
const { logger } = require('../middleware/logger');
const ERROR_MESSAGES = require('../utils/errorMessages');
const CONSTANTS = require('../utils/constants');

const upload = multer({ storage: multer.memoryStorage() });



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
            let headerColumns = [];
            records = parse(req.file.buffer, {
                columns: (header) => {
                    headerColumns = header;
                    return header;
                },
                skip_empty_lines: true,
                trim: true,
            });

            if (!hasExpectedColumns(headerColumns)) {
                logger.warn('Upload rejected: CSV has invalid columns', {
                    jobId: String(job._id),
                    receivedColumns: headerColumns,
                    expectedColumns: CONSTANTS.EXPECTED_COLUMNS,
                });
                await ImportJob.findByIdAndUpdate(job._id, { status: 'failed' });
                return res.status(400).json({
                    error: ERROR_MESSAGES.INVALID_CSV_COLUMNS,
                    id: job._id,
                });
            }
        } catch (parseErr) {
            logger.error('CSV parse failed', { jobId: String(job._id), error: parseErr.message });
            await ImportJob.findByIdAndUpdate(job._id, { status: 'failed' });
            return res.status(400).json({
                error: ERROR_MESSAGES.INVALID_CSV_FORMAT,
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
                    ? ERROR_MESSAGES.DUPLICATE_EMAIL
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
            return next(httpError(400, ERROR_MESSAGES.INVALID_PAGE_PARAMS));
        }

        if (limit > CONSTANTS.MAX_PAGE_SIZE) {
            return next(httpError(400, ERROR_MESSAGES.LIMIT_TOO_LARGE));
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