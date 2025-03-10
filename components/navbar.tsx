import Link from "next/link"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"

export function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              oarthur.dev
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/planos"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              Planos
            </Link>
            <Link
              href="/contato"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              Contato
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">
                <User className="h-5 w-5 mr-2" />
                Entrar
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/register">Criar Conta</Link>
            </Button>
          </nav>
        </div>
      </div>
    </nav>
  )
}