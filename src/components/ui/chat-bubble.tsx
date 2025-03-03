import React from 'react';
import { styled } from 'styled-components';

// Types
interface ChatBubbleProps {
  variant: 'sent' | 'received';
  children: React.ReactNode;
}

interface ChatBubbleAvatarProps {
  src?: string;
  fallback: string;
  className?: string;
}

interface ChatBubbleMessageProps {
  variant: 'sent' | 'received';
  isLoading?: boolean;
  children?: React.ReactNode;
}

// Styled Components
const StyledChatBubble = styled.div<{ variant: 'sent' | 'received' }>`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  ${props => props.variant === 'sent' && 'flex-direction: row-reverse;'}
`;

const StyledAvatar = styled.div<{ src?: string }>`
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-image: ${props => props.src ? `url(${props.src})` : 'none'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => !props.src ? '#e2e8f0' : 'transparent'};
  color: ${props => !props.src ? '#64748b' : 'transparent'};
  font-size: 0.875rem;
  font-weight: 500;
`;

const StyledMessage = styled.div<{ variant: 'sent' | 'received' }>`
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  max-width: 80%;
  ${props => props.variant === 'sent' ? `
    background-color: #000;
    color: #fff;
    border-top-right-radius: 0;
  ` : `
    background-color: #f1f5f9;
    color: #000;
    border-top-left-radius: 0;
  `}
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  
  span {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: #cbd5e1;
    animation: bounce 1.4s infinite ease-in-out both;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  }
`;

// Components
export function ChatBubble({ variant, children }: ChatBubbleProps) {
  return <StyledChatBubble variant={variant}>{children}</StyledChatBubble>;
}

export function ChatBubbleAvatar({ src, fallback, className }: ChatBubbleAvatarProps) {
  return (
    <StyledAvatar src={src} className={className}>
      {!src && fallback}
    </StyledAvatar>
  );
}

export function ChatBubbleMessage({ variant, isLoading, children }: ChatBubbleMessageProps) {
  return (
    <StyledMessage variant={variant}>
      {isLoading ? (
        <LoadingDots>
          <span />
          <span />
          <span />
        </LoadingDots>
      ) : children}
    </StyledMessage>
  );
} 