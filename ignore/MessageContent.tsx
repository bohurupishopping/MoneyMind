import React, { useCallback, useEffect, useRef, useState } from 'react';
import { File, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { ExtendedMessage } from '@/types/conversation';
import { MessageActions } from './MessageActions';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useScrollToBottom } from '@/hooks/useScrollToBottom';

interface MessageContentProps {
  message: ExtendedMessage;
  index: number;
  copiedIndex: number | null;
  onCopy: (content: string, index: number) => void;
  isTyping?: boolean;
  messages?: ExtendedMessage[];
  isLoadingHistory?: boolean;
  isHistorical?: boolean;
}

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface ComponentProps {
  children?: React.ReactNode;
  [key: string]: any;
}

const isPrimarilyCode = (content: string): boolean => {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = content.match(codeBlockRegex);
  if (!codeBlocks) return false;

  const codeLength = codeBlocks.reduce((acc, block) => acc + block.length, 0);
  return codeLength > content.length * 0.3;
};

const getContentType = (content: string): 'code' | 'html' | 'long-text' | 'normal' => {
  const hasHtmlTags = /<[^>]+>[\s\S]*<\/[^>]+>/.test(content);
  const hasHtmlDeclaration = content.includes('<!DOCTYPE html>') || content.includes('<html');

  if (hasHtmlTags || hasHtmlDeclaration || content.includes('```html')) {
    return 'html';
  }

  if (isPrimarilyCode(content)) return 'code';
  if (content.split('\n').length > 10) return 'long-text';
  return 'normal';
};

export const MessageContent: React.FC<MessageContentProps> = React.memo(({
  message,
  index,
  copiedIndex,
  onCopy,
  isTyping = false,
  messages = [],
  isLoadingHistory = false,
  isHistorical = false
}) => {
  const messageRef = useRef<HTMLDivElement>(null);
  const { scrollToElement } = useScrollToBottom(messages, messageRef, isTyping, {
    threshold: 150,
    behavior: isTyping ? 'auto' : 'smooth'
  });

  const contentType = getContentType(message.content);

  // Scroll to new messages
  useEffect(() => {
    if (index === messages.length - 1) {
      const timer = setTimeout(() => {
        scrollToElement();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [index, messages.length, scrollToElement]);

  const hasAttachments = message.attachments && message.attachments.length > 0;
  const fileType = message.fileType;

  const handleCodeCopy = useCallback(async (codeContent: string) => {
    try {
      const cleanedCode = codeContent
        .replace(/```[\s\S]*?\n/, '')
        .replace(/```$/, '')
        .trim();

      await navigator.clipboard.writeText(cleanedCode);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy failed",
        description: "Please try selecting and copying manually",
        variant: "destructive",
      });
    }
  }, []);

  // Function to handle text selection copy
  const handleSelectionCopy = useCallback(async () => {
    const selectedText = window.getSelection()?.toString();
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
        toast({
          title: "Copied!",
          description: "Selected text copied to clipboard",
          duration: 2000,
        });
      } catch (error) {
        console.error('Failed to copy selection:', error);
        toast({
          title: "Copy failed",
          description: "Please try copying manually",
          variant: "destructive",
        });
      }
    }
  }, []);

  const markdownComponents: Components = {
    p: ({ children, ...props }: ComponentProps) => {
      const hasBlockElements = React.Children.toArray(children).some(child => {
        if (React.isValidElement(child)) {
          const type = (child.type as any)?.name?.toLowerCase?.() || child.type;
          return ['pre', 'code', 'div', 'blockquote'].includes(type as string);
        }
        return false;
      });

      if (hasBlockElements) {
        return <>{children}</>;
      }

      return <p className="mb-2 last:mb-0 leading-relaxed" {...props}>{children}</p>;
    },
    ul: ({ children, ...props }: ComponentProps) => (
      <ul className="mb-2 list-none pl-4" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: ComponentProps) => (
      <ol className="mb-2 list-decimal pl-6" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: ComponentProps) => (
      <li className="leading-relaxed" {...props}>
        {typeof children === 'string' ? children.replace(/^[-*]/, '•') : children}
      </li>
    ),
    h1: ({ children, ...props }: ComponentProps) => (
      <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0" {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: ComponentProps) => (
      <h2 className="text-lg font-semibold mb-2 mt-2" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: ComponentProps) => (
      <h3 className="text-base font-medium mb-1 mt-2" {...props}>{children}</h3>
    ),
    blockquote: ({ children }: ComponentProps) => (
      <blockquote className="border-l-2 pl-3 my-2 text-muted-foreground">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: ComponentProps) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1",
          "text-blue-600 dark:text-blue-400",
          "hover:text-blue-700 dark:hover:text-blue-300",
          "no-underline hover:underline"
        )}
      >
        {children}
        <ExternalLink className="h-3 w-3" />
      </a>
    ),
    code: ({ inline, className, children, ...props }: CodeProps) => {
      const match = /language-(\w+)/.exec(className || '');
      const [copied, setCopied] = useState(false);
      const { theme } = useTheme();

      const handleCopy = async () => {
        if (children) {
          const code = String(children).replace(/\n$/, '');
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      };

      if (inline) {
        return (
          <code className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-sm" {...props}>
            {children}
          </code>
        );
      }

      return (
        <div className="relative group my-4">
          <SyntaxHighlighter
            style={theme === 'dark' ? oneDark : oneLight}
            language={match?.[1] || 'text'}
            PreTag="div"
            className="!bg-neutral-100 dark:!bg-neutral-800/50 !rounded-xl !border !border-neutral-200 dark:!border-neutral-700"
            customStyle={{
              padding: '1rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
            showLineNumbers
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
          <button
            onClick={handleCopy}
            className={cn(
              "absolute top-3 right-3 p-2 rounded-lg",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "bg-neutral-200 dark:bg-neutral-700",
              "hover:bg-neutral-300 dark:hover:bg-neutral-600"
            )}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-neutral-500" />
            )}
          </button>
        </div>
      );
    },
    pre: ({ children, ...props }: ComponentProps) => (
      <div className="my-2" {...props}>
        {children}
      </div>
    ),
    html: ({ children }: ComponentProps) => (
      <div className="my-2" dangerouslySetInnerHTML={{ __html: children as string }} />
    )
  };

  if (isLoadingHistory) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <span className="ml-2 text-zinc-500">Loading chat history...</span>
      </div>
    );
  }

  return (
    <div
      ref={messageRef}
      className={cn(
        "flex flex-col w-full max-w-3xl lg:max-w-5xl mx-auto scroll-mt-4 group",
        "transform-gpu backface-hidden will-change-transform",
        isHistorical && "opacity-80"
      )}
    >
      <div
        className={cn(
          "w-full rounded-lg px-6 md:px-8 py-4 md:py-5",
          "bg-white dark:bg-zinc-900 shadow-sm dark:shadow-zinc-800/10",
          "border border-zinc-200 dark:border-zinc-800",
          "transform-gpu motion-safe:animate-fade-in motion-safe:animate-slide-in",
        )}
      >
        {hasAttachments && fileType && (
          <div className="flex flex-col gap-2 mb-3">
            {message.attachments?.map((url: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                {fileType === 'document' ? (
                  <div className="flex items-center gap-2 text-[15px] text-zinc-500">
                    <File className="w-4 h-4" />
                    <span>Document analysis</span>
                  </div>
                ) : (
                  <div className="relative w-full max-w-lg mx-auto rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    <img
                      src={url}
                      alt="Attached image"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div
          className={cn(
            "prose prose-zinc dark:prose-invert max-w-none",
            "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
            "prose-p:text-[15px] prose-p:leading-[1.7] prose-p:tracking-[-0.1px]",
            "prose-headings:font-semibold prose-headings:tracking-tight",
            "[&>p+p]:mt-4",
            "[&>*+pre]:mt-4 [&>pre+*]:mt-4",
            "[&>*+blockquote]:mt-4 [&>blockquote+*]:mt-4",
            "[&>*+h1]:mt-8 [&>*+h2]:mt-6 [&>*+h3]:mt-4",
            contentType === 'long-text' && "whitespace-pre-wrap",
            contentType === 'html' && "break-words"
          )}
          onMouseUp={handleSelectionCopy}
          style={{
            willChange: 'transform, opacity',
            contain: 'content'
          }}
        >
          <ReactMarkdown components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
      {message.timestamp && (
        <div className="text-[13px] text-zinc-400 dark:text-zinc-500 mt-2 text-center">
          {new Date(message.timestamp).toLocaleString()}
        </div>
      )}
      <div className="flex justify-center mt-2">
        <MessageActions
          message={message}
          index={index}
          copiedIndex={copiedIndex}
          onCopy={onCopy}
          contentType={contentType}
        />
      </div>
    </div>
  );
}, (prevProps: MessageContentProps, nextProps: MessageContentProps): boolean => {
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.index === nextProps.index &&
    prevProps.copiedIndex === nextProps.copiedIndex &&
    prevProps.isTyping === nextProps.isTyping &&
    JSON.stringify(prevProps.message.attachments) === JSON.stringify(nextProps.message.attachments) &&
    prevProps.isLoadingHistory === nextProps.isLoadingHistory &&
    prevProps.isHistorical === nextProps.isHistorical
  );
});

MessageContent.displayName = 'MessageContent';
