import React from 'react';
import { styled } from 'styled-components';

interface ChatMessageListProps {
  children: React.ReactNode;
}

const StyledChatMessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  overflow-y: auto;
  height: 100%;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
`;

export function ChatMessageList({ children }: ChatMessageListProps) {
  return <StyledChatMessageList>{children}</StyledChatMessageList>;
} 