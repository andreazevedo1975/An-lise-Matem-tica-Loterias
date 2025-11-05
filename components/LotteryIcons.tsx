
import React from 'react';

// Simplified, theme-friendly icons for each lottery.
// Using `fill="currentColor"` allows the icon to inherit its color from the parent's text color.

export const MegaSenaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.4,6.6A6.2,6.2,0,0,0,12,3.5a6.2,6.2,0,0,0-4.4,10.6,6.2,6.2,0,0,0,4.4,1.8c1.3,0,2.6-.4,3.7-1.2a6.2,6.2,0,0,0,2.5-7.1M12,14.5a3.2,3.2,0,0,1-3.2-3.2A3.2,3.2,0,0,1,12,8.1a3.2,3.2,0,0,1,3.2,3.2A3.2,3.2,0,0,1,12,14.5" />
  </svg>
);

export const QuinaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12,3A9,9,0,1,0,21,12,9,9,0,0,0,12,3Zm0,16a7,7,0,1,1,7-7A7,7,0,0,1,12,19Zm1.5-6.9-2.1,2.1.8.8L15,12.2V15h1V11a1,1,0,0,0-1-1H11v1h3.1l-2.7,2.7-.8-.8L13.1,10H8V9h6a1,1,0,0,1,1,1Z" />
  </svg>
);

export const LotofacilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm5,13H14v3H12V15H7V13h5V10h2v3h3Z" />
  </svg>
);

export const LotomaniaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12,2,9.2,8.5,2,9.7l5.4,5.2L6.1,22,12,18.5,17.9,22l-1.3-7.1L22,9.7l-7.2-.2Z" />
  </svg>
);
