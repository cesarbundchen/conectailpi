// Cadastro de nova ILPI — rota PÚBLICA protegida pelo INVITE_SECRET
// Usa service role para criar ILPI + usuário + perfil atomicamente
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase'
import { todasPermissoes } from '@/lib/modulos'

// Rate limit simples em memória: 5 tentativas por IP a cada 15 min.
// Suficiente para frear força bruta do convite no free tier (1 instância).
const tentativas = new Map<string, { n: number; ate: number }>()
function limitado(ip: string): boolean {
  const agora = Date.now()
  const t = tentativas.get(ip)
  if (!t || agora > t.ate) { tentativas.set(ip, { n: 1, ate: agora + 15 * 60_000 }); return false }
  t.n++
  return t.n > 5
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconhecido'
  if (limitado(ip)) {
    return NextResponse.json({ ok: false, erro: 'Muitas tentativas. Aguarde 15 minutos.' }, { status: 429 })
  }
  try {
    const { convite, ilpi_nome, cnpj, telefone, admin_nome, email, senha } = await req.json()

    // 1. Validar convite (comparação simples; secret nunca vai ao navegador)
    if (!process.env.INVITE_SECRET || convite !== process.env.INVITE_SECRET) {
      return NextResponse.json({ ok: false, erro: 'Código de convite inválido.' }, { status: 403 })
    }
    if (!ilpi_nome || !admin_nome || !email || !senha || senha.length < 8) {
      return NextResponse.json({ ok: false, erro: 'Dados incompletos.' }, { status: 400 })
    }

    const admin = createAdminSupabase()

    // 2. Criar a ILPI
    const { data: ilpi, error: e1 } = await admin.from('ilpis')
      .insert({ nome: ilpi_nome, cnpj: cnpj || null, telefone: telefone || null, email, plano: 'gratuito' })
      .select().single()
    if (e1) throw e1

    // 3. Criar o usuário no Auth (e-mail já confirmado)
    const { data: user, error: e2 } = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true,
    })
    if (e2) {
      await admin.from('ilpis').delete().eq('id', ilpi.id) // rollback
      const msg = e2.message?.includes('already') ? 'Este e-mail já está cadastrado.' : e2.message
      return NextResponse.json({ ok: false, erro: msg }, { status: 400 })
    }

    // 4. Criar o perfil de acesso "Administrador da instituição" (todas as permissões)
    //    Sem ele, o admin entra mas não enxerga nenhum módulo (RBAC v1.5).
    const { data: perfilAcesso, error: e4 } = await admin.from('perfis_acesso')
      .insert({
        ilpi_id: ilpi.id, nome: 'Administrador da instituição',
        descricao: 'Perfil completo do administrador, criado no cadastro da instituição',
        formacoes: 'Direção, gestão', permissoes: todasPermissoes(), protegido: true,
      })
      .select('id').single()
    if (e4 || !perfilAcesso) {
      await admin.auth.admin.deleteUser(user.user.id) // rollback
      await admin.from('ilpis').delete().eq('id', ilpi.id)
      throw e4 ?? new Error('Não foi possível criar o perfil de acesso do administrador.')
    }

    // 5. Criar o perfil do admin vinculado, já como Operador de Dados (LGPD)
    const { error: e3 } = await admin.from('perfis')
      .insert({
        id: user.user.id, ilpi_id: ilpi.id, nome: admin_nome, papel: 'admin',
        perfil_acesso_id: perfilAcesso.id, operador_dados: true,
      })
    if (e3) {
      await admin.auth.admin.deleteUser(user.user.id) // rollback
      await admin.from('ilpis').delete().eq('id', ilpi.id)
      throw e3
    }

    // 6. Auditoria
    await admin.from('historico').insert({
      ilpi_id: ilpi.id, modulo: 'Sistema', acao: 'Cadastro da ILPI',
      descricao: `ILPI "${ilpi_nome}" criada — admin: ${admin_nome}`, usuario_id: user.user.id,
    })

    return NextResponse.json({ ok: true, dados: { ilpi_id: ilpi.id } })
  } catch (e) {
    // Erros do Supabase são objetos { message }, não instâncias de Error
    console.error('Erro no cadastro de ILPI:', e)
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Erro interno'
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 })
  }
}
