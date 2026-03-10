const { Schema, model } = require('mongoose');

const importJobSchema = new Schema(
    {
        filename: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
        },
        failureReason: {
            type: String,
            default: null,
            trim: true,
            validate: {
                // failureReason is only required when the job status is failed.
                validator: function (v) {
                    return this.status !== 'failed' || (typeof v === 'string' && v.length > 0);
                },
                message: 'failureReason is required when status is failed',
            },
        },
        totalRecords: { type: Number, default: 0 },
        successCount: { type: Number, default: 0 },
        failedCount: { type: Number, default: 0 },
        rejectedRecords: [
            {
                row: { type: Number }, // CSV row number (1, 2, 3...)
                data: { type: Object }, // actual row data from CSV
                errorMsgs: [{ type: String }] // array of error messages
            }
        ]
    },
    { timestamps: true } 
);

module.exports = model('ImportJob', importJobSchema);