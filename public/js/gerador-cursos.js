// =========================================================================
    // 3. UPLOAD SEQUENCIAL PARA O GOOGLE DRIVE (Evita duplicação de pasta)
    // =========================================================================
    if (btnSubmit) btnSubmit.innerHTML = `<span class="animate-pulse">Enviando arquivos para a pasta ${pastaDestinoDrive}...</span>`;

    const enviarParaDrive = async (blob, nomeArquivo) => {
      const url = `/api/upload?filename=${encodeURIComponent(nomeArquivo)}&folder=${encodeURIComponent(pastaDestinoDrive)}`;
      return fetch(url, { method: 'POST', body: blob });
    };

    const listaEnvios = [
      { blob: blobDiex, nome: nomeArquivoDiex },
      { blob: blobBar, nome: nomeArquivoBar },
      { blob: blobOrdPagto, nome: nomeArquivoOrdPagto }
    ];

    // Envio sequencial obrigatório: o primeiro cria a pasta, os outros aproveitam a mesma
    for (const item of listaEnvios) {
      try {
        await enviarParaDrive(item.blob, item.nome);
      } catch (errUploadItem) {
        console.warn(`Erro no upload de ${item.nome}:`, errUploadItem);
      }
    }
