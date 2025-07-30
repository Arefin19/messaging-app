// components/ContactCard.jsx - Updated to display profile pictures properly
import React from 'react';
import { getUserProfilePicture, handleProfilePictureError } from '../utlis/profilePicture';

const ContactCard = ({ data, email, otherUserData, onClick, isActive }) => {
  // Use otherUserData if available, otherwise create basic user object
  const userData = otherUserData || { 
    email: email, 
    displayName: email?.split('@')[0] || 'Unknown User' 
  };
  
  // Get profile picture using the userData
  const profilePic = getUserProfilePicture(userData, 40);
  
  // Format last message or show default
  const lastMessage = data?.lastMessage || 'No messages yet';
  const displayName = userData.displayName || email?.split('@')[0] || 'Unknown User';
  
  // Format last seen/timestamp if available
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all mb-2 ${
        isActive 
          ? 'bg-dPri text-white' 
          : 'hover:bg-gray-600/50 text-white'
      }`}
    >
      {/* Profile Picture */}
      <div className="relative flex-shrink-0">
        <img 
          src={profilePic}
          alt={`${displayName} profile`}
          className="w-12 h-12 rounded-full object-cover "
          onError={(e) => handleProfilePictureError(e, userData, 40)}
        />
        {/* Online indicator */}
        {userData.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </div>
      
      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium truncate">
            {displayName}
          </h3>
          {data?.lastUpdated && (
            <span className="text-xs opacity-70">
              {formatTimestamp(data.lastUpdated)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm opacity-70 truncate">
            {lastMessage}
          </p>
          
          {/* Unread count (if you implement it later) */}
          {data?.unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {data.unreadCount}
            </span>
          )}
        </div>
        
        {/* User email for reference */}
        <p className="text-xs opacity-50 truncate mt-1">
          {email}
        </p>
      </div>
    </div>
  );
};

export default ContactCard;