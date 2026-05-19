-- HelpProf — seed de guias de domínio extraídos de Guia de Dominio Markdown.docx.
-- Idempotente: usa o índice único ativo uq_domain_guides_tool_active em domain_guides(tool_category) WHERE deleted_at IS NULL.

ALTER TABLE public.domain_guides ADD COLUMN IF NOT EXISTS seed_key TEXT NULL;

INSERT INTO public.categories (slug, name, group_tag, logo_url, brand_color, sort_order) VALUES
  ('WORD', 'Microsoft Word', 'Documentos', 'assets/word.png', '#2b579a', 2),
  ('GOOGLE_DRIVE', 'Google Drive', 'Documentos', NULL, '#0f9d58', 12),
  ('EXCEL', 'Microsoft Excel', 'Documentos', 'assets/excel.png', '#217346', 3),
  ('CANVA', 'Canva', 'Planejamento', 'assets/canva.png', '#00C4CC', 5),
  ('GOOGLE_FORMS', 'Google Forms', 'Interatividade', NULL, '#7248b9', 9),
  ('GOOGLE_CLASSROOM', 'Google Classroom', 'Planejamento', NULL, '#1f8f4d', 10),
  ('KAHOOT', 'Kahoot!', 'Gamificação', 'assets/kahoot.png', '#46178f', 11),
  ('POWERPOINT', 'Microsoft PowerPoint', 'Documentos', NULL, '#d24726', 8),
  ('GOOGLE_MEET', 'Google Meet', 'Interatividade', NULL, '#00897b', 13),
  ('ONEDRIVE', 'Microsoft OneDrive', 'Documentos', 'assets/onedrive.png', '#0078d4', 1),
  ('CMSP', 'CMSP – Centro de Mídias de São Paulo', 'Interatividade', 'assets/cmsp.png', '#7c3aed', 7),
  ('SED', 'SED – Secretaria Escolar Digital', 'Planejamento', 'assets/sed.png', '#1e40af', 6),
  ('TEAMS', 'Microsoft Teams', 'Interatividade', NULL, '#6264a7', 14),
  ('NOVA_ESCOLA', 'Nova Escola', 'Planejamento', NULL, '#f97316', 15)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  group_tag = COALESCE(EXCLUDED.group_tag, public.categories.group_tag),
  logo_url = COALESCE(EXCLUDED.logo_url, public.categories.logo_url),
  brand_color = EXCLUDED.brand_color,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.domain_guides (seed_key, tool_category, title, deep_content, slides_embed, deleted_at) VALUES
('GUIDE-01', 'WORD', 'Guia de domínio — Microsoft Word', $md$## Microsoft Word
Ao abrir o Word, o usuário encontra uma página em branco pronta para receber textos, anotações ou informações, como se estivesse começando a escrever em uma folha comum. A diferença é que, no ambiente digital, tudo pode ser alterado a qualquer momento sem rasuras, sem desperdício de papel e com muito mais possibilidades de personalização.
Além de permitir a digitação de textos, o Word oferece diversas ferramentas que ajudam a deixar qualquer documento mais organizado, profissional e fácil de entender.
### Principais funcionalidades
- **Digitação e edição de texto:** permite escrever, apagar, copiar, recortar e mover palavras, frases ou parágrafos com facilidade.
- **Formatação de texto:** possibilita alterar tipo de letra, tamanho, cor, negrito, itálico, sublinhado e outros estilos para destacar informações importantes.
- **Organização do conteúdo:** permite alinhar textos, ajustar espaçamentos, criar recuos, dividir conteúdos em tópicos e numerar listas automaticamente.
- **Inserção de elementos visuais:** possibilita adicionar imagens, tabelas, gráficos, formas, ícones e símbolos para tornar o documento mais visual e informativo.
- **Correção automática:** identifica possíveis erros ortográficos e gramaticais, sugerindo correções durante a escrita.
- **Estruturação de páginas:** permite configurar margens, orientação da página, cabeçalhos, rodapés e numeração de páginas.
- **Ferramentas de navegação:** possibilita criar títulos, subtítulos e sumários automáticos, facilitando a leitura de documentos maiores.
- **Revisão e comentários:** permite destacar trechos, adicionar observações e acompanhar alterações feitas no documento.
- **Compartilhamento e exportação:** possibilita salvar o arquivo em diferentes formatos, como documento editável ou PDF, além de compartilhar digitalmente.
Por reunir recursos de escrita, organização e apresentação visual em um único ambiente, o Microsoft Word se tornou uma das ferramentas mais utilizadas para produção de documentos pessoais, acadêmicos e profissionais.
$md$, NULL, NULL),
('GUIDE-02', 'GOOGLE_DRIVE', 'Guia de domínio — Google Drive', $md$## Google Drive
O **Google Drive** é uma plataforma de armazenamento em nuvem que permite guardar, organizar, acessar e compartilhar arquivos pela internet de forma prática e segura. De maneira simples, ele pode ser comparado a uma “mochila digital” ou um “pen drive online”, onde documentos, imagens, vídeos e outros arquivos ficam armazenados sem ocupar espaço físico no computador ou celular.
Ao utilizar o Google Drive, o usuário pode salvar seus arquivos na nuvem, ou seja, em servidores online, permitindo que esses conteúdos sejam acessados de praticamente qualquer lugar, desde que exista conexão com a internet. Isso significa que um arquivo salvo no computador pode ser aberto depois no celular, tablet ou outro dispositivo usando a mesma conta.
Além de armazenar arquivos, o Google Drive oferece diversas ferramentas que facilitam a organização, edição e compartilhamento de informações.
### Principais funcionalidades
- **Armazenamento de arquivos:** permite salvar documentos, imagens, vídeos, apresentações, planilhas, PDFs e diversos outros tipos de arquivos em um espaço online.
- **Acesso em múltiplos dispositivos:** possibilita abrir os arquivos em computadores, celulares ou tablets, mantendo tudo sincronizado automaticamente.
- **Organização de conteúdo:** permite criar pastas, mover arquivos, renomear documentos e manter os conteúdos organizados de forma semelhante a um explorador de arquivos.
- **Compartilhamento de arquivos:** possibilita enviar arquivos ou pastas para outras pessoas por meio de links ou convites, facilitando o trabalho em equipe.
- **Controle de permissões:** permite definir quem pode apenas visualizar, comentar ou editar um arquivo compartilhado.
- **Backup automático:** pode armazenar cópias de segurança de arquivos importantes, reduzindo o risco de perda de informações.
- **Integração com outras ferramentas:** funciona em conjunto com aplicações, permitindo criar e editar documentos diretamente no navegador.
- **Histórico de versões:** possibilita visualizar alterações feitas anteriormente e recuperar versões antigas de arquivos.
- **Busca inteligente:** permite localizar arquivos rapidamente por nome, tipo de arquivo ou conteúdo.
Por reunir armazenamento, organização, segurança e colaboração em um único ambiente, o Google Drive se tornou uma das ferramentas mais utilizadas para gerenciamento e compartilhamento de arquivos no ambiente pessoal, acadêmico e profissional.
$md$, NULL, NULL),
('GUIDE-03', 'EXCEL', 'Guia de domínio — Microsoft Excel', $md$## Microsoft Excel
O **Microsoft Excel** é um programa de planilhas eletrônicas, criado para organizar, calcular, analisar e apresentar informações. De maneira simples, onde cada informação pode ser organizada em linhas e colunas, facilitando a visualização e o controle de dados.
Ao abrir o Excel, o usuário encontra uma grade formada por células, que são pequenos espaços onde podem ser inseridos números, textos, datas ou fórmulas. Cada célula funciona como um campo de informação, permitindo registrar desde dados simples até cálculos complexos de maneira automática.
Diferente de uma calculadora comum, o Excel não apenas realiza contas, mas também permite armazenar informações, cruzar dados, gerar gráficos e automatizar processos, tornando o trabalho com números muito mais rápido, preciso e organizado.
Além disso, sua interface visual facilita a manipulação dos dados, permitindo que informações extensas sejam transformadas em tabelas claras, relatórios e representações gráficas de fácil interpretação.
### Principais funcionalidades
- **Criação de planilhas:** permite organizar informações em tabelas compostas por linhas, colunas e células.
- **Cálculos automáticos:** possibilita realizar operações matemáticas como soma, subtração, multiplicação, divisão, porcentagens e médias de forma automática.
- **Uso de fórmulas e funções:** oferece funções prontas para cálculos financeiros, estatísticos, lógicos e administrativos, automatizando tarefas repetitivas.
- **Organização e filtragem de dados:** permite ordenar informações, aplicar filtros e localizar dados específicos com rapidez.
- **Criação de gráficos:** possibilita transformar números em gráficos visuais, como barras, linhas, pizza e outros modelos para facilitar a interpretação.
- **Formatação visual:** permite alterar cores, bordas, estilos, tamanhos e destaques para tornar a planilha mais organizada e intuitiva.
- **Análise de informações:** possibilita comparar dados, identificar padrões, acompanhar resultados e apoiar tomadas de decisão.
- **Automação de tarefas:** permite criar processos automáticos por meio de fórmulas, preenchimento inteligente e recursos avançados.
- **Importação e exportação de arquivos:** possibilita trabalhar com diferentes formatos de documentos e compartilhar planilhas com outros usuários.
Por reunir organização, cálculo, análise e apresentação de dados em um único ambiente, o Microsoft Excel se tornou uma das ferramentas mais utilizadas para controle de informações em ambientes pessoais, acadêmicos, administrativos e empresariais.
$md$, NULL, NULL),
('GUIDE-04', 'CANVA', 'Guia de domínio — Canva', $md$## Canva
O **Canva** é uma plataforma de design gráfico online que permite criar materiais visuais de forma simples, prática e intuitiva, mesmo para pessoas que não possuem experiência com edição ou design.
De maneira fácil de entender, o Canva pode ser comparado a uma “mesa de criação digital”, onde o usuário encontra imagens, textos, cores, ícones, formas e modelos prontos para montar apresentações, cartazes, posts para redes sociais, convites, currículos, logotipos e diversos outros materiais visuais.
Ao acessar a plataforma, o usuário pode começar um projeto em branco ou escolher um modelo já pronto. A partir disso, basta arrastar, soltar, editar textos, trocar imagens e personalizar elementos visuais de acordo com sua necessidade, tornando o processo de criação muito mais rápido e acessível.
Diferente de softwares de design mais técnicos, o Canva foi desenvolvido para que qualquer pessoa consiga criar conteúdos visualmente profissionais por meio de uma interface simples e organizada.
### Principais funcionalidades
- **Criação de designs personalizados:** permite desenvolver materiais visuais para diferentes finalidades, como apresentações, banners, posts, flyers, currículos e documentos.
- **Modelos prontos:** oferece milhares de templates pré-configurados que podem ser editados e personalizados.
- **Editor de arrastar e soltar:** possibilita mover textos, imagens, ícones e elementos visuais de forma intuitiva, sem necessidade de conhecimentos técnicos.
- **Biblioteca de elementos gráficos:** disponibiliza fotos, ilustrações, formas, ícones, vídeos, adesivos e animações para enriquecer os projetos.
- **Edição de textos e imagens:** permite alterar fontes, cores, tamanhos, transparência, efeitos e filtros visuais.
- **Criação de apresentações:** possibilita montar slides visualmente organizados para estudos, reuniões ou apresentações profissionais.
- **Recursos de colaboração:** permite que várias pessoas editem um mesmo projeto em tempo real.
- **Armazenamento online:** os projetos ficam salvos na nuvem, permitindo acesso em diferentes dispositivos.
- **Exportação em diferentes formatos:** possibilita salvar os projetos em formatos como PNG, JPG, PDF, vídeo e outros.
- **Publicação e compartilhamento:** permite gerar links de visualização, compartilhar com equipes ou publicar diretamente em plataformas digitais.
Por unir criatividade, praticidade e recursos visuais em um único ambiente, o Canva se tornou uma das ferramentas mais utilizadas para criação de conteúdos gráficos em contextos pessoais, acadêmicos e profissionais.
$md$, NULL, NULL),
('GUIDE-05', 'GOOGLE_FORMS', 'Guia de domínio — Google Forms', $md$## Google Forms
O **Google Forms** é uma ferramenta de criação de formulários online, criada para coletar informações de maneira rápida, organizada e automatizada. De forma simples, ele pode ser comparado a uma “ficha digital inteligente”, onde perguntas são criadas para que outras pessoas possam responder pela internet, sem a necessidade de papel ou preenchimento manual.
Ao utilizar o Google Forms, o usuário pode montar formulários personalizados com diferentes tipos de perguntas, como campos de texto, múltipla escolha, caixas de seleção, escalas de avaliação e envio de arquivos. Após a criação, o formulário pode ser compartilhado por link, e-mail ou outros meios digitais, permitindo que pessoas respondam de qualquer dispositivo com acesso à internet.
Conforme as respostas são enviadas, a plataforma organiza automaticamente todas as informações coletadas, transformando os dados em listas, tabelas e gráficos, facilitando a visualização e análise dos resultados.
Por sua praticidade e facilidade de uso, o Google Forms é amplamente utilizado para pesquisas, questionários, inscrições, avaliações, formulários de cadastro, coleta de feedback e levantamentos de dados em geral.
### Principais funcionalidades
- **Criação de formulários personalizados:** permite desenvolver questionários, pesquisas, inscrições, enquetes e formulários de coleta de dados.
- **Diversos tipos de perguntas:** possibilita criar perguntas abertas, múltipla escolha, caixas de seleção, listas suspensas, escalas e envio de arquivos.
- **Personalização visual:** permite alterar cores, temas, imagens de capa e estilos para tornar o formulário mais atrativo e organizado.
- **Compartilhamento simplificado:** possibilita gerar links, enviar por e-mail ou incorporar o formulário em sites e plataformas digitais.
- **Coleta automática de respostas:** registra todas as respostas em tempo real, sem necessidade de organização manual.
- **Geração de gráficos e resumos:** transforma automaticamente as respostas em gráficos e estatísticas visuais para facilitar a interpretação.
- **Integração com planilhas:** permite enviar automaticamente os dados coletados para para análises mais detalhadas.
- **Controle de acesso:** possibilita limitar respostas, exigir login ou definir quem pode acessar o formulário.
- **Edição em tempo real:** permite modificar perguntas e configurações mesmo após o formulário já ter sido compartilhado.
- **Colaboração em equipe:** possibilita que várias pessoas criem e editem o mesmo formulário simultaneamente.
Por reunir praticidade, automação e organização de dados em um único ambiente, o Google Forms se tornou uma ferramenta muito utilizada para coleta de informações em contextos pessoais, acadêmicos, profissionais e organizacionais.
$md$, NULL, NULL),
('GUIDE-06', 'GOOGLE_CLASSROOM', 'Guia de domínio — Google Classroom', $md$## Google Classroom
O **Google Classroom** é uma plataforma educacional, criada para facilitar a organização do ensino e da aprendizagem em ambientes digitais. De forma simples, ele pode ser comparado a uma “sala de aula virtual”, onde professores e alunos podem se reunir, compartilhar materiais, realizar atividades e acompanhar o processo de ensino pela internet.
Ao utilizar o Google Classroom, o professor pode criar turmas virtuais, adicionar alunos e disponibilizar conteúdos como documentos, apresentações, vídeos, links, exercícios e avisos importantes. Já os alunos podem acessar esses materiais, realizar tarefas, enviar atividades e acompanhar prazos diretamente pela plataforma.
Diferente de uma sala de aula tradicional, onde materiais podem estar espalhados entre cadernos, folhas e mensagens, o Google Classroom centraliza todas as informações em um único ambiente digital, tornando a comunicação e a organização muito mais práticas.
A plataforma também permite acompanhar o desempenho dos estudantes, controlar entregas e fornecer feedback de maneira rápida, aproximando professores e alunos mesmo à distância.
### Principais funcionalidades
- **Criação de turmas virtuais:** permite organizar disciplinas, cursos ou grupos de estudo em espaços digitais separados.
- **Compartilhamento de materiais:** possibilita disponibilizar documentos, vídeos, apresentações, links, imagens e outros conteúdos de apoio.
- **Criação e envio de atividades:** permite elaborar exercícios, trabalhos, questionários e tarefas com datas de entrega definidas.
- **Entrega digital de trabalhos:** possibilita que os alunos enviem atividades diretamente pela plataforma.
- **Comunicação entre professores e alunos:** permite publicar avisos, recados, comentários e orientações em tempo real.
- **Acompanhamento de prazos:** organiza atividades pendentes, entregues ou atrasadas de forma automática.
- **Correção e feedback:** permite avaliar tarefas, atribuir notas e enviar comentários individuais ou coletivos.
- **Acesso em diferentes dispositivos:** possibilita utilizar a plataforma em computadores, tablets ou smartphones.
- **Organização automática de conteúdos:** mantém materiais, atividades, notas e interações centralizados em um único ambiente.
Por unir comunicação, organização e recursos educacionais em uma única plataforma, o Google Classroom se tornou uma ferramenta amplamente utilizada para apoiar o ensino presencial, híbrido e a distância em instituições de ensino e ambientes de capacitação.
$md$, NULL, NULL),
('GUIDE-07', 'KAHOOT', 'Guia de domínio — Kahoot!', $md$## Kahoot!
O **Kahoot!** é uma plataforma de aprendizagem interativa, criada para transformar o aprendizado em uma experiência mais dinâmica, participativa e divertida. De maneira simples, ele pode ser comparado a um “game de perguntas e respostas”, onde os participantes aprendem enquanto competem, respondem desafios e acompanham sua pontuação em tempo real.
Ao utilizar o Kahoot!, o usuário pode criar quizzes, questionários, desafios, enquetes e atividades educativas com perguntas personalizadas. Essas atividades podem ser acessadas por computadores, celulares ou tablets, permitindo que várias pessoas participem ao mesmo tempo, seja presencialmente ou à distância.
Durante uma atividade, as perguntas são exibidas na tela principal, enquanto os participantes utilizam seus dispositivos para responder dentro de um tempo determinado. A cada resposta correta, pontos são acumulados, e um ranking é atualizado automaticamente, tornando a experiência mais envolvente e motivadora.
Diferente de métodos tradicionais de avaliação, o Kahoot! utiliza elementos de jogos, competição e interação para estimular a participação, a concentração e o aprendizado de forma mais leve e divertida.
### Principais funcionalidades
- **Criação de quizzes personalizados:** permite desenvolver jogos de perguntas e respostas com temas variados.
- **Perguntas com diferentes formatos:** possibilita criar múltipla escolha, verdadeiro ou falso, enquetes, desafios e atividades interativas.
- **Participação em tempo real:** permite que várias pessoas respondam simultaneamente utilizando computadores, celulares ou tablets.
- **Sistema de pontuação e ranking:** calcula pontos automaticamente com base em acertos e tempo de resposta, exibindo classificações em tempo real.
- **Uso de elementos multimídia:** permite adicionar imagens, vídeos, músicas e outros recursos visuais às perguntas.
- **Cronômetro para respostas:** possibilita definir tempo limite para cada questão, aumentando a dinâmica da atividade.
- **Relatórios de desempenho:** apresenta estatísticas e resultados das respostas para análise posterior.
- **Compartilhamento de atividades:** permite disponibilizar quizzes por código de acesso ou link.
- **Uso presencial ou remoto:** possibilita aplicação em salas de aula, treinamentos, reuniões ou atividades online.
- **Biblioteca de conteúdos prontos:** oferece quizzes já criados por outros usuários que podem ser reutilizados ou adaptados.
Por unir aprendizado, tecnologia e elementos de gamificação em um único ambiente, o Kahoot! se tornou uma ferramenta amplamente utilizada para ensino, treinamentos, revisões de conteúdo e atividades colaborativas de forma interativa e motivadora.
$md$, NULL, NULL),
('GUIDE-08', 'POWERPOINT', 'Guia de domínio — Microsoft PowerPoint', $md$## Microsoft PowerPoint
O **Microsoft PowerPoint** é um programa de criação de apresentações, criado para organizar e apresentar informações de forma visual, dinâmica e fácil de compreender. De maneira simples, ele pode ser comparado a um “quadro de apresentações digital”, onde textos, imagens, gráficos, vídeos e animações podem ser organizados em páginas chamadas slides.
Ao utilizar o PowerPoint, o usuário pode criar apresentações compostas por vários slides, cada um funcionando como uma página visual destinada a transmitir uma ideia, explicar um conteúdo ou apresentar informações para um público. Esses slides podem conter títulos, textos explicativos, imagens, tabelas, gráficos, ícones, vídeos e diversos elementos visuais que ajudam a tornar a comunicação mais clara e envolvente.
Diferente de um documento tradicional, que normalmente é lido de forma contínua, o PowerPoint foi desenvolvido para apresentar informações de maneira sequencial e visual, facilitando apresentações em salas de aula, reuniões, treinamentos, palestras e eventos.
Além disso, a ferramenta permite aplicar efeitos de transição entre slides, animações em elementos específicos e recursos multimídia, tornando a apresentação mais interativa e atrativa para quem está assistindo.
### Principais funcionalidades
- **Criação de apresentações em slides:** permite organizar conteúdos em páginas visuais sequenciais.
- **Inserção de textos e títulos:** possibilita adicionar informações escritas de forma estruturada e destacada.
- **Uso de imagens e elementos visuais:** permite inserir fotos, ícones, formas, ilustrações e objetos gráficos.
- **Criação de tabelas e gráficos:** possibilita apresentar dados numéricos de forma visual e fácil de interpretar.
- **Inserção de vídeos e áudios:** permite adicionar conteúdos multimídia para enriquecer a apresentação.
- **Temas e modelos prontos:** oferece layouts, estilos e combinações visuais que facilitam a criação de apresentações profissionais.
- **Animações de objetos:** possibilita aplicar movimentos e efeitos em textos, imagens e elementos específicos.
- **Transições entre slides:** permite criar efeitos visuais durante a passagem de um slide para outro.
- **Modo apresentação:** oferece uma visualização específica para apresentar o conteúdo ao público em tela cheia.
- **Compartilhamento e exportação:** permite salvar apresentações em diferentes formatos, incluindo PDF, vídeo e arquivos editáveis.
- **Colaboração em equipe:** possibilita que várias pessoas editem a mesma apresentação simultaneamente.
Por reunir organização visual, recursos multimídia e ferramentas de apresentação em um único ambiente, o Microsoft PowerPoint se tornou uma das ferramentas mais utilizadas para ensino, comunicação profissional, treinamentos e apresentações em geral.
$md$, NULL, NULL),
('GUIDE-09', 'GOOGLE_MEET', 'Guia de domínio — Google Meet', $md$## Google Meet
O **Google Meet** é uma plataforma de videoconferência, criada para permitir que pessoas se comuniquem por áudio e vídeo em tempo real, independentemente de onde estejam. De maneira simples, ele pode ser comparado a uma “sala de reunião virtual”, onde participantes podem conversar, compartilhar informações e colaborar pela internet como se estivessem no mesmo ambiente.
Ao utilizar o Google Meet, o usuário pode criar reuniões online ou participar de encontros por meio de links ou códigos de acesso, utilizando computadores, celulares ou tablets. Durante a chamada, é possível ver e ouvir os participantes, conversar por voz, enviar mensagens pelo chat e interagir de forma instantânea.
Diferente de uma ligação telefônica tradicional, o Google Meet permite comunicação visual e colaboração em grupo, tornando reuniões, aulas, treinamentos e apresentações muito mais próximas da experiência presencial.
Além disso, a plataforma oferece recursos que ajudam na organização e na produtividade, permitindo compartilhar a tela, apresentar documentos, gravar reuniões e interagir com vários participantes simultaneamente.
### Principais funcionalidades
- **Chamadas de vídeo em tempo real:** permite realizar reuniões online com áudio e vídeo entre duas ou mais pessoas.
- **Criação e ingresso em reuniões:** possibilita gerar links ou códigos de acesso para convidar participantes.
- **Compartilhamento de tela:** permite mostrar apresentações, documentos, sistemas ou qualquer conteúdo exibido no dispositivo.
- **Chat integrado:** possibilita enviar mensagens, links e observações durante a reunião sem interromper a fala.
- **Participação em múltiplos dispositivos:** permite acessar reuniões por computadores, smartphones ou tablets.
- **Gravação de reuniões:** permite registrar encontros para visualização posterior, quando disponível na conta utilizada.
- **Controle de participantes:** possibilita admitir usuários, silenciar microfones e gerenciar permissões da reunião.
- **Legendas automáticas:** oferece transcrição em tempo real em idiomas compatíveis, facilitando a compreensão.
- **Qualidade e estabilidade de conexão:** ajusta automaticamente vídeo e áudio conforme a qualidade da internet disponível.
Por reunir comunicação, colaboração e compartilhamento de conteúdo em um único ambiente digital, o Google Meet se tornou uma ferramenta amplamente utilizada para aulas online, reuniões profissionais, treinamentos, apresentações e encontros virtuais.
$md$, NULL, NULL),
('GUIDE-10', 'ONEDRIVE', 'Guia de domínio — Microsoft OneDrive', $md$## Microsoft OneDrive
O **Microsoft OneDrive** é um serviço de armazenamento em nuvem, criado para guardar, organizar, sincronizar e compartilhar arquivos pela internet de forma segura e prática. De maneira simples, ele pode ser comparado a um “cofre digital” ou um “pendrive online”, onde documentos, fotos, vídeos e outros arquivos ficam armazenados na nuvem e podem ser acessados de praticamente qualquer lugar.
Ao utilizar o OneDrive, o usuário pode salvar arquivos sem depender apenas da memória do computador ou do celular. Em vez de manter tudo armazenado em um único dispositivo, os dados ficam protegidos em servidores online, permitindo acesso por meio de computadores, smartphones, tablets ou navegadores conectados à internet.
Isso significa que um arquivo criado em casa pode ser aberto no trabalho, na faculdade ou em outro dispositivo utilizando a mesma conta, mantendo as informações sempre atualizadas e sincronizadas.
Além do armazenamento, o OneDrive oferece recursos que facilitam a organização, colaboração e proteção de arquivos, tornando o trabalho individual ou em equipe muito mais eficiente.
### Principais funcionalidades
- **Armazenamento em nuvem:** permite salvar documentos, imagens, vídeos, planilhas, apresentações e diversos outros tipos de arquivos em um espaço online.
- **Sincronização automática:** mantém os arquivos atualizados entre diferentes dispositivos conectados à mesma conta.
- **Acesso em múltiplos dispositivos:** possibilita abrir, editar ou baixar arquivos em computadores, celulares, tablets ou navegadores.
- **Organização de arquivos:** permite criar pastas, mover documentos, renomear arquivos e manter conteúdos organizados de forma semelhante ao explorador de arquivos tradicional.
- **Compartilhamento simplificado:** possibilita enviar arquivos ou pastas por links, permitindo acesso rápido a outras pessoas.
- **Controle de permissões:** permite definir quem pode visualizar, comentar ou editar arquivos compartilhados.
- **Backup de arquivos importantes:** possibilita armazenar cópias de segurança de documentos e mídias, reduzindo riscos de perda de dados.
- **Histórico de versões:** permite recuperar versões anteriores de arquivos após alterações ou exclusões acidentais.
- **Proteção e segurança:** oferece recursos de autenticação, recuperação de arquivos e proteção contra exclusões ou alterações não desejadas.
Por unir armazenamento, segurança, sincronização e colaboração em um único ambiente digital, o Microsoft OneDrive se tornou uma ferramenta amplamente utilizada para gerenciamento de arquivos em contextos pessoais, acadêmicos e profissionais.
$md$, NULL, NULL),
('GUIDE-11', 'CMSP', 'Guia de domínio — CMSP – Centro de Mídias de São Paulo', $md$## CMSP – Centro de Mídias de São Paulo
O **CMSP (Centro de Mídias da Educação de São Paulo)** é uma plataforma educacional digital, desenvolvido para apoiar o ensino, a comunicação e o acesso a conteúdos pedagógicos de forma online. De maneira simples, ele pode ser comparado a uma “escola digital”, onde alunos, professores e gestores podem acompanhar aulas, materiais, atividades e comunicados em um único ambiente virtual.
A plataforma foi criada para aproximar a tecnologia do processo de aprendizagem, permitindo que conteúdos educacionais estejam disponíveis a qualquer momento e em diferentes dispositivos, como computadores, celulares e tablets.
Ao utilizar o CMSP, os estudantes podem assistir aulas ao vivo ou gravadas, acessar conteúdos complementares, participar de atividades interativas e acompanhar orientações escolares. Já professores e equipes pedagógicas podem organizar turmas, compartilhar materiais, realizar transmissões e se comunicar com a comunidade escolar de forma mais ágil.
Diferente de uma sala de aula tradicional, onde o acesso ao conteúdo depende do horário e da presença física, o CMSP amplia as possibilidades de aprendizado, permitindo que a educação aconteça também em ambientes digitais.
Além disso, a plataforma integra diferentes recursos multimídia e ferramentas de interação, tornando o ensino mais acessível, organizado e conectado com a realidade tecnológica atual.
### Principais funcionalidades
- **Transmissão de aulas ao vivo:** permite acompanhar aulas em tempo real com professores e especialistas.
- **Acesso a aulas gravadas:** possibilita rever conteúdos posteriormente, respeitando o ritmo de aprendizagem de cada estudante.
- **Disponibilização de materiais didáticos:** permite acessar documentos, apresentações, vídeos, exercícios e conteúdos complementares.
- **Interação em tempo real:** possibilita participação por chat, enquetes, comentários e atividades durante as transmissões.
- **Organização por turmas e séries:** apresenta conteúdos específicos de acordo com o ano escolar ou área de ensino.
- **Acesso em diferentes dispositivos:** permite utilizar a plataforma por computadores, smartphones ou tablets.
- **Comunicação escolar:** facilita o envio de avisos, orientações e informações entre escola, professores e estudantes.
- **Atividades pedagógicas digitais:** possibilita responder exercícios, desafios e propostas de aprendizagem online.
- **Integração com recursos educacionais:** conecta diferentes ferramentas e conteúdos digitais utilizados no ambiente escolar.
- **Acompanhamento contínuo da aprendizagem:** auxilia no acesso constante aos conteúdos e no desenvolvimento educacional.
Por reunir ensino, comunicação e recursos digitais em um único ambiente, o CMSP se tornou uma importante ferramenta de apoio à educação pública do estado de São Paulo, promovendo maior acessibilidade, organização e continuidade no processo de aprendizagem.
$md$, NULL, NULL),
('GUIDE-12', 'SED', 'Guia de domínio — SED – Secretaria Escolar Digital', $md$## SED – Secretaria Escolar Digital
A **SED (Secretaria Escolar Digital)** é uma plataforma educacional desenvolvida para centralizar informações acadêmicas, administrativas e pedagógicas das escolas da rede pública estadual. De maneira simples, ela pode ser comparada a uma “secretaria escolar online”, onde alunos, professores, responsáveis, gestores e equipes escolares podem acessar informações importantes sem precisar estar fisicamente na escola.
Assim como uma secretaria tradicional organiza documentos, registros e informações dos estudantes, a SED realiza esse mesmo papel no ambiente digital, tornando processos escolares mais rápidos, organizados e acessíveis.
Por meio da plataforma, é possível consultar dados escolares, acompanhar frequência, registrar notas, acessar turmas, organizar calendários, acompanhar o desempenho acadêmico e realizar diferentes processos administrativos de forma integrada.
Diferente dos métodos tradicionais baseados em formulários impressos e registros manuais, a SED automatiza grande parte da gestão escolar, reduzindo burocracias e facilitando a comunicação entre escola, professores, alunos e responsáveis.
Além disso, a plataforma permite que informações importantes estejam disponíveis em tempo real, contribuindo para uma gestão educacional mais eficiente e transparente.
### Principais funcionalidades
- **Consulta de informações escolares:** permite visualizar dados acadêmicos, turmas, disciplinas e informações cadastrais.
- **Registro de frequência:** possibilita o lançamento e acompanhamento da presença dos estudantes.
- **Lançamento de notas e avaliações:** permite registrar resultados acadêmicos e acompanhar o desempenho escolar.
- **Gestão de turmas e classes:** auxilia na organização de alunos, professores e componentes curriculares.
- **Acompanhamento pedagógico:** possibilita monitorar evolução acadêmica, atividades e indicadores educacionais.
- **Acesso ao calendário escolar:** permite consultar datas letivas, eventos, avaliações e períodos acadêmicos.
- **Comunicação institucional:** facilita a divulgação de avisos, orientações e informações escolares.
- **Processos administrativos digitais:** permite realizar matrículas, transferências, atualizações cadastrais e outros procedimentos.
- **Acesso em ambiente online:** possibilita utilização por computadores, tablets ou smartphones conectados à internet.
Por reunir organização acadêmica, gestão escolar e acesso digital às informações em um único ambiente, a SED se tornou uma ferramenta fundamental para modernizar e facilitar os processos educacionais nas escolas públicas do estado de São paulo.
$md$, NULL, NULL),
('GUIDE-13', 'TEAMS', 'Guia de domínio — Microsoft Teams', $md$## Microsoft Teams
O **Microsoft Teams** é uma plataforma de comunicação, colaboração e produtividade, criada para conectar pessoas, equipes e organizações em um ambiente digital integrado. De maneira simples, ele pode ser comparado a um “escritório virtual” ou uma “sala de trabalho online”, onde é possível conversar, realizar reuniões, compartilhar arquivos e desenvolver atividades em equipe, mesmo que cada participante esteja em um lugar diferente.
Ao utilizar o Microsoft Teams, o usuário pode trocar mensagens instantâneas, participar de chamadas de áudio e vídeo, organizar grupos de trabalho, compartilhar documentos e acompanhar projetos em tempo real. Tudo isso acontece dentro de uma única plataforma, evitando a necessidade de utilizar vários aplicativos separados para comunicação e organização.
Diferente de aplicativos focados apenas em mensagens ou videoconferências, o Teams combina comunicação, armazenamento, colaboração e integração com outras ferramentas, tornando o trabalho em equipe mais organizado, produtivo e acessível.
Além do ambiente corporativo, a plataforma também é amplamente utilizada em instituições de ensino, treinamentos, reuniões administrativas e projetos colaborativos.
### Principais funcionalidades
- **Mensagens instantâneas:** permite enviar mensagens individuais ou em grupo de forma rápida e organizada.
- **Chamadas de áudio e vídeo:** possibilita realizar reuniões online com duas ou mais pessoas em tempo real.
- **Criação de equipes e canais:** permite organizar grupos de trabalho, disciplinas, departamentos ou projetos em espaços separados.
- **Compartilhamento de arquivos:** possibilita enviar documentos, imagens, planilhas, apresentações e outros arquivos diretamente nas conversas.
- **Edição colaborativa:** permite que várias pessoas trabalhem simultaneamente em um mesmo arquivo.
- **Agendamento de reuniões:** permite marcar encontros virtuais com data, horário e convidados definidos.
- **Compartilhamento de tela:** possibilita apresentar documentos, sistemas, apresentações ou qualquer conteúdo exibido no dispositivo.
- **Gravação de reuniões:** permite registrar encontros para consultas futuras, quando habilitado.
- **Organização de tarefas e projetos:** auxilia no acompanhamento de atividades, prazos e colaboração entre equipes.
- **Acesso multiplataforma:** possibilita utilizar a ferramenta em computadores, navegadores, tablets e smartphones.
Por reunir comunicação, colaboração, organização e produtividade em um único ambiente digital, o Microsoft Teams se tornou uma ferramenta amplamente utilizada em empresas, instituições de ensino e projetos colaborativos, facilitando o trabalho e a interação entre pessoas em qualquer lugar.
$md$, NULL, NULL),
('GUIDE-14', 'NOVA_ESCOLA', 'Guia de domínio — Nova Escola', $md$## Nova Escola
A **Nova Escola** é uma plataforma educacional brasileira criada para apoiar o trabalho de professores, gestores escolares e profissionais da educação, oferecendo conteúdos pedagógicos, materiais de apoio, cursos e recursos voltados ao processo de ensino e aprendizagem. De maneira simples, ela pode ser comparada a uma “biblioteca digital para educadores”, onde profissionais da educação encontram orientações, atividades, planos de aula e conteúdos especializados para enriquecer suas práticas pedagógicas.
A plataforma reúne materiais desenvolvidos por especialistas da área educacional, buscando apoiar o planejamento das aulas, a formação continuada e a aplicação de metodologias que tornem o ensino mais dinâmico e eficiente.
Ao utilizar a Nova Escola, educadores podem acessar conteúdos organizados por etapas de ensino, componentes curriculares e temas pedagógicos, facilitando a busca por materiais adequados para diferentes contextos escolares.
Diferente de um site comum de pesquisa, a Nova Escola concentra conteúdos específicos da área educacional, elaborados com foco nas necessidades reais do ambiente escolar e no desenvolvimento profissional dos educadores.
Além disso, a plataforma disponibiliza recursos digitais que auxiliam tanto no planejamento das aulas quanto na atualização profissional, promovendo aprendizado contínuo e troca de experiências.
### Principais funcionalidades
- **Planos de aula prontos:** oferece sugestões de aulas estruturadas para diferentes disciplinas e níveis de ensino.
- **Materiais pedagógicos:** disponibiliza atividades, exercícios, sequências didáticas e conteúdos de apoio para uso em sala de aula.
- **Cursos e formação continuada:** permite acesso a cursos, trilhas de aprendizagem e conteúdos voltados ao desenvolvimento profissional.
- **Artigos e conteúdos especializados:** reúne textos, reportagens e orientações sobre educação, metodologias e práticas pedagógicas.
- **Busca por área de conhecimento:** possibilita localizar materiais por disciplina, série, etapa escolar ou tema específico.
- **Recursos para planejamento:** auxilia professores na organização de aulas, objetivos de aprendizagem e estratégias didáticas.
- **Conteúdos alinhados à educação brasileira:** oferece materiais relacionados a diretrizes e práticas educacionais utilizadas no país.
- **Acesso digital em diferentes dispositivos:** permite utilizar a plataforma em computadores, tablets ou smartphones.
- **Atualização constante de conteúdos:** disponibiliza novos materiais, tendências pedagógicas e recursos educacionais periodicamente.
- **Apoio à comunidade educadora:** promove compartilhamento de experiências, ideias e boas práticas entre profissionais da educação.
Por reunir conhecimento pedagógico, formação profissional e recursos educacionais em um único ambiente digital, a **Nova Escola** se tornou uma importante ferramenta de apoio para todos educadores, contribuindo para a inovação e o fortalecimento das práticas de ensino.
$md$, NULL, NULL)
ON CONFLICT (tool_category) WHERE deleted_at IS NULL DO UPDATE SET
  seed_key = EXCLUDED.seed_key,
  title = EXCLUDED.title,
  deep_content = EXCLUDED.deep_content,
  slides_embed = EXCLUDED.slides_embed,
  deleted_at = NULL;
