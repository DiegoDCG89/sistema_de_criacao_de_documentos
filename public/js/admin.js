// public/js/admin.js

const AUTH_KEY = 'sisdoc_admin_token';

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  // Mapeamento de Eventos
  document.getElementById('form-login').addEventListener('submit', realizarLogin);
  document.getElementById('btn-atualizar').addEventListener('click', carregarProcessos);
  document.getElementById('btn-sair').addEventListener('click', fazerLogout);

  verificarSessao();
});

// ==========================================
// 1. GERENCIAMENTO DE SESSÃO E LOGIN
// ==========================================
function verificarSessao() {
  const token = sessionStorage.getItem(AUTH_KEY);
  if (token) {
    mostrarTela('dashboard');
    carregarProcessos();
  } else {
    mostrarTela('login');
  }
}

function mostrarTela(tela) {
  const viewLogin = document.getElementById('view-login');
  const viewDashboard = document.getElementById('view-dashboard');

  if (tela === 'login') {
    viewLogin.classList.remove('hidden');
    viewDashboard.classList.add('hidden');
    // Limpa campos por segurança
    document.getElementById('admin-user').value = '';
    document.getElementById('admin-pass').value = '';
  } else {
    viewLogin.classList.add('hidden');
    viewDashboard.classList.remove('hidden');
  }
}

async function realizarLogin(e) {
  e.preventDefault();
  
  const usuario = document.getElementById('admin-user').value.trim();
  const senha = document.getElementById('admin-pass').value.trim();
  const erroMsg = document.getElementById('login-error');

  erroMsg.classList.add('hidden');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });

    const data = await res.json();
    
    if (res.ok && data.success) {
      sessionStorage.setItem(AUTH_KEY, data.token);
      verificarSessao();
    } else {
      erroMsg.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Erro ao conectar ao servidor de autenticação:', err);
    erroMsg.classList.remove('hidden');
  }
}

function fazerLogout() {
  sessionStorage.removeItem(AUTH_KEY);
  verificarSessao();
}

// ==========================================
// 2. BUSCAR DADOS E MONTAR TABELA
// ==========================================
async function carregarProcessos() {
  const token = sessionStorage.getItem(AUTH_KEY);
  if (!token) return;

  const btnAtualizar = document.getElementById('btn-atualizar');
  btnAtualizar.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Carregando...';

  try {
    const res = await fetch('/api/solicitacoes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      // Token inválido ou expirado
      fazerLogout();
      return;
    }

    const dados = await res.json();
    renderizarTabela(dados);
  } catch (err) {
    console.error('Erro ao buscar processos:', err);
    alert('Erro ao conectar com o servidor para buscar os dados.');
  } finally {
    btnAtualizar.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> Atualizar';
    if (window.lucide) lucide.createIcons();
  }
}

function renderizarTabela(lista) {
  const tbody = document.getElementById('tabela-body');
  const emptyState = document.getElementById('tabela-vazia');

  tbody.innerHTML = '';

  if (!lista || lista.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  lista.forEach(sol => {
    // Tratamento seguro para os botões de download
    const btnPdf = sol.urlPdfDocs ? `<a href="${sol.urlPdfDocs}" target="_blank" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-semibold shadow-sm transition">PDF</a>` : '';
    const btnWordDiex = sol.urlDiex ? `<a href="${sol.urlDiex}" target="_blank" class="bg-[#4B5320] hover:bg-[#353c15] text-white px-2 py-1 rounded text-xs font-semibold shadow-sm transition">DIEx (Word)</a>` : '';
    const btnWordBar = sol.urlNotaBar ? `<a href="${sol.urlNotaBar}" target="_blank" class="bg-stone-700 hover:bg-stone-800 text-white px-2 py-1 rounded text-xs font-semibold shadow-sm transition">BAR (Word)</a>` : '';
    const btnWordOp = sol.urlOp ? `<a href="${sol.urlOp}" target="_blank" class="bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 rounded text-xs font-semibold shadow-sm transition">OP (Word)</a>` : '';

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-stone-50 transition border-b border-stone-100';
    tr.innerHTML = `
      <td class="p-4 align-top">
        <span class="font-bold text-stone-800 block">${sol.id || 'N/I'}</span>
        <span class="text-xs text-stone-500">${sol.dataCriacao || '-'}</span>
      </td>
      <td class="p-4 align-top">
        <span class="font-bold text-stone-900 block">${sol.posto || ''} ${sol.nomeCompleto || sol.nome || 'N/I'}</span>
        <span class="text-xs text-stone-500 block">CPF: ${sol.cpf || 'N/I'}</span>
      </td>
      <td class="p-4 align-top">
        <span class="text-stone-800 block font-medium">${sol.omDestino || 'N/I'}</span>
        <span class="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded mt-1 inline-block">${sol.modalidade === 'transporte_pnr' ? 'Bagagem - Mesma Sede' : (sol.modalidade || 'Outros')}</span>
      </td>
      <td class="p-4 align-top text-center">
        <div class="flex items-center justify-center gap-1.5 flex-wrap">
          ${btnPdf} ${btnWordDiex} ${btnWordBar} ${btnWordOp}
          <button onclick="window.excluirSolicitacao('${sol.id}')" title="Excluir Processo" class="ml-2 p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  if (window.lucide) lucide.createIcons();
}

// Expõe a função de deletar para o botão na tabela
window.excluirSolicitacao = async (id) => {
  if (!confirm(`Tem certeza que deseja apagar o processo ${id} permanentemente do servidor?`)) return;

  const token = sessionStorage.getItem(AUTH_KEY);
  try {
    const res = await fetch(`/api/solicitacoes?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      carregarProcessos();
    } else {
      alert('Erro ao tentar excluir a solicitação.');
    }
  } catch (err) {
    console.error('Falha ao excluir:', err);
  }
};
