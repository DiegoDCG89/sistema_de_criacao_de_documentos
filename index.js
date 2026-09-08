import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Configuração para processar JSON e uploads binários
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// Diretório para armazenar os arquivos gerados
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Arquivo local para persistência de dados das solicitações
const dbFile = path.join(__dirname, 'solicitacoes_db.json');
function lerSolicitacoes() {
  try {
    if (!fs.existsSync(dbFile)) return [];
    const raw = fs.readFileSync(dbFile, 'utf-8');
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function salvarSolicitacoes(dados) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(dados, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar no arquivo db:', err);
  }
}

// Credenciais de Administrador
const ADMIN_USER = process.env.ADMIN_USER || 'root';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'aeromovel';

function validarToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '').trim();
  const expectedToken = Buffer.from(`${ADMIN_USER}:${ADMIN_SECRET_KEY}`).toString('base64');
  return token === expectedToken;
}

// ----------------------------------------------------
// 1. ROTA DE LOGIN
// ----------------------------------------------------
app.post('/api/login', express.json(), (req, res) => {
  const { usuario, senha } = req.body || {};
  if (usuario === ADMIN_USER && senha === ADMIN_SECRET_KEY) {
    const token = Buffer.from(`${ADMIN_USER}:${ADMIN_SECRET_KEY}`).toString('base64');
    return res.status(200).json({ success: true, token });
  }
  return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
});

// ----------------------------------------------------
// 2. ROTA DE UPLOAD DE ARQUIVOS (.docx e .pdf)
// ----------------------------------------------------
app.post('/api/upload', (req, res) => {
  try {
    const filename = req.query.filename || `arquivo-${Date.now()}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, req.body);
    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${encodeURIComponent(filename)}`;

    return res.status(200).json({ url: fileUrl });
  } catch (err) {
    console.error('Erro no upload:', err);
    return res.status(500).json({ error: 'Falha ao salvar arquivo no servidor' });
  }
});

// Serve a pasta de arquivos para download direto
app.use('/uploads', express.static(uploadsDir));

// ----------------------------------------------------
// 3. ROTAS DE SOLICITAÇÕES (CRIAR, LISTAR, DELETAR)
// ----------------------------------------------------
app.get('/api/solicitacoes', (req, res) => {
  if (!validarToken(req)) {
    return res.status(401).json({ error: 'Acesso não autorizado' });
  }
  const lista = lerSolicitacoes();
  return res.status(200).json(lista);
});

app.post('/api/solicitacoes', express.json(), (req, res) => {
  try {
    const sol = req.body;
    if (!sol || !sol.id) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const lista = lerSolicitacoes();
    lista.unshift(sol);
    salvarSolicitacoes(lista);

    return res.status(201).json({ success: true, id: sol.id });
  } catch (err) {
    console.error('Erro ao registrar solicitação:', err);
    return res.status(500).json({ error: 'Erro interno ao salvar solicitação' });
  }
});

app.delete('/api/solicitacoes', (req, res) => {
  if (!validarToken(req)) {
    return res.status(401).json({ error: 'Acesso não autorizado' });
  }

  const { id } = req.query;
  let lista = lerSolicitacoes();
  lista = lista.filter(item => item.id !== id);
  salvarSolicitacoes(lista);

  return res.status(200).json({ success: true, message: `Solicitação ${id} removida` });
});

// ----------------------------------------------------
// 4. SERVIR ARQUIVOS ESTÁTICOS / HTML
// ----------------------------------------------------
function encontrarIndexHtml() {
  const caminhosPossiveis = [
    path.join(__dirname, 'public', 'index.html'),
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'sisdoc-eb', 'public', 'index.html'),
    path.join(process.cwd(), 'public', 'index.html'),
    path.join(process.cwd(), 'index.html')
  ];

  for (const p of caminhosPossiveis) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const arquivoIndex = encontrarIndexHtml();
if (arquivoIndex) {
  app.use(express.static(path.dirname(arquivoIndex)));
  app.get('*', (req, res) => {
    res.sendFile(arquivoIndex);
  });
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
