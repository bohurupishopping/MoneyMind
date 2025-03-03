import React from 'react';
import { styled } from 'styled-components';

interface ChatInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

const StyledTextArea = styled.textarea`
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: 1rem;
  line-height: 1.5;
  
  &::placeholder {
    color: #94a3b8;
  }
  
  &:focus {
    outline: none;
  }
`;

export function ChatInput({ className, ...props }: ChatInputProps) {
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  React.useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [props.value]);

  return (
    <StyledTextArea
      ref={textAreaRef}
      onInput={handleInput}
      rows={1}
      className={className}
      {...props}
    />
  );
} 