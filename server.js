const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde 'public' y 'data'
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

const TOKENS_FILE = path.join(__dirname, 'data', 'tokensQR.json');

// Inicializar tokensQR.json
async function initializeTokensFile() {
  try {
    await fs.access(TOKENS_FILE);
  } catch {
    await fs.writeFile(TOKENS_FILE, JSON.stringify({}));
  }
}

// Rutas API
app.get('/api/tokens', async (req, res) => {
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Error leyendo los tokens' });
  }
});

app.post('/api/tokens', async (req, res) => {
  try {
    const newToken = req.body;
    const data = await fs.readFile(TOKENS_FILE, 'utf8');
    const tokens = JSON.parse(data);
    tokens[newToken.estudiante_id] = newToken;
    await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    res.json({ message: 'Token guardado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando el token' });
  }
});

app.delete('/api/tokens/:estudiante_id', async (req, res) => {
  try {
    const estudianteId = req.params.estudiante_id;
    const data = await fs.readFile(TOKENS_FILE, 'utf8');
    const tokens = JSON.parse(data);
    delete tokens[estudianteId];
    await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    res.json({ message: 'Token eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando el token' });
  }
});

// Usar el puerto asignado por Render o 3000 para desarrollo local
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  await initializeTokensFile();
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});