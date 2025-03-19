import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { initializeChat, sendMessage, subscribeToMessages } from '@/lib/chat/socket'
import { format } from 'date-fns'
import { Send, Paperclip, Smile, Image, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { marked } from 'marked'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Message {
  id: string
  content: string
  type: string
  metadata: any
  created_at: string
  profiles: {
    full_name: string
  }
}

interface ChatWindowProps {
  projectId: string
  roomId: string
}

export function ChatWindow({ projectId, roomId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          type,
          metadata,
          created_at,
          profiles (
            full_name
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(data)
        scrollToBottom()
      }
      setIsLoading(false)
    }

    const initialize = async () => {
      const cleanup = await initializeChat(roomId)
      const unsubscribe = subscribeToMessages((message) => {
        if (message.room_id === roomId) {
          setMessages(prev => [...prev, message])
          scrollToBottom()
        }
      })

      fetchMessages()

      return () => {
        cleanup?.()
        unsubscribe()
      }
    }

    initialize()
  }, [roomId, supabase])

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return

    const newMessageObject: Message = {
      id: Date.now().toString(),
      content: newMessage,
      type: 'text',
      metadata: {},
      created_at: new Date().toISOString(),
      profiles: {
        full_name: 'Você'
      }
    }
    setMessages(prev => [...prev, newMessageObject]);

    scrollToBottom();

    try {
      await sendMessage(roomId, newMessage)
      setNewMessage('')
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

    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: marked(message.content) }}
      />
    )
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
                    <span className="font-medium">
                      {message.profiles.full_name}
                    </span>
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
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
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