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

app.post('/gerar-vistoria', async (req, res) => {
    try {
        const { tipoVistoria, nomeMilitar, dataVistoria, itens } = req.body;

        // 1. Carregar o template do Termo de Vistoria (certifique-se de salvar um modelo .docx válido na pasta templates)
        const content = fs.readFileSync(path.resolve(__dirname, 'public/templates/termo_vistoria.docx'), 'binary');
        
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // 2. Preencher os dados no documento
        // No seu template .docx, você usará {#itens} {nome} - {estado} {/itens} para gerar as linhas da tabela
        doc.render({
            tipoVistoria: tipoVistoria,
            nomeMilitar: nomeMilitar,
            dataVistoria: dataVistoria,
            itens: itens 
        });

        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        
        // Caminho temporário para salvar o arquivo gerado
        const fileName = `Termo_Vistoria_${tipoVistoria}_${nomeMilitar.replace(/\s+/g, '_')}.docx`;
        const tempPath = path.resolve(__dirname, 'temp', fileName);
        fs.writeFileSync(tempPath, buf);

        // 3. Upload para o Google Drive na pasta ESPECÍFICA solicitada
        // ID da Pasta: 10XKJm8SvCr6YWLNgbdaYUR20Go_L6m6P
        const drive = google.drive({ version: 'v3', auth: oauth2Client }); // Usa a autenticação já configurada no seu projeto
        
        const fileMetadata = {
            name: fileName,
            parents: ['10XKJm8SvCr6YWLNgbdaYUR20Go_L6m6P'] // <--- PASTA SOLICITADA
        };
        
        const media = {
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            body: fs.createReadStream(tempPath)
        };

        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink'
        });

        // Limpar arquivo temporário
        fs.unlinkSync(tempPath);

        // Enviar a URL de volta para o usuário baixar/visualizar
        res.json({ 
            success: true, 
            message: 'Documento salvo no Drive',
            fileId: driveResponse.data.id,
            downloadUrl: driveResponse.data.webContentLink
        });

    } catch (error) {
        console.error("Erro ao gerar vistoria:", error);
        res.status(500).json({ error: 'Erro interno ao gerar o documento de vistoria.' });
    }
});
// Rota para Gerar Termo de Vistoria de PNR
app.post('/gerar-termo-vistoria', async (req, res) => {
    try {
        const { tipoVistoria, dataVistoria, nomeMilitar, enderecoPNR, itens } = req.body;

        // Escolhe o template certo baseado no dropdown
        let templateFile = tipoVistoria === 'OCUPACAO' 
            ? 'termo_vistoria_ocupacao.docx' 
            : 'termo_vistoria_desocupacao.docx';

        const templatePath = path.resolve(__dirname, 'public/templates', templateFile);
        
        // Lê o arquivo gerado e extrai o ZIP (docxtemplater)
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Aplica os dados (substitui as tags no Word, multiplicando a tabela)
        doc.render({
            tipoVistoria: tipoVistoria === 'OCUPACAO' ? 'OCUPAÇÃO' : 'DESOCUPAÇÃO',
            dataVistoria: dataVistoria,
            nomeMilitar: nomeMilitar.toUpperCase(),
            enderecoPNR: enderecoPNR,
            itens: itens // O array que vai gerar as linhas dinâmicas
        });

        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        
        // Nome limpo para salvar
        const nomeMilitarLimpo = nomeMilitar.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Vistoria_PNR_${tipoVistoria}_${nomeMilitarLimpo}.docx`;
        const tempPath = path.resolve(__dirname, 'temp', fileName); // Garanta que a pasta "temp" exista na raiz do projeto
        
        fs.writeFileSync(tempPath, buf);

        // Upload para a pasta específica do Google Drive
        const drive = google.drive({ version: 'v3', auth: oauth2Client }); // Supondo que oauth2Client está configurado
        
        const fileMetadata = {
            name: fileName,
            parents: ['10XKJm8SvCr6YWLNgbdaYUR20Go_L6m6P'] // A PASTA DO PNR NO DRIVE
        };
        
        const media = {
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            body: fs.createReadStream(tempPath)
        };

        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });

        // Apaga o arquivo local temporário
        fs.unlinkSync(tempPath);

        res.json({ 
            success: true, 
            fileId: driveResponse.data.id,
            downloadUrl: driveResponse.data.webViewLink
        });

    } catch (error) {
        console.error("Erro na Vistoria PNR:", error);
        res.status(500).json({ error: 'Erro ao gerar ou salvar a vistoria.' });
    }
});


// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor SisDoc rodando na porta ${PORT}`);
});
