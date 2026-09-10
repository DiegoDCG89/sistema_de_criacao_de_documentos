// public/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    carregarSolicitacoes();
  });
  
  // Função atrelada ao botão "Atualizar" na interface (global)
  window.carregarSolicitacoes = async function() {
    const tbody = document.getElementById('tabela-corpo');
    
    // Mostra o ícone de carregamento enquanto busca os dados
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-10">
          <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-[#2c3b2c] mb-2"></i>
          <p class="text-sm font-medium text-stone-500">Buscando documentos no servidor...</p>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
  
    try {
      const resposta = await fetch('/api/solicitacoes');
      
      if (!resposta.ok) {
        throw new Error('Falha ao buscar os dados da API.');
      }
  
      const dados = await resposta.json();
      tbody.innerHTML = '';
  
      // Caso não tenha nenhum documento salvo ainda
      if (dados.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-10 text-stone-500 font-medium">
              Nenhuma solicitação encontrada no banco de dados.
            </td>
          </tr>
        `;
        return;
      }
  
      // Monta as linhas da tabela para cada solicitação
      dados.forEach(req => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-stone-100 hover:bg-[#fbfaf6] transition-colors';
  
        // Montar os botões de download apenas se a URL existir
        let botoesDownload = '';
        
        if (req.urlPdfDocs) {
          botoesDownload += `<a href="${req.urlPdfDocs}" download title="Baixar Checklist PDF" class="flex items-center gap-1 bg-[#2c3b2c] hover:bg-[#1a241a] text-[#c6b075] px-2.5 py-1.5 rounded text-xs font-bold transition shadow-sm"><i data-lucide="file-text" class="w-3.5 h-3.5"></i> PDF</a>`;
        }
        if (req.urlDiex) {
          botoesDownload += `<a href="${req.urlDiex}" download title="Baixar DIEx" class="flex items-center gap-1 border border-[#2c3b2c] text-[#2c3b2c] hover:bg-[#2c3b2c] hover:text-[#c6b075] px-2.5 py-1.5 rounded text-xs font-bold transition shadow-sm"><i data-lucide="file-word" class="w-3.5 h-3.5"></i> DIEx</a>`;
        }
        if (req.urlNotaBar) {
          botoesDownload += `<a href="${req.urlNotaBar}" download title="Baixar Nota para BAR" class="flex items-center gap-1 border border-[#2c3b2c] text-[#2c3b2c] hover:bg-[#2c3b2c] hover:text-[#c6b075] px-2.5 py-1.5 rounded text-xs font-bold transition shadow-sm"><i data-lucide="file-word" class="w-3.5 h-3.5"></i> BAR</a>`;
        }
        if (req.urlOp) {
          botoesDownload += `<a href="${req.urlOp}" download title="Baixar Ordem de Pagamento" class="flex items-center gap-1 border border-[#2c3b2c] text-[#2c3b2c] hover:bg-[#2c3b2c] hover:text-[#c6b075] px-2.5 py-1.5 rounded text-xs font-bold transition shadow-sm"><i data-lucide="file-word" class="w-3.5 h-3.5"></i> OP</a>`;
        }
  
        // Cor do Badge da modalidade (estética)
        let corBadge = 'bg-[#e1d5b3] text-[#2c3b2c]';
        if (req.modalidade.includes('Bagagem')) corBadge = 'bg-stone-200 text-stone-700';
  
        tr.innerHTML = `
          <td class="p-4 text-sm font-bold text-[#2c3b2c]">${req.id || '-'}</td>
          <td class="p-4 text-sm text-stone-600">${req.dataCriacao || '-'}</td>
          <td class="p-4 text-sm">
            <span class="${corBadge} px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
              ${req.modalidade || 'Indefinido'}
            </span>
          </td>
          <td class="p-4 text-sm text-stone-800 font-medium">${req.posto || ''} ${req.nomeCompleto || ''}</td>
          <td class="p-4 text-sm text-stone-600 font-mono">${req.cpf || '-'}</td>
          <td class="p-4">
            <div class="flex flex-wrap items-center gap-2">
              ${botoesDownload || '<span class="text-xs text-stone-400 italic">Nenhum arquivo salvo</span>'}
            </div>
          </td>
        `;
        
        tbody.appendChild(tr);
      });
  
      if (window.lucide) lucide.createIcons();
  
    } catch (erro) {
      console.error(erro);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-10 text-red-500 font-medium">
            <i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-2 text-red-500"></i>
            Erro de conexão. O servidor backend pode estar offline ou indisponível.
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
    }
  };
