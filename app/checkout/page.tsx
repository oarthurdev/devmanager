"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Code2, Smartphone, Bot, Database, Plus } from "lucide-react"

const productIcons = {
  site: Code2,
  app: Smartphone,
  bot: Bot,
  api: Database,
  outros: Plus,
}

const productCustomizations = {
  site: {
    template: ["Moderno", "Minimalista", "Corporativo", "E-commerce", "Landing Page"],
    features: ["Blog", "Newsletter", "Chat ao Vivo", "Área de Membros", "Integração com Redes Sociais"]
  },
  app: {
    platform: ["iOS", "Android", "iOS + Android"],
    features: ["Login Social", "Notificações Push", "Modo Offline", "Geolocalização", "Pagamentos In-App"]
  },
  bot: {
    platform: ["WhatsApp", "Telegram", "Discord", "Messenger", "Personalizado"],
    features: ["IA Conversacional", "Respostas Automáticas", "Integração com CRM", "Análise de Sentimentos", "Relatórios"]
  },
  api: {
    type: ["REST", "GraphQL", "WebSocket", "Híbrida"],
    features: ["Autenticação JWT", "Cache", "Rate Limiting", "Documentação Swagger", "Logs Detalhados"]
  },
  outros: {
    type: ["Automação", "Scraping", "Análise de Dados", "Integração", "Outro"],
    features: ["Personalizado", "Consultoria", "Suporte Premium", "Treinamento", "Documentação"]
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan")
  const products = searchParams.get("products")?.split(",") || []
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    requirements: "",
    customizations: {} as Record<string, { template?: string; platform?: string; type?: string; features: string[] }>
  })

  const handleCustomizationChange = (
    productId: string,
    field: "template" | "platform" | "type" | "features",
    value: string | string[]
  ) => {
    setFormData(prev => ({
      ...prev,
      customizations: {
        ...prev.customizations,
        [productId]: {
          ...prev.customizations[productId],
          [field]: value
        }
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Store form data in localStorage for the payment page
      localStorage.setItem('checkoutFormData', JSON.stringify(formData))
      
      // Redirect to payment page
      router.push(`/pagamento?plan=${plan}&products=${products.join(',')}`)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-4">Personalização e Checkout</h1>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Configure seus produtos e forneça as informações necessárias para iniciarmos seu projeto.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Customization */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold mb-6">Personalização dos Produtos</h2>
            {products.map((productId) => {
              const Icon = productIcons[productId as keyof typeof productIcons]
              const options = productCustomizations[productId as keyof typeof productCustomizations]

              return (
                <Card key={productId} className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Icon className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-semibold capitalize">{productId}</h3>
                  </div>

                  {/* Template/Platform/Type Selection */}
                  {("template" in options || "platform" in options || "type" in options) && (
                    <div className="mb-6">
                      <Label className="mb-3 block">
                        {"template" in options
                          ? "Template"
                          : "platform" in options
                          ? "Plataforma"
                          : "Tipo"}
                      </Label>
                      <RadioGroup
                        onValueChange={(value) =>
                          handleCustomizationChange(
                            productId,
                            "template" in options
                              ? "template"
                              : "platform" in options
                              ? "platform"
                              : "type",
                            value
                          )
                        }
                        className="grid grid-cols-2 gap-2"
                      >
                        {("template" in options
                          ? options.template
                          : "platform" in options
                          ? options.platform
                          : options.type
                        ).map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`${productId}-${option}`} />
                            <Label htmlFor={`${productId}-${option}`}>{option}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}


                  {/* Features Selection */}
                  <div>
                    <Label className="mb-3 block">Funcionalidades Desejadas</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {options.features.map((feature) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`${productId}-${feature}`}
                            onChange={(e) => {
                              const currentFeatures = formData.customizations[productId]?.features || []
                              if (e.target.checked) {
                                handleCustomizationChange(productId, "features", [...currentFeatures, feature])
                              } else {
                                handleCustomizationChange(
                                  productId,
                                  "features",
                                  currentFeatures.filter(f => f !== feature)
                                )
                              }
                            }}
                          />
                          <Label htmlFor={`${productId}-${feature}`}>{feature}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Customer Information and Summary */}
          <div>
            <Card className="p-6 sticky top-6">
              <h2 className="text-2xl font-semibold mb-6">Informações do Cliente</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="requirements">Requisitos Adicionais</Label>
                  <Textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                    className="h-32"
                  />
                </div>

                <div className="pt-6 border-t">
                  <div className="flex justify-between mb-4">
                    <span className="font-semibold">Plano Selecionado</span>
                    <span>{plan}</span>
                  </div>
                  <div className="flex justify-between mb-6">
                    <span className="font-semibold">Produtos</span>
                    <span>{products.length} produto(s)</span>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Processando..." : "Prosseguir para Pagamento"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}