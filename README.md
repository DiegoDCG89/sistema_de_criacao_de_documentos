# sistema_de_criacao_de_documentos
Sistema para criação de documentos administrativos


## Documentos e templates (padrão de nomes)

Todos os `.docx` são gerados no navegador com **Docxtemplater**, a partir de `public/templates/`.
Nomes sem acento, em minúsculas: `tipo_fluxo[_complemento].docx`.

| Fluxo | DIEx | Nota para o BAR | Nota Ord Pagto |
|---|---|---|---|
| Curso | `diex_curso` | `nota_bar_curso` | `ord_pagto_curso` |
| Movimentação | `diex_movimentacao` | `nota_bar_movimentacao` | `ord_pagto_movimentacao` |
| Bagagem (PNR) | `diex_bagagem` e `diex_sped_bagagem` | `nota_bar_bagagem` | `ord_pagto_bagagem` |

Curso e Movimentação têm também a versão `_complemento` de cada documento.

### Tags (sempre MAIÚSCULAS, sem acento)
`DATA_ATUAL`, `MES_ANO`, `POSTO_GRAD`, `NOME_COMPLETO`, `CPF`, `IDENTIDADE`, `PREC_CP`, `TELEFONE`,
`BANCO`, `AGENCIA`, `CONTA_CORRENTE`, `ADT_DCEM`, `DATA_DESLIGAMENTO`, `OM_ORIGEM`, `OM_DESTINO`,
`CIDADE_RESIDE`, `CIDADE_DESTINO`, `GUARNICAO`, `NOME_CURSO`, `OM_REALIZACAO`, `MOTIVO`,
`BAR_OCUPACAO` (número do BAR), `DATA_BAR` (", de dd/mm/aaaa"), `ENDERECO_PNR`, laços `{#TEM_DEPENDENTES}` / `{^TEM_DEPENDENTES}` / `{#DEPENDENTES}` (`NOME`, `PARENTESCO`).

### Nome dos arquivos gerados
`TIPO_FLUXO[_COMPLEMENTO]_POSTO_NOME.docx`, sem acentos (ex.: `NOTA_BAR_CURSO_1o_Sgt_FULANO_DE_TAL.docx`).
Helpers em `public/js/utils.js` (`nomeArquivoDoc`, `renderizarDocx`, ...). Campos sem valor saem vazios (nunca "undefined").

### Formato de datas nos documentos
Padrão militar **DD MÊS AA** (ex.: `07 OUT 26`), via `formatarDataMilitar()` em `public/js/utils.js`.
Vale para `DATA_ATUAL`, `DATA_DESLIGAMENTO` e `DATA_BAR`; `MES_ANO` sai como `OUT 26`.

