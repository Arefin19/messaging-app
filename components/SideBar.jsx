import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRightFromBracket, 
  faSpinner, 
  faUser, 
  faPlus,
  faSearch,
  faEllipsisVertical,
  faMoon,
  faSun,
  faUsers,
  faComments,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import Button from './Button';
import ContactCard from './ContactCard';
import Modal from './Modal';
import AddContact from './AddContact';
import Logout from './Logout';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseconfig';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebaseconfig';
import getOtherUser from '../utlis/getOtherUser';

const SideBar = ({ setSelectedChat, darkMode, toggleDarkMode }) => {
  const [user, loadingAuth, authError] = useAuthState(auth);
  const [chats, setChats] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showLogoutPop, setShowLogoutPop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [debugInfo, setDebugInfo] = useState({});

  // Debug authentication state
  useEffect(() => {
    console.log('Auth State:', { user: user?.email, loadingAuth, authError });
    setDebugInfo(prev => ({
      ...prev,
      authState: { 
        userEmail: user?.email, 
        loadingAuth, 
        authError: authError?.message 
      }
    }));
  }, [user, loadingAuth, authError]);

  // Update user's online status when component mounts
  useEffect(() => {
    if (!user?.email) {
      console.log('No user email, skipping status update');
      return;
    }

    const updateUserStatus = async () => {
      try {
        console.log('Updating user status for:', user.email);
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          email: user.email.toLowerCase(),
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || '',
          lastSeen: serverTimestamp(),
          isOnline: true,
          uid: user.uid
        }, { merge: true });
        console.log('User status updated successfully');
        
        setDebugInfo(prev => ({
          ...prev,
          userStatusUpdate: 'Success'
        }));
      } catch (error) {
        console.error('Error updating user status:', error);
        setDebugInfo(prev => ({
          ...prev,
          userStatusUpdate: error.message
        }));
      }
    };

    updateUserStatus();

    // Update status when user goes offline
    const handleBeforeUnload = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error updating offline status:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Fetch all users from Firestore
  useEffect(() => {
    if (!user?.email) {
      console.log('No user email, skipping users fetch');
      setUsersLoading(false);
      return;
    }

    console.log('Starting to fetch users...');
    setUsersLoading(true);
    const usersRef = collection(db, 'users');
    
    const unsubscribeUsers = onSnapshot(
      usersRef,
      (querySnapshot) => {
        console.log('Users snapshot received, size:', querySnapshot.size);
        const usersData = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          console.log('User document:', { id: doc.id, ...userData });
          // Exclude current user from the list
          if (userData.email !== user.email.toLowerCase()) {
            usersData.push({ 
              id: doc.id, 
              ...userData
            });
          }
        });
        console.log('Filtered users data:', usersData);
        setAllUsers(usersData);
        setUsersLoading(false);
        
        setDebugInfo(prev => ({
          ...prev,
          usersQuery: {
            totalDocs: querySnapshot.size,
            filteredUsers: usersData.length,
            currentUserEmail: user.email.toLowerCase()
          }
        }));
      },
      (err) => {
        console.error("Error fetching users:", err);
        setError('Failed to load users: ' + err.message);
        setUsersLoading(false);
        
        setDebugInfo(prev => ({
          ...prev,
          usersQueryError: err.message
        }));
      }
    );

    return () => {
      console.log('Unsubscribing from users listener');
      unsubscribeUsers();
    };
  }, [user]);

  // Fetch existing chats
  useEffect(() => {
    if (!user?.email) {
      console.log('No user email, skipping chats fetch');
      setLoading(false);
      return;
    }

    console.log('Starting to fetch chats for user:', user.email.toLowerCase());
    setLoading(true);
    const q = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log('Chats snapshot received, size:', querySnapshot.size);
        const chatsData = [];
        querySnapshot.forEach((doc) => {
          const chatData = doc.data();
          console.log('Chat document:', { id: doc.id, ...chatData });
          chatsData.push({ 
            id: doc.id, 
            ...chatData,
            users: chatData.users.map(email => email?.toLowerCase())
          });
        });
        console.log('Processed chats data:', chatsData);
        setChats(chatsData);
        setLoading(false);
        
        setDebugInfo(prev => ({
          ...prev,
          chatsQuery: {
            totalDocs: querySnapshot.size,
            chatsData: chatsData.length,
            queryEmail: user.email.toLowerCase()
          }
        }));
      },
      (err) => {
        console.error("Error fetching chats:", err);
        setError('Failed to load chats: ' + err.message);
        setLoading(false);
        
        setDebugInfo(prev => ({
          ...prev,
          chatsQueryError: err.message
        }));
      }
    );

    return () => {
      console.log('Unsubscribing from chats listener');
      unsubscribe();
    };
  }, [user]);

  // Create or get existing chat with a user
  const startChatWithUser = async (selectedUser) => {
    try {
      console.log('Starting chat with user:', selectedUser.email);
      
      // Check if chat already exists
      const existingChat = chats.find(chat => 
        chat.users.includes(selectedUser.email.toLowerCase()) && 
        chat.users.includes(user.email.toLowerCase())
      );

      if (existingChat) {
        console.log('Found existing chat:', existingChat.id);
        setSelectedChat(existingChat);
        return;
      }

      console.log('Creating new chat...');
      // Create new chat using the same structure as AddContact
      const newChatData = {
        users: [user.email.toLowerCase(), selectedUser.email.toLowerCase()],
        userEmails: {
          [user.email.toLowerCase()]: true,
          [selectedUser.email.toLowerCase()]: true
        },
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "chats"), newChatData);
      console.log('New chat created with ID:', docRef.id);
      
      // Set the new chat as selected
      const newChat = {
        id: docRef.id,
        ...newChatData
      };
      
      setSelectedChat(newChat);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to start chat: ' + error.message);
    }
  };

  // Function to get user profile picture with proper fallback
  const getUserProfilePicture = (user) => {
    if (!user) return null;
    
    // Check if photoURL exists and is a valid URL
    if (user.photoURL && user.photoURL.trim() !== '') {
      return user.photoURL;
    }
    
    // Generate a fallback avatar using the user's initial
    const initial = user.displayName ? 
      user.displayName.charAt(0).toUpperCase() : 
      user.email.charAt(0).toUpperCase();
    
    return `https://ui-avatars.com/api/?name=${initial}&background=random&color=fff&size=40`;
  };

  const filteredChats = chats.filter(chat => {
    const otherUserEmail = getOtherUser(chat.users, user?.email?.toLowerCase() || '');
    return otherUserEmail.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = allUsers.filter(userData => {
    const searchTerm = searchQuery.toLowerCase();
    return userData.displayName?.toLowerCase().includes(searchTerm) ||
           userData.email?.toLowerCase().includes(searchTerm);
  });

  // Show loading state while auth is loading
  if (loadingAuth) {
    return (
      <aside className='bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg flex flex-col h-full shadow-xl shadow-gray-900/50 w-full text-left text-lg text-white p-4'>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-dPri mb-2" />
            <p className='text-gray-300'>Loading authentication...</p>
          </div>
        </div>
      </aside>
    );
  }

  // Show error if auth failed
  if (authError) {
    return (
      <aside className='bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg flex flex-col h-full shadow-xl shadow-gray-900/50 w-full text-left text-lg text-white p-4'>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-400 mb-2" />
            <p className='text-red-400'>Authentication Error: {authError.message}</p>
          </div>
        </div>
      </aside>
    );
  }

  if (!user) {
    return (
      <aside className='bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg flex flex-col h-full shadow-xl shadow-gray-900/50 w-full text-left text-lg text-white p-4'>
        <div className="flex items-center justify-center h-full">
          <p className='text-gray-300'>Please log in to view chats</p>
        </div>
      </aside>
    );
  }

  const currentUserProfilePic = getUserProfilePicture(user);

  return (
    <aside className='bg-gradient-to-b from-gray-700 to-gray-800 relative rounded-lg flex flex-col h-full shadow-xl shadow-gray-900/50 w-full text-left text-white p-4'>
      {/* Header Section */}
      <div className="flex flex-col gap-3 border-b border-gray-600 pb-4">
        {/* User Info with Menu */}
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-x-3 cursor-pointer hover:bg-gray-600/50 rounded-lg p-2 transition-all"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <img 
              src={currentUserProfilePic} 
              alt="User profile" 
              className="w-10 h-10 rounded-full object-cover border-2 border-dPri"
              onError={(e) => {
                // If image fails to load, use initials fallback
                const initial = user.displayName ? 
                  user.displayName.charAt(0).toUpperCase() : 
                  user.email.charAt(0).toUpperCase();
                e.target.src = `https://ui-avatars.com/api/?name=${initial}&background=4F46E5&color=fff&size=40`;
              }}
            />
            <div>
              <h1 className="font-medium truncate max-w-[120px]">{user.displayName || user.email.split('@')[0]}</h1>
              <p className="text-xs text-gray-300">Online</p>
            </div>
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute left-4 top-20 bg-gray-700 rounded-lg shadow-lg z-50 w-48 overflow-hidden">
              <button 
                className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2"
                onClick={toggleDarkMode}
              >
                <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button 
                className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2"
                onClick={() => {
                  setShowLogoutPop(true);
                  setShowUserMenu(false);
                }}
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                Logout
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowLogoutPop(true)}
              aria-label="Logout"
              className="p-2 rounded-lg hover:bg-gray-600/50 transition-all"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-600/30 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-all ${
              activeTab === 'chats' 
                ? 'bg-dPri text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faComments} className="text-sm" />
            Chats ({chats.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-all ${
              activeTab === 'users' 
                ? 'bg-dPri text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faUsers} className="text-sm" />
            Users ({allUsers.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={activeTab === 'chats' ? "Search chats..." : "Search users..."}
            className="w-full bg-gray-600/50 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dPri"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* New Chat Button - Only show in chats tab */}
      {activeTab === 'chats' && (
        <Button 
          onClick={() => setShowAddContact(true)}
          className="mt-4 mb-3 w-full flex items-center justify-center gap-2"
          variant="primary"
        >
          <FontAwesomeIcon icon={faPlus} />
          New Chat
        </Button>
      )}

      {/* Add Contact Modal */}
      <Modal showItem={showAddContact} setShowItem={setShowAddContact}>
        <AddContact 
          setShowItem={setShowAddContact} 
          chats={chats}
        />
      </Modal>

      {/* Logout Modal */}
      <Modal showItem={showLogoutPop} setShowItem={setShowLogoutPop}>
        <Logout setShowItem={setShowLogoutPop} />
      </Modal>

      {/* Content Area */}
      <div className="w-full overflow-auto flex-1 px-1 py-2 custom-scrollbar">
        {/* Chats Tab Content */}
        {activeTab === 'chats' && (
          <>
            {loading ? (
              <div className="flex justify-center items-center h-20">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-dPri" />
              </div>
            ) : error && error.includes('chats') ? (
              <div className="text-center py-4">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 text-2xl mb-2" />
                <p className="text-red-400 text-sm">{error}</p>
                <p className="text-gray-400 text-xs mt-2">Check console for details</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                {searchQuery ? (
                  <>
                    <p>No chats found for "{searchQuery}"</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-dPri hover:underline mt-2"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mb-2">No chats yet</p>
                    
                  </>
                )}
              </div>
            ) : (
              filteredChats.map((chat) => {
                const otherUserEmail = getOtherUser(chat.users, user.email?.toLowerCase() || '');
                return (
                  <ContactCard 
                    key={chat.id}
                    data={chat}
                    email={otherUserEmail}
                    onClick={() => {
                      setSelectedChat(chat);
                      setSearchQuery('');
                    }}
                    isActive={false}
                  />
                );
              })
            )}
          </>
        )}

        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <>
            {usersLoading ? (
              <div className="flex justify-center items-center h-20">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-dPri" />
              </div>
            ) : error && error.includes('users') ? (
              <div className="text-center py-4">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 text-2xl mb-2" />
                <p className="text-red-400 text-sm">{error}</p>
                <p className="text-gray-400 text-xs mt-2">Check console for details</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                {searchQuery ? (
                  <>
                    <p>No users found for "{searchQuery}"</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-dPri hover:underline mt-2"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <p>No other users found</p>
                    <p className="text-xs mt-2">Users will appear here when they sign up</p>
                  </>
                )}
              </div>
            ) : (
              filteredUsers.map((userData) => {
                // Check if chat already exists with this user
                const existingChat = chats.find(chat => 
                  chat.users.includes(userData.email.toLowerCase())
                );

                const userProfilePic = getUserProfilePicture(userData);

                return (
                  <div
                    key={userData.id}
                    onClick={() => startChatWithUser(userData)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-600/50 rounded-lg cursor-pointer transition-all mb-2"
                  >
                    <img 
                      src={userProfilePic} 
                      alt="User profile" 
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        const initial = userData.displayName ? 
                          userData.displayName.charAt(0).toUpperCase() : 
                          userData.email.charAt(0).toUpperCase();
                        e.target.src = `https://ui-avatars.com/api/?name=${initial}&background=4F46E5&color=fff&size=40`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">
                          {userData.displayName}
                        </h3>
                        {existingChat && (
                          <span className="text-xs bg-dPri text-white px-2 py-1 rounded-full">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {userData.email}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${userData.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        <span className="text-xs text-gray-400">
                          {userData.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Status Bar */}
      <div className="text-xs text-gray-400 pt-2 border-t border-gray-600 mt-auto">
        <div className="flex justify-between items-center">
          <span>
            {activeTab === 'chats' 
              ? `${filteredChats.length} ${filteredChats.length === 1 ? 'chat' : 'chats'}`
              : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'}`
            }
          </span>
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};

export default SideBar;