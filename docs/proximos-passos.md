# Próximos passos — HelpProf

Este documento organiza o que falta para sair do protótipo estável e evoluir o produto. Ordem sugerida: **estabilizar deploy → popular conteúdo → IA → polish**.

---

## Estado atual (baseline)

Já implementado:

- Frontend estático (Home, listagem, domínios, pílula, admin)
- API FastAPI com Supabase
- CRUD admin (pílulas, categorias, guias de domínio)
- Vitrine de domínios na Home com filtro por `group_tag`
- Modo domínio em `pilula.html` (`?mode=domain`)
- Logos dinâmicas via `logo_url` + fallback em `tool-assets.js`
- Deploy documentado (Render: backend Web Service + frontend Static Site)
- Embeddings assíncronos (trigger Postgres → Edge Function) — infra pronta, depende de config no Supabase

Ainda frágil ou incompleto:

- IA Lume pouco testada em produção
- População inicial de conteúdo pelos encarregados
- Sem testes automatizados
- Sem CI/CD
- README/deploy recém-documentados — validar fluxo completo em Render após cada mudança

---

## Fase 1 — Estabilizar produção (1–3 dias)

Objetivo: site no ar, admin funcionando, sem depender do notebook.

### Checklist deploy

- [ ] Backend no Render com todas as env vars (`CORS_ORIGINS` = URL exata do frontend)
- [ ] Frontend no Render ou Hostinger com `js/hp-config.js` apontando para a API
- [ ] Migrations aplicadas no Supabase de produção (incluindo `group_tag`)
- [ ] Usuário admin criado no Supabase Auth
- [ ] Testar fluxo: login admin → criar categoria → criar guia → criar pílula → ver na Home/listagem

### CORS

Se aparecer `blocked by CORS policy` com `200 OK`:

1. Confirme `CORS_ORIGINS=https://seu-frontend.onrender.com` no backend (sem aspas, sem `/` final)
2. `ENVIRONMENT=production` no Render
3. Redeploy do backend após alterar env

### Conteúdo mínimo para demo

Cadastre pelo admin pelo menos:

- 3 categorias com `group_tag` e `logo_url`
- 1 guia de domínio por categoria usada na vitrine
- 5–10 pílulas distribuídas em 2–3 ferramentas

---

## Fase 2 — Popular e validar com o time (1–2 semanas)

Objetivo: encarregados alimentam o sistema; vocês validam usabilidade.

### Processo sugerido para encarregados

1. Criar **ferramenta** (categoria): slug, nome, objetivo pedagógico, logo, cor
2. Criar **guia de domínio** para essa ferramenta (Markdown longo)
3. Criar **pílulas** curtas ligadas à mesma ferramenta (passo a passo + slides opcional)

### Padronização de conteúdo

- Definir template Markdown para pílulas (título, passos numerados, dica final)
- Definir template para guias de domínio (o que é, quando usar, limitações, boas práticas)
- Lista fechada de `group_tag`: Gamificação, Documentos, Planejamento, Interatividade

### Melhorias rápidas de UX (se sobrar tempo)

- [ ] Mensagens de erro mais claras no admin quando API falha
- [ ] Preview de Markdown no admin antes de salvar
- [ ] Indicador “sem guia de domínio” na listagem de categorias no admin

---

## Fase 3 — IA Lume (2–4 semanas)

Objetivo: busca inteligente na Home com conteúdo real já cadastrado.

**Pré-requisito:** base de pílulas e tags minimamente preenchida.

### Configuração

- [ ] `GEMINI_API_KEY` no backend (Render)
- [ ] Edge Function `embed-pill` deployada no Supabase com secrets
- [ ] `app.embed_function_url` e `app.embed_webhook_secret` no Postgres (ver [HelpProf-backend.md](./HelpProf-backend.md))
- [ ] Confirmar que novas/alteradas pílulas geram embedding (logs da Edge)

### Produto

- [ ] Conectar formulário “Perguntar para a Lume” na Home a `POST /api/v1/lume/query`
- [ ] Exibir resposta + sugestões de pílulas na UI
- [ ] Tratar `low_confidence` com copy amigável
- [ ] Testar cenários: pergunta vaga, pergunta fora de escopo, pergunta dentro de uma pílula aberta

### Métricas

- [ ] Revisar tabela `search_logs` no Supabase para perguntas frequentes
- [ ] Ajustar `LUME_SIMILARITY_FLOOR` conforme qualidade das respostas

---

## Fase 4 — Qualidade e manutenção (contínuo)

### Testes

- [ ] Testes de API com `pytest` (health, pills list, categories filter)
- [ ] Smoke test manual documentado (checklist por release)

### DevOps

- [ ] GitHub Actions: lint + testes no PR
- [ ] Deploy automático Render ligado à branch `main` (opcional)

### Segurança

- [ ] Rotacionar secrets se algum vazou em chat/commit
- [ ] Restringir `ADMIN_EMAILS` em produção
- [ ] Revisar RLS no Supabase (somente leitura pública onde faz sentido)

### Performance

- [ ] Plano pago Render ou keep-alive se cold start atrapalhar demo
- [ ] Cache simples de `GET /categories` no frontend (sessionStorage) se necessário

---

## Fase 5 — Evoluções de produto (backlog)

Priorize com o time após validação com professores.

| Ideia | Valor | Esforço |
|-------|-------|---------|
| Busca full-text unificada (pílulas + domínios) | Alto | Médio |
| Analytics de views por ferramenta | Médio | Baixo |
| Versionamento / histórico de edição no admin | Médio | Alto |
| Upload de imagens para Supabase Storage (logos) | Alto | Médio |
| PWA / offline leve para consulta | Médio | Alto |
| Internacionalização | Baixo | Médio |
| Integração SSO institucional | Alto | Alto |

---

## Decisões em aberto

Registrar aqui quando o time decidir:

1. **Hospedagem final do frontend:** Render Static Site vs Hostinger vs domínio próprio  
2. **IA no MVP público:** liberar Lume na Home já na Fase 2 ou só após conteúdo maduro  
3. **Quem edita conteúdo:** só Triad Support ou professores convidados com login  
4. **Slug de ferramentas:** manter MAIÚSCULAS (`KAHOOT`) ou migrar para minúsculas consistentes  

---

## Referência rápida para quem vem do .NET

| Conceito .NET | Equivalente aqui |
|---------------|------------------|
| ASP.NET Core Web API | FastAPI em `backend/app` |
| Controllers | `backend/app/api/routers/` |
| DTOs | Pydantic em `backend/app/models/schemas.py` |
| `appsettings.json` + User Secrets | `backend/.env` |
| Entity Framework | Supabase client + SQL migrations |
| Blazor/Razor Pages | HTML + JS por página (`index.html`, etc.) |
| IIS/Kestrel | Uvicorn |
| Publicar site + API juntos | Dois deploys: Static Site + Web Service |

---

## Contato e documentação

- Backend detalhado: [HelpProf-backend.md](./HelpProf-backend.md)
- README do repositório: [../README.md](../README.md)

Atualize este arquivo quando uma fase for concluída ou quando prioridades mudarem.
