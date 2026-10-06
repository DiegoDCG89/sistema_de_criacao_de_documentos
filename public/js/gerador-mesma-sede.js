// Exemplo da função que você provavelmente já tem para gerar e enviar os arquivos
async function gerarDocumento(templateUrl, nomeArquivoSaida, dadosFormulario, nomePasta) {
    try {
        // 1. Carrega o template
        const response = await fetch(templateUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        // 2. Processa com PizZip e Docxtemplater
        const zip = new window.PizZip(arrayBuffer);
        const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        
        // 3. Aplica os dados do formulário nas variáveis do documento
        doc.render(dadosFormulario);
        
        // 4. Gera o arquivo final (Blob)
        const blob = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        // 5. Cria um File object para enviar para a sua rota de upload no Node.js
        const file = new File([blob], nomeArquivoSaida, { type: blob.type });
        
        // Chama a sua função existente que faz o fetch para '/api/upload'
        await fazerUploadParaDrive(file, nomePasta); 
        
    } catch (error) {
        console.error(`Erro ao gerar ${nomeArquivoSaida}:`, error);
    }
}

// Evento de envio do formulário da Mesma Sede
document.getElementById('formMesmaSede').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Captura os dados do formulário
    const dados = {
        nome: document.getElementById('nome').value,
        posto: document.getElementById('posto').value,
        // ... (adicione todas as variáveis necessárias que estão nos templates)
    };

    const pastaDestino = `Bagagem_Mesma_Sede_${dados.nome}`;

    // Mostra indicador de carregamento na interface...
    
    try {
        // 1. Gera o documento principal (que você já tinha)
        await gerarDocumento(
            '/templates/template-mesma-sede.docx', 
            `Requerimento_Bagagem_${dados.nome}.docx`, 
            dados, 
            pastaDestino
        );

        // ==========================================
        // 2. ADICIONA A GERAÇÃO DO DIEX DE OPÇÃO
        // ==========================================
        await gerarDocumento(
            '/templates/template-diex-opcao.docx', // Caminho para o template igual ao de Cursos
            `DIEx_Opcao_${dados.nome}.docx`, 
            dados, 
            pastaDestino
        );

        // ==========================================
        // 3. ADICIONA A GERAÇÃO DA NOTA DIEX OPÇÃO
        // ==========================================
        await gerarDocumento(
            '/templates/template-nota-diex-opcao.docx', // Caminho para o template
            `Nota_DIEx_Opcao_${dados.nome}.docx`, 
            dados, 
            pastaDestino
        );

        alert('Todos os documentos gerados e salvos no Drive com sucesso!');
        // Limpar formulário, esconder loading, etc.
    } catch (erro) {
        alert('Ocorreu um erro ao gerar os documentos da Mesma Sede.');
    }
});
