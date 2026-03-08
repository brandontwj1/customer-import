const { Router } = require('express');
const { upload, uploadCSV, getImportsById, getImports } = require('../controllers/importController');

const router = Router();

router.post('/', upload.single('file'), uploadCSV);
router.get('/', getImports);
router.get('/:id', getImportsById);

module.exports = router;