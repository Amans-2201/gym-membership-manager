// client/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Using axios
import './App.css';

// --- Helper Function to Format Date ---
// Ensures date from DB (YYYY-MM-DDTHH:mm:ss.sssZ) or Date object is formatted to YYYY-MM-DD
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Adjust for timezone offset to get local date correct
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().split('T')[0];
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return ''; // Return empty or a default if formatting fails
    }
};


// --- AddMemberForm Component ---
function AddMemberForm({ onMemberAdded, editingMember, onUpdateComplete, setEditingMember }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [membershipType, setMembershipType] = useState('Basic');
    const [joinDate, setJoinDate] = useState(formatDateForInput(new Date())); // Default to today
    const [status, setStatus] = useState('Active');
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

     // Effect to populate form when editingMember changes
    useEffect(() => {
        if (editingMember) {
            setName(editingMember.name);
            setEmail(editingMember.email);
            setMembershipType(editingMember.membership_type || 'Basic');
            setJoinDate(formatDateForInput(editingMember.join_date));
            setStatus(editingMember.status || 'Active');
            setIsEditing(true);
             setError(''); // Clear previous errors
        } else {
            // Reset form if editingMember is null (i.e., cancelled or completed)
             resetForm();
        }
    }, [editingMember]);


    const resetForm = () => {
         setName('');
         setEmail('');
         setMembershipType('Basic');
         setJoinDate(formatDateForInput(new Date()));
         setStatus('Active');
         setError('');
         setIsEditing(false);
         setEditingMember(null); // Clear editing state in parent
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors

        if (!name || !email || !joinDate) {
            setError('Name, Email, and Join Date are required.');
            return;
        }

        const memberData = {
            name,
            email,
            membership_type: membershipType,
            join_date: joinDate,
            status,
        };

        try {
             if (isEditing && editingMember) {
                 // --- Update existing member ---
                const response = await axios.put(`/api/members/${editingMember.id}`, memberData);
                onUpdateComplete(response.data); // Pass updated member data back to parent
                console.log('Member updated:', response.data);
             } else {
                 // --- Add new member ---
                const response = await axios.post('/api/members', memberData);
                onMemberAdded(response.data); // Pass new member data back to parent
                console.log('Member added:', response.data);
             }
            resetForm(); // Clear the form fields and editing state
        } catch (err) {
            console.error('Error saving member:', err);
            const errorMsg = err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'add'} member. Please try again.`;
             const details = err.response?.data?.details;
            setError(`${errorMsg}${details ? ` (${details})` : ''}`);
        }
    };

    return (
        <div className="add-member-form">
            <h2>{isEditing ? 'Edit Member' : 'Add New Member'}</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Name:</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="membershipType">Membership Type:</label>
                    <select
                        id="membershipType"
                        value={membershipType}
                        onChange={(e) => setMembershipType(e.target.value)}
                    >
                        <option value="Basic">Basic</option>
                        <option value="Premium">Premium</option>
                        <option value="VIP">VIP</option>
                        <option value="Family">Family</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="joinDate">Join Date:</label>
                    <input
                        type="date"
                        id="joinDate"
                        value={joinDate}
                        onChange={(e) => setJoinDate(e.target.value)}
                        required
                    />
                </div>
                 <div className="form-group">
                    <label htmlFor="status">Status:</label>
                    <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Expired">Expired</option>
                    </select>
                </div>
                <div className="form-actions">
                    <button type="submit">{isEditing ? 'Update Member' : 'Add Member'}</button>
                     {isEditing && (
                        <button type="button" onClick={resetForm}>Cancel Edit</button>
                     )}
                </div>
            </form>
        </div>
    );
}


// --- MemberList Component ---
function MemberList({ members, onDeleteMember, onEditMember }) {
     if (!members || members.length === 0) {
        return <p>No members found.</p>;
     }

    return (
        <div className="member-list">
            <h2>Current Members ({members.length})</h2>
            <ul>
                {members.map((member) => (
                    <li key={member.id}>
                        <span>{member.name}</span>
                        <span className="member-email">{member.email}</span>
                        <span>{member.membership_type}</span>
                        <span>Joined: {formatDateForInput(member.join_date)}</span>
                         <span className={`member-status status-${member.status}`}>{member.status}</span>
                        <div>
                             <button className="edit-button" onClick={() => onEditMember(member)}>Edit</button>
                            <button onClick={() => onDeleteMember(member.id)}>Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// --- Main App Component ---
function App() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingMember, setEditingMember] = useState(null); // State to hold member being edited

    // Fetch members when component mounts
    const fetchMembers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // The proxy in package.json handles directing this to http://localhost:5001/api/members
            const response = await axios.get('/api/members');
            setMembers(response.data);
        } catch (err) {
            console.error("Error fetching members:", err);
             const errorMsg = err.response?.data?.error || "Could not fetch members. Is the backend server running?";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependency array means this runs once on mount

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]); // fetchMembers is stable due to useCallback

    // Handler for adding a new member
    const handleMemberAdded = (newMember) => {
         // Add the new member to the list and sort
        setMembers(prevMembers => [...prevMembers, newMember].sort((a, b) => a.name.localeCompare(b.name)));
    };

    // Handler for deleting a member
    const handleDeleteMember = async (id) => {
         if (window.confirm('Are you sure you want to delete this member?')) {
             try {
                await axios.delete(`/api/members/${id}`);
                setMembers(prevMembers => prevMembers.filter(member => member.id !== id));
                // If the deleted member was being edited, clear the form
                if (editingMember && editingMember.id === id) {
                    setEditingMember(null);
                }
             } catch (err) {
                console.error("Error deleting member:", err);
                 const errorMsg = err.response?.data?.error || "Failed to delete member.";
                setError(`Error deleting member: ${errorMsg}`); // Show error to user
             }
         }
    };

    // Handler for initiating edit
    const handleEditMember = (member) => {
         setEditingMember(member);
         window.scrollTo(0, 0); // Scroll to top to see the form
    };

    // Handler for completing an update
     const handleUpdateComplete = (updatedMember) => {
         setMembers(prevMembers =>
            prevMembers.map(m => (m.id === updatedMember.id ? updatedMember : m))
                     .sort((a, b) => a.name.localeCompare(b.name))
         );
         setEditingMember(null); // Clear editing state
    };


    return (
        <div className="App">
            <h1>Gym Membership Management</h1>

            {error && <p className="error">{error}</p>}

            <AddMemberForm
                onMemberAdded={handleMemberAdded}
                editingMember={editingMember} // Pass member to edit
                onUpdateComplete={handleUpdateComplete} // Pass update handler
                setEditingMember={setEditingMember} // Allow form to clear editing state
            />

            {loading ? (
                <p className="loading">Loading members...</p>
            ) : (
                <MemberList
                    members={members}
                    onDeleteMember={handleDeleteMember}
                    onEditMember={handleEditMember} // Pass edit handler
                />
            )}
        </div>
    );
}

export default App;