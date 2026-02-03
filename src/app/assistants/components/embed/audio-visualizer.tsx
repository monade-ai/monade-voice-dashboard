import { cn } from '@/lib/utils';

type AgentState = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'disconnected';

interface AudioVisualizerProps {
  agentState: AgentState;
  audioData?: Float32Array | null;
}

export function AudioVisualizer({ agentState, audioData }: AudioVisualizerProps) {
  // Create a simple bar visualizer
  const bars = Array.from({ length: 5 }, (_, i) => i);
  
  // Determine bar heights based on audio data or agent state
  const getBarHeight = (index: number) => {
    if (audioData && audioData.length > index) {
      // Use actual audio data if available
      return Math.max(2, Math.floor(audioData[index] * 30));
    } else if (agentState === 'speaking') {
      // Animated heights for speaking state
      return Math.floor(Math.random() * 20) + 5;
    } else if (agentState === 'listening') {
      // Low heights for listening state
      return Math.floor(Math.random() * 5) + 2;
    } else if (agentState === 'thinking') {
      // Medium heights for thinking state
      return Math.floor(Math.random() * 10) + 5;
    } else {
      // Minimal heights for other states
      return 2;
    }
  };
  
  // Determine bar colors based on agent state
  const getBarColor = (_index: number) => {
    if (agentState === 'speaking') {
      return 'bg-foreground';
    } else if (agentState === 'listening') {
      return 'bg-amber-500';
    } else if (agentState === 'thinking') {
      return 'bg-blue-500';
    } else {
      return 'bg-muted';
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center gap-2">
      {bars.map((bar, index) => (
        <div
          key={index}
          className={cn([
            'min-h-2 w-3 rounded-full transition-all duration-100 ease-linear',
            getBarColor(index),
          ])}
          style={{
            height: `${getBarHeight(index)}px`,
          }}
        />
      ))}
    </div>
  );
}
