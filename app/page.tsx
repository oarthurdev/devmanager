import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Code2, Smartphone, Bot, Database, Plus } from "lucide-react"
import Link from "next/link"

const services = [
  {
    icon: Code2,
    name: "Site",
    description: "Websites modernos e responsivos"
  },
  {
    icon: Smartphone,
    name: "APP",
    description: "Aplicativos móveis nativos"
  },
  {
    icon: Bot,
    name: "Bot",
    description: "Automação e chatbots inteligentes"
  },
  {
    icon: Database,
    name: "API",
    description: "APIs RESTful e GraphQL"
  },
  {
    icon: Plus,
    name: "Outros",
    description: "Soluções personalizadas"
  }
]

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Transforme suas ideias em realidade digital
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Desenvolvimento profissional de software com foco em qualidade, 
          performance e experiência do usuário.
        </p>
        <Button asChild size="lg" className="mr-4">
          <Link href="/planos">Ver Planos</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/contato">Fale Conosco</Link>
        </Button>
      </section>

      {/* Services Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Nossos Serviços</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <Card key={service.name} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <service.icon className="w-8 h-8 text-primary" />
                <h3 className="text-xl font-semibold">{service.name}</h3>
              </div>
              <p className="text-muted-foreground">{service.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="bg-card rounded-lg p-8 md:p-12 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-muted-foreground mb-8">
            Escolha o plano ideal para seu projeto e comece a desenvolver hoje mesmo.
          </p>
          <Button asChild size="lg">
            <Link href="/planos">Explorar Planos</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}