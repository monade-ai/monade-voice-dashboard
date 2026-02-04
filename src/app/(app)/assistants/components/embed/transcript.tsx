import { useCallback, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface TranscriptProps {
  messages: ChatMessage[];
  className?: string;
}

export function Transcript({
  ref,
  messages,
  className,
}: React.ComponentProps<'div'> & TranscriptProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);

  const handleRef = useCallback(
    (node: HTMLDivElement) => {
      transcriptRef.current = node;
      if (ref) {
        if (typeof ref === 'function') {
          ref(node);
        } else {
          ref.current = node;
        }
      }
    },
    [ref],
  );

  // auto scroll transcript
  useEffect(() => {
    function scrollToBottom() {
      const scrollingElement = transcriptRef.current;

      if (scrollingElement) {
        scrollingElement.scrollTop = scrollingElement.scrollHeight;
      }
    }

    if (transcriptRef.current) {
      const resizeObserver = new ResizeObserver(scrollToBottom);

      resizeObserver.observe(transcriptRef.current);
      scrollToBottom();

      return () => resizeObserver.disconnect();
    }
  }, [messages]);

  return (
    <div
      ref={handleRef}
      className={`flex grow flex-col overflow-x-hidden overflow-y-auto py-3 pr-3 pl-1 ${className || ''}`}
    >
      <div className="flex flex-1 flex-col justify-end gap-3">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.sender === 'assistant' ? 'justify-start' : 'justify-end'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                message.sender === 'assistant' 
                  ? 'bg-amber-50 text-amber-900 rounded-tl-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tr-none'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}