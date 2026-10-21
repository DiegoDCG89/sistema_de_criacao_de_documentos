SisDoc - Sistema de Geração de Documentos

O SisDoc é uma aplicação web desenvolvida para automatizar, padronizar e acelerar a criação de documentos administrativos e formais. Projetado especificamente para as necessidades do 5º Batalhão de Infantaria Aeromóvel, o sistema elimina o trabalho manual repetitivo na elaboração de despachos, termos e requisições, garantindo integridade e agilidade nos processos burocráticos.

🚀 Funcionalidades
O sistema é modular e focado na injeção de dados em templates .docx pré-configurados, atuando nas seguintes frentes:

Vistorias de PNR: Geração de Termos de Ocupação e Desocupação, com adição dinâmica de cômodos, itens e melhorias.

Movimentação: Automação de despachos para transferência de pessoal entre quartéis ou guarnições.

Cursos: Geração de documentação para militares nomeados para ações de formação.

Bagagem (PNR): Gestão documental de transporte de bagagens.

Exportação em Lote: Geração simultânea de DIEx, Notas para BAR e Ordens de Pagamento a partir de um único preenchimento.

Integração com Google Drive: Upload automático dos documentos gerados para pastas específicas na nuvem.

Painel Administrativo: Acompanhamento e gestão das solicitações de documentos geradas pelos usuários.

🛠️ Tecnologias Utilizadas
Backend:

Node.js

Express (Roteamento e servidor estático)

CORS & fs/path (Manipulação de arquivos)

Frontend:

HTML5 / Vanilla JavaScript (ES6 Modules)

Tailwind CSS (Estilização via CDN)

Docxtemplater & PizZip (Processamento e renderização de .docx no cliente)

Lucide Icons (Iconografia)

📁 Estrutura do Projeto
Plaintext
sistema_de_criacao_de_documentos/
├── public/
│   ├── css/                # Folhas de estilo globais (sisdoc.css)
│   ├── js/                 # Lógica modular do frontend (gerador-*.js, utils.js)
│   ├── templates/          # Arquivos .docx base (DIEx, Notas BAR, Ordens de Pagamento)
│   └── *.html              # Interfaces dos módulos (vistoria, movimentacao, cursos, etc.)
├── uploads/                # Diretório de armazenamento local temporário dos documentos gerados
├── database.json           # Banco de dados local em JSON para registro de solicitações
├── server.js               # Ponto de entrada do backend (API e rotas)
├── package.json            # Dependências e scripts do projeto
└── README.md

⚙️ Pré-requisitos e Instalação
Certifique-se de ter o Node.js (versão 18+ recomendada) instalado na sua máquina.

Clone o repositório:

Bash
git clone https://github.com/seu-usuario/sisdoc.git
cd sisdoc
Instale as dependências:

Bash
npm install
Inicie o servidor de desenvolvimento:

Bash
node server.js
Acesse a aplicação:
Abra o navegador e acesse http://localhost:3000.

🔒 Segurança e Tratamento de Dados
Client-Side Rendering: A injeção de dados nos templates .docx ocorre predominantemente no lado do cliente utilizando docxtemplater, reduzindo a carga no servidor.

Armazenamento: Os documentos finais são enviados ao servidor apenas para armazenamento temporário na pasta /uploads e posterior roteamento para o Google Drive.

Isolamento de Módulos: O uso de ES6 Modules (type="module") garante que o escopo de cada formulário se mantenha isolado, evitando vazamento de variáveis de estado entre os contextos de Vistoria e Movimentação, por exemplo.

✒️ Autoria
Desenvolvido por Diego Carneiro Gonçalo.
