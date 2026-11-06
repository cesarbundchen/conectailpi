// Painel da marca nas telas de login e cadastro (some no celular)
import Icone from '@/components/ui/Icone'

export default function MarcaAcesso({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <aside className="acesso-marca">
      <img src="/logo-escuro.png" alt="ConectaILPI" className="acesso-logo" />
      <div>
        <p className="acesso-tit">{titulo}</p>
        <p className="acesso-sub">{subtitulo}</p>
      </div>
      <ul className="acesso-lista">
        <li><span><Icone nome="medicamentos" /></span>Cada dose registrada, com horário e responsável</li>
        <li><span><Icone nome="plantao" /></span>Passagem de plantão sem informação perdida</li>
        <li><span><Icone nome="familia" /></span>Família acompanhando pelo Portal</li>
        <li><span><Icone nome="cadeado" /></span>Acesso por função e dados protegidos</li>
      </ul>
    </aside>
  )
}
