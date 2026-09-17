// =========================================================================
// SisDoc - Gerador de DIEx de Opção de Curso (Docxtemplater + Google Drive)
// =========================================================================

// Função utilitária: Formata data atual (ex: "17 de setembro de 2026")
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

// Função utilitária: Formatar datas de inputs HTML (YYYY-MM-DD -> DD/MM/AAAA)
function formatarDataBR(dataStr) {
  if (!dataStr) return '';
  const partes = dataStr.split('-');
  if (partes.length !== 3) return dataStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Coleta todos os dependentes adicionados na tabela/lista do formulário
function coletarDependentesDoForm() {
  const listaDependentes = [];
  // Procura por linhas de dependentes dinâmicos criados no formulário
  const linhas = document.querySelectorAll('.linha-dependente, .item-dependente');
  
  linhas.forEach((linha) => {
    const nomeEl = linha.querySelector('[name="dep_nome"], .dep-nome');
    const parentescoEl = linha.querySelector('[name="dep_parentesco"], .dep-parentesco');
    const dataNascEl = linha.querySelector('[name="dep_data_nasc"], .dep-data-nasc');

    const nome = nomeEl ? nomeEl.value.trim().toUpperCase() : '';
    const parentesco = parentescoEl ? parentescoEl.value.trim() : '';
    const dataNasc = dataNascEl ? formatarDataBR(dataNascEl.value.trim()) : '';

    if (nome) {
      listaDependentes.push({
        NOME: nome,
        PARENTESCO: parentesco,
        DATA_NASC: dataNasc
      });
    }
  });

  return listaDependentes;
}

// Função Principal de Geração do Documento
async function gerarDocumentoCurso(event) {
  if (event) event.preventDefault();

  const btnGerar = document.getElementById('btnGerar') || document.querySelector('button[type="submit"]');
  const textoOriginalBtn = btnGerar ? btnGerar.innerText : 'Gerar Documento';

  try {
    if (btnGerar) {
      btnGerar.disabled = true;
      btnGerar.innerText = 'Processando documento...';
    }

    // 1. Coleta dados dos inputs do formulário
    const getVal = (id) => {
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      return el ? el.value.trim() : '';
    };

    const postoGrad = getVal('posto') || getVal('posto_graduacao');
    const nomeCompleto = (getVal('nome') || getVal('nome_completo')).toUpperCase();
    const nomeCurso = getVal('nome_curso');
    const omRealizacao = getVal('om_realizacao');
    const guarnicao = getVal('guarnicao');
    const adtDcem = getVal('adt_dcem');
    const dataDesligamento = formatarDataBR(getVal('data_desligamento'));
    const cpf = getVal('cpf');
    const identidade = getVal('identidade');
    const precCp = getVal('prec_cp');
    const banco = getVal('banco');
    const agencia = getVal('agencia');
    const contaCorrente = getVal('conta_corrente');
    const telefone = getVal('telefone');

    if (!nomeCompleto || !postoGrad) {
      alert('Por favor, preencha ao menos o Posto/Graduação e o Nome Completo.');
      if (btnGerar) {
        btnGerar.disabled = false;
        btnGerar.innerText = textoOriginalBtn;
      }
      return;
    }

    const dependentes = coletarDependentesDoForm();

    // 2. Carrega o modelo .docx oficial salvo na pasta /templates
    const response = await fetch('/templates/diex_opcao_curso.docx');
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o modelo de template: ${response.statusText}`);
    }
    const templateArrayBuffer = await response.arrayBuffer();

    // 3. Inicializa o PizZip e o Docxtemplater
    // NOVA INICIALIZAÇÃO SEGURA:
const PizZipConstructor = window.PizZip || window.pizzip || PizZip;
if (!PizZipConstructor) {
  throw new Error("A biblioteca PizZip não foi carregada. Verifique as tags <script> no HTML.");
}
const zip = new PizZipConstructor(templateArrayBuffer);

const DocxTemplaterConstructor = window.docxtemplater || window.Docxtemplater || docxtemplater;
if (!DocxTemplaterConstructor) {
  throw new Error("A biblioteca Docxtemplater não foi carregada. Verifique as tags <script> no HTML.");
}
const doc = new DocxTemplaterConstructor(zip, {
  paragraphLoop: true,
  linebreaks: true
});
    const doc = new window.docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    // 4. Injeta os dados nas tags oficiais que configuramos
    const payloadTemplate = {
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

      // Controle condicional da tabela
      TEM_DEPENDENTES: dependentes.length > 0,
      DEPENDENTES: dependentes
    };

    doc.render(payloadTemplate);

    // 5. Gera o arquivo final compilado em formato Blob (.docx)
    const blobGerado = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const nomeArquivo = `DIEx_Opcao_Curso_${postoGrad.replace(/\s+/g, '_')}_${nomeCompleto.replace(/\s+/g, '_')}.docx`;
    const nomePastaDrive = `Cursos - ${postoGrad} ${nomeCompleto}`;

    // 6. Download imediato para o militar no navegador
    const urlDownload = URL.createObjectURL(blobGerado);
    const linkTemp = document.createElement('a');
    linkTemp.href = urlDownload;
    linkTemp.download = nomeArquivo;
    document.body.appendChild(linkTemp);
    linkTemp.click();
    document.body.removeChild(linkTemp);
    URL.revokeObjectURL(urlDownload);

    // 7. Upload para o backend -> Google Drive
    if (btnGerar) btnGerar.innerText = 'Enviando para o Google Drive...';

    const urlUpload = `/api/upload?filename=${encodeURIComponent(nomeArquivo)}&folder=${encodeURIComponent(nomePastaDrive)}`;
    const resUpload = await fetch(urlUpload, {
      method: 'POST',
      body: blobGerado
    });

    if (!resUpload.ok) {
      console.warn('Aviso: Falha ao enviar para o Google Drive');
    }

    // 8. Protocolo no sistema administrativo (database.json)
    await fetch('/api/solicitacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Date.now(),
        data: new Date().toISOString(),
        requerente: `${postoGrad} ${nomeCompleto}`,
        tipo: 'DIEx Opção - Curso',
        arquivo: nomeArquivo,
        pasta: nomePastaDrive,
        dependentesQtd: dependentes.length
      })
    });

    alert('Documento gerado com sucesso, baixado e arquivado no Google Drive!');

  } catch (error) {
    console.error('Erro no processamento do documento:', error);
    alert(`Ocorreu um erro ao gerar o documento: ${error.message}`);
  } finally {
    if (btnGerar) {
      btnGerar.disabled = false;
      btnGerar.innerText = textoOriginalBtn;
    }
  }
}

// Vincula o disparador ao formulário da página
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form') || document.getElementById('formCurso');
  if (form) {
    form.addEventListener('submit', gerarDocumentoCurso);
  }
});
