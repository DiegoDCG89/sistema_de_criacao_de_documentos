import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Permite processar o JSON (formulário) até 50mb
app.use(express.json({ limit: '50mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbFile = path.join(__dirname, 'solicitacoes_db.json');
function lerSolicitacoes() {
  try {
    if (!fs.existsSync(dbFile)) return [];
    return JSON.parse(fs.readFileSync(dbFile, 'utf-8')) || [];
  } catch {
    return [];
  }
}
function salvarSolicitacoes(dados) {
  try { fs.writeFileSync(dbFile, JSON.stringify(dados, null, 2), 'utf-8'); } catch (err) {}
}

const ADMIN_USER = process.env.ADMIN_USER || 'root';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'aeromovel';

function validarToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  return authHeader.replace('Bearer ', '').trim() === Buffer.from(`${ADMIN_USER}:${ADMIN_SECRET_KEY}`).toString('base64');
}

app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body || {};
  if (usuario === ADMIN_USER && senha === ADMIN_SECRET_KEY) {
    return res.status(200).json({ success: true, token: Buffer.from(`${ADMIN_USER}:${ADMIN_SECRET_KEY}`).toString('base64') });
  }
  return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
});

// NOVO UPLOAD (Stream Direto: evita quebra de memória no Render)
app.post('/api/upload', (req, res) => {
  const filename = req.query.filename || `arquivo-${Date.now()}`;
  const filePath = path.join(uploadsDir, filename);
  
  const stream = fs.createWriteStream(filePath);
  req.pipe(stream);

  stream.on('finish', () => {
    // Identifica HTTPS automaticamente para não dar erro de Mixed Content
    const protocol = req.headers['x-forwarded-proto'] || req.protocol; 
    const host = req.get('host');
    res.status(200).json({ url: `${protocol}://${host}/uploads/${encodeURIComponent(filename)}` });
  });

  stream.on('error', (err) => {
    console.error('Erro Stream Upload:', err);
    res.status(500).json({ error: 'Erro ao gravar arquivo no disco do servidor.' });
  });
});

app.use('/uploads', express.static(uploadsDir));

app.get('/api/solicitacoes', (req, res) => {
  if (!validarToken(req)) return res.status(401).json({ error: 'Não autorizado' });
  res.status(200).json(lerSolicitacoes());
});

app.post('/api/solicitacoes', (req, res) => {
  try {
    const sol = req.body;
    if (!sol || !sol.id) return res.status(400).json({ error: 'Dados inválidos' });
    const lista = lerSolicitacoes();
    lista.unshift(sol);
    salvarSolicitacoes(lista);
    res.status(201).json({ success: true, id: sol.id });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno ao salvar solicitação' });
  }
});

app.delete('/api/solicitacoes', (req, res) => {
  if (!validarToken(req)) return res.status(401).json({ error: 'Não autorizado' });
  let lista = lerSolicitacoes();
  lista = lista.filter(item => item.id !== req.query.id);
  salvarSolicitacoes(lista);
  res.status(200).json({ success: true });
});

function encontrarIndexHtml() {
  const caminhos = [
    path.join(__dirname, 'public', 'index.html'),
    path.join(__dirname, 'index.html')
  ];
  for (const p of caminhos) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const arquivoIndex = encontrarIndexHtml();
if (arquivoIndex) {
  app.use(express.static(path.dirname(arquivoIndex)));
  app.get('*', (req, res) => res.sendFile(arquivoIndex));
}

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
