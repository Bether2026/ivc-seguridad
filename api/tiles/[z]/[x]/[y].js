// Proxy de tiles OSM para exports de relevamiento
// Vercel no tiene `node-fetch` embebido en runtime < 18, usa fetch global (Node 18+)
module.exports = async function(req, res) {
  var z = req.query.z;
  var x = req.query.x;
  var y = String(req.query.y).replace(/\.png$/, '');

  if (!z || !x || !y || isNaN(z) || isNaN(x) || isNaN(y)) {
    res.status(400).end();
    return;
  }

  var url = 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';

  try {
    var response = await fetch(url, {
      headers: {
        'User-Agent': 'IVC-Seguridad/1.0 (https://ivc-seguridad.vercel.app)',
        'Referer': 'https://ivc-seguridad.vercel.app'
      }
    });

    if (!response.ok) {
      res.status(response.status).end();
      return;
    }

    var buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
  } catch(e) {
    res.status(500).end();
  }
};
