import React from 'react';
import './CircularTimer.css';

const CircularTimer = ({ timeLeft, duration }) => {
    const radius = 180;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;

    const strokeDashoffset = circumference - (timeLeft / duration) * circumference;

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m
            .toString()
            .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="circular-timer">
            <div className="circular-timer__container">
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className="circular-timer__svg"
                >
                    <circle
                        className="circular-timer__background"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <circle
                        className="circular-timer__progress"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset }}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                </svg>
                <div className="circular-timer__content">
                    <div className="circular-timer__time">{formatTime(timeLeft)}</div>
                </div>
            </div>
        </div>
    );
};

export default CircularTimer;
