
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

type RelativeTimeProps = {
  timestamp: Date;
};

export function RelativeTime({ timestamp }: RelativeTimeProps) {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    // This code only runs on the client, after hydration
    setRelativeTime(formatDistanceToNow(timestamp, { addSuffix: true }));
  }, [timestamp]);

  // Render nothing on the server and initial client render to prevent hydration mismatch
  if (!relativeTime) {
    return null;
  }

  return <>{relativeTime}</>;
}
