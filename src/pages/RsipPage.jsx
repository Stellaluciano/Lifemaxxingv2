import React, { useState, useEffect, useMemo } from 'react';

import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './RsipPage.css';

// Recursive Tree Node Component
const TreeNode = ({ node, allNodes, onAdd, onDelete }) => {
    const children = useMemo(() =>
        allNodes.filter((n) => n.parentId === node.id),
        [allNodes, node.id]
    );

    return (
        <div className="tree-node">
            <div className="node-content">
                <div className="node-text">{node.text}</div>
                <div className="node-actions">
                    <button
                        className="node-btn node-btn--add"
                        onClick={() => onAdd(node.id)}
                        title="Add child node"
                    >
                        +
                    </button>
                    {node.parentId !== null && ( // Don't delete root from here usually, or handle it specifically
                        <button
                            className="node-btn node-btn--delete"
                            onClick={() => onDelete(node.id)}
                            title="Delete node and children"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>
            {children.length > 0 && (
                <div className="node-children">
                    {children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            allNodes={allNodes}
                            onAdd={onAdd}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const RsipPage = () => {
    const { user } = useAuth();
    const [trees, setTrees] = useState([]);
    const [selectedTree, setSelectedTree] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newTreeName, setNewTreeName] = useState('');
    const [nodeModal, setNodeModal] = useState({ isOpen: false, parentId: null, text: '' });

    // Fetch all trees
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'users', user.uid, 'habitTrees'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const mapped = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTrees(mapped);
        });
        return () => unsubscribe();
    }, [user]);

    // Create new tree
    const handleCreateTree = async (e) => {
        e.preventDefault();
        if (!newTreeName.trim() || !user) return;

        const rootNode = {
            id: crypto.randomUUID(),
            text: 'Start Habit',
            parentId: null
        };

        try {
            const docRef = await addDoc(collection(db, 'users', user.uid, 'habitTrees'), {
                name: newTreeName,
                nodes: [rootNode],
                createdAt: serverTimestamp()
            });
            setNewTreeName('');
            setIsCreating(false);
            // Optionally auto-select the new tree
            setSelectedTree({ id: docRef.id, name: newTreeName, nodes: [rootNode] });
        } catch (error) {
            console.error("Error creating tree:", error);
        }
    };

    // Delete entire tree
    const handleDeleteTree = async (treeId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this entire habit tree?")) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'habitTrees', treeId));
            if (selectedTree?.id === treeId) {
                setSelectedTree(null);
            }
        } catch (error) {
            console.error("Error deleting tree:", error);
        }
    };

    // Open Add Node Modal
    const handleAddNode = (parentId) => {
        setNodeModal({ isOpen: true, parentId, text: '' });
    };

    const handleCloseNodeModal = () => {
        setNodeModal({ isOpen: false, parentId: null, text: '' });
    };

    // Confirm Add Node
    const handleConfirmAddNode = async (e) => {
        e.preventDefault();
        if (!nodeModal.text.trim()) return;

        const newNode = {
            id: crypto.randomUUID(),
            text: nodeModal.text.trim(),
            parentId: nodeModal.parentId
        };

        const updatedNodes = [...selectedTree.nodes, newNode];

        // Optimistic update
        setSelectedTree(prev => ({ ...prev, nodes: updatedNodes }));
        handleCloseNodeModal();

        // Persist
        try {
            await updateDoc(doc(db, 'users', user.uid, 'habitTrees', selectedTree.id), {
                nodes: updatedNodes
            });
        } catch (error) {
            console.error("Error adding node:", error);
        }
    };

    // Delete Node (and children)
    const handleDeleteNode = async (nodeId) => {
        if (!window.confirm("Delete this node and all following steps?")) return;

        // Recursive function to find all descendant IDs
        const getDescendants = (id, nodes) => {
            const children = nodes.filter(n => n.parentId === id);
            let ids = children.map(c => c.id);
            children.forEach(child => {
                ids = [...ids, ...getDescendants(child.id, nodes)];
            });
            return ids;
        };

        const nodesToDelete = [nodeId, ...getDescendants(nodeId, selectedTree.nodes)];
        const updatedNodes = selectedTree.nodes.filter(n => !nodesToDelete.includes(n.id));

        // Optimistic update
        setSelectedTree(prev => ({ ...prev, nodes: updatedNodes }));

        // Persist
        try {
            await updateDoc(doc(db, 'users', user.uid, 'habitTrees', selectedTree.id), {
                nodes: updatedNodes
            });
        } catch (error) {
            console.error("Error deleting node:", error);
        }
    };

    // Render
    if (!user) {
        return (
            <div className="rsip-page">
                <header className="rsip-header">
                    <h1 className="rsip-title">Habit Decision Trees</h1>
                </header>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#64748b',
                    fontSize: '1.1rem'
                }}>
                    Please log in to manage your habit trees.
                </div>
            </div>
        );
    }

    return (
        <div className="rsip-page">
            <header className="rsip-header">
                <h1 className="rsip-title">
                    {selectedTree ? selectedTree.name : 'Habit Decision Trees'}
                </h1>
                <div className="rsip-controls">
                    {selectedTree ? (
                        <button
                            className="rsip-btn"
                            onClick={() => setSelectedTree(null)}
                        >
                            Back to List
                        </button>
                    ) : (
                        <button
                            className="rsip-btn rsip-btn--primary"
                            onClick={() => setIsCreating(true)}
                        >
                            + New Tree
                        </button>
                    )}
                </div>
            </header>

            {isCreating && !selectedTree && (
                <div className="rsip-create-form">
                    <form onSubmit={handleCreateTree} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <input
                            type="text"
                            placeholder="Tree Name (e.g., Sleep Routine)"
                            value={newTreeName}
                            onChange={(e) => setNewTreeName(e.target.value)}
                            style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'white',
                                flex: 1
                            }}
                            autoFocus
                        />
                        <button type="submit" className="rsip-btn rsip-btn--primary">Create</button>
                        <button type="button" className="rsip-btn" onClick={() => setIsCreating(false)}>Cancel</button>
                    </form>
                </div>
            )}

            {!selectedTree ? (
                <div className="tree-list">
                    {trees.length === 0 && !isCreating && (
                        <p style={{ color: 'rgba(255,255,255,0.5)' }}>No habit trees yet. Create one to get started.</p>
                    )}
                    {trees.map(tree => (
                        <div key={tree.id} className="tree-card" onClick={() => setSelectedTree(tree)}>
                            <h3 className="tree-card__title">{tree.name}</h3>
                            <span className="tree-card__meta">{tree.nodes?.length || 0} steps</span>
                            <button
                                className="node-btn node-btn--delete"
                                style={{ alignSelf: 'flex-end', marginTop: 'auto' }}
                                onClick={(e) => handleDeleteTree(tree.id, e)}
                            >
                                Delete Tree
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="tree-view">
                    {/* Find root node (parentId is null) */}
                    {selectedTree.nodes.filter(n => n.parentId === null).map(root => (
                        <TreeNode
                            key={root.id}
                            node={root}
                            allNodes={selectedTree.nodes}
                            onAdd={handleAddNode}
                            onDelete={handleDeleteNode}
                        />
                    ))}
                </div>
            )}

            {/* Add Node Modal */}
            {nodeModal.isOpen && (
                <div className="sacred-modal__overlay" role="dialog" aria-modal="true">
                    <div className="sacred-modal">
                        <h2 className="sacred-modal__title">Add Next Step</h2>
                        <form onSubmit={handleConfirmAddNode}>
                            <label className="sacred-modal__label">
                                What happens next?
                                <input
                                    type="text"
                                    className="sacred-modal__input"
                                    placeholder="e.g. Turn off phone"
                                    value={nodeModal.text}
                                    onChange={(e) => setNodeModal(prev => ({ ...prev, text: e.target.value }))}
                                    autoFocus
                                />
                            </label>
                            <div className="sacred-modal__actions">
                                <button
                                    type="button"
                                    className="sacred-modal__secondary"
                                    onClick={handleCloseNodeModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="sacred-modal__primary"
                                    disabled={!nodeModal.text.trim()}
                                >
                                    Add Step
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RsipPage;
