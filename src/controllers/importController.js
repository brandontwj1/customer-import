const { parse } = require('csv-parse/sync');
const { randomUUID } = require('crypto');
const multer = require('multer');
const Customer = require('../models/Customer');
const ImportJob = require('../models/ImportJob');
const { validateRow } = require('../services/csvService');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadCSV(req, res, next) {
    console.log('Received file upload request');
    try {
        if (!req.file) {
            console.warn('Upload request rejected: missing file in multipart form-data');
            return res.status(400).json({
                error: 'No file uploaded. Use form-data with field name "file".',
            });
        }

        // Generate the job ID before the DB call.
        const job = await ImportJob.create({
            jobId: randomUUID(),
            filename: req.file.originalname,
            status: 'processing',
        });

        console.log(`Created import job with ID: ${job.jobId} for file: ${job.filename}`);

        // Parse the CSV buffer into row objects
        let records;
        try {
            records = parse(req.file.buffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
        } catch (parseErr) {
            console.error(`CSV parse failed for job ${job.jobId}:`, parseErr.message);
            await ImportJob.findByIdAndUpdate(job._id, { status: 'failed' });
            return res.status(400).json({
                error: 'Could not parse CSV file. Check that it is valid CSV with a header row.',
                jobId: job.jobId,
            });
        }

        console.log(`Processing job ${job.jobId} with ${records.length} records`);

        let successCount = 0;
        const rejectedRecords = [];

        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const rowNumber = i + 1; // 1-based (row 1 = first data row after header)

            // Validate the row with csvService
            const errorMsgs = validateRow(row);
            if (errorMsgs.length > 0) {
                console.warn(`Row ${rowNumber} rejected for job ${job.jobId}: ${errorMsgs.join('; ')}`);
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
                    ? 'email already exists in the database'
                    : 'database error: ' + dbErr.message;
                console.warn(`Row ${rowNumber} failed DB insert for job ${job.jobId}: ${reason}`);
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

        console.log(
            `Job ${job.jobId} completed. Total: ${records.length}, Success: ${successCount}, Failed: ${rejectedRecords.length}`
        );

        return res.status(202).json({ jobId: job.jobId });

    } catch (err) {
        console.error('Unexpected error in uploadCSV:', err);
        next(err);
    }
}

async function getImportResult(req, res, next) {
    try {
        // jobId is a UUID string — query by the jobId field, not the MongoDB _id.
        const job = await ImportJob.findOne({ jobId: req.params.jobId });

        if (!job) {
            console.warn('Import result requested for unknown jobId:', req.params.jobId);
            return res.status(404).json({ error: 'Import job not found' });
        }

        console.log('Fetching import result for job:', job.jobId);
        return res.json(job);
    } catch (err) {
        console.error('Unexpected error in getImportResult:', err);
        next(err);
    }
}

module.exports = { upload, uploadCSV, getImportResult };