import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { initializeChat, sendMessage, subscribeToMessages } from '@/lib/chat/socket'
import { format } from 'date-fns'
import { Send, Paperclip, Smile, Image, FileText, User, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { marked } from 'marked'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Linkify from 'linkify-react'
import GiphyPicker from '@/components/chat/giphy-picker'
import { initializePresence } from '@/lib/presence'

interface Message {
  userName: any
  id: string
  content: string
  type: string
  metadata: any
  created_at: string
  user_id: string
  profiles: {
    full_name: string
  }[]
  role?: {
    name: string
  }
  is_client?: boolean
}

interface ChatWindowProps {
  projectId: string
  roomId: string
}

export function ChatWindow({ projectId, roomId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const supabase = createClient()

  const channel = supabase.channel(`typing:${roomId}`)

  useEffect(() => {
    const initialize = async () => {
      const cleanup = await initializePresence()
      return () => cleanup()
    }
    initialize()
  }, [])
  
  useEffect(() => {
    const initializeChannel = async () => {
      // Primeiro, subscreve o canal
      await channel.subscribe()
  
      // Depois, faz o track do estado inicial da presença (se já estiver digitando)
      await channel.track({ isTyping: false })
  
      // Agora, você pode adicionar os listeners para os eventos de presença
      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState()
          const typing = new Set(
            Object.values(newState)
              .flat()
              .filter((p: any) => p.isTyping)
              .map((p: any) => p.username)
          )
          setTypingUsers(typing)
        })
    }
  
    initializeChannel()
  
    // Cleanup: Desinscreve do canal quando o componente for desmontado
    return () => {
      channel.unsubscribe()
    }
  }, [roomId, supabase])

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }

    fetchCurrentUser()
  }, [supabase])

  const fetchMessages = async () => {
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single()
  
      const { data } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          type,
          metadata,
          created_at,
          user_id,
          profiles!chat_messages_user_id_fkey1 (
            full_name
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
  
      if (data) {
        const messagesWithRoles = await Promise.all(data.map(async (message) => {
          if (project && message.user_id === project.user_id) {
            return { 
              ...message, 
              is_client: true, 
              userName: message.profiles[0]?.full_name || null 
            }
          }
  
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('roles(name)')
            .eq('user_id', message.user_id)
            .eq('status', 'active')
            .maybeSingle()
  
          const role = teamMember?.roles?.[0] ?? null
          return { 
            ...message, 
            role, 
            userName: message.profiles[0]?.full_name || null 
          }
        }))
  
        setMessages(messagesWithRoles)
        scrollToBottom()
      }
  
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setIsLoading(false)
    }
  }

  const initialize = async () => {
    try {
      const cleanup = await initializeChat(roomId)
  
      const unsubscribe = subscribeToMessages(async (message) => {
        if (message.room_id === roomId) {
          const { data: fullMessage } = await supabase
            .from('chat_messages')
            .select(`
              id,
              content,
              type,
              metadata,
              created_at,
              user_id,
              profiles!chat_messages_user_id_fkey1 (
                full_name
              )
            `)
            .eq('id', message.id)
            .single()
  
          if (fullMessage) {
            const { data: teamMember } = await supabase
              .from('team_members')
              .select('roles(name)')
              .eq('user_id', fullMessage.user_id)
              .eq('status', 'active')
              .maybeSingle()
  
            const { data: project } = await supabase
              .from('projects')
              .select('user_id')
              .eq('id', projectId)
              .single()
  
            const messageWithRole = {
              ...fullMessage,
              role: teamMember?.roles?.[0] ?? null,
              is_client: project?.user_id === fullMessage.user_id,
              userName: fullMessage.profiles[0].full_name
            } as unknown as Message
  
            setMessages(prev => [...prev, messageWithRole])
            scrollToBottom()
          }
        }
      })

      fetchMessages()
  
      return () => {
        cleanup?.()
        unsubscribe()
      }
    } catch (error) {
      console.error('Error initializing chat:', error)
    }
  }
  
  useEffect(() => {
    initialize()
  }, [roomId, projectId, supabase])
  
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const handleTyping = async () => {
    if (!isTyping) {
      setIsTyping(true)
      const channel = supabase.channel(`typing:${roomId}`)
      await channel.track({ isTyping: true })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false)
      const channel = supabase.channel(`typing:${roomId}`)
      await channel.track({ isTyping: false })
    }, 2000)
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return

    const newMessageData: Message = {
      id: `${Date.now()}`,
      content: newMessage,
      type: 'text',
      metadata: {},
      created_at: new Date().toISOString(),
      user_id: currentUserId || '',
      userName: "Você",
      profiles: [{ full_name: "Você" }],
    }
  
    setMessages(prev => [...prev, newMessageData])
    scrollToBottom()

    try {
      await sendMessage(roomId, newMessage)
      setNewMessage('')
      setIsTyping(false)
      const channel = supabase.channel(`typing:${roomId}`)
      await channel.track({ isTyping: false })
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native)
  }

  const handleGifSelect = async (gif: any) => {
    try {
      await sendMessage(roomId, '', 'gif', {
        url: gif.images.original.url,
        title: gif.title
      })
    } catch (error) {
      console.error('Error sending GIF:', error)
    }
  }

  const handleFileUpload = async (files: FileList) => {
    const file = files[0]
    if (!file) return

    try {
      const filePath = `${projectId}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(filePath, 3600)

      if (urlData) {
        const metadata = {
          type: file.type,
          name: file.name,
          size: file.size,
          url: urlData.signedUrl
        }

        await sendMessage(roomId, `Arquivo enviado: ${file.name}`, 'file', metadata)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const renderMessage = (message: Message) => {
    if (message.type === 'file') {
      const { type, name, url } = message.metadata
      if (type.startsWith('image/')) {
        return <img src={url} alt={name} className="max-w-sm rounded-lg" />
      }
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <FileText className="w-4 h-4" />
          {name}
        </a>
      )
    }

    if (message.type === 'gif') {
      return (
        <img
          src={message.metadata.url}
          alt={message.metadata.title}
          className="max-w-sm rounded-lg"
        />
      )
    }

    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <Linkify options={{ target: '_blank' }}>
          <div dangerouslySetInnerHTML={{ __html: marked(message.content) }} />
        </Linkify>
      </div>
    )
  }

  const renderUserBadge = (message: Message) => {
    if (message.is_client) {
      return (
        <Badge variant="outline" className="ml-2 flex items-center gap-1">
          <User className="w-3 h-3" />
          Cliente
        </Badge>
      )
    }

    if (message.role?.name) {
      return (
        <Badge variant="outline" className="ml-2 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          {message.role.name}
        </Badge>
      )
    }

    return null
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-primary/20 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-primary/20 rounded"></div>
              <div className="h-4 bg-primary/20 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="mb-4"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const userName = message.user_id === currentUserId ? "Você" : message.profiles?.full_name
                      return (
                        <span className="font-medium">
                          {userName}
                        </span>
                      )
                    })()}
                    {renderUserBadge(message)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), 'HH:mm')}
                    </span>
                  </div>
                  {renderMessage(message)}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {typingUsers.size > 0 && (
          <div className="text-sm text-muted-foreground italic">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'está' : 'estão'} digitando...
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem... (Markdown suportado)"
              className="min-h-[80px]"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <Image className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="light"
                  />
                </PopoverContent>
              </Popover>
              <GiphyPicker onSelect={handleGifSelect} />
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            size="icon"
            className="h-[80px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}