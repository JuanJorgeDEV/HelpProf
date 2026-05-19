-- HelpProf — seed inicial de pílulas extraídas de HelpProf_pilulas_por_ferramenta (2).docx.
-- Idempotente: usa categories.slug e pills.seed_key para poder reexecutar sem duplicar conteúdo.

ALTER TABLE public.pills ADD COLUMN IF NOT EXISTS seed_key TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pills_seed_key ON public.pills (seed_key);

INSERT INTO public.categories (slug, name, group_tag, logo_url, brand_color, sort_order) VALUES
  ('CANVA', 'Canva', 'Planejamento', 'assets/canva.png', '#00C4CC', 5),
  ('WORD', 'Microsoft Word', 'Documentos', 'assets/word.png', '#2b579a', 2),
  ('POWERPOINT', 'Microsoft PowerPoint', 'Documentos', NULL, '#d24726', 8),
  ('GOOGLE_FORMS', 'Google Forms', 'Interatividade', NULL, '#7248b9', 9),
  ('EXCEL', 'Microsoft Excel', 'Documentos', 'assets/excel.png', '#217346', 3),
  ('GOOGLE_CLASSROOM', 'Google Classroom', 'Planejamento', NULL, '#1f8f4d', 10),
  ('KAHOOT', 'Kahoot', 'Gamificação', 'assets/kahoot.png', '#46178f', 11),
  ('ONEDRIVE', 'Microsoft OneDrive', 'Documentos', 'assets/onedrive.png', '#0078d4', 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  group_tag = COALESCE(EXCLUDED.group_tag, public.categories.group_tag),
  logo_url = COALESCE(EXCLUDED.logo_url, public.categories.logo_url),
  brand_color = EXCLUDED.brand_color,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.pills (seed_key, tool_category, title, survival_content, tags, views_count) VALUES
('DOCX-01', 'CANVA', 'Como usar um modelo pronto no Canva?', $md$1. Acesse o Canva.
2. Pesquise o tipo de material desejado, como **cartaz** ou **apresentação**.
3. Escolha um modelo pronto.
4. Clique nos textos para editar.
5. Troque imagens, cores e informações.
6. Baixe ou compartilhe o material.$md$, ARRAY['Canva','modelo','material pedagógico']::text[], 0),
('DOCX-02', 'CANVA', 'Como baixar uma arte em PDF no Canva?', $md$1. Abra o design no Canva.
2. Clique em **Compartilhar**.
3. Clique em **Baixar**.
4. Escolha o formato **PDF**.
5. Clique em **Baixar**.
6. Verifique o arquivo salvo no computador.$md$, ARRAY['Canva','PDF','download']::text[], 0),
('DOCX-03', 'CANVA', 'Como criar um cartaz para sala de aula?', $md$1. No Canva, pesquise por **cartaz escolar**.
2. Escolha um modelo.
3. Edite o título e as informações.
4. Adicione imagens ou ícones.
5. Ajuste as cores e o tamanho das letras.
6. Baixe em PDF ou imagem.$md$, ARRAY['Canva','cartaz','sala de aula']::text[], 0),
('DOCX-04', 'CANVA', 'Como compartilhar um design com outro professor?', $md$1. Abra o design.
2. Clique em **Compartilhar**.
3. Escolha se a pessoa pode **visualizar** ou **editar**.
4. Copie o link.
5. Envie o link para o outro professor.
6. Confirme se a permissão está correta.$md$, ARRAY['Canva','compartilhar','permissão']::text[], 0),
('DOCX-05', 'CANVA', 'Como criar um certificado simples no Canva?', $md$1. Pesquise por **certificado** no Canva.
2. Escolha um modelo.
3. Edite o nome do evento ou projeto.
4. Deixe espaço para o nome do aluno.
5. Adicione data e assinatura.
6. Baixe em PDF para imprimir.$md$, ARRAY['Canva','certificado','PDF']::text[], 0),
('DOCX-06', 'WORD', 'Como salvar um arquivo em PDF no Word?', $md$1. Abra o documento no Word.
2. Clique em **Arquivo**.
3. Clique em **Salvar como** ou **Exportar**.
4. Escolha o formato **PDF**.
5. Selecione a pasta de destino.
6. Clique em **Salvar**.$md$, ARRAY['Word','PDF','salvar']::text[], 0),
('DOCX-07', 'WORD', 'Como inserir uma imagem no Word?', $md$1. Clique no local onde a imagem deve aparecer.
2. Vá em **Inserir**.
3. Clique em **Imagens**.
4. Escolha a imagem no computador.
5. Clique em **Inserir**.
6. Ajuste o tamanho da imagem.$md$, ARRAY['Word','imagem','inserir']::text[], 0),
('DOCX-08', 'WORD', 'Como criar uma tabela no Word?', $md$1. Clique onde a tabela será inserida.
2. Vá em **Inserir**.
3. Clique em **Tabela**.
4. Escolha o número de linhas e colunas.
5. Digite as informações.
6. Ajuste a formatação se necessário.$md$, ARRAY['Word','tabela','organização']::text[], 0),
('DOCX-09', 'WORD', 'Como criar um sumário automático?', $md$1. Aplique estilos de título no documento.
2. Clique onde o sumário deve aparecer.
3. Vá em **Referências**.
4. Clique em **Sumário**.
5. Escolha um modelo automático.
6. Atualize o sumário quando mudar o texto.$md$, ARRAY['Word','sumário','referências']::text[], 0),
('DOCX-10', 'WORD', 'Como verificar acessibilidade no Word?', $md$1. Abra o documento.
2. Vá em **Revisão**.
3. Clique em **Verificar Acessibilidade**.
4. Leia os avisos exibidos.
5. Corrija os problemas indicados.
6. Salve o documento revisado.$md$, ARRAY['Word','acessibilidade','revisão']::text[], 0),
('DOCX-11', 'POWERPOINT', 'Como criar uma apresentação no PowerPoint?', $md$1. Abra o PowerPoint.
2. Clique em **Nova apresentação**.
3. Escolha um tema ou modelo.
4. Edite o título do primeiro slide.
5. Adicione novos slides.
6. Salve o arquivo.$md$, ARRAY['PowerPoint','apresentação','slides']::text[], 0),
('DOCX-12', 'POWERPOINT', 'Como adicionar um novo slide?', $md$1. Abra a apresentação.
2. Vá até a guia **Página Inicial**.
3. Clique em **Novo Slide**.
4. Escolha o tipo de layout.
5. Digite o conteúdo.
6. Salve a apresentação.$md$, ARRAY['PowerPoint','slide','layout']::text[], 0),
('DOCX-13', 'POWERPOINT', 'Como salvar uma apresentação em PDF?', $md$1. Abra a apresentação.
2. Clique em **Arquivo**.
3. Clique em **Exportar**.
4. Escolha **Criar PDF/XPS**.
5. Escolha a pasta de destino.
6. Clique em **Publicar** ou **Salvar**.$md$, ARRAY['PowerPoint','PDF','exportar']::text[], 0),
('DOCX-14', 'POWERPOINT', 'Como compartilhar uma apresentação com outro professor?', $md$1. Clique em **Compartilhar**.
2. Salve no OneDrive, se necessário.
3. Digite o e-mail do professor.
4. Escolha se ele pode editar ou apenas visualizar.
5. Adicione uma mensagem.
6. Clique em **Enviar**.$md$, ARRAY['PowerPoint','compartilhar','OneDrive']::text[], 0),
('DOCX-15', 'POWERPOINT', 'Como deixar slides mais acessíveis?', $md$1. Use letras grandes e legíveis.
2. Evite excesso de texto no slide.
3. Use bom contraste entre texto e fundo.
4. Adicione texto alternativo nas imagens.
5. Organize os elementos em ordem lógica.
6. Use o verificador de acessibilidade.$md$, ARRAY['PowerPoint','acessibilidade','slides']::text[], 0),
('DOCX-16', 'GOOGLE_FORMS', 'Como criar uma atividade no Google Forms?', $md$1. Acesse o Google Forms.
2. Clique em **Em branco**.
3. Digite o título da atividade.
4. Escreva a primeira pergunta.
5. Escolha o tipo de resposta.
6. Clique em **Enviar** quando terminar.$md$, ARRAY['Google Forms','atividade','formulário']::text[], 0),
('DOCX-17', 'GOOGLE_FORMS', 'Como transformar um formulário em quiz?', $md$1. Abra o formulário.
2. Clique em **Configurações**.
3. Ative a opção **Criar teste**.
4. Volte para as perguntas.
5. Marque as respostas corretas.
6. Defina a pontuação.$md$, ARRAY['Google Forms','quiz','teste']::text[], 0),
('DOCX-18', 'GOOGLE_FORMS', 'Como adicionar resposta correta no Google Forms?', $md$1. Clique na pergunta.
2. Escolha um tipo compatível, como múltipla escolha.
3. Clique em **Chave de resposta**.
4. Marque a alternativa correta.
5. Defina os pontos.
6. Clique em **Concluído**.$md$, ARRAY['Google Forms','resposta correta','pontuação']::text[], 0),
('DOCX-19', 'GOOGLE_FORMS', 'Como enviar o formulário para alunos?', $md$1. Abra o formulário.
2. Clique em **Enviar**.
3. Escolha o ícone de link.
4. Copie o link.
5. Envie pelo Classroom, WhatsApp ou e-mail.
6. Oriente os alunos sobre o prazo.$md$, ARRAY['Google Forms','enviar','alunos']::text[], 0),
('DOCX-20', 'GOOGLE_FORMS', 'Como ver respostas no Google Forms?', $md$1. Abra o formulário.
2. Clique na aba **Respostas**.
3. Veja o resumo geral.
4. Clique em **Individual** para ver aluno por aluno.
5. Clique no ícone do Google Sheets se quiser uma planilha.
6. Analise os resultados.$md$, ARRAY['Google Forms','respostas','resultados']::text[], 0),
('DOCX-21', 'EXCEL', 'Como calcular média de alunos no Excel?', $md$1. Digite as notas em colunas.
2. Clique na célula da média.
3. Digite `=MÉDIA(`.
4. Selecione as notas do aluno.
5. Feche com `)`.
6. Pressione **Enter**.$md$, ARRAY['Excel','média','notas']::text[], 0),
('DOCX-22', 'EXCEL', 'Como somar pontos de uma atividade?', $md$1. Digite os pontos em uma linha ou coluna.
2. Clique na célula do total.
3. Digite `=SOMA(`.
4. Selecione os pontos.
5. Feche com `)`.
6. Pressione **Enter**.$md$, ARRAY['Excel','soma','pontos']::text[], 0),
('DOCX-23', 'EXCEL', 'Como filtrar alunos por turma?', $md$1. Clique em uma célula da tabela.
2. Vá em **Dados**.
3. Clique em **Filtro**.
4. Clique na seta da coluna **Turma**.
5. Marque a turma desejada.
6. Clique em **OK**.$md$, ARRAY['Excel','filtro','turma']::text[], 0),
('DOCX-24', 'EXCEL', 'Como ordenar notas do maior para o menor?', $md$1. Clique em uma célula da coluna de notas.
2. Vá em **Dados**.
3. Clique em **Classificar**.
4. Escolha a coluna de notas.
5. Selecione do maior para o menor.
6. Confirme em **OK**.$md$, ARRAY['Excel','classificar','notas']::text[], 0),
('DOCX-25', 'EXCEL', 'Como criar gráfico de desempenho?', $md$1. Selecione os nomes e notas.
2. Vá em **Inserir**.
3. Clique em **Gráficos Recomendados**.
4. Escolha um modelo de gráfico.
5. Clique em **OK**.
6. Edite o título do gráfico.$md$, ARRAY['Excel','gráfico','desempenho']::text[], 0),
('DOCX-26', 'GOOGLE_CLASSROOM', 'Como criar uma turma no Google Classroom?', $md$1. Acesse o Google Classroom.
2. Clique no botão **+**.
3. Escolha **Criar turma**.
4. Digite o nome da turma.
5. Preencha disciplina ou seção, se quiser.
6. Clique em **Criar**.$md$, ARRAY['Google Classroom','turma','criar']::text[], 0),
('DOCX-27', 'GOOGLE_CLASSROOM', 'Como convidar alunos para a turma?', $md$1. Abra a turma.
2. Vá até a área de pessoas ou configurações.
3. Copie o código ou link da turma.
4. Envie para os alunos.
5. Peça que entrem com a conta correta.
6. Confira se eles aparecem na turma.$md$, ARRAY['Google Classroom','alunos','convite']::text[], 0),
('DOCX-28', 'GOOGLE_CLASSROOM', 'Como postar um aviso para os alunos?', $md$1. Abra a turma.
2. Vá para o mural.
3. Clique em **Compartilhar algo com sua turma**.
4. Digite o aviso.
5. Adicione arquivo ou link, se necessário.
6. Clique em **Postar**.$md$, ARRAY['Google Classroom','aviso','mural']::text[], 0),
('DOCX-29', 'GOOGLE_CLASSROOM', 'Como criar uma atividade?', $md$1. Abra a turma.
2. Clique em **Atividades**.
3. Clique em **Criar**.
4. Escolha **Atividade**.
5. Preencha título, instruções e prazo.
6. Clique em **Atribuir**.$md$, ARRAY['Google Classroom','atividade','atribuir']::text[], 0),
('DOCX-30', 'GOOGLE_CLASSROOM', 'Como corrigir e devolver uma atividade?', $md$1. Abra a atividade.
2. Clique no trabalho do aluno.
3. Analise a entrega.
4. Insira nota ou comentário.
5. Clique em **Devolver**.
6. Confirme o envio ao aluno.$md$, ARRAY['Google Classroom','corrigir','devolver']::text[], 0),
('DOCX-31', 'KAHOOT', 'Como criar um quiz no Kahoot?', $md$1. Entre na conta do Kahoot.
2. Clique em **Create**.
3. Escolha **Kahoot**.
4. Adicione uma pergunta.
5. Insira alternativas e marque a correta.
6. Salve o quiz.$md$, ARRAY['Kahoot','quiz','gamificação']::text[], 0),
('DOCX-32', 'KAHOOT', 'Como adicionar uma pergunta no Kahoot?', $md$1. Abra o Kahoot em edição.
2. Clique em **Add question**.
3. Escolha o tipo de pergunta.
4. Digite o enunciado.
5. Coloque as alternativas.
6. Marque a resposta correta.$md$, ARRAY['Kahoot','pergunta','alternativas']::text[], 0),
('DOCX-33', 'KAHOOT', 'Como compartilhar um Kahoot?', $md$1. Abra a página do Kahoot.
2. Clique nos três pontos.
3. Escolha **Share kahoot**.
4. Clique em **Copy**.
5. Envie o link.
6. Confira se os alunos conseguem acessar.$md$, ARRAY['Kahoot','compartilhar','link']::text[], 0),
('DOCX-34', 'KAHOOT', 'Como ver relatórios de um Kahoot?', $md$1. Entre na conta usada no jogo.
2. Vá até **Reports**.
3. Localize o Kahoot aplicado.
4. Abra o relatório.
5. Veja acertos, erros e participantes.
6. Use os dados para retomar conteúdos.$md$, ARRAY['Kahoot','relatórios','resultados']::text[], 0),
('DOCX-35', 'KAHOOT', 'Como usar um Kahoot pronto?', $md$1. Acesse a área de descoberta do Kahoot.
2. Pesquise o tema da aula.
3. Escolha um Kahoot pronto.
4. Revise as perguntas.
5. Edite o que for necessário.
6. Salve ou aplique com a turma.$md$, ARRAY['Kahoot','pronto','descoberta']::text[], 0),
('DOCX-36', 'ONEDRIVE', 'Como salvar um arquivo no OneDrive?', $md$1. Acesse o OneDrive com sua conta Microsoft.
2. Clique em **Adicionar novo**.
3. Escolha **Upload de arquivos**.
4. Selecione o arquivo no computador.
5. Aguarde o envio terminar.
6. Confira se o arquivo apareceu na lista.$md$, ARRAY['OneDrive','upload','arquivo']::text[], 0),
('DOCX-37', 'ONEDRIVE', 'Como enviar uma pasta para o OneDrive?', $md$1. Acesse o OneDrive pelo navegador.
2. Clique em **Adicionar novo**.
3. Escolha **Upload de pasta**.
4. Selecione a pasta desejada.
5. Confirme o envio.
6. Aguarde até todos os arquivos carregarem.$md$, ARRAY['OneDrive','pasta','upload']::text[], 0),
('DOCX-38', 'ONEDRIVE', 'Como compartilhar arquivo com outro professor?', $md$1. No OneDrive, selecione o arquivo.
2. Clique em **Compartilhar**.
3. Digite o e-mail do professor.
4. Escolha se ele pode **visualizar** ou **editar**.
5. Escreva uma mensagem, se quiser.
6. Clique em **Enviar**.$md$, ARRAY['OneDrive','compartilhar','professor']::text[], 0),
('DOCX-39', 'ONEDRIVE', 'Como enviar link de arquivo para alunos?', $md$1. Selecione o arquivo ou pasta no OneDrive.
2. Clique em **Compartilhar**.
3. Ajuste a permissão do link.
4. Clique em **Copiar link**.
5. Cole o link no Classroom, WhatsApp ou e-mail.
6. Avise os alunos sobre o prazo ou orientação.$md$, ARRAY['OneDrive','link','alunos']::text[], 0),
('DOCX-40', 'ONEDRIVE', 'Como remover acesso de um arquivo compartilhado?', $md$1. Selecione o arquivo compartilhado.
2. Clique em **Gerenciar acesso**.
3. Veja as pessoas ou links com acesso.
4. Remova o acesso de quem não deve visualizar.
5. Exclua links antigos, se necessário.
6. Confirme se o arquivo ficou privado novamente.$md$, ARRAY['OneDrive','acesso','privacidade']::text[], 0)
ON CONFLICT (seed_key) DO UPDATE SET
  tool_category = EXCLUDED.tool_category,
  title = EXCLUDED.title,
  survival_content = EXCLUDED.survival_content,
  tags = EXCLUDED.tags,
  deleted_at = NULL;
