const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações para o servidor entender o envio de arquivos e JSON
app.use(cors());
app.use(express.json()); 

// Indica ao servidor que a pasta "public" contém as páginas do site
app.use(express.static(path.join(__dirname, 'public')));
// Permite que o painel admin acesse e baixe os arquivos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Garante que a pasta de uploads e o "banco de dados" existam quando iniciar
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([]));
}

// ==========================================
// ROTA 1: RECEBER E SALVAR OS ARQUIVOS (WORD E PDF)
// ==========================================
app.post('/api/upload', (req, res) => {
  const filename = req.query.filename || `documento_${Date.now()}`;
  const filePath = path.join(uploadsDir, filename);
  
  // Recebe o arquivo cru (Stream) enviado pelo gerador e salva na pasta uploads
  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);
  
  req.on('end', () => {
    // Retorna a URL onde o arquivo ficou salvo para o front-end registrar no banco
    res.json({ url: `/uploads/${filename}` });
  });

  req.on('error', (err) => {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro interno ao salvar o arquivo' });
  });
});

// ==========================================
// ROTA 2: SALVAR OS DADOS DA SOLICITAÇÃO NO BANCO
// ==========================================
app.post('/api/solicitacoes', (req, res) => {
  try {
    const novaSolicitacao = req.body;
    
    // Lê o banco de dados atual
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Adiciona a nova solicitação sempre no topo da lista (início)
    db.unshift(novaSolicitacao);
    
    // Salva o arquivo atualizado
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    res.json({ success: true, message: 'Registrado no Painel Admin com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar no banco:', error);
    res.status(500).json({ error: 'Erro interno ao salvar dados do formulário.' });
  }
});

// ==========================================
// ROTA 3: ENVIAR OS DADOS PARA A TELA DO ADMIN
// ==========================================
app.get('/api/solicitacoes', (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(db);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar o banco de dados.' });
  }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
  console.log(`Servidor SisDoc rodando na porta ${PORT}`);
});
