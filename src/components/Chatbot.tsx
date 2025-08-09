"use client";

import * as React from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { runChatbot } from '@/ai/flows/chatbot-flow';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

interface ChatbotProps {
  onClose: () => void;
}

export default function Chatbot({ onClose }: ChatbotProps) {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: 'initial',
      text: 'Halo! Saya asisten virtual GadaiAlert. Ada yang bisa saya bantu seputar transaksi Anda?',
      sender: 'bot',
    },
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
        // A bit of a hack to get the viewport element from the ScrollArea component
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: [{text: m.text}]
      }));

      const botResponseText = await runChatbot({
        history,
        question: input,
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.',
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Chatbot error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <Card className="w-80 h-[28rem] shadow-2xl flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between bg-primary text-primary-foreground p-3">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6" />
            <CardTitle className="text-lg font-headline">GadaiAlert Assistant</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary/80" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="p-4 space-y-4">
                    {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                        'flex gap-2 items-start',
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                        )}
                    >
                        {message.sender === 'bot' && (
                        <Avatar className="w-8 h-8">
                            <AvatarFallback className='bg-primary text-primary-foreground'>
                                <Bot className="w-5 h-5"/>
                            </AvatarFallback>
                        </Avatar>
                        )}
                        <div
                        className={cn(
                            'rounded-lg px-3 py-2 max-w-[80%] text-sm',
                            message.sender === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                        >
                        {message.text}
                        </div>
                         {message.sender === 'user' && (
                        <Avatar className="w-8 h-8">
                             <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        )}
                    </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-2 items-start justify-start">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback className='bg-primary text-primary-foreground'>
                                    <Bot className="w-5 h-5"/>
                                </AvatarFallback>
                            </Avatar>
                             <div className="rounded-lg px-3 py-2 bg-muted">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </CardContent>
        <CardFooter className="p-2 border-t">
          <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik pesan Anda..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
