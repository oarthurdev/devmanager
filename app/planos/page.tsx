"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Code2, Smartphone, Bot, Database, Plus } from "lucide-react"
import Link from "next/link"

const plans = [
  {
    name: "Básico",
    price: "4.997",
    description: "Ideal para projetos pequenos e startups",
    features: [
      "1 produto à sua escolha",
      "Suporte básico",
      "Entrega em até 30 dias",
      "1 revisão gratuita",
    ]
  },
  {
    name: "Profissional",
    price: "9.997",
    description: "Perfeito para empresas em crescimento",
    features: [
      "2 produtos à sua escolha",
      "Suporte prioritário",
      "Entrega em até 45 dias",
      "3 revisões gratuitas",
      "SEO otimizado",
      "Análise de performance"
    ],
    popular: true
  },
  {
    name: "Enterprise",
    price: "19.997",
    description: "Para projetos complexos e empresas estabelecidas",
    features: [
      "3 produtos à sua escolha",
      "Suporte 24/7",
      "Entrega em até 60 dias",
      "Revisões ilimitadas",
      "SEO otimizado",
      "Análise de performance",
      "Consultoria especializada",
      "Manutenção mensal"
    ]
  }
]

const products = [
  {
    id: "site",
    icon: Code2,
    name: "Site",
    description: "Websites modernos e responsivos"
  },
  {
    id: "app",
    icon: Smartphone,
    name: "APP",
    description: "Aplicativos móveis nativos"
  },
  {
    id: "bot",
    icon: Bot,
    name: "Bot",
    description: "Automação e chatbots inteligentes"
  },
  {
    id: "api",
    icon: Database,
    name: "API",
    description: "APIs RESTful e GraphQL"
  },
  {
    id: "outros",
    icon: Plus,
    name: "Outros",
    description: "Soluções personalizadas"
  }
]

export default function PlanosPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  const handleProductSelect = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId))
    } else {
      const maxProducts = plans.find(p => p.name === selectedPlan)?.features[0].split(" ")[0]
      if (selectedProducts.length < parseInt(maxProducts || "0")) {
        setSelectedProducts([...selectedProducts, productId])
      }
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-4">Escolha seu Plano</h1>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Selecione o plano que melhor atende às suas necessidades e personalize com os produtos desejados.
        </p>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-6 relative ${
                selectedPlan === plan.name
                  ? "ring-2 ring-primary"
                  : "hover:shadow-lg"
              } transition-all`}
            >
              {plan.popular && (
                <Badge className="absolute top-4 right-4">Mais Popular</Badge>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline mb-4">
                <span className="text-3xl font-bold">R$ {plan.price}</span>
              </div>
              <p className="text-muted-foreground mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={selectedPlan === plan.name ? "secondary" : "default"}
                onClick={() => {
                  setSelectedPlan(plan.name)
                  setSelectedProducts([])
                }}
              >
                {selectedPlan === plan.name ? "Selecionado" : "Selecionar"}
              </Button>
            </Card>
          ))}
        </div>

        {/* Products Selection */}
        {selectedPlan && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              Escolha seus Produtos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className={`p-4 cursor-pointer ${
                    selectedProducts.includes(product.id)
                      ? "ring-2 ring-primary"
                      : "hover:bg-accent"
                  } transition-all`}
                  onClick={() => handleProductSelect(product.id)}
                >
                  <div className="flex items-center gap-3">
                    <product.icon className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button
                size="lg"
                disabled={selectedProducts.length === 0}
                asChild
              >
                <Link
                  href={{
                    pathname: "/checkout",
                    query: {
                      plan: selectedPlan,
                      products: selectedProducts.join(",")
                    }
                  }}
                >
                  Continuar para Personalização
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}