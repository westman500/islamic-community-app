import { useEffect, useState } from 'react'
import { Heart, ThumbsDown } from 'lucide-react'

interface Reaction {
  id: string
  type: 'like' | 'dislike'
  x: number
}

interface FloatingReactionsProps {
  onReaction?: (type: 'like' | 'dislike') => void
}

export const FloatingReactions = ({ onReaction }: FloatingReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([])

  const addReaction = (type: 'like' | 'dislike') => {
    const id = `${Date.now()}-${Math.random()}`
    const x = Math.random() * 80 + 10 // Random position between 10% and 90%
    
    setReactions(prev => [...prev, { id, type, x }])
    
    // Remove after animation completes
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id))
    }, 3000)
    
    if (onReaction) {
      onReaction(type)
    }
  }

  // Expose addReaction method to parent
  useEffect(() => {
    // @ts-ignore - Attach to window for easy access
    window.triggerFloatingReaction = addReaction
    
    return () => {
      // @ts-ignore
      delete window.triggerFloatingReaction
    }
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {reactions.map(reaction => (
        <div
          key={reaction.id}
          className="absolute bottom-0 floating-reaction"
          style={{
            left: `${reaction.x}%`,
            animation: 'float-up 3s ease-out forwards'
          }}
        >
          {reaction.type === 'like' ? (
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          ) : (
            <ThumbsDown className="w-8 h-8 text-blue-500 fill-blue-500" />
          )}
        </div>
      ))}
      
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-50vh) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100vh) scale(0.8);
            opacity: 0;
          }
        }
        
        .floating-reaction {
          z-index: 50;
        }
      `}</style>
    </div>
  )
}

// Export helper to trigger reactions
export const triggerReaction = (type: 'like' | 'dislike') => {
  // @ts-ignore
  if (window.triggerFloatingReaction) {
    // @ts-ignore
    window.triggerFloatingReaction(type)
  }
}
