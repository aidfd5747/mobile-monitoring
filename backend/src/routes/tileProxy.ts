import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const cacheDir = path.join(__dirname, '../../tile-cache');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

// Upstream tile provider - use Carto Voyager as default
const UPSTREAM_TEMPLATE = process.env.UPSTREAM_TILE_TEMPLATE || 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

router.get('/:z/:x/:y.png', async (req, res) => {
  const { z, x, y } = req.params;
  const fileName = `${z}-${x}-${y}.png`;
  const cachePath = path.join(cacheDir, fileName);

  if (fs.existsSync(cachePath)) {
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(cachePath);
  }

  const upstream = UPSTREAM_TEMPLATE.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  try {
    const r = await fetch(upstream);
    if (!r.ok) {
      return res.sendStatus(502);
    }
    const arrayBuffer = await r.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(cachePath, buffer);
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(cachePath);
  } catch (err) {
    console.error('tile proxy error', err);
    return res.sendStatus(502);
  }
});

// Health endpoint to verify upstream accessibility without caching a tile
router.get('/health', async (_req, res) => {
  try {
    // probe z=0,x=0,y=0
    const upstream = UPSTREAM_TEMPLATE.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0');
    const r = await fetch(upstream, { method: 'HEAD' });
    if (!r.ok) return res.status(502).json({ ok: false, upstreamStatus: r.status });
    return res.json({ ok: true, upstream: upstream });
  } catch (err) {
    console.error('tile proxy health error', err);
    return res.status(502).json({ ok: false });
  }
});

export default router;
