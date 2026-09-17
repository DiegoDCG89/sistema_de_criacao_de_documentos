// =========================================================================
// SisDoc - Gerador de DIEx de Opção de Curso (Completo com UI e Dependentes)
// =========================================================================

// 1. Funções Utilitárias de Data
function formatarDataPorExtenso() {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = meses[hoje.getMonth()];
  const ano = hoje.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

function formatarDataBR(dataStr) {
  if (!dataStr) return '';
  const partes = dataStr.split('-');
  if (partes.length !== 3) return dataStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// 2. Controle de Interface: Dependentes (Adicionar / Remover / Exibir)
document.addEventListener('DOMContentLoaded', () => {
  // Controle dos Rádios SIM / NÃO
  const radioSim = document.querySelector('input[type="radio"][value="SIM"], #dep_sim, #radioSim');
  const radioNao = document.querySelector('input[type="radio"][value="NAO"], #dep_nao, #radioNao');
  const containerDependentes = document.getElementById('containerDependentes') || 
                               document.getElementById('area-dependentes') || 
                               document.querySelector('.secao-dependentes');

  function alternarDependentes() {
    if (!containerDependentes) return;
    const temDep = radioSim && radioSim.checked;
    containerDependentes.style.display = temDep ? 'block' : 'none';
  }

  if (radioSim) radioSim.addEventListener('change', alternarDependentes);
  if (radioNao) radioNao.addEventListener('change', alternarDependentes);

  // Botão Adicionar Dependente
  const btnAddDep = document.getElementById('btnAddDependente') || 
                    document.getElementById('add-dependente') ||
                    document.querySelector('.btn-add-dep');

  const listaContainer = document.getElementById('listaDependentes') || 
                         document.getElementById('tabelaDependentesBody') ||
                         containerDependentes;

  if (btnAddDep && listaContainer) {
    btnAddDep.addEventListener('click', (e) => {
      e.preventDefault();
      const divLinha = document.createElement('div');
      divLinha.className = 'linha-dependente';
      divLinha.style.display = 'flex';
      divLinha.style.gap = '10px';
      divLinha.style.marginBottom = '10px';
      divLinha.style.alignItems = 'center';

      divLinha.innerHTML = `
        <input type="text" placeholder="Nome Completo" class="dep-nome" style="flex: 2; padding: 6px; border: 1px solid #ccc; border-radius: 4px;" required>
        <input type="text" placeholder="Parentesco (ex: Esposa, Filho)" class="dep-parentesco" style="flex: 1.5; padding: 6px; border: 1px solid #ccc; border-radius: 4px;" required>
        <input type="date" class="dep-data-nasc" style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px;" required>
        <button type="button" class="btn-remover-dep" style="background: #e53e3e; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">X</button>
      `;

      divLinha.querySelector('.btn-remover-dep').addEventListener('click', () => {
        divLinha.remove();
      });

      listaContainer.appendChild(divLinha);
    });
  }

  // Intercepta o Submit do Formulário
  const form = document.querySelector('form') || document.getElementById('formCurso');
  if (form) {
    form.addEventListener('submit', gerarDocumentoCurso);
  }
});

// 3. Coleta dos dados dos dependentes
function coletarDependentes() {
  const lista = [];
  const linhas = document.querySelectorAll('.linha-dependente');

  linhas.forEach((linha) => {
    const nomeEl = linha.querySelector('.dep-nome');
    const parentescoEl = linha.querySelector('.dep-parentesco');
    const dataNascEl = linha.querySelector('.dep-data-nasc');

    const nome = nomeEl ? nomeEl.value.trim().toUpperCase() : '';
    const parentesco = parentescoEl ? parentescoEl.value.trim() : '';
    const dataNasc = dataNascEl ? formatarDataBR(dataNascEl.value.trim()) : '';

    if (nome) {
      lista.push({
        NOME: nome,
        PARENTESCO: parentesco,
        DATA_NASC: dataNasc
      });
    }
  });

  return lista;
}

// 4. Função Principal de Geração
async function gerarDocumentoCurso(event) {
  if (event) event.preventDefault();

  const btnGerar = document.querySelector('button[type="submit"]') || document.getElementById('btnGerar');
  const textoOriginal = btnGerar ? btnGerar.innerText : 'Gerar Documento';

  try {
    if (btnGerar) {
      btnGerar.disabled = true;
      btnGerar.innerText = 'Processando documento...';
    }

    // Helper tolerante para capturar valores por id, name ou label
    const getVal = (seletor) => {
      const el = document.querySelector(`#${seletor}, [name="${seletor}"], input[id*="${seletor}" i], select[id*="${seletor}" i]`);
      return el ? el.value.trim() : '';
    };

    const postoGrad = getVal('posto') || getVal('posto_graduacao');
    const nomeCompleto = (getVal('nome') || getVal('nome_completo')).toUpperCase();
    const nomeCurso = getVal('nome_curso') || getVal('curso');
    const omRealizacao = getVal('om_realizacao') || getVal('om');
    const guarnicao = getVal('guarnicao');
    const adtDcem = getVal('adt_dcem') || getVal('adt');
    const dataDesligamento = formatarDataBR(getVal('data_desligamento') || getVal('desligamento'));
    const cpf = getVal('cpf');
    const identidade = getVal('identidade');
    const precCp = getVal('prec_cp') || getVal('preccp');
    const banco = getVal('banco');
    const agencia = getVal('agencia');
    const contaCorrente = getVal('conta_corrente') || getVal('conta');
    const telefone = getVal('telefone');

    if (!postoGrad || !nomeCompleto) {
      alert('Atenção: Preencha o Posto/Graduação e o Nome Completo antes de gerar.');
      if (btnGerar) {
        btnGerar.disabled = false;
        btnGerar.innerText = textoOriginal;
      }
      return;
    }

    // Dependentes
    const radioSim = document.querySelector('input[type="radio"][value="SIM"]:checked, #dep_sim:checked');
    const dependentes = radioSim ? coletarDependentes() : [];

    // Carregamento de Bibliotecas com Proteção contra erros de CDN
    const PizZipLib = window.PizZip || window.pizzip || (typeof PizZip !== 'undefined' ? PizZip : null);
    const DocxLib = window.docxtemplater || window.Docxtemplater || (typeof docxtemplater !== 'undefined' ? docxtemplater : null);

    if (!PizZipLib || !DocxLib) {
      throw new Error("As bibliotecas de Word não foram carregadas. Verifique a conexão com a internet ou os scripts no HTML.");
    }

    // Carregamento do Template
    const response = await fetch('/templates/diex_opcao_curso.docx');
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o arquivo /templates/diex_opcao_curso.docx (Status: ${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // Renderização
    const zip = new PizZipLib(arrayBuffer);
    const doc = new DocxLib(zip, { paragraphLoop: true, linebreaks: true });

    doc.render({
      DATA_ATUAL: formatarDataPorExtenso(),
      POSTO_GRAD: postoGrad,
      NOME_COMPLETO: nomeCompleto,
      NOME_CURSO: nomeCurso,
      OM_REALIZACAO: omRealizacao,
      GUARNICAO: guarnicao,
      ADT_DCEM: adtDcem,
      DATA_DESLIGAMENTO: dataDesligamento,
      CPF: cpf,
      IDENTIDADE: identidade,
      PREC_CP: precCp,
      BANCO: banco,
      AGENCIA: agencia,
      CONTA_CORRENTE: contaCorrente,
      TELEFONE: telefone,
      TEM_DEPENDENTES: dependentes.length > 0,
      DEPENDENTES: dependentes
    });

    const blobGerado = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const nomeArquivo = `DIEx_Opcao_Curso_${postoGrad.replace(/\s+/g, '_')}_${nomeCompleto.replace(/\s+/g, '_')}.docx`;
    const nomePastaDrive = `Cursos - ${postoGrad} ${nomeCompleto}`;

    // Download Local
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blobGerado);
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Upload Google Drive
    if (btnGerar) btnGerar.innerText = 'Enviando para o Google Drive...';
    try {
      await fetch(`/api/upload?filename=${encodeURIComponent(nomeArquivo)}&folder=${encodeURIComponent(nomePastaDrive)}`, {
        method: 'POST',
        body: blobGerado
      });

      await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Date.now(),
          data: new Date().toISOString(),
          requerente: `${postoGrad} ${nomeCompleto}`,
          tipo: 'DIEx Opção - Curso',
          arquivo: nomeArquivo,
          pasta: nomePastaDrive
        })
      });
    } catch (errUpload) {
      console.warn('Aviso: Falha no upload para nuvem, mas o download local foi concluído:', errUpload);
    }

    alert('Documento gerado e baixado com sucesso!');

  } catch (err) {
    console.error('Erro na geração:', err);
    alert(`Erro ao gerar documento: ${err.message}`);
  } finally {
    if (btnGerar) {
      btnGerar.disabled = false;
      btnGerar.innerText = textoOriginal;
    }
  }
}