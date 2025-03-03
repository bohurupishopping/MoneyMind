import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AttachmentPreview } from '@/components/ui/attachment-preview';
import { FileUpload } from '@/types/conversation';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { ModelSelector } from './ModelSelector';

// Supported file types
const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/javascript',
  'application/x-javascript',
  'application/x-python',
  'text/x-python',
  'text/plain',
  'text/html',
  'text/css',
  'text/md',
  'text/csv',
  'text/xml',
  'text/rtf'
];

interface ChatInputProps {
  onSubmit: (message: string, attachments?: FileUpload[], withSearch?: boolean) => void;
  isLoading?: boolean;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  className?: string;
}

export const ChatInput = ({ 
  onSubmit, 
  isLoading, 
  selectedModel = 'groq',
  onModelChange = () => {},
  className 
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [withSearch, setWithSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    if (!inputRef.current) return;
    
    // Reset height temporarily to get proper scrollHeight
    inputRef.current.style.height = '44px'; // Use fixed initial height
    
    // Get the scroll height and calculate new height
    const scrollHeight = inputRef.current.scrollHeight;
    const newHeight = Math.min(Math.max(44, scrollHeight), 200);
    
    // Only adjust height if content actually needs more space
    if (scrollHeight > 44) {
      inputRef.current.style.height = `${newHeight}px`;
      inputRef.current.style.overflowY = newHeight >= 200 ? 'auto' : 'hidden';
    } else {
      inputRef.current.style.height = '44px';
      inputRef.current.style.overflowY = 'hidden';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;
    
    // Check if any attachments are still uploading
    if (attachments.some(att => att.uploading)) {
      console.warn('Attachments are still uploading');
      return;
    }
    
    onSubmit(message, attachments, withSearch);
    setMessage('');
    setAttachments([]);
  };

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    setIsUploading(true);
    const newAttachments: FileUpload[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
          console.warn(`Unsupported file type: ${file.type}`);
          continue;
        }

        if (file.size > 20 * 1024 * 1024) { // 20MB limit
          console.warn('File too large');
          continue;
        }

        // Create preview for images
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }

        const attachment: FileUpload = {
          id: uuidv4(),
          file,
          type: file.type.startsWith('image/') ? 'image' : 'document',
          preview,
          uploading: true
        };

        // Process file through vision API if it's a document
        if (attachment.type === 'document') {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('fileType', file.type);
          formData.append('model', 'gemini-1.5-flash');
          formData.append('prompt', 'Please analyze this document and provide insights.');
          formData.append('systemPrompt', 'You are a helpful AI assistant analyzing documents.');

          try {
            const response = await fetch('/api/vision', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error('Failed to process document');
            }

            const result = await response.json();
            attachment.uploading = false;
            attachment.url = result.url;
            attachment.path = result.path;
          } catch (error) {
            console.error('Error processing document:', error);
            attachment.uploading = false;
          }
        } else {
          attachment.uploading = false;
        }

        newAttachments.push(attachment);
      }

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // Handle paste events
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];

    for (const item of Array.from(items)) {
      // Handle image files
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault(); // Prevent default paste only if we found images
      await handleFileUpload(imageFiles);
    }
  }, [handleFileUpload]);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const updated = prev.filter(att => att.id !== id);
      // Clean up previews
      prev.forEach(att => {
        if (att.id === id && att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });
      return updated;
    });
  }, []);

  return (
    <motion.div 
      className="relative w-full max-w-4xl mx-auto px-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <AttachmentPreview
          attachments={attachments}
          onRemove={handleRemoveAttachment}
        />
      )}

      {/* Main Input Form */}
      <motion.form
        onSubmit={handleSubmit}
        className={cn(
          "relative flex items-center gap-2",
          "rounded-[20px]",
          "p-2 pr-2.5",
          "transition-all duration-300 ease-out",
          "backdrop-blur-md",
          isFocused ? [
            "bg-white/95 dark:bg-gray-800/95",
            "border border-blue-200/50 dark:border-blue-800/30",
            "shadow-lg shadow-blue-500/5 dark:shadow-blue-500/3",
            "ring-[1px] ring-blue-100 dark:ring-blue-900/30"
          ] : [
            "bg-gray-50/90 dark:bg-gray-800/90",
            "border border-gray-200/50 dark:border-gray-700/30",
            "hover:border-gray-300/50 dark:hover:border-gray-600/30",
            "hover:bg-white/95 dark:hover:bg-gray-800/95",
            "shadow-md shadow-black/[0.03] dark:shadow-black/[0.05]"
          ],
          "transform-gpu"
        )}
      >
        {/* Action Buttons */}
        <motion.div 
          className="flex items-center gap-2 pl-1"
          initial={false}
          animate={isFocused ? { opacity: 1 } : { opacity: 0.8 }}
        >
          <ModelSelector
            onModelChange={onModelChange}
            selectedModel={selectedModel}
            compact
            isChatMode
          />
          <div className="w-[1px] h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full",
              "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              "hover:bg-gray-100/80 dark:hover:bg-gray-700/80",
              "transition-all duration-200 ease-out",
              withSearch && "text-blue-500 hover:text-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
            )}
            onClick={() => setWithSearch(!withSearch)}
          >
            <Search className="w-[18px] h-[18px]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full",
              "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              "hover:bg-gray-100/80 dark:hover:bg-gray-700/80",
              "transition-all duration-200 ease-out",
              attachments.length > 0 && "text-blue-500 hover:text-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
            )}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
            ) : (
              <Paperclip className="w-[18px] h-[18px]" />
            )}
          </Button>
        </motion.div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={inputRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={attachments.length > 0 ? "Add a message about your attachments..." : "Type your message..."}
            className={cn(
              "w-full min-h-[44px] max-h-[200px] py-2.5 px-2",
              "bg-transparent",
              "border-0 outline-0 focus:outline-0 ring-0 focus:ring-0 focus:ring-offset-0",
              "resize-none",
              "text-gray-700 dark:text-gray-200",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "transition-colors duration-200",
              "text-[15px] leading-relaxed",
              "[&::-webkit-scrollbar]:hidden",
              "[-ms-overflow-style:none]",
              "[scrollbar-width:none]"
            )}
            style={{ 
              height: '44px',
              boxShadow: 'none',
              outline: 'none',
              overflow: 'hidden'
            }}
          />
        </div>

        {/* Send Button */}
        <motion.div 
          initial={false}
          animate={isFocused ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 0.9 }}
        >
          <Button 
            type="submit"
            disabled={(!message.trim() && attachments.length === 0) || isLoading || attachments.some(a => a.uploading)}
            className={cn(
              "h-9 w-9",
              "bg-gradient-to-br from-blue-500 to-blue-600",
              "hover:from-blue-600 hover:to-blue-700",
              "text-white",
              "rounded-full",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "disabled:hover:from-blue-500 disabled:hover:to-blue-600",
              "transition-all duration-200",
              "flex items-center justify-center",
              "group",
              "shadow-md shadow-blue-500/20",
              "hover:shadow-lg hover:shadow-blue-500/30",
              "active:scale-95",
              "transform-gpu"
            )}
          >
            <motion.div
              animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
              className="flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <Send 
                  className="w-[18px] h-[18px] group-hover:translate-x-0.5 
                    transition-transform duration-200" 
                  strokeWidth={2.5}
                />
              )}
            </motion.div>
          </Button>
        </motion.div>
      </motion.form>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        className="hidden"
        multiple
        accept={SUPPORTED_FILE_TYPES.join(',')}
      />
    </motion.div>
  );
};
