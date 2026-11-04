// FONTE ÚNICA das escalas de avaliação — usada pela API (pontuação/validação)
// e pela tela (formulário). Alterar aqui reflete nos dois lados sem drift.
export type ItemEscala = { id: string; rotulo: string; opcoes: { rotulo: string; pontos: number }[] }
export type DefEscala = { nome: string; itens: ItemEscala[]; classificar: (p: number) => string }

export const ESCALAS: Record<string, DefEscala> = {
  Katz: {
    nome: 'Katz — Independência nas Atividades de Vida Diária',
    itens: ['Banho', 'Vestir-se', 'Higiene pessoal', 'Transferência', 'Continência', 'Alimentação'].map(r => ({
      id: r.toLowerCase().replace(/[^a-z]/g, ''), rotulo: r,
      opcoes: [{ rotulo: 'Independente', pontos: 1 }, { rotulo: 'Dependente', pontos: 0 }],
    })),
    classificar: p => p === 6 ? 'Independente' : p >= 3 ? 'Dependência parcial' : 'Dependência importante',
  },
  Braden: {
    nome: 'Braden — Risco de lesão por pressão',
    itens: [
      { id: 'percepcao', rotulo: 'Percepção sensorial', ops: ['1 Totalmente limitada', '2 Muito limitada', '3 Levemente limitada', '4 Nenhuma limitação'] },
      { id: 'umidade', rotulo: 'Umidade da pele', ops: ['1 Constantemente úmida', '2 Muito úmida', '3 Ocasionalmente úmida', '4 Raramente úmida'] },
      { id: 'atividade', rotulo: 'Atividade', ops: ['1 Acamada', '2 Restrita à cadeira', '3 Anda ocasionalmente', '4 Anda frequentemente'] },
      { id: 'mobilidade', rotulo: 'Mobilidade', ops: ['1 Totalmente imóvel', '2 Muito limitada', '3 Levemente limitada', '4 Sem limitações'] },
      { id: 'nutricao', rotulo: 'Nutrição', ops: ['1 Muito pobre', '2 Provavelmente inadequada', '3 Adequada', '4 Excelente'] },
      { id: 'friccao', rotulo: 'Fricção e cisalhamento', ops: ['1 Problema', '2 Problema potencial', '3 Sem problema aparente'] },
    ].map(i => ({ id: i.id, rotulo: i.rotulo, opcoes: i.ops.map((o, k) => ({ rotulo: o, pontos: k + 1 })) })),
    classificar: p => p <= 9 ? 'Risco muito alto' : p <= 12 ? 'Risco alto' : p <= 14 ? 'Risco moderado' : p <= 18 ? 'Risco baixo' : 'Sem risco',
  },
  Morse: {
    nome: 'Morse — Risco de quedas',
    itens: [
      { id: 'quedas', rotulo: 'Histórico de quedas (3 meses)', ops: [['Não', 0], ['Sim', 25]] },
      { id: 'diagnostico', rotulo: 'Diagnóstico secundário', ops: [['Não', 0], ['Sim', 15]] },
      { id: 'deambulacao', rotulo: 'Auxílio na deambulação', ops: [['Nenhum/acamada', 0], ['Muleta/bengala/andador', 15], ['Apoia-se no mobiliário', 30]] },
      { id: 'ev', rotulo: 'Terapia endovenosa', ops: [['Não', 0], ['Sim', 20]] },
      { id: 'marcha', rotulo: 'Marcha', ops: [['Normal/acamada', 0], ['Fraca', 10], ['Comprometida', 20]] },
      { id: 'mental', rotulo: 'Estado mental', ops: [['Orientada', 0], ['Superestima capacidade', 15]] },
    ].map(i => ({ id: i.id, rotulo: i.rotulo, opcoes: (i.ops as [string, number][]).map(([r, p]) => ({ rotulo: r, pontos: p })) })),
    classificar: p => p >= 45 ? 'Risco alto' : p >= 25 ? 'Risco moderado' : 'Risco baixo',
  },
}
