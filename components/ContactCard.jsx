import React from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckDouble,
  faMessage
} from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';

const ContactCard = ({ data, email, isActive, lastMessage, onClick }) => {
  const router = useRouter();

  const redirect = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/chat/${data.id}`);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const truncateMessage = (message, length = 25) => {
    if (!message) return '';
    return message.length > length 
      ? `${message.substring(0, length)}...` 
      : message;
  };

  // Function to get user profile picture with proper fallback
  const getUserProfilePicture = (userEmail) => {
    if (!userEmail) return null;
    
    // Generate a fallback avatar using the user's initial
    const initial = userEmail.charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${initial}&background=4F46E5&color=fff&size=40`;
  };

  const userProfilePic = getUserProfilePicture(email);

  // Check if user is online (you might want to pass this as prop or fetch from user data)
  const isOnline = false; // You can implement online status checking here

  // Check if there's an existing chat (for "Connected" badge)
  const hasExistingChat = data && data.id;

  return (
    <div
      onClick={redirect}
      className="flex items-center gap-3 p-3 hover:bg-gray-600/50 rounded-lg cursor-pointer transition-all mb-2"
    >
      <img 
        src={userProfilePic} 
        alt="User profile" 
        className="w-10 h-10 rounded-full object-cover"
        onError={(e) => {
          const initial = email.charAt(0).toUpperCase();
          e.target.src = `https://ui-avatars.com/api/?name=${initial}&background=4F46E5&color=fff&size=40`;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium truncate text-white">
            {email.split('@')[0]} {/* Show username part only, like displayName */}
          </h3>
         
          {lastMessage?.timestamp && !hasExistingChat && (
            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
              {formatTime(lastMessage.timestamp)}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">
          {email}
        </p>
        
        {/* Last Message Preview or Online Status */}
        {lastMessage ? (
          <div className="flex items-center gap-1.5 mt-1">
            {lastMessage.sender === email ? (
              <>
                <span className="text-gray-300 text-xs truncate">
                  {truncateMessage(lastMessage.text)}
                </span>
                <FontAwesomeIcon 
                  icon={lastMessage.read ? faCheckDouble : faMessage} 
                  className={`text-xs ${
                    lastMessage.read ? 'text-cyan-400' : 'text-gray-400'
                  }`} 
                />
              </>
            ) : (
              <span className="text-gray-400 text-xs truncate">
                You: {truncateMessage(lastMessage.text)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-1">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-gray-400">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactCard;