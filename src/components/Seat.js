import React from 'react';
import regularSeat from '../assets/regular-seat.svg';
import sacredSeat from '../assets/sacred-seat.svg';

const Seat = ({ isSacred, onClick }) => {
  const label = isSacred ? 'Sacred Seat' : 'Seat';

  return (
    <button
      type="button"
      className={`seat${isSacred ? ' seat--sacred' : ''}`}
      onClick={isSacred ? onClick : undefined}
      aria-disabled={!isSacred}
      aria-label={label}
    >
      <img
        src={isSacred ? sacredSeat : regularSeat}
        alt=""
        className="seat__icon"
        draggable="false"
      />
    </button>
  );
};

export default Seat;
