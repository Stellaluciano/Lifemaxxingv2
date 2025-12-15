import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const SortableModule = ({ id, children, className = '', style: propStyle, handleStyle }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        position: 'relative',
        height: '100%', // Ensure it fills grid cell if needed
        ...propStyle
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={className}
        >
            {/* Drag Handle - Grip Dots */}
            <div
                {...attributes}
                {...listeners}
                className="module-drag-handle"
                title="Drag to rearrange"
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    cursor: 'grab',
                    padding: '8px',
                    zIndex: 100, // Above content
                    opacity: 0.3, // Slightly more visible
                    transition: 'opacity 0.2s, transform 0.2s',
                    color: '#9ca3af', // Softer grey to blend
                    backdropFilter: 'none', // Remove blur
                    ...handleStyle
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.opacity = '0.2';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" style={{ display: 'block' }}>
                    <circle cx="3" cy="3" r="1.5" />
                    <circle cx="9" cy="3" r="1.5" />
                    <circle cx="3" cy="9" r="1.5" />
                    <circle cx="9" cy="9" r="1.5" />
                    <circle cx="3" cy="15" r="1.5" />
                    <circle cx="9" cy="15" r="1.5" />
                </svg>
            </div>

            {children}
        </div>
    );
};
