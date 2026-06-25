import { useEffect, useState } from 'react';

interface Props {
  message: string | null;
  duration?: number;
  onDismiss?: () => void;
}

export default function Toast({ message, duration = 2000, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(t);
  }, [message, duration, onDismiss]);

  if (!message) return null;
  return (
    <div className={`fp-toast ${visible ? 'fp-toast-visible' : ''}`}>
      {message}
    </div>
  );
}
