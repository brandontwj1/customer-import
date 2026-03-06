const { Schema, model } = require('mongoose');

const importJobSchema = new Schema(
    {
        jobId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        filename: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
        },
        totalRecords: { type: Number, default: 0 },
        successCount: { type: Number, default: 0 },
        failedCount: { type: Number, default: 0 },
        rejectedRecords: [
            {
                row: { type: Number },      // CSV row number (1, 2, 3...)
                data: { type: Object },     // actual row data from CSV
                errorMsgs: [{ type: String }]  // array of error messages
            }
        ]
    },
    { timestamps: true }  // gives createdAt, updatedAt
);

module.exports = model('ImportJob', importJobSchema);