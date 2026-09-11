const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis'); // Nova biblioteca

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// CONFIGURAÇÃO DO GOOGLE DRIVE
// ==========================================
// Cole o ID da pasta que você pegou no Passo 1 aqui dentro das aspas!
const PARENT_FOLDER_ID = 'COLE_O_ID_DA_PASTA_AQUI';

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/drive.file']
});
const drive = google.drive({ version: 'v3', auth });

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify([]));

// ==========================================
// ROTA 1: UPLOAD DIRETO PARA O GOOGLE DRIVE
// ==========================================
app.post('/api/upload', (req, res) => {
  const filename = req.query.filename || `arquivo_${Date.now()}`;
  // Recebe o nome da pasta enviado pelo front-end
  const folderName = req.query.folder || 'Sem Classificacao'; 

  // Salva temporariamente no servidor apenas para fazer a ponte
  const tempPath = path.join(uploadsDir, filename);
  const writeStream = fs.createWriteStream(tempPath);
  req.pipe(writeStream);
  
  req.on('end', async () => {
    try {
      // 1. Verifica se a subpasta (ex: Bagagem - Sgt Fulano) já existe
      let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${PARENT_FOLDER_ID}' in parents and trashed=false`;
      let resFolder = await drive.files.list({ q: query, fields: 'files(id, name)' });
      let subFolderId;

      if (resFolder.data.files.length > 0) {
        subFolderId = resFolder.data.files[0].id; // Já existe
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
      
      const driveFile = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id, webViewLink'
      });

      // 3. Apaga o arquivo temporário do Render
      fs.unlinkSync(tempPath);

      // 4. Retorna o link oficial do Google Drive para o Painel Admin!
      res.json({ url: driveFile.data.webViewLink });

    } catch (error) {
      console.error('Erro no Drive:', error);
      res.status(500).json({ error: 'Erro ao enviar para o Google Drive' });
    }
  });
});

// ==========================================
// ROTAS 2 E 3: BANCO DE DADOS (MANTIDAS)
// ==========================================
app.post('/api/solicitacoes', (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    db.unshift(req.body);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Erro ao salvar' }); }
});

app.get('/api/solicitacoes', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(dbPath, 'utf8'))); } 
  catch (error) { res.status(500).json({ error: 'Erro ao ler' }); }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
