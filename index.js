import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Configuração para aceitar requisições JSON
app.use(express.json());

// Credenciais administrativas (definidas por variáveis de ambiente ou valores padrão)
const ADMIN_USER = process.env.ADMIN_USER || 'root';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'aeromovel';

// ----------------------------------------------------
// 1. ROTA DE AUTENTICAÇÃO DO ADMINISTRADOR
// ----------------------------------------------------
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body || {};

  if (usuario === ADMIN_USER && senha === ADMIN_SECRET_KEY) {
    const token = Buffer.from(`${ADMIN_USER}:${ADMIN_SECRET_KEY}`).toString('base64');
    return res.status(200).json({
      success: true,
      token,
      message: 'Autenticado com sucesso'
    });
  }

  return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
});

// ----------------------------------------------------
// 2. ENTREGA DA INTERFACE ESTÁTICA
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
