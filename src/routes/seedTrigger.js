const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

router.post('/', (req, res) => {
  exec('node src/db/seed.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ MongoDB Seed error:', stderr);
      return res.status(500).json({ error: 'Failed to seed products' });
    }
    console.log('✅ MongoDB Seed success:', stdout);
    res.status(200).json({ message: 'MongoDB: Products seeded successfully' });
  });
});

module.exports = router;
{/*const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

router.post('/', (req, res) => {
  exec('node prisma/seed.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Seed error:', stderr);
      return res.status(500).json({ error: 'Failed to seed products' });
    }
    console.log('✅ Seed success:', stdout);
    res.status(200).json({ message: 'Products seeded successfully' });
  });
});

module.exports = router;*/}
