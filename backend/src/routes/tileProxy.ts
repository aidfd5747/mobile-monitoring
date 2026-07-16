import express from 'express';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Upstream tile provider - use Carto Voyager as default
const UPSTREAM_TEMPLATE = process.env.UPSTREAM_TILE_TEMPLATE || 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

// Supabase client for persistent tile cache
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
);
const TILE_BUCKET = process.env.SUPABASE_TILE_BUCKET || process.env.SUPABASE_BUCKET || 'tiles';

router.get('/:z/:x/:y.png', async (req, res) => {
  const { z, x, y } = req.params;
  const filePath = `${z}/${x}/${y}.png`;

  try {
    // Try Supabase storage first
    const { data: existing, error: downloadError } = await supabase.storage.from(TILE_BUCKET).download(filePath);
    if (existing && !downloadError) {
      const arrayBuffer = await existing.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', 'image/png');
      return res.send(buffer);
    }
  } catch (err) {
    console.warn('tile proxy supabase download error', err);
  }

  // If not in Supabase, fetch upstream and save to Supabase
  const upstream = UPSTREAM_TEMPLATE.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  try {
    const r = await fetch(upstream);
    if (!r.ok) {
      return res.sendStatus(502);
    }
    const arrayBuffer = await r.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      // upload to supabase storage (service role key required)
      const { error: uploadError } = await supabase.storage.from(TILE_BUCKET).upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      });
      if (uploadError) console.warn('tile proxy supabase upload error', uploadError);
    } catch (err) {
      console.warn('tile proxy supabase upload exception', err);
    }

    res.setHeader('Content-Type', 'image/png');
    return res.send(buffer);
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
