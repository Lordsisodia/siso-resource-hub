import React from 'react';
import { Bot, User, Code, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface ChatMessageProps {
  role: 'assistant' | 'user';
  content: string;
  assistantType?: string;
  isLoading?: boolean;
  steps?: {
    thinking?: string;
    searching?: string;
    response?: string;
  };
}

export const ChatMessage = ({ role, content, assistantType, isLoading, steps }: ChatMessageProps) => {
  const [copied, setCopied] = React.useState(false);
  
  const formatContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const [, ...codeLines] = part.split('\n');
        codeLines.pop();
        const code = codeLines.join('\n');
        
        const copyCode = () => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        };

        return (
          <div key={index} className="relative my-4 rounded-lg bg-black/50 p-4 font-mono text-sm shadow-lg">
            <div className="absolute right-2 top-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-siso-text hover:bg-siso-text/10 transition-colors"
                onClick={copyCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Code className="mb-2 h-4 w-4 text-siso-orange" />
            <pre className="mt-2 overflow-x-auto">{code}</pre>
          </div>
        );
      }
      
      return (
        <p key={index} className="whitespace-pre-wrap leading-relaxed">
          {part.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line.replace(
                /(https?:\/\/[^\s]+)/g,
                (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-siso-orange hover:text-siso-red underline transition-colors">${url}</a>`
              )}
              {i !== part.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    });
  };

  const renderSteps = () => {
    if (!steps) return null;
    
    return (
      <div className="space-y-2 mb-4 text-sm text-siso-text/80">
        {steps.thinking && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {steps.thinking}
          </motion.div>
        )}
        {steps.searching && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {steps.searching}
          </motion.div>
        )}
        {steps.response && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="text-siso-orange font-medium"
          >
            {steps.response}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex items-start gap-4 p-6 rounded-lg transition-colors",
        role === 'assistant' ? 'bg-siso-text/5 hover:bg-siso-text/8' : 'hover:bg-black/20'
      )}
    >
      <div className={cn(
        "shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
        role === 'assistant' 
          ? 'bg-gradient-to-br from-siso-red to-siso-orange animate-glow' 
          : 'bg-gradient-to-br from-siso-text/20 to-siso-text/30'
      )}>
        {role === 'assistant' ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-siso-text-bold">
            {role === 'assistant' ? assistantType : 'You'}
          </p>
          {role === 'assistant' && (
            <span className="text-xs text-siso-text-muted px-2 py-1 rounded-full bg-siso-text/10">
              AI Assistant
            </span>
          )}
        </div>
        <div className="text-siso-text prose prose-invert max-w-none">
          {isLoading ? (
            <div className="flex gap-2">
              <span className="w-2 h-2 bg-siso-orange/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-siso-orange/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-siso-orange/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <>
              {renderSteps()}
              {content && formatContent(content)}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};