const { Router } = require('express');
const { upload, uploadCSV, getImportResult } = require('../controllers/importController');

const router = Router();

router.post('/', upload.single('file'), uploadCSV);
router.get('/:jobId', getImportResult);

module.exports = router;