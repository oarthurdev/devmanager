import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Gift } from 'lucide-react'

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY

interface GiphyPickerProps {
  onSelect: (gif: any) => void
}

export default function GiphyPicker({ onSelect }: GiphyPickerProps) {
  const [search, setSearch] = useState('')
  const [gifs, setGifs] = useState([])
  const [loading, setLoading] = useState(false)

  const searchGifs = async (query: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=20`
      )
      const data = await response.json()
      setGifs(data.data)
    } catch (error) {
      console.error('Error searching GIFs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Gift className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Buscar GIFs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (e.target.value) {
                searchGifs(e.target.value)
              }
            }}
          />
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <span className="animate-spin">Loading...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {gifs.map((gif: any) => (
                  <button
                    key={gif.id}
                    className="rounded overflow-hidden hover:opacity-80 transition-opacity"
                    onClick={() => onSelect(gif)}
                  >
                    <img
                      src={gif.images.fixed_height_small.url}
                      alt={gif.title}
                      className="w-full h-auto"
                    />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}