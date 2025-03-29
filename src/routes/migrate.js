const express = require('express');
const { exec } = require('child_process');

const router = express.Router();

router.get('/', (req, res) => {
  exec('npx prisma migrate deploy', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Migration error:', stderr);
      return res.status(500).send('Migration failed');
    }
    console.log('✅ Migration success:', stdout);
    res.send('Migration completed!');
  });
});

module.exports = router;
