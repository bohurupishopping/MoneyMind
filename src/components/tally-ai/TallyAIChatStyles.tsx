import tw from 'tailwind-styled-components';
import { motion } from 'framer-motion';

interface AvatarProps {
  isUser: boolean;
}

interface MessageBubbleProps {
  isUser: boolean;
}

interface DotProps {
  delay: string;
}

interface SidebarButtonProps {
  active?: boolean;
}

export const ChatContainer = tw.div`
  flex
  flex-col
  min-h-[100dvh]
  w-full
  overflow-hidden
  font-sans
  relative
`;

export const Header = tw.header`
  sticky 
  top-0 
  z-10 
  flex 
  items-center 
  justify-between 
  px-4
  sm:px-6 
  h-14
  sm:h-16 
  border-b
  border-gray-200
  shadow-sm
`;

export const ChatSection = tw.div`
  relative 
  flex 
  flex-col 
  flex-1
  flex-grow
  overflow-hidden
  w-full
  pb-20
  sm:pb-24
`;

export const MessagesContainer = tw.div`
  flex-1 
  overflow-y-auto 
  px-4
  sm:px-6
  py-4
  sm:py-6 
  space-y-4
  sm:space-y-6 
  bg-transparent
  w-full
  max-w-5xl
  mx-auto
  -webkit-overflow-scrolling-touch
  scroll-smooth
`;

export const MessageWrapper = tw.div`
  flex 
  items-start 
  gap-3
  sm:gap-4 
  max-w-full
  w-full
  animate-fade-in
`;

export const Avatar = tw.div<AvatarProps>`
  ${(p) => `
    flex-shrink-0 
    w-8
    h-8
    sm:w-10 
    sm:h-10 
    rounded-full 
    flex 
    items-center 
    justify-center 
    ${p.isUser 
      ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white' 
      : 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
    }
    shadow-md
    ring-2
    ring-gray-50
  `}
`;

export const MessageBubble = tw.div<MessageBubbleProps>`
  ${(p) => `
    rounded-2xl 
    px-4
    sm:px-5 
    py-3
    sm:py-3.5 
    ${p.isUser
      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
      : 'bg-gray-100 text-gray-800 border border-gray-100 shadow-sm'
    }
    max-w-full
    overflow-hidden
    ${p.isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}
    transition-all
    duration-200
  `}
`;

export const InputSection = tw.div`
  fixed
  bottom-0
  left-0
  right-0
  z-50
  px-2
  sm:px-4
  pb-3
  sm:pb-4
  pt-2
  w-full
  pointer-events-none
`;

export const InputWrapper = tw.div`
  max-w-5xl 
  mx-auto 
  relative 
  flex
  items-center
  gap-2
  sm:gap-3
  w-full
  rounded-full
  bg-gray-50/95
  border
  border-gray-200/80
  shadow-lg
  focus-within:ring-2
  focus-within:ring-indigo-500/80
  focus-within:border-indigo-500/80
  px-3
  sm:px-4
  py-1.5
  pointer-events-auto
  hover:shadow-xl
  transition-all
  backdrop-blur-sm
`;

export const SuggestionButton = tw.button`
  p-3
  sm:p-4 
  text-left 
  rounded-xl 
  border 
  border-gray-200
  bg-gray-50
  shadow-sm
  hover:bg-gray-100
  transition-all
  duration-200
  hover:shadow-md
  hover:scale-[1.01]
  active:scale-[0.98]
`;

export const EmptyStateContainer = tw.div`
  flex 
  flex-col 
  items-center 
  justify-center 
  min-h-full 
  text-center 
  p-4 
  sm:p-6
  md:p-8
  max-w-3xl
  mx-auto
  w-full
`;

export const EmptyStateIcon = tw.div`
  w-14
  h-14
  sm:w-16 
  sm:h-16 
  rounded-full 
  bg-gradient-to-br from-indigo-100 to-indigo-200
  flex
  items-center
  justify-center
  mb-6
  shadow-md
  ring-4
  ring-gray-50
`;

export const LoadingDots = tw.div`
  flex 
  items-center 
  space-x-2
  py-2
  px-1
`;

export const Dot = tw.div<DotProps>`
  ${(p) => `
    w-2
    h-2
    sm:w-2.5 
    sm:h-2.5 
    bg-gradient-to-r from-indigo-400 to-indigo-600
    rounded-full
    animate-bounce
    animation-delay-${p.delay}
    shadow-sm
  `}
`; 

export const SidebarButton = tw.button<SidebarButtonProps>`
  ${(p) => `
    w-full
    flex
    items-center
    gap-3
    px-4
    py-3
    rounded-xl
    text-sm
    font-medium
    ${p.active 
      ? 'bg-indigo-100 text-indigo-700 shadow-sm'
      : 'text-gray-700 hover:bg-gray-100'}
    transition-all
    duration-200
  `}
`;

export const ChatThreadItem = tw.div`
  flex
  items-center
  gap-3
  p-3
  rounded-xl
  hover:bg-gray-100
  cursor-pointer
  text-sm
  text-gray-700
  transition-all
  duration-200
`;

export const SuggestionGrid = tw.div`
  grid
  grid-cols-1
  sm:grid-cols-2
  gap-3
  w-full
  max-w-2xl
`;

export const WelcomeContainer = tw.div`
  w-full
  max-w-2xl
  mx-auto
  px-4
  py-8
  space-y-6
`;

export const WelcomeIconContainer = tw.div`
  w-16
  h-16
  mx-auto
  bg-indigo-50
  rounded-2xl
  flex
  items-center
  justify-center
`;

export const ActionButton = tw.button`
  flex
  items-center
  justify-center
  p-2
  rounded-full
  text-gray-600
  hover:bg-gray-100
  transition-all
  duration-200
`;

export const MotionDiv = motion.div;