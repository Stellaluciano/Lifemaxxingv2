import React from 'react';
import { useNavigate } from 'react-router-dom';
import Seat from './Seat';

const StudyRoom = () => {
  const seats = Array.from({ length: 25 }, (_, index) => index);
  const sacredIndex = Math.floor(seats.length / 2);
  const silverIndices = [sacredIndex - 5, sacredIndex + 5, sacredIndex - 1, sacredIndex + 1];
  const navigate = useNavigate();

  const handleSacredSeatClick = () => {
    navigate('/timer');
  };

  const handleSilverSeatClick = () => {
    navigate('/auxiliary-timer');
  };

  return (
    <div className="study-room">
      <h1 className="study-room__title">Where do you want to sit?</h1>
      <div className="study-room__grid">
        {seats.map((seatIndex) => {
          const isSacred = seatIndex === sacredIndex;
          const isSilver = silverIndices.includes(seatIndex);

          let variant = 'regular';
          let onSeatClick = undefined;

          if (isSacred) {
            variant = 'sacred';
            onSeatClick = handleSacredSeatClick;
          } else if (isSilver) {
            variant = 'silver';
            onSeatClick = handleSilverSeatClick;
          }

          return <Seat key={seatIndex} variant={variant} onClick={onSeatClick} />;
        })}
      </div>
    </div>
  );
};

export default StudyRoom;
