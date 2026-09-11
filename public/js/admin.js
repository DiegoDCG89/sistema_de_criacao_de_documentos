document.addEventListener('DOMContentLoaded', () => {
  carregarSolicitacoes();
});

window.carregarSolicitacoes = async function() {
  const tbody = document.getElementById('tabela-corpo');
  
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-10">
        <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-[#2c3b2c] mb-2"></i>
        <p class="text-sm font-medium text-stone-500">Buscando protocolo...</p>
      </td>
    </tr>
  `;
  if (window.lucide) lucide.createIcons();

  try {
    const resposta = await fetch('/api/solicitacoes');
    if (!resposta.ok) throw new Error('Falha ao buscar os dados.');

    const dados = await resposta.json();
    tbody.innerHTML = '';

    if (dados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-10 text-stone-500 font-medium">
            Nenhuma solicitação deu entrada ainda.
          </td>
        </tr>
      `;
      return;
    }

    dados.forEach(req => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-stone-100 hover:bg-[#fbfaf6] transition-colors';

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
      `;
      tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();

  } catch (erro) {
    console.error(erro);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-10 text-red-500 font-medium">
          <i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-2 text-red-500"></i>
          Erro de conexão com o servidor.
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
  }
};
