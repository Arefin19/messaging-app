import React, { useState, useEffect } from 'react';
import Button from './Button';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseconfig';
import { useAuthState } from 'react-firebase-hooks/auth';

const AddContact = ({ setShowItem, chats = [] }) => {
  const [user, loadingAuth] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loadingAuth && !user) {
      setError('You must be logged in to add contacts');
    }
  }, [user, loadingAuth]);

  const chatExists = () => {
    if (!Array.isArray(chats)) return false;
    return chats.some(chat => {
      return chat.users.includes(email.toLowerCase());
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (loadingAuth) {
      setError('Authentication still loading...');
      return;
    }

    if (!user) {
      setError('You must be logged in to add contacts');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setError('Please enter an email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (trimmedEmail === user.email.toLowerCase()) {
      setError('You cannot add yourself as a contact');
      return;
    }

    if (chatExists()) {
      setError('You already have a chat with this user');
      return;
    }

    try {
      setIsLoading(true);
      
      await addDoc(collection(db, "chats"), {
        users: [user.email.toLowerCase(), trimmedEmail],
        userEmails: {
          [user.email.toLowerCase()]: true,
          [trimmedEmail]: true
        },
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      
      setEmail('');
      setShowItem(false);
    } catch (err) {
      console.error("Error adding contact:", err);
      if (err.code === 'permission-denied') {
        setError('You don\'t have permission to add contacts');
      } else if (err.code === 'already-exists') {
        setError('Chat already exists with this user');
      } else {
        setError(err.message || 'Failed to add contact. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto ">
      <h1 className="text-2xl font-semibold mb-6 text-center text-white-800">Add New Contact</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Enter contact email"
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            disabled={isLoading || !user}
          />
        </div>
        
        {error && (
          <p className="text-red-500 text-sm text-center">
            {error}
          </p>
        )}
        
        <div className="flex justify-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={isLoading || !user}
            className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors ${
              isLoading || !user ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Adding...' : 'Add Contact'}
          </Button>
          
          <Button
            type="button"
            onClick={() => setShowItem(false)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddContact;