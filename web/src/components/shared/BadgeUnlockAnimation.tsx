import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

interface BadgeUnlockAnimationProps {
  badgeName: string;
  iconName?: string;
  onComplete?: () => void;
}

export function BadgeUnlockAnimation({ badgeName, iconName = 'Award', onComplete }: BadgeUnlockAnimationProps) {
  const [stage, setStage] = useState<'hidden' | 'entering' | 'celebrating' | 'fading'>('hidden');
  const IconComponent = (Icons as any)[iconName] || Icons.Award;

  useEffect(() => {
    // Stage timings:
    // 0ms -> entering
    // 500ms -> celebrating (pulse/highlight)
    // 3000ms -> fading
    // 3500ms -> unmount / complete
    
    // Respect prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (reducedMotion) {
      setStage('celebrating');
      const timer = setTimeout(() => {
        setStage('fading');
        setTimeout(() => onComplete?.(), 500);
      }, 2500);
      return () => clearTimeout(timer);
    }

    setStage('entering');
    const t1 = setTimeout(() => setStage('celebrating'), 500);
    const t2 = setTimeout(() => setStage('fading'), 3000);
    const t3 = setTimeout(() => {
      setStage('hidden');
      onComplete?.();
    }, 3500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  if (stage === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm transition-opacity duration-500"
        style={{ opacity: stage === 'fading' ? 0 : 1 }}
      />
      
      <div className={`
        relative z-10 flex flex-col items-center bg-card p-8 rounded-2xl shadow-2xl border border-primary/20
        transition-all duration-500 transform
        ${stage === 'entering' ? 'scale-90 translate-y-10 opacity-0' : ''}
        ${stage === 'celebrating' ? 'scale-100 translate-y-0 opacity-100' : ''}
        ${stage === 'fading' ? 'scale-110 opacity-0' : ''}
      `}>
        {/* Highlight Ring */}
        <div className={`
          absolute inset-0 rounded-2xl border-[3px] border-primary/50
          transition-transform duration-1000 ease-out
          ${stage === 'celebrating' ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}
        `} />

        <div className="bg-primary/10 p-5 rounded-full mb-4">
          <IconComponent size={48} className="text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Badge Unlocked!</h2>
        <p className="text-lg text-primary font-semibold">{badgeName}</p>
        <p className="text-sm text-muted-foreground mt-2 text-center max-w-[200px]">
          Keep up the great sustainability work!
        </p>
      </div>
    </div>
  );
}
