import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pjbeldcdaugusbxpwegf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmVsZGNkYXVndXNieHB3ZWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTY4ODcsImV4cCI6MjA5MTgzMjg4N30.vjmyBAs67kAsbLNavUcV_9h9b-hoJeD-ZFRADNBhOc4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
