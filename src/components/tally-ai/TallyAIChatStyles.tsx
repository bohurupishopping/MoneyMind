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
  bg-white
  flex
  flex-col
  overflow-hidden
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
  bg-white
  border-b
  border-gray-200
`;

export const ChatSection = tw.div`
  relative 
  flex 
  flex-col 
  h-[calc(100%-3.5rem)]
  sm:h-[calc(100%-4rem)]
  flex-grow
  overflow-hidden
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
  bg-white
`;

export const MessageWrapper = tw.div`
  flex 
  items-start 
  gap-2
  sm:gap-3 
  max-w-[90%]
  sm:max-w-[85%] 
  animate-fade-in-up
  w-full
`;

export const Avatar = tw.div<AvatarProps>`
  ${(p) => `
    flex-shrink-0 
    w-7
    h-7
    sm:w-8 
    sm:h-8 
    rounded-full 
    flex 
    items-center 
    justify-center 
    ${p.isUser 
      ? 'bg-indigo-600 text-white' 
      : 'bg-emerald-600 text-white'
    }
    shadow-sm
  `}
`;

export const MessageBubble = tw.div<MessageBubbleProps>`
  ${(p) => `
    rounded-2xl 
    px-3
    sm:px-4 
    py-2
    sm:py-2.5 
    ${p.isUser
      ? 'bg-indigo-600 text-white shadow-sm'
      : 'bg-gray-100 text-gray-900'
    }
    max-w-full
    overflow-hidden
  `}
`;

export const InputSection = tw.div`
  border-t 
  border-gray-200
  bg-white
  px-2
  sm:px-4
  py-3
  sm:py-4
  md:px-6
`;

export const InputWrapper = tw.div`
  max-w-3xl 
  mx-auto 
  relative 
  flex 
  items-end 
  gap-2
  w-full
  bg-white
  rounded-2xl
  border
  border-gray-200
  shadow-sm
  focus-within:ring-2
  focus-within:ring-indigo-500
  focus-within:border-indigo-500
  transition-all
  p-2
  sm:p-3
`;

export const SuggestionButton = tw.button`
  group 
  p-3
  sm:p-4 
  text-left 
  rounded-xl 
  border 
  border-gray-200
  bg-white
  hover:border-indigo-300
  hover:bg-indigo-50
  transition-all
  duration-200
  shadow-sm
  hover:shadow
`;

export const EmptyStateContainer = tw.div`
  flex 
  flex-col 
  items-center 
  justify-center 
  min-h-full 
  text-center 
  p-4 
  md:p-8
  max-w-2xl
  mx-auto
  w-full
`;

export const EmptyStateIcon = tw.div`
  w-14
  h-14
  sm:w-16 
  sm:h-16 
  rounded-full 
  bg-indigo-100
  flex
  items-center
  justify-center
  mb-6
  transition-transform
  hover:scale-105
`;

export const LoadingDots = tw.div`
  flex 
  items-center 
  space-x-1.5
  py-1
`;

export const Dot = tw.div<DotProps>`
  ${(p) => `
    w-1.5
    h-1.5
    sm:w-2 
    sm:h-2 
    bg-gray-400
    rounded-full
    animate-bounce
    animation-delay-${p.delay}
  `}
`; 

export const SidebarButton = tw.button<SidebarButtonProps>`
  ${(p) => `
    w-full
    flex
    items-center
    gap-2
    px-3
    py-2
    rounded-lg
    text-sm
    font-medium
    transition-colors
    ${p.active 
      ? 'bg-indigo-100 text-indigo-700'
      : 'text-gray-700 hover:bg-gray-100'}
  `}
`;

export const ChatThreadItem = tw.div`
  flex
  items-center
  gap-2
  p-2
  rounded-lg
  hover:bg-gray-100
  cursor-pointer
  transition-colors
  text-sm
  text-gray-700
`;