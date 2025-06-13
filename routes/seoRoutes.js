const express = require('express');
const seoController = require('../controllers/seoControllers');

const router = express.Router();

router.post('/analyze', seoController.analyzeSEO);

module.exports = router;