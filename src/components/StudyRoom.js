import React from 'react';
import { useNavigate } from 'react-router-dom';
import Seat from './Seat';

const StudyRoom = () => {
  const seats = Array.from({ length: 25 }, (_, index) => index);
  const sacredIndex = Math.floor(seats.length / 2);
  const navigate = useNavigate();

  const handleSacredSeatClick = () => {
    navigate('/timer');
  };

  return (
    <div className="study-room">
      <h1 className="study-room__title">Where do you want to sit?</h1>
      <div className="study-room__grid">
        {seats.map((seatIndex) => (
          <Seat
            key={seatIndex}
            isSacred={seatIndex === sacredIndex}
            onClick={handleSacredSeatClick}
          />
        ))}
      </div>
    </div>
  );
};

export default StudyRoom;
