'use client';

import { useState, useRef, useEffect } from 'react';
import { Sprout, Search, Send, User, Bot, Leaf, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const thinkingMessages = [
  "Analyzing soil conditions...",
  "Checking weather patterns in Kirinyaga...",
  "Reviewing livestock health data...",
  "Consulting crop calendars...",
  "Calculating feed requirements...",
  "Researching market prices...",
  "Cross-referencing disease symptoms...",
  "Optimizing irrigation schedules..."
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        const { data: history } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(20);

        if (history) {
          const formattedMessages: Message[] = history.map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'bot',
            content: msg.content,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isThinking) {
      let index = 0;
      setThinkingMessage(thinkingMessages[0]);
      
      thinkingIntervalRef.current = setInterval(() => {
        index = (index + 1) % thinkingMessages.length;
        setThinkingMessage(thinkingMessages[index]);
      }, 2000);
    } else {
      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
      }
      setThinkingMessage('');
    }

    return () => {
      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
      }
    };
  }, [isThinking]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      // Get last 5 messages for context
      const recentMessages = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input.trim(),
          context: recentMessages 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: data.text,
        timestamp: new Date()
      };

      // Save both user and bot messages to Supabase
      await Promise.all([
        supabase.from('chat_history').insert({
          user_id: userId,
          role: 'user',
          content: userMessage.content,
          timestamp: userMessage.timestamp.toISOString()
        }),
        supabase.from('chat_history').insert({
          user_id: userId,
          role: 'bot',
          content: botMessage.content,
          timestamp: botMessage.timestamp.toISOString()
        })
      ]);

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Still save user message even if API fails
      try {
        await supabase.from('chat_history').insert({
          user_id: userId,
          role: 'user',
          content: userMessage.content,
          timestamp: userMessage.timestamp.toISOString()
        });
      } catch (saveError) {
        console.error('Error saving user message:', saveError);
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Header */}
      <header className="p-4 bg-emerald-700 text-white flex items-center gap-3 shadow-md">
        <Sprout className="w-6 h-6" />
        <h1 className="font-bold text-lg">Smart Farmer Advisor</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs">Online</span>
        </div>
      </header>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-stone-50 to-stone-100">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <Leaf className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-stone-800 mb-2">Welcome to Smart Farmer Advisor</h2>
            <p className="text-stone-600 text-sm max-w-md mx-auto">
              Ask me anything about livestock management, crop cultivation, or farm business in Kenya. I'm here to help!
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm backdrop-blur-sm ${
              m.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-none shadow-emerald-200' 
                : 'bg-white/90 border border-stone-200 text-stone-800 rounded-tl-none shadow-stone-100'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {m.role === 'bot' ? (
                  <>
                    <Bot className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-600">AI Advisor</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 opacity-70" />
                    <span className="text-xs opacity-70">You</span>
                  </>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              <div className="text-xs opacity-60 mt-2">
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking State */}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white/90 border border-stone-200 p-4 rounded-2xl rounded-tl-none shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  <Leaf className="w-3 h-3 text-emerald-500 absolute -bottom-1 -right-1 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm text-stone-600 font-medium">Thinking...</p>
                  <p className="text-xs text-stone-500">{thinkingMessage}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Creative Input Bar */}
      <footer className="p-4 bg-white/80 backdrop-blur-lg border-t border-stone-200 shadow-lg">
        <div className="flex items-center gap-2 bg-stone-100 p-2 rounded-full border border-stone-300 focus-within:border-emerald-500 transition-all">
          <button 
            onClick={() => setSearchEnabled(!searchEnabled)}
            className={`p-2 rounded-full transition-all ${
              searchEnabled ? 'text-emerald-600 bg-emerald-50' : 'text-stone-500 hover:text-emerald-600'
            }`}
            title={searchEnabled ? "Search Grounding Enabled" : "Search Grounding Disabled"}
          >
            <Search className="w-5 h-5" />
          </button>
          <input 
            type="text"
            placeholder="Ask about your cow or crops..." 
            className="bg-transparent flex-1 outline-none text-sm px-2 text-stone-800 placeholder-stone-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isThinking}
          />
          <button 
            onClick={sendMessage}
            disabled={isThinking || !input.trim()}
            className="bg-emerald-600 p-2 rounded-full text-white shadow-lg transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isThinking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Search Status Indicator */}
        <div className="flex items-center justify-center mt-2">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <div className={`w-2 h-2 rounded-full ${searchEnabled ? 'bg-emerald-500' : 'bg-stone-400'}`}></div>
            <span>{searchEnabled ? 'Google Search Grounding Active' : 'Using Knowledge Base Only'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
