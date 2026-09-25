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

  // Monitora se o token foi aceito
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      console.log('Novo Refresh Token recebido da Google.');
    }
    console.log('Access Token gerado com sucesso.');
  });

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

// ==========================================
// ROTA 1: UPLOAD DIRETO PARA O GOOGLE DRIVE
// ==========================================
app.post('/api/upload', (req, res) => {
  const filenameOriginal = req.query.filename || `documento_${Date.now()}.docx`;
  const filename = path.basename(filenameOriginal);
  const extensoesPermitidas = ['.docx', '.pdf'];
  
  if (!extensoesPermitidas.includes(path.extname(filename).toLowerCase())) {
    return res.status(400).json({ error: 'Tipo de arquivo não permitido.' });
  }

  const tempPath = path.join(uploadsDir, filename);
  const folderName = req.query.folder || 'Sem Classificacao';

  const writeStream = fs.createWriteStream(tempPath);
  req.pipe(writeStream);

  writeStream.on('finish', async () => {
    try {
      if (!drive) throw new Error('Cliente Google Drive não autenticado.');

      // 1. Busca se a subpasta já existe (QUERY CORRIGIDA)
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
        // Cria a subpasta na pasta mãe
        const createFolder = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [PARENT_FOLDER_ID]
          },
          fields: 'id'
        });
        subFolderId = createFolder.data.id;
        console.log(`Nova subpasta criada: [${folderName}] ID: ${subFolderId}`);
      }

      // 2. Upload do arquivo
      let mimeType = filename.endsWith('.docx') 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        : 'application/pdf';

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

      console.log(`Salvo com sucesso: [${uploadedFile.data.name}]`);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.json({ success: true, fileId: uploadedFile.data.id });

    } catch (error) {
      console.error('Falha de Upload:', error.message);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(500).json({ error: 'Erro de comunicação com o Drive' });
    }
  });

  writeStream.on('error', (err) => {
    console.error('Erro na gravação local:', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return res.status(500).json({ error: 'Erro no servidor' });
  });
});

// Mantivemos sua rota fake para não quebrar o frontend, mas o arquivo JSON foi removido
app.post('/api/solicitacoes', (req, res) => {
  res.json({ success: true, message: 'Log local desativado nesta versão' });
});

app.listen(PORT, () => {
  console.log(`Servidor SisDoc rodando na porta ${PORT}`);
});
