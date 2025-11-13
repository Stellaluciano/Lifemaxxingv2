import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Seat from './Seat';
import { SACRED_INTENT_STORAGE_KEY, TEST_INTENT_STORAGE_KEY } from '../constants';

const CATEGORY_OPTIONS = [
  { value: 'study', label: '📚 Study' },
  { value: 'workout', label: '💪 Workout' },
  { value: 'chores', label: '🧹 Chores' },
  { value: 'work', label: '💻 Work' },
  { value: 'meditation', label: '🧘 Meditation' },
  { value: 'custom', label: '➕ Custom' },
];

const DEFAULT_CATEGORY = CATEGORY_OPTIONS[0].value;

const StudyRoom = () => {
  const seats = Array.from({ length: 25 }, (_, index) => index);
  const sacredIndex = Math.floor(seats.length / 2);
  const testIndex = seats.length - 1;
  const silverIndices = [sacredIndex - 5, sacredIndex + 5, sacredIndex - 1, sacredIndex + 1];
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY);
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [modalContext, setModalContext] = useState(null);

  const requiresCustomInput = selectedCategory === 'custom';

  const resolvedCategoryLabel = useMemo(() => {
    if (!requiresCustomInput) {
      return CATEGORY_OPTIONS.find((option) => option.value === selectedCategory)?.label ?? selectedCategory;
    }

    const trimmed = customCategory.trim();
    return trimmed.length > 0 ? trimmed : 'Custom';
  }, [selectedCategory, customCategory, requiresCustomInput]);

  const openIntentModal = (context) => {
    setModalContext(context);
    setIsModalOpen(true);
  };

  const handleSacredSeatClick = () => {
    openIntentModal({
      intentStorageKey: SACRED_INTENT_STORAGE_KEY,
      destinationPath: '/timer',
      seatName: 'Sacred Seat',
    });
  };

  const handleSilverSeatClick = () => {
    navigate('/auxiliary-timer');
  };

  const handleTestSeatClick = () => {
    openIntentModal({
      intentStorageKey: TEST_INTENT_STORAGE_KEY,
      destinationPath: '/test-timer',
      seatName: 'Test Chain',
    });
  };

  const resetModalState = () => {
    setIsModalOpen(false);
    setSelectedCategory(DEFAULT_CATEGORY);
    setCustomCategory('');
    setDescription('');
    setModalContext(null);
  };

  const handleModalStart = () => {
    if (!modalContext) {
      return;
    }
    const intent = {
      categoryLabel: resolvedCategoryLabel,
      categoryValue: selectedCategory,
      description: description.trim(),
      startTime: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(modalContext.intentStorageKey ?? SACRED_INTENT_STORAGE_KEY, JSON.stringify(intent));
      } catch (error) {
        console.warn('Failed to store sacred seat intent', error);
      }
    }
    resetModalState();
    navigate(modalContext.destinationPath ?? '/timer');
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

          if (seatIndex === testIndex) {
            variant = 'test';
            onSeatClick = handleTestSeatClick;
          } else if (isSacred) {
            variant = 'sacred';
            onSeatClick = handleSacredSeatClick;
          } else if (isSilver) {
            variant = 'silver';
            onSeatClick = handleSilverSeatClick;
          }

          return <Seat key={seatIndex} variant={variant} onClick={onSeatClick} />;
        })}
      </div>
      {isModalOpen && (
        <div
          className="sacred-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sacred-modal-title"
        >
          <div className="sacred-modal">
            <h2 id="sacred-modal-title" className="sacred-modal__title">
              What are you going to do?
              {modalContext?.seatName ? ` (${modalContext.seatName})` : ''}
            </h2>
            <label className="sacred-modal__label">
              Category
              <select
                className="sacred-modal__select"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {requiresCustomInput && (
              <label className="sacred-modal__label">
                Custom category
                <input
                  type="text"
                  className="sacred-modal__input"
                  placeholder="e.g. Deep Work Sprint"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                />
              </label>
            )}
            <label className="sacred-modal__label">
              Description
              <textarea
                className="sacred-modal__textarea"
                placeholder="Finish BST220 homework"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </label>
            <div className="sacred-modal__actions">
              <button
                type="button"
                className="sacred-modal__secondary"
                onClick={resetModalState}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sacred-modal__primary"
                disabled={requiresCustomInput && customCategory.trim().length === 0}
                onClick={handleModalStart}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoom;
