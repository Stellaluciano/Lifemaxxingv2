import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    useSensor,
    useSensors,
    TouchSensor,
    MouseSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';

import WeightTracker from '../components/WeightTracker';
import StrengthTracker from '../components/StrengthTracker';
import ClimbingTracker from '../components/ClimbingTracker';
import SleepTracker from '../components/SleepTracker';
import HydrationTracker from '../components/HydrationTracker';
import { SortableModule } from '../components/SortableModule';
import './MyTemple.css';

const DEFAULT_ORDER = ['weight', 'climbing', 'strength', 'hydration', 'sleep'];

const MyTemple = () => {
    const { user } = useAuth();
    const [items, setItems] = useState(DEFAULT_ORDER);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Load Order
    useEffect(() => {
        let mounted = true;
        const loadLayout = async () => {
            if (!user) return;
            try {
                const docRef = doc(db, 'users', user.uid, 'settings', 'layout');
                const snap = await getDoc(docRef);
                if (mounted && snap.exists() && snap.data().templeOrder) {
                    // Filter to ensure only valid keys and defaults if missing (optional)
                    const loaded = snap.data().templeOrder;
                    if (Array.isArray(loaded) && loaded.length > 0) {
                        setItems(loaded);
                    }
                }
            } catch (e) {
                console.error("Layout load error", e);
            }
        };
        loadLayout();
        return () => { mounted = false; };
    }, [user]);

    // Save Order
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Save to DB
                if (user) {
                    setDoc(doc(db, 'users', user.uid, 'settings', 'layout'), {
                        templeOrder: newOrder
                    }, { merge: true }).catch(console.error);
                }
                return newOrder;
            });
        }
    };

    const renderModule = (id) => {
        switch (id) {
            case 'weight':
                return (
                    <SortableModule key={id} id={id} className="temple-card weight-tracker">
                        <WeightTracker />
                    </SortableModule>
                );
            case 'climbing':
                return (
                    <SortableModule key={id} id={id} className="temple-card climbing-tracker">
                        <ClimbingTracker />
                    </SortableModule>
                );
            case 'strength':
                return (
                    <SortableModule key={id} id={id} className="temple-card strength-tracker">
                        <StrengthTracker />
                    </SortableModule>
                );
            case 'hydration':
                return (
                    <SortableModule key={id} id={id}>
                        <HydrationTracker />
                    </SortableModule>
                );
            case 'sleep':
                return (
                    <SortableModule key={id} id={id}>
                        <SleepTracker />
                    </SortableModule>
                );
            default: return null;
        }
    };

    return (
        <div className="my-temple-page">
            <header className="my-temple-header">
                <h1>My Temple</h1>
                <p>The body is a temple — treat it with honor.</p>
            </header>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="temple-dashboard">
                    <SortableContext
                        items={items}
                        strategy={rectSortingStrategy}
                    >
                        {items.map(id => renderModule(id))}
                    </SortableContext>
                </div>
            </DndContext>
        </div>
    );
};

export default MyTemple;
