const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// CONFIGURAÇÃO DO GOOGLE DRIVE (OAUTH 2.0)
// ==========================================
const PARENT_FOLDER_ID = process.env.PARENT_FOLDER_ID || '1aRQ3voavqDnmvY3TVeTF81X3QwxAByB7';

let drive;
try {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  drive = google.drive({ version: 'v3', auth: oauth2Client });
  console.log('Cliente Google Drive OAuth 2.0 inicializado com sucesso.');
} catch (error) {
  console.error('Erro ao inicializar Google Drive OAuth:', error.message);
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify([]));

// ==========================================
// ROTA 1: UPLOAD DIRETO PARA O GOOGLE DRIVE
// ==========================================
app.post('/api/upload', (req, res) => {
  const filename = req.query.filename || `documento_${Date.now()}.docx`;
  const folderName = req.query.folder || 'Sem Classificacao';

  const tempPath = path.join(uploadsDir, filename);
  const writeStream = fs.createWriteStream(tempPath);

  req.pipe(writeStream);

  writeStream.on('finish', async () => {
    try {
      if (!drive) {
        throw new Error('Cliente Google Drive não autenticado.');
      }

      // 1. Busca se a subpasta já existe dentro da pasta mãe
      const sanitizedFolder = folderName.replace(/'/g, "\\'");
      const query = `mimeType='application/vnd.google-apps.folder' and name='${sanitizedFolder}' and '${PARENT_FOLDER_ID}' in parents and trashed=false`;
      
      const resFolder = await drive.files.list({
        q: query,
        fields: 'files(id, name)'
      });

      let subFolderId;

      if (resFolder.data.files && resFolder.data.files.length > 0) {
        subFolderId = resFolder.data.files[0].id;
      } else {
        // Cria a subpasta na conta pessoal
        const createFolder = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [PARENT_FOLDER_ID]
          },
          fields: 'id'
        });
        subFolderId = createFolder.data.id;
        console.log(`Subpasta criada: [${folderName}] ID: ${subFolderId}`);
      }

      // 2. Detecta tipo MIME adequado
      let mimeType = 'application/octet-stream';
      if (filename.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (filename.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      }

      // 3. Upload do arquivo para a subpasta
      const uploadedFile = await drive.files.create({
        requestBody: {
          name: filename,
          parents: [subFolderId]
        },
        media: {
          mimeType: mimeType,
          body: fs.createReadStream(tempPath)
        },
        fields: 'id, name'
      });

      console.log(`Arquivo salvo no Drive: [${uploadedFile.data.name}] ID: ${uploadedFile.data.id}`);

      // 4. Limpa o arquivo temporário local
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      return res.json({ success: true, fileId: uploadedFile.data.id });

    } catch (error) {
      console.error('Erro no upload para o Drive:', error.response?.data || error.message);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(500).json({ error: 'Erro ao enviar para o Google Drive' });
    }
  });

  writeStream.on('error', (err) => {
    console.error('Erro na gravação do arquivo temporário:', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return res.status(500).json({ error: 'Erro ao processar arquivo no servidor' });
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
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar protocolo' });
  }
});

app.get('/api/solicitacoes', (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(db);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler protocolo' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor SisDoc rodando na porta ${PORT}`);
});
