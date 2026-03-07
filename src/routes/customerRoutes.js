const { Router } = require('express');
const {
    getCustomers,
    getCustomerById,
    updateCustomerById,
    deleteCustomerById
} = require('../controllers/customerController');

const router = Router();

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomerById);
router.delete('/:id', deleteCustomerById);

module.exports = router;