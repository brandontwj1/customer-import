const Bull = require('bull');
const { parse } = require('csv-parse/sync');
const Customer = require('../models/Customer');
const ImportJob = require('../models/ImportJob');
const { validateRow, hasExpectedColumns } = require('../services/csvService');
const { logger } = require('../middleware/logger');
const importQueue = require('../queues/importQueue');
const connectDB = require('../config/db');
const ERROR_MESSAGES = require('../utils/errorMessages');
const CONSTANTS = require('../utils/constants');
require('dotenv').config();

const concurrency = Number(process.env.IMPORT_WORKER_CONCURRENCY) || 5;
const safeConcurrency = Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 5;

// Connect to MongoDB before starting the worker
async function startWorker() {
    await connectDB();
    importQueue.process(safeConcurrency, async (job) => {
        const { importJobId, csvBuffer } = job.data;

        logger.info('Worker picked up import job', { importJobId });
        await ImportJob.findByIdAndUpdate(importJobId, { status: 'processing' });

        let records;
        try {
            let headerColumns = [];
            records = parse(csvBuffer, {
                columns: (header) => {
                    headerColumns = header;
                    return header;
                },
                skip_empty_lines: true,
                trim: true,
            });

            if (!hasExpectedColumns(headerColumns)) {
                logger.warn('Upload rejected: CSV has invalid columns', {
                    jobId: String(importJobId),
                    receivedColumns: headerColumns,
                    expectedColumns: CONSTANTS.EXPECTED_COLUMNS,
                });
                await ImportJob.findByIdAndUpdate(importJobId, { status: 'failed', failureReason: ERROR_MESSAGES.INVALID_CSV_COLUMNS });
                return
            }
        } catch (parseErr) {
            logger.error('CSV parse failed', { jobId: String(importJobId), error: parseErr.message });
            await ImportJob.findByIdAndUpdate(importJobId, { status: 'failed', failureReason: ERROR_MESSAGES.INVALID_CSV_FORMAT });
            return;
        }

        logger.info('Processing import job records', { jobId: String(importJobId), totalRecords: records.length });

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
        await ImportJob.findByIdAndUpdate(importJobId, {
            status: 'completed',
            totalRecords: records.length,
            successCount,
            failedCount: rejectedRecords.length,
            rejectedRecords,
        });

        logger.info('Import job completed', {
            jobId: String(importJobId),
            totalRecords: records.length,
            successCount,
            failedCount: rejectedRecords.length,
        });
    });
}

startWorker().catch((err) => {
    console.error('Error starting worker:', { error: err.message, stack: err.stack });
    process.exit(1);
});

module.exports = importQueue;