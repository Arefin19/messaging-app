import React from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckDouble,
  faMessage
} from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';

const ContactCard = ({ data, email, isActive, lastMessage }) => {
  const router = useRouter();

  const redirect = () => {
    router.push(`/chat/${data.id}`);
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

  return (
    <div 
      className={`flex items-center p-4 cursor-pointer transition-all duration-200 ${
        isActive 
          ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-l-2 border-cyan-400' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/20'
      } rounded-lg`}
      onClick={redirect}
    >
      {/* Profile Avatar */}
      <div className="relative mr-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium shadow-sm">
          {email.charAt(0).toUpperCase()}
        </div>
        {data.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 bg-green-400" />
        )}
      </div>

      {/* Contact Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-800 dark:text-gray-100 font-medium truncate">
            {email}
          </h2>
          {lastMessage?.timestamp && (
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
              {formatTime(lastMessage.timestamp)}
            </span>
          )}
        </div>

        {/* Last Message Preview */}
        {lastMessage && (
          <div className="flex items-center gap-1.5 mt-1">
            {lastMessage.sender === email ? (
              <>
                <span className="text-gray-600 dark:text-gray-300 text-sm truncate">
                  {truncateMessage(lastMessage.text)}
                </span>
                <FontAwesomeIcon 
                  icon={lastMessage.read ? faCheckDouble : faMessage} 
                  className={`text-xs ${
                    lastMessage.read ? 'text-cyan-500 dark:text-cyan-400' : 'text-gray-400'
                  }`} 
                />
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 text-sm truncate">
                You: {truncateMessage(lastMessage.text)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactCard;