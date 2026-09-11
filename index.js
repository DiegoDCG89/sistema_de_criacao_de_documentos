const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis'); // Biblioteca do Google

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// CONFIGURAÇÃO DO GOOGLE DRIVE
// ==========================================
const PARENT_FOLDER_ID = '1aRQ3voavqDnmvY3TVeTF81X3QwxAByB7';

// Inicia a conexão usando a chave JSON que deve estar na mesma pasta
let drive;
try {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-credentials.json'),
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  drive = google.drive({ version: 'v3', auth });
} catch (error) {
  console.error("AVISO: Arquivo google-credentials.json não encontrado ou inválido!");
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify([]));

// ==========================================
// ROTA 1: UPLOAD DIRETO PARA O GOOGLE DRIVE
// ==========================================
app.post('/api/upload', (req, res) => {
  const filename = req.query.filename || `arquivo_${Date.now()}`;
  const folderName = req.query.folder || 'Sem Classificacao'; 

  // Salva temporariamente no servidor apenas para fazer a ponte
  const tempPath = path.join(uploadsDir, filename);
  const writeStream = fs.createWriteStream(tempPath);
  req.pipe(writeStream);
  
  req.on('end', async () => {
    try {
      if (!drive) throw new Error("Google Drive não está autenticado.");

      // 1. Verifica se a subpasta (ex: Bagagem - Sgt Fulano) já existe
      let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${PARENT_FOLDER_ID}' in parents and trashed=false`;
      let resFolder = await drive.files.list({ q: query, fields: 'files(id, name)' });
      let subFolderId;

      if (resFolder.data.files.length > 0) {
        subFolderId = resFolder.data.files[0].id; // Já existe, usa a mesma
      } else {
        // Cria a subpasta se não existir
        let createFolder = await drive.files.create({
            resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [PARENT_FOLDER_ID] },
            fields: 'id'
        });
        subFolderId = createFolder.data.id;
      }

      // 2. Faz o upload do arquivo para dentro dessa subpasta
      const fileMetadata = { name: filename, parents: [subFolderId] };
      const media = { body: fs.createReadStream(tempPath) };
      
      await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id'
      });

      // 3. Apaga o arquivo temporário do Render para não ocupar espaço
      fs.unlinkSync(tempPath);
      res.json({ success: true });

    } catch (error) {
      console.error('Erro no Drive:', error);
      res.status(500).json({ error: 'Erro ao enviar para o Google Drive' });
    }
  });
});

// ==========================================
// ROTAS DO LIVRO DE PROTOCOLO (ADMIN)
// ==========================================
app.post('/api/solicitacoes', (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    db.unshift(req.body);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro ao salvar protocolo' }); }
});

app.get('/api/solicitacoes', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(dbPath, 'utf8'))); } 
  catch (error) { res.status(500).json({ error: 'Erro ao ler protocolo' }); }
});

app.listen(PORT, () => {
  console.log(`Servidor SisDoc rodando na porta ${PORT}`);
});
