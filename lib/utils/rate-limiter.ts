import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const WINDOW_SIZE = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100

export async function rateLimiter(req: NextRequest) {
  const supabase = createClient()
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const key = `rate-limit:${ip}`

  try {
    const { data, error } = await supabase
      .from('rate_limits')
      .select('requests, timestamp')
      .eq('ip', ip)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Rate limit error:', error)
      return false
    }

    if (!data) {
      await supabase
        .from('rate_limits')
        .insert({ ip, requests: 1, timestamp: now })
      return true
    }

    if (now - data.timestamp > WINDOW_SIZE) {
      await supabase
        .from('rate_limits')
        .update({ requests: 1, timestamp: now })
        .eq('ip', ip)
      return true
    }

    if (data.requests >= MAX_REQUESTS) {
      return false
    }

    await supabase
      .from('rate_limits')
      .update({ requests: data.requests + 1 })
      .eq('ip', ip)
    return true
  } catch (error) {
    console.error('Rate limit error:', error)
    return false
  }
}