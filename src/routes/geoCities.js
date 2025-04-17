import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/', async (req, res) => {
  const query = req.query.query;
  const method = req.query.method;

  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&limit=10`;

    if (method === 'ukr-poshta') {
      url += `&country=ukraine`;
    }

    url += `&city=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YourAppName (your@email.com)',
        'Accept-Language': 'uk',
      },
    });

    const data = await response.json();
    const result = data.map((item) => ({
      id: item.place_id,
      city: item.display_name,
      country: item.address?.country || '',
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

export default router;
