const express = require('express');
const ctrl = require('../controllers/catalog.controller');

const router = express.Router();

router.get('/services', ctrl.listServiceTypes);
router.get('/cities', ctrl.listCities);

module.exports = router;
