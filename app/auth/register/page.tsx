"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, User, Mail, Lock, Phone } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"

export default function RegisterPage() {
  const { signUp } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [accountType, setAccountType] = useState<"pf" | "pj">("pf")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    document: "", // CPF ou CNPJ
    companyName: "",
    acceptedTerms: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error("As senhas não coincidem")
      }

      await signUp(formData.email, formData.password, {
        account_type: accountType,
        full_name: formData.name,
        phone: formData.phone,
        document: formData.document,
        company_name: accountType === "pj" ? formData.companyName : undefined,
      })
    } catch (error) {
      console.error("Registration error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const Contract = () => (
    <div className="prose prose-sm max-w-none">
      <h2>Contrato de Prestação de Serviços de Desenvolvimento de Software</h2>
      
      <p>Por este instrumento particular, de um lado:</p>
      
      <p><strong>CONTRATADA:</strong> oarthur.dev, prestadora de serviços de desenvolvimento de software.</p>
      
      <p><strong>CONTRATANTE:</strong> {formData.name}, {accountType === "pf" ? "pessoa física" : "pessoa jurídica"} com {accountType === "pf" ? "CPF" : "CNPJ"} nº {formData.document}.</p>
      
      <h3>1. OBJETO</h3>
      <p>Prestação de serviços de desenvolvimento de software conforme especificações e funcionalidades escolhidas pelo CONTRATANTE no momento da contratação do plano.</p>
      
      <h3>2. PRAZO DE ENTREGA</h3>
      <p>2.1. Os prazos de entrega variam de acordo com o plano escolhido:
        - Plano Básico: 30 dias
        - Plano Profissional: 45 dias
        - Plano Enterprise: 60 dias</p>
      <p>2.2. Em caso de não entrega do projeto até 30 dias após o prazo estipulado, o CONTRATANTE terá direito ao reembolso integral do valor pago.</p>
      
      <h3>3. GARANTIAS</h3>
      <p>3.1. A CONTRATADA garante o funcionamento do software conforme especificações acordadas.
      3.2. O período de garantia é de 90 dias após a entrega.</p>
      
      <h3>4. CONFIDENCIALIDADE</h3>
      <p>As partes se comprometem a manter sigilo sobre todas as informações compartilhadas durante o desenvolvimento do projeto.</p>
      
      <h3>5. PROPRIEDADE INTELECTUAL</h3>
      <p>Após a conclusão do projeto e pagamento integral, o CONTRATANTE terá direito de uso perpétuo do software desenvolvido.</p>
      
      <h3>6. SUPORTE E MANUTENÇÃO</h3>
      <p>O suporte técnico será prestado conforme especificações do plano contratado.</p>
      
      <h3>7. REEMBOLSO</h3>
      <p>7.1. O CONTRATANTE terá direito ao reembolso integral nas seguintes situações:
        - Não entrega do projeto em até 30 dias após o prazo estipulado
        - Não conformidade com as especificações acordadas
        - Problemas técnicos não resolvidos durante o período de garantia</p>
      
      <h3>8. FORO</h3>
      <p>Fica eleito o foro da comarca do CONTRATANTE para dirimir quaisquer dúvidas oriundas deste contrato.</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary py-16">
      <div className="container max-w-2xl mx-auto px-4">
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Criar Conta</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Label>Tipo de Conta</Label>
              <RadioGroup
                value={accountType}
                onValueChange={(value: "pf" | "pj") => setAccountType(value)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pf" id="pf" />
                  <Label htmlFor="pf" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Pessoa Física
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pj" id="pj" />
                  <Label htmlFor="pj" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Pessoa Jurídica
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {accountType === "pf" ? "Nome Completo" : "Nome do Responsável"}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder={accountType === "pf" ? "Seu nome completo" : "Nome do responsável"}
                    className="pl-9"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              {accountType === "pj" && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Razão Social</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      placeholder="Nome da empresa"
                      className="pl-9"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-9"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="pl-9"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">
                  {accountType === "pf" ? "CPF" : "CNPJ"}
                </Label>
                <Input
                  id="document"
                  placeholder={accountType === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.acceptedTerms}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, acceptedTerms: checked as boolean })
                }
                required
              />
              <Label htmlFor="terms" className="text-sm">
                Li e aceito os{" "}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" className="p-0 h-auto font-normal">
                      termos de serviço
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Termos de Serviço</DialogTitle>
                    </DialogHeader>
                    <Contract />
                  </DialogContent>
                </Dialog>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Faça login
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </main>
  )
}