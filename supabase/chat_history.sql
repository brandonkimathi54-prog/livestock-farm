-- Chat History Table for Smart Farmer Advisor
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp DESC);

-- RLS Policies
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat history
CREATE POLICY "Users can view own chat history" ON chat_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own messages
CREATE POLICY "Users can insert own messages" ON chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own messages
CREATE POLICY "Users can update own messages" ON chat_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own messages
CREATE POLICY "Users can delete own messages" ON chat_history
  FOR DELETE USING (auth.uid() = user_id);
