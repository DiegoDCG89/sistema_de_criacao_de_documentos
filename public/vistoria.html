const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações básicas
app.use(cors());
app.use(express.json()); // Permite receber JSON do frontend

// Define as pastas que o navegador pode acessar publicamente
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Garante que a pasta de uploads e o arquivo de banco de dados existam
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify([]));

// ==========================================
// ROTA 1: RECEBER OS ARQUIVOS WORD E PDF
// ==========================================
app.post('/api/upload', (req, res) => {
  // Pega o nome do arquivo que enviamos no frontend
  const filename = req.query.filename || `arquivo_${Date.now()}`;
  const filePath = path.join(uploadsDir, filename);
  
  // Cria um fluxo de gravação para salvar o arquivo cru que vem no Body
  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);
  
  req.on('end', () => {
    // Quando terminar de baixar no servidor, devolve o link de acesso
    res.json({ url: `/uploads/${filename}` });
  });

  req.on('error', (err) => {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro ao salvar o arquivo' });
  });
});

// ==========================================
// ROTA 2: SALVAR DADOS DA SOLICITAÇÃO (JSON)
// ==========================================
app.post('/api/solicitacoes', (req, res) => {
  try {
    const novaSolicitacao = req.body;
    
    // Lê o banco de dados atual
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Adiciona o novo pedido no início da lista
    db.unshift(novaSolicitacao);
    
    // Salva o arquivo novamente
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    res.json({ success: true, message: 'Solicitação registrada com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar no banco:', error);
    res.status(500).json({ error: 'Erro interno ao salvar dados.' });
  }
});

// ==========================================
// ROTA 3: LISTAR DADOS PARA O PAINEL ADMIN
// ==========================================
app.get('/api/solicitacoes', (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(db);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler o banco de dados.' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor SisDoc rodando na porta ${PORT}`);
});
