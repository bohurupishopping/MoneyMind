import tw from 'tailwind-styled-components';

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
  relative 
  h-screen
  w-screen
  fixed
  top-0
  left-0
  bg-gradient-to-b from-white to-gray-50
  flex
  flex-col
  overflow-hidden
  font-sans
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
  bg-white/95
  backdrop-blur-sm
  border-b
  border-gray-200
  shadow-sm
`;

export const ChatSection = tw.div`
  relative 
  flex 
  flex-col 
  h-[calc(100%-3.5rem)]
  sm:h-[calc(100%-4rem)]
  flex-grow
  overflow-hidden
  w-full
`;

export const MessagesContainer = tw.div`
  flex-1 
  overflow-y-auto 
  px-2 
  sm:px-4 
  md:px-6 
  py-4
  sm:py-6 
  space-y-4
  sm:space-y-6 
  scrollbar-thin
  scrollbar-thumb-gray-300
  scrollbar-track-transparent
  bg-transparent
  w-full
  max-w-4xl
  mx-auto
`;

export const MessageWrapper = tw.div`
  flex 
  items-start 
  gap-3
  sm:gap-4 
  max-w-full
  w-full
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
    ring-white
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
      : 'bg-white text-gray-800 border border-gray-100 shadow-sm'
    }
    max-w-full
    overflow-hidden
    ${p.isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}
  `}
`;

export const InputSection = tw.div`
  border-t 
  border-gray-200
  bg-white/95
  backdrop-blur-sm
  px-2
  sm:px-4
  py-3
  sm:py-4
  md:px-6
  shadow-[0_-1px_3px_rgba(0,0,0,0.05)]
  w-full
`;

export const InputWrapper = tw.div`
  max-w-4xl 
  mx-auto 
  relative 
  flex 
  items-end 
  gap-2
  sm:gap-3
  w-full
  bg-white
  rounded-2xl
  border
  border-gray-200
  shadow-md
  focus-within:ring-2
  focus-within:ring-indigo-500
  focus-within:border-indigo-500
  p-2
  sm:p-3
  md:p-4
`;

export const SuggestionButton = tw.button`
  p-3
  sm:p-4 
  text-left 
  rounded-xl 
  border 
  border-gray-200
  bg-white
  shadow-sm
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
  ring-white
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
`;