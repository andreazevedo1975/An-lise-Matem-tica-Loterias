import React from 'react';

interface NumberBallProps {
  number: number;
  color: string;
  size?: 'small' | 'medium';
}

const NumberBall: React.FC<NumberBallProps> = ({ number, color, size = 'medium' }) => {
  const sizeClasses = size === 'medium' 
    ? 'w-10 h-10 text-lg' 
    : 'w-8 h-8 text-sm';

  const isHexColor = color.startsWith('#');
  
  // If the color prop contains a text color utility (e.g., 'text-slate-800'), don't add the default 'text-white'.
  const textColorClass = color.includes('text-') ? '' : 'text-white';

  const finalClassName = `flex items-center justify-center rounded-full font-bold shadow-lg ${sizeClasses} ${textColorClass} ${!isHexColor ? color : ''}`;
  
  const style = isHexColor ? { backgroundColor: color } : {};

  return (
    <div
      className={finalClassName.trim()}
      style={style}
    >
      {String(number).padStart(2, '0')}
    </div>
  );
};

export default NumberBall;