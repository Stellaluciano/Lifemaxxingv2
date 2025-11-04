import React from 'react';
import regularSeat from '../assets/regular-seat.svg';
import sacredSeat from '../assets/sacred-seat.svg';
import silverSeat from '../assets/silver-seat.svg';

const Seat = ({ variant = 'regular', onClick }) => {
  const labelMap = {
    sacred: 'Sacred Seat',
    silver: 'Silver Seat',
    regular: 'Seat',
  };

  const iconMap = {
    sacred: sacredSeat,
    silver: silverSeat,
    regular: regularSeat,
  };

  const isInteractive = variant !== 'regular' && typeof onClick === 'function';

  return (
    <button
      type="button"
      className={`seat seat--${variant}`}
      onClick={isInteractive ? onClick : undefined}
      aria-disabled={!isInteractive}
      aria-label={labelMap[variant]}
    >
      <img src={iconMap[variant]} alt="" className="seat__icon" draggable="false" />
    </button>
  );
};

export default Seat;
