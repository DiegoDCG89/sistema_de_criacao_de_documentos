// =========================================================================
// SisDoc - Termo de Vistoria de PNR (ocupação / desocupação)
// Gera o .docx no navegador (Docxtemplater), baixa uma cópia e envia ao Drive
// =========================================================================
import { nomeArquivoDoc, nomeSeguro, formatarDataMilitar, dataAtualMilitar, renderizarDocx } from './utils.js';

// ---------------- Catálogo de itens por cômodo ----------------
const itensPorComodo = {
  'Área Externa': ['Jardins', 'Quintal', 'Torneiras', 'Muros', 'Paredes', 'Janelas', 'Portas', 'Portões', 'Calçada',
    'Pintura externa', 'Campainha', 'Grades', 'Lâmpadas', 'Globos', 'Plafonier/Bocal', 'Tomadas', 'Fechaduras',
    'Chaves', 'Varandas - Piso', 'Varandas - Teto', 'OBS'],
  'Sala': ['Paredes', 'Janelas', 'Portas', 'Globos', 'Plafonier/Bocal', 'Lâmpadas', 'Tomadas', 'Interruptores',
    'Fechaduras', 'Chaves', 'Tela mosquiteiro', 'Teto', 'Piso', 'Rodapé', 'Pintura', 'Grade', 'OBS'],
  'Banheiro': ['Armário c/ espelho', 'Lavatório/gabinete', 'Vaso sanitário', 'Ducha higiênica', 'Porta-toalha',
    'Porta-papel', 'Saboneteiras', 'Registros', 'Torneiras', 'Banheira', 'Chuveiro', 'Paredes (azulejos)', 'Janelas',
    'Tela mosquiteiro', 'Portas', 'Fechadura', 'Chaves', 'Ralos', 'Pia', 'Bidê', 'Piso', 'Globos', 'Plafonier/Bocal',
    'Lâmpadas', 'Tomadas', 'Interruptores', 'Teto', 'Box', 'Pintura', 'OBS'],
  'Copa/Cozinha': ['Torneiras', 'Janelas', 'Portas', 'Fechadura', 'Filtro', 'Paredes (azulejos)', 'Pia/gabinete',
    'Interfone', 'Registros', 'Ralos', 'Chaves', 'Pias (pedra ou aço)', 'Piso', 'Globos', 'Plafonier/Bocal',
    'Lâmpadas', 'Interruptores', 'Tomadas', 'Teto (Metade Laje/PVC)', 'Pintura', 'Grade', 'Armários', 'OBS'],
  'Garagem': ['Piso', 'Paredes', 'Madeiramento', 'Globos', 'Plafonier/Bocal', 'Lâmpadas', 'Pintura', 'OBS'],
  'Área de Serviço': ['Tanques', 'Registros', 'Torneiras de PVC', 'Paredes (azulejos)', 'Grade', 'Fechadura', 'Chaves',
    'Ralos', 'Piso', 'Globos', 'Plafonier/Bocal', 'Lâmpadas', 'Interruptores', 'Tomadas', 'Teto', 'Pintura', 'OBS'],
  'Instalações Hidráulicas': ['Funcionando?', 'OBS'],
  'Leituras': ['Água', 'Energia Elétrica', 'OBS']
};

const PADRAO = 'Sem Alteração';
let pnrs = {};

const $ = (id) => document.getElementById(id);
const form = $('formVistoria');
const container = $('comodosContainer');
const btnAdd = $('btnAdicionarComodo');
const btnEnviar = $('btnEnviar');
const msg = $('mensagemStatus');
const aviso = $('avisoComodos');
const TEXTO_BTN = btnEnviar.textContent;

// ---------------- Mensagens ----------------
function mostrarMensagem(texto, tipo) {
  msg.textContent = texto;
  msg.className = 'mensagem-status ' + tipo;
  msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function limparMensagem() { msg.textContent = ''; msg.className = 'mensagem-status'; }

// ---------------- Catálogo de PNRs ----------------
async function carregarPNRs() {
  const select = $('enderecoPNR');
  try {
    const res = await fetch('js/pnr-enderecos.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pnrs = await res.json();
  } catch (e) {
    console.error('Falha ao carregar PNRs:', e);
    select.innerHTML = '<option value="">Erro ao carregar a lista de PNRs</option>';
    mostrarMensagem('Não foi possível carregar a lista de PNRs. Recarregue a página.', 'erro');
    return;
  }
  select.replaceChildren(new Option('Selecione o PNR...', ''));
  const grupos = new Map();
  for (const [chave, d] of Object.entries(pnrs)) {
    if (!grupos.has(d.logradouro)) {
      const og = document.createElement('optgroup');
      og.label = d.logradouro;
      grupos.set(d.logradouro, og);
      select.appendChild(og);
    }
    grupos.get(d.logradouro).appendChild(new Option(`${d.logradouro}, ${chave}`, chave));
  }
}

// ---------------- Cômodos e Melhorias ----------------
function adicionarComodo() {
  limparMensagem();
  const card = document.createElement('section');
  card.className = 'comodo-card';

  const cabecalho = document.createElement('div');
  cabecalho.className = 'comodo-cabecalho';

  const grupo = document.createElement('div');
  grupo.className = 'flex-1 min-w-0';
  const rotulo = document.createElement('label');
  rotulo.className = 'rotulo rotulo-obrigatorio';
  const select = document.createElement('select');
  select.className = 'campo-select comodo-tipo';
  select.required = true;
  select.appendChild(new Option('Selecione o cômodo...', ''));
  Object.keys(itensPorComodo).forEach(n => select.appendChild(new Option(n, n)));
  grupo.append(rotulo, select);

  const btnRemover = document.createElement('button');
  btnRemover.type = 'button';
  btnRemover.className = 'text-red-600 hover:text-red-800 font-semibold text-sm px-2 py-2';
  btnRemover.textContent = 'Remover cômodo';
  btnRemover.addEventListener('click', () => { card.remove(); atualizarNumeracao(); limparMensagem(); });

  cabecalho.append(grupo, btnRemover);

  const titulo = document.createElement('h4');
  titulo.className = 'text-sm font-bold text-gray-700 border-b border-gray-200 pb-2 mb-4';
  titulo.textContent = 'Itens para vistoria';
  
  const grade = document.createElement('div');
  grade.className = 'comodo-itens grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4';

  card.append(cabecalho, titulo, grade);
  select.addEventListener('change', () => renderizarItens(grade, select.value));

  container.appendChild(card);
  atualizarNumeracao();
  select.focus();
}

function renderizarItens(grade, tipoComodo) {
  grade.replaceChildren();
  
  if (!tipoComodo) return;

  // Renderiza itens padrão do cômodo
  (itensPorComodo[tipoComodo] || []).forEach(nomeItem => {
    const ehObs = nomeItem === 'OBS';
    const bloco = document.createElement('div');
    bloco.className = 'item-vistoria' + (ehObs ? ' obs md:col-span-2' : '');

    const label = document.createElement('label');
    label.textContent = nomeItem;

    const campo = document.createElement('textarea');
    campo.className = 'campo-textarea item-relato';
    campo.dataset.item = nomeItem;
    campo.rows = ehObs ? 3 : 2;
    campo.setAttribute('aria-label', `${nomeItem} - ${tipoComodo}`);
    
    if (ehObs) {
      campo.placeholder = 'Observações gerais do cômodo (opcional)';
    } else {
      campo.value = PADRAO;
      campo.required = true;
    }
    bloco.append(label, campo);
    grade.appendChild(bloco);
  });

  // Bloco para adicionar Melhorias Dinâmicas
  const blocoBtnMelhoria = document.createElement('div');
  blocoBtnMelhoria.className = 'md:col-span-2 flex justify-start mt-2 border-t border-dashed border-gray-300 pt-4';

  const btnMelhoria = document.createElement('button');
  btnMelhoria.type = 'button';
  btnMelhoria.className = 'btn-secundario text-sm py-1.5 px-3 flex items-center gap-1.5';
  btnMelhoria.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Adicionar Melhoria';
  
  btnMelhoria.addEventListener('click', () => adicionarCampoMelhoria(grade, blocoBtnMelhoria));

  blocoBtnMelhoria.appendChild(btnMelhoria);
  grade.appendChild(blocoBtnMelhoria);
  
  if (typeof lucide !== 'undefined') lucide.createIcons({ root: grade });
}

function adicionarCampoMelhoria(grade, blocoBtnMelhoria) {
  const bloco = document.createElement('div');
  bloco.className = 'item-melhoria-container flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg md:col-span-2 shadow-sm';

  const cabecalho = document.createElement('div');
  cabecalho.className = 'flex justify-between items-center';
  const titulo = document.createElement('h5');
  titulo.textContent = 'Nova Melhoria';
  titulo.className = 'text-sm font-bold text-gray-700';

  const btnRemover = document.createElement('button');
  btnRemover.type = 'button';
  btnRemover.className = 'text-red-500 hover:text-red-700 text-xs font-semibold';
  btnRemover.textContent = 'Remover Melhoria';
  btnRemover.addEventListener('click', () => bloco.remove());

  cabecalho.append(titulo, btnRemover);

  const gridInputs = document.createElement('div');
  gridInputs.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

  const divNome = document.createElement('div');
  const labelNome = document.createElement('label');
  labelNome.textContent = 'Nome da Melhoria';
  labelNome.className = 'text-xs font-semibold text-gray-600 mb-1 block';
  const inputNome = document.createElement('input');
  inputNome.type = 'text';
  inputNome.className = 'campo nome-melhoria uppercase-input';
  inputNome.placeholder = 'Ex: Porcelanato, Toldo, Armário...';
  inputNome.required = true;
  divNome.append(labelNome, inputNome);

  const divRelato = document.createElement('div');
  const labelRelato = document.createElement('label');
  labelRelato.textContent = 'Estado / Condição';
  labelRelato.className = 'text-xs font-semibold text-gray-600 mb-1 block';
  const inputRelato = document.createElement('textarea');
  inputRelato.className = 'campo-textarea relato-melhoria';
  inputRelato.rows = 2;
  inputRelato.placeholder = 'Condição atual da melhoria';
  inputRelato.value = PADRAO;
  inputRelato.required = true;
  divRelato.append(labelRelato, inputRelato);

  gridInputs.append(divNome, divRelato);
  bloco.append(cabecalho, gridInputs);

  // Insere a nova melhoria antes do botão "Adicionar Melhoria"
  grade.insertBefore(bloco, blocoBtnMelhoria);
}

function atualizarNumeracao() {
  const cards = container.querySelectorAll('.comodo-card');
  cards.forEach((card, i) => {
    card.querySelector('.comodo-cabecalho label').textContent = `Cômodo ${i + 1}`;
    card.querySelector('.comodo-tipo').setAttribute('aria-label', `Selecione o tipo do cômodo ${i + 1}`);
  });
  aviso.classList.toggle('hidden', cards.length > 0);
}

// ---------------- Coleta de Dados ----------------
function coletarComodos() {
  return Array.from(container.querySelectorAll('.comodo-card')).map((card, i) => {
    const tipo = card.querySelector('.comodo-tipo').value;
    if (!tipo) throw new Error(`Selecione o tipo do cômodo ${i + 1}.`);

    const itens = [];
    
    // Coleta itens padrão
    card.querySelectorAll('.item-relato').forEach(campo => {
      const relato = campo.value.trim();
      if (!relato && campo.dataset.item !== 'OBS') {
        throw new Error(`Preencha o relato de "${campo.dataset.item}" no cômodo ${i + 1} (${tipo}).`);
      }
      if (relato) itens.push({ NOME: campo.dataset.item, RELATO: relato });
    });

    // Coleta as melhorias extras (Dinâmicas)
    card.querySelectorAll('.item-melhoria-container').forEach(container => {
      const nome = container.querySelector('.nome-melhoria').value.trim().toUpperCase();
      const relato = container.querySelector('.relato-melhoria').value.trim();
      
      if (!nome || !relato) {
        throw new Error(`Preencha corretamente o nome e o estado da melhoria adicionada no cômodo ${i + 1} (${tipo}).`);
      }
      itens.push({ NOME: nome, RELATO: relato });
    });

    return { NOME_COMODO: tipo, ITENS: itens };
  });
}

// ---------------- Envio e Geração ----------------
function baixarLocal(doc) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(doc.blob);
  link.download = doc.nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  limparMensagem();

  let comodos;
  try { comodos = coletarComodos(); }
  catch (err) { mostrarMensagem(err.message, 'erro'); return; }
  
  if (comodos.length === 0) {
    mostrarMensagem('Adicione pelo menos um cômodo para realizar a vistoria.', 'erro');
    return;
  }

  const pnr = pnrs[$('enderecoPNR').value];
  if (!pnr) { mostrarMensagem('Selecione o PNR que será vistoriado.', 'erro'); return; }

  const tipo = $('tipoVistoria').value; // OCUPACAO | DESOCUPACAO
  const payload = {
    TIPO_VISTORIA: tipo === 'OCUPACAO' ? 'OCUPAÇÃO' : 'DESOCUPAÇÃO',
    DATA_VISTORIA: formatarDataMilitar($('dataVistoria').value),
    DATA_ATUAL: dataAtualMilitar(),
    POSTO_GRAD: $('posto').value,
    NOME_COMPLETO: $('nomeMilitar').value.trim().toUpperCase(),
    ENDERECO_PNR: pnr.endereco.toUpperCase(),
    COMODOS: comodos
  };

  btnEnviar.disabled = true;
  btnAdd.disabled = true;
  let docGerado = null;

  try {
    btnEnviar.textContent = 'Gerando termo...';
    const template = tipo === 'OCUPACAO' ? '/templates/termo_vistoria_ocupacao.docx'
                                         : '/templates/termo_vistoria_desocupacao.docx';
    docGerado = {
      nome: nomeArquivoDoc('TERMO_VISTORIA', tipo, payload.POSTO_GRAD, payload.NOME_COMPLETO),
      blob: await renderizarDocx(template, payload)
    };
    baixarLocal(docGerado);

    btnEnviar.textContent = 'Enviando para o Drive...';
    const pasta = `Vistoria_${nomeSeguro(payload.NOME_COMPLETO)}`;
    const res = await fetch(`/api/upload?filename=${encodeURIComponent(docGerado.nome)}&folder=${encodeURIComponent(pasta)}`,
      { method: 'POST', body: docGerado.blob });
    if (!res.ok) throw Object.assign(new Error('Falha no upload para o Google Drive.'), { aposGerar: true });

    // Protocolo interno
    try {
      await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'VIS-' + Date.now().toString().slice(-6),
          dataCriacao: new Date().toLocaleDateString('pt-BR'),
          modalidade: `Termo de Vistoria de PNR (${payload.TIPO_VISTORIA})`,
          posto: payload.POSTO_GRAD,
          nomeCompleto: payload.NOME_COMPLETO
        })
      });
    } catch { console.warn('Protocolo local falhou, mas o upload foi concluído.'); }

    mostrarMensagem('Termo gerado, baixado e salvo no Drive com sucesso!', 'sucesso');
  } catch (err) {
    console.error('Erro ao gerar o termo:', err);
    mostrarMensagem(
      docGerado
        ? `O termo foi baixado no seu computador, mas não foi salvo no Drive: ${err.message}`
        : `Não foi possível gerar o termo. ${err.message}`,
      'erro');
  } finally {
    btnEnviar.disabled = false;
    btnAdd.disabled = false;
    btnEnviar.textContent = TEXTO_BTN;
  }
});

// ---------------- Inicialização ----------------
btnAdd.addEventListener('click', adicionarComodo);

function definirDataHoje() {
  const h = new Date();
  $('dataVistoria').value = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

form.addEventListener('reset', () => {
  setTimeout(() => {
    container.replaceChildren();
    limparMensagem();
    definirDataHoje();
    adicionarComodo();
  }, 0);
});

definirDataHoje();
carregarPNRs();
adicionarComodo();
