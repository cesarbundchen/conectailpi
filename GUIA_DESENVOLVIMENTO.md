# Guia de desenvolvimento — CareILPI SaaS v1.5

Como mexer no sistema sem quebrar o que já funciona.

---

## 1. Rodar na sua máquina (15 minutos, uma vez só)

Precisa ter **Node.js 18 ou superior** instalado ([nodejs.org](https://nodejs.org)).

```bash
# 1. Descompacte o ZIP e entre na pasta
cd careILPI_saas

# 2. Instale as dependências (demora ~2 min na primeira vez)
npm install

# 3. Crie o arquivo de configuração
cp .env.local.example .env.local
# Abra .env.local e preencha com as chaves do Supabase

# 4. Rode
npm run dev
```

Abra `http://localhost:3000`. Toda alteração que você salvar aparece na hora no navegador.

**Sem as chaves do Supabase** o sistema sobe mas não conecta ao banco — dá para ver as telas, não para gravar. As chaves ficam em Supabase → Settings → API.

---

## 2. Onde fica cada coisa

```
careILPI_saas/
├── src/
│   ├── app/
│   │   ├── (protected)/          ← TELAS (só entra quem está logado)
│   │   │   ├── residentes/page.tsx
│   │   │   ├── financeiro/page.tsx
│   │   │   └── ...               ← uma pasta = uma tela
│   │   ├── api/                  ← REGRAS DE NEGÓCIO (servidor)
│   │   │   ├── residentes/route.ts
│   │   │   └── ...               ← uma pasta = uma rota de API
│   │   ├── portal/[token]/       ← portal da família (público)
│   │   └── globals.css           ← TODO o visual do sistema
│   ├── lib/
│   │   ├── modulos.ts            ← ⭐ módulos e permissões (fonte única)
│   │   ├── permissoes.ts         ← checagem de acesso no servidor
│   │   ├── escalas.ts            ← Katz, Braden, Morse (fonte única)
│   │   ├── api.ts                ← requireUser: quem está logado
│   │   └── db.ts                 ← funções de banco reaproveitadas
│   └── components/               ← peças reusadas (Modal, Toast, Sidebar)
├── supabase/migrations/          ← ⭐ ESTRUTURA DO BANCO (6 arquivos, rodar em ordem)
└── tests/                        ← rede de segurança (46 testes)
```

**As duas pastas que mais importam:** `src/lib/` (as regras) e `supabase/migrations/` (o banco).

---

## 3. Receitas — como fazer as alterações mais comuns

### Mudar um texto, cor ou rótulo
Abra a tela em `src/app/(protected)/[nome]/page.tsx`, procure o texto, altere, salve. Cores ficam todas no topo de `src/app/globals.css` (as variáveis `--azul`, `--verde` etc.).

### Adicionar um campo novo numa tela
Três lugares, sempre nesta ordem:
1. **Banco** — novo arquivo em `supabase/migrations/007_seu_nome.sql` com `ALTER TABLE ... ADD COLUMN ...`
2. **Tipo** — `src/types/database.ts`, adicione o campo na interface
3. **Tela** — o formulário em `src/app/(protected)/.../page.tsx`

Se pular o passo 2, o build reclama — é proposital, evita esquecimento.

### Adicionar um módulo inteiro (ex.: Estoque/Farmácia)
1. Declare em `src/lib/modulos.ts` (um objeto no array `MODULOS`)
2. Crie as tabelas em `supabase/migrations/007_estoque.sql` — **com `ENABLE ROW LEVEL SECURITY`**
3. Crie a API em `src/app/api/estoque/route.ts` (copie outra como base, use `exigir(ctx, 'estoque', 'incluir')`)
4. Crie a tela em `src/app/(protected)/estoque/page.tsx`
5. Adicione o link em `src/components/layout/Sidebar.tsx`
6. Rode `npm test` — os testes vão cobrar RLS e a inclusão na exportação LGPD automaticamente

### Mudar quem pode fazer o quê
**Não mexa no código.** Entre no sistema como administrador → **Perfis de acesso** → configure pela tela. Só altere `modulos.ts` se for criar um módulo ou uma ação nova.

### Mudar a janela de autocorreção (24h) ou a janela de reversão (7 dias)
`src/lib/permissoes.ts`, constantes `JANELA_AUTOCORRECAO_H` e `DIAS_JANELA_REVERSAO`.

---

## 4. A rede de segurança — use SEMPRE antes de publicar

```bash
npm test          # 46 testes, ~2 segundos
npm run build     # compila como em produção, ~40 segundos
```

**Se os dois passarem, pode publicar.** Se algum falhar, a mensagem diz exatamente o quê e onde.

Os testes existem porque já pegaram defeitos reais. Eles bloqueiam, por construção:
- tabela nova sem RLS (vazamento entre instituições)
- tabela nova fora do backup LGPD
- escala clínica definida em dois lugares (risco de divergir)
- tela mostrando botão que a API nega
- perfil com permissão de escrever sem permissão de ver

**Nunca desative um teste para "passar".** Se ele falhou, ou o código está errado, ou a regra mudou de verdade — e nesse caso o teste é que deve ser reescrito, conscientemente.

---

## 5. Publicar as alterações

Se já está na Vercel ligada ao GitHub:

```bash
git add .
git commit -m "descrição do que mudou"
git push
```

A Vercel publica sozinha em ~2 minutos. **Se você criou migração nova**, rode o SQL no Supabase (SQL Editor → cole → Run) **antes** do push, senão o site quebra por falta da coluna.

---

## 6. Regras da casa (o que não fazer)

| Não faça | Por quê |
|---|---|
| Apagar linha do banco com `DELETE` | O sistema nunca apaga — usa `arquivado = true`. Auditoria e LGPD dependem disso. |
| Confiar em validação só na tela | A tela esconde por cortesia; quem nega é a API (`permissoes.ts`) e o banco (RLS). Sempre as três camadas. |
| Duplicar regra de negócio | Se aparecer em dois lugares, vira fonte única em `src/lib/`. Foi assim com as escalas clínicas. |
| Editar migração já executada | Crie uma nova (`007_`, `008_`...). Editar quebra quem já rodou a antiga. |
| Commitar `.env.local` | Contém as chaves. Já está no `.gitignore` — mantenha. |

---

## 7. Quando pedir ajuda

- **Erro no `npm run build`** → copie a mensagem inteira; ela aponta arquivo e linha
- **Tela em branco** → abra o console do navegador (F12), o erro está lá
- **"row-level security policy" no Supabase** → falta política RLS para a operação
- **Funciona local mas não na Vercel** → quase sempre variável de ambiente faltando no painel da Vercel
