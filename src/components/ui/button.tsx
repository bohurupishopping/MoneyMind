import React from 'react';
import { styled } from 'styled-components';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  
  /* Size variants */
  ${props => props.size === 'sm' && `
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  `}
  
  ${props => props.size === 'default' && `
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  `}
  
  ${props => props.size === 'lg' && `
    padding: 1rem 2rem;
    font-size: 1.125rem;
  `}
  
  ${props => props.size === 'icon' && `
    padding: 0.5rem;
    width: 2.5rem;
    height: 2.5rem;
  `}
  
  /* Style variants */
  ${props => props.variant === 'default' && `
    background-color: #000;
    color: #fff;
    border: none;
    
    &:hover {
      opacity: 0.9;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `}
  
  ${props => props.variant === 'ghost' && `
    background-color: transparent;
    color: #666;
    border: none;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `}
  
  ${props => props.variant === 'outline' && `
    background-color: transparent;
    color: #000;
    border: 1px solid #000;
    
    &:hover {
      background-color: #000;
      color: #fff;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `}
`;

export function Button({
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonProps) {
  return (
    <StyledButton variant={variant} size={size} {...props}>
      {children}
    </StyledButton>
  );
} 