"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface PaymentData {
  qr_code: string
  qr_code_base64: string
  payment_id: string
  expiration_date: string
  amount: number
  project_id: string
}

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')
  const products = searchParams.get('products')?.split(',') || []
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const paymentCreated = useRef(false)
  const projectCreated = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    const createPaymentAndProject = async () => {
      try {
        if (paymentCreated.current) return
        
        const formDataStr = localStorage.getItem('checkoutFormData')
        if (!formDataStr) return

        const formData = JSON.parse(formDataStr)
        const customizations = formData.customizations || {}
        
        paymentCreated.current = true

        if (!projectCreated.current) {
          const { data: authData, error: authError } = await supabase.auth.getSession();

          if (!authError) {
            const projectResponse = await fetch('/api/create-project', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authData.session?.access_token}`,
              },
              body: JSON.stringify({
                plan,
                products,
                formData,
                customizations
              }),
            });
        
            if (projectResponse.ok) {
              const projectData = await projectResponse.json();
              const projectId = projectData.project_id;
        
              projectCreated.current = true;
        
              const paymentResponse = await fetch('/api/create-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  plan,
                  products,
                  formData,
                  project_id: projectId,
                }),
              });
        
              if (!paymentResponse.ok) {
                throw new Error('Failed to create payment');
              }

              const data = await paymentResponse.json()
              setPaymentData(data)
            }
          }
        }
      } catch (error) {
        console.error('Error:', error)
        paymentCreated.current = false
      }
    }

    createPaymentAndProject()

    // Check payment status periodically
    const interval = setInterval(async () => {
      if (!paymentData?.project_id) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Check project status
        const { data: project } = await supabase
          .from('projects')
          .select('id, status')
          .eq('id', paymentData.project_id)
          .single()

        // If project exists and status is no longer pending, payment was processed
        if (project && project.status !== 'pending') {
          router.push(`/dashboard/projects/${project.id}`)
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [plan, products, router, paymentData?.project_id, supabase])

  useEffect(() => {
    if (!paymentData?.expiration_date) return

    const updateTimeLeft = () => {
      const now = new Date().getTime()
      const expirationTime = new Date(paymentData.expiration_date).getTime()
      const difference = expirationTime - now

      if (difference <= 0) {
        setTimeLeft('Expirado')
        return
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [paymentData?.expiration_date])

  const handleCopyCode = async () => {
    if (!paymentData?.qr_code) return
    
    try {
      await navigator.clipboard.writeText(paymentData.qr_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const qrCodeUrl = useMemo(() => {
    if (!paymentData?.qr_code_base64) return ''
    return `data:image/png;base64,${paymentData.qr_code_base64}`
  }, [paymentData?.qr_code_base64])

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <div className="animate-pulse text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-4">Pagamento via PIX</h1>
        <p className="text-muted-foreground text-center mb-8">
          Escaneie o QR Code ou copie o código PIX para realizar o pagamento
        </p>

        <Card className="p-8">
          <div className="flex flex-col items-center space-y-6">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg">
              <Image
                key={paymentData.payment_id}
                src={qrCodeUrl}
                alt="QR Code PIX"
                width={200}
                height={200}
                className="mx-auto"
                priority
              />
            </div>

            {/* Timer */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Tempo restante para pagamento</p>
              <p className="text-2xl font-bold">{timeLeft}</p>
            </div>

            {/* Amount */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Valor total</p>
              <p className="text-2xl font-bold">
                R$ {(paymentData.amount / 100).toFixed(2).replace('.', ',')}
              </p>
            </div>

            {/* Copy Code Button */}
            <div className="w-full">
              <p className="text-sm text-muted-foreground mb-2">Código PIX</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentData.qr_code}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-md bg-muted"
                />
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  className="min-w-[100px]"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="w-full space-y-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">Como pagar:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Abra o app do seu banco</li>
                <li>Escolha pagar via PIX</li>
                <li>Escaneie o QR Code ou cole o código PIX</li>
                <li>Confirme as informações e finalize o pagamento</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}