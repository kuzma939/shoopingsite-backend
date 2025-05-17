import express from 'express';
import { exec } from 'child_process';

const router = express.Router();

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
export default router;
