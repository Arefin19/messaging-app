import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowCircleLeft,
  faPaperPlane,
  faSpinner,
  faUser,
  faEllipsisVertical,
  faCheck,
  faCheckDouble,
  faReply,
  faFaceSmile,
  faImage,
  faTimes,
  faPlay,
  faDownload,
  faHeart
} from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/router';
import { useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { addDoc, collection, doc, orderBy, query, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebaseconfig';
import { useAuthState } from 'react-firebase-hooks/auth';
import getOtherUser from '../utlis/getOtherUser';
import { getUserProfilePicture, handleProfilePictureError } from '../utlis/profilePicture';
import { 
  uploadToImgBB, 
  validateImageFile, 
  createImagePreview, 
  generateFallbackAvatar 
} from '../utlis/imgbbUpload';

// Simple emoji picker component
const EmojiPicker = ({ onEmojiSelect, onClose, isVisible }) => {
  const emojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
    '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
    '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳',
    '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
    '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯',
    '😳', '🥵', '🥶', '😶', '😐', '😑', '😬', '🙄', '😯', '😦',
    '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴',
    '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿',
    '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
    '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
    '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
    '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊',
    '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅'
  ];

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-14 left-0 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-4 w-80 max-h-60 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-800 dark:text-white">Choose an emoji</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

// Quick reaction picker component
const QuickReactionPicker = ({ onReactionSelect, onClose, isVisible, position = { top: 0, left: 0 } }) => {
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bg-white dark:bg-gray-700 rounded-full shadow-xl border border-gray-200 dark:border-gray-600 p-2 z-50 flex gap-1"
      style={{ 
        top: position.top - 60, 
        left: Math.max(10, position.left - 120),
        transform: 'translateX(0)'
      }}
    >
      {quickReactions.map((reaction, index) => (
        <button
          key={index}
          onClick={() => {
            onReactionSelect(reaction);
            onClose();
          }}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full text-xl transition-all hover:scale-110"
        >
          {reaction}
        </button>
      ))}
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full text-sm transition-colors text-gray-500"
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  );
};

// Message context menu component
const MessageContextMenu = ({ 
  isVisible, 
  position, 
  onReply, 
  onReact, 
  onCopy, 
  onDelete, 
  onClose, 
  canDelete 
}) => {
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      <div 
        className="fixed bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-2 z-50 min-w-[150px]"
        style={{ 
          top: position.top, 
          left: position.left,
          transform: 'translateY(-50%)'
        }}
      >
        <button
          onClick={() => { onReply(); onClose(); }}
          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3 text-gray-800 dark:text-gray-200"
        >
          <FontAwesomeIcon icon={faReply} className="text-sm" />
          Reply
        </button>
        <button
          onClick={() => { onReact(); onClose(); }}
          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3 text-gray-800 dark:text-gray-200"
        >
          <FontAwesomeIcon icon={faFaceSmile} className="text-sm" />
          React
        </button>
        <button
          onClick={() => { onCopy(); onClose(); }}
          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3 text-gray-800 dark:text-gray-200"
        >
          📋 Copy
        </button>
        {canDelete && (
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3 text-red-500"
          >
            🗑️ Delete
          </button>
        )}
      </div>
    </>
  );
};

// Enhanced Image preview component with upload progress
const ImagePreview = ({ file, onRemove, uploadProgress = null, isUploading = false }) => {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }, [file]);

  if (!preview) return null;

  return (
    <div className="relative inline-block mr-2 mb-2">
      <img 
        src={preview} 
        alt="Preview" 
        className={`w-20 h-20 object-cover rounded-lg border border-gray-300 ${isUploading ? 'opacity-60' : ''}`}
      />
      
      {/* Upload progress overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="text-white animate-spin mb-1" />
            <div className="text-xs text-white">
              {uploadProgress || 'Uploading...'}
            </div>
          </div>
        </div>
      )}
      
      {/* Remove button */}
      {!isUploading && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      )}
    </div>
  );
};

// Reaction display component
const MessageReactions = ({ reactions, onReactionClick, currentUserEmail }) => {
  if (!reactions || Object.keys(reactions).length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(reactions).map(([emoji, users]) => {
        const hasReacted = users.includes(currentUserEmail);
        const count = users.length;
        
        return (
          <button
            key={emoji}
            onClick={() => onReactionClick(emoji)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105 ${
              hasReacted 
                ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600' 
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>{emoji}</span>
            <span className="text-xs">{count}</span>
          </button>
        );
      })}
    </div>
  );
};

const Message = ({ 
  messageId,
  messageIndex,
  sender, 
  text, 
  time, 
  isSameSender, 
  isLastMessage, 
  userPhoto, 
  otherUserPhoto, 
  imageUrl, 
  images,
  replyTo,
  reactions,
  onReply,
  onReact,
  onContextMenu,
  currentUserEmail
}) => {
  const formattedTime = time?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '';
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [reactionPosition, setReactionPosition] = useState({ top: 0, left: 0 });

  // Use messageIndex as fallback for messageId
  const effectiveMessageId = messageId || messageIndex;

  const handleLongPress = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    onContextMenu(effectiveMessageId, {
      top: rect.top + window.scrollY,
      left: rect.right + window.scrollX
    });
  };

  const handleDoubleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setReactionPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX + rect.width / 2
    });
    setShowQuickReactions(true);
  };

  const handleReactionSelect = (emoji) => {
    console.log('Selecting reaction:', emoji, 'for message:', effectiveMessageId);
    onReact(effectiveMessageId, emoji);
    setShowQuickReactions(false);
  };

  const handleReactionClick = (emoji) => {
    console.log('Clicking reaction:', emoji, 'for message:', effectiveMessageId);
    onReact(effectiveMessageId, emoji);
  };

  // Get all images (support both single imageUrl and multiple images array)
  const allImages = images && images.length > 0 ? images : (imageUrl ? [imageUrl] : []);

  return (
    <>
      <div className={`flex ${sender ? 'justify-end' : 'justify-start'} mb-1 px-2 group`}>
        <div className={`flex max-w-xs md:max-w-md lg:max-w-lg ${isSameSender ? 'mt-1' : 'mt-3'}`}>
          {!sender && !isSameSender && (
            <div className="flex-shrink-0 mr-2 self-end">
              {otherUserPhoto ? (
                <img
                  src={otherUserPhoto}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=U&background=4F46E5&color=fff&size=32`;
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  U
                </div>
              )}
            </div>
          )}

          {!sender && isSameSender && <div className="flex-shrink-0 mr-2 w-8"></div>}

          <div className={`flex flex-col ${sender ? 'items-end' : 'items-start'} relative`}>
            {!isSameSender && (
              <span className={`text-xs font-medium mb-1 ${sender ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                {sender ? 'You' : 'Other User'}
              </span>
            )}

            <div
              className={`px-4 py-2 rounded-lg relative cursor-pointer select-none ${
                sender
                  ? 'bg-blue-500 text-white rounded-tr-none'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none'
              } ${isSameSender ? sender ? 'rounded-tr-lg' : 'rounded-tl-lg' : ''}`}
              onContextMenu={handleLongPress}
              onDoubleClick={handleDoubleClick}
              onTouchStart={(e) => {
                const touchStartTime = Date.now();
                const timer = setTimeout(() => {
                  if (Date.now() - touchStartTime >= 500) {
                    handleLongPress(e);
                  }
                }, 500);
                
                e.currentTarget.addEventListener('touchend', () => {
                  clearTimeout(timer);
                }, { once: true });
              }}
            >
              {/* Reply preview */}
              {replyTo && (
                <div className={`mb-2 p-2 rounded border-l-2 ${
                  sender ? 'border-blue-300 bg-blue-400/20' : 'border-gray-400 bg-gray-300/20'
                }`}>
                  <p className="text-xs opacity-75">
                    Replying to {replyTo.sender === currentUserEmail ? 'yourself' : 'other user'}
                  </p>
                  <p className="text-sm truncate">{replyTo.message}</p>
                </div>
              )}

              {/* Images content */}
              {allImages.length > 0 && (
                <div className="mb-2">
                  {allImages.length === 1 ? (
                    <img 
                      src={allImages[0]} 
                      alt="Shared image" 
                      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(allImages[0], '_blank')}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {allImages.slice(0, 4).map((img, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={img} 
                            alt={`Shared image ${index + 1}`} 
                            className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(img, '_blank')}
                          />
                          {index === 3 && allImages.length > 4 && (
                            <div className="absolute inset-0 bg-black bg-opacity-60 rounded flex items-center justify-center text-white font-bold">
                              +{allImages.length - 4}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Text content */}
              {text && <p className="whitespace-pre-wrap break-words">{text}</p>}

              {/* Quick action buttons (visible on hover/touch) */}
              <div className={`absolute ${sender ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full shadow-lg p-1 flex gap-1`}>
                <button
                  onClick={() => onReply(effectiveMessageId, text, sender)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  title="Reply"
                >
                  <FontAwesomeIcon icon={faReply} className="text-xs" />
                </button>
                <button
                  onClick={handleDoubleClick}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  title="React"
                >
                  <FontAwesomeIcon icon={faFaceSmile} className="text-xs" />
                </button>
              </div>
            </div>

            {/* Message reactions */}
            <MessageReactions 
              reactions={reactions}
              onReactionClick={handleReactionClick}
              currentUserEmail={currentUserEmail}
            />

            <div className={`flex items-center mt-1 space-x-1 ${sender ? 'flex-row-reverse' : ''}`}>
              <span className="text-xs text-gray-500 dark:text-gray-400">{formattedTime}</span>
              {sender && (
                <span className="text-xs">
                  {isLastMessage ? (
                    <FontAwesomeIcon icon={faCheckDouble} className="text-blue-400 dark:text-blue-300" />
                  ) : (
                    <FontAwesomeIcon icon={faCheck} className="text-gray-400" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick reaction picker */}
      <QuickReactionPicker
        isVisible={showQuickReactions}
        position={reactionPosition}
        onReactionSelect={handleReactionSelect}
        onClose={() => setShowQuickReactions(false)}
      />
    </>
  );
};

const ChatBox = () => {
  const [user] = useAuthState(auth);
  const [textBox, setTextBox] = useState('');
  const router = useRouter();
  const { id } = router.query;
  const messagesRef = collection(db, `chats/${id}/messages`);
  const messagesQuery = query(messagesRef, orderBy('timestamp'));
  
  // Use custom hook to get messages with document IDs
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setMessages(messagesData);
      setLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [id]);
  
  const [chat, loadingChat] = useDocumentData(doc(db, `chats/${id}`));
  const scrollEnd = useRef();
  const textInputRef = useRef();
  const fileInputRef = useRef();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [contextMenu, setContextMenu] = useState({ isVisible: false, messageId: null, position: { top: 0, left: 0 } });

  // ImgBB API key - You need to get this from https://api.imgbb.com/
  const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || 'YOUR_IMGBB_API_KEY_HERE';

  const handleSend = async () => {
    const trimmedText = textBox?.trim() || '';
    if ((!trimmedText && selectedFiles.length === 0) || !user?.email || isSending) return;

    try {
      setIsSending(true);
      setError(null);
      setUploadProgress('');

      let imageUrls = [];

      // Upload images to ImgBB if any
      if (selectedFiles.length > 0) {
        if (!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') {
          throw new Error('ImgBB API key is not configured. Please add NEXT_PUBLIC_IMGBB_API_KEY to your environment variables.');
        }

        setIsUploading(true);
        setUploadProgress('Starting image upload...');
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          try {
            setUploadProgress(`Uploading image ${i + 1} of ${selectedFiles.length}...`);
            console.log(`Uploading image ${i + 1}:`, file.name);
            
            // Validate file before upload
            const validation = validateImageFile(file);
            if (!validation.isValid) {
              throw new Error(`Invalid file ${file.name}: ${validation.error}`);
            }
            
            const imageUrl = await uploadToImgBB(file, IMGBB_API_KEY);
            imageUrls.push(imageUrl);
            console.log(`✅ Image ${i + 1} uploaded successfully:`, imageUrl);
            
          } catch (uploadError) {
            console.error(`Failed to upload image ${i + 1}:`, uploadError);
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }
        }
        setIsUploading(false);
        setUploadProgress('Images uploaded successfully!');
        console.log('✅ All images uploaded to ImgBB:', imageUrls);
      }

      // Create message data
      const messageData = {
        message: trimmedText,
        sender: user.email,
        timestamp: serverTimestamp(),
        read: false,
        reactions: {}
      };

      // Add image data if available
      if (imageUrls.length > 0) {
        messageData.images = imageUrls;
        messageData.imageUrl = imageUrls[0]; // Keep for backward compatibility
        messageData.imageUploadSource = 'imgbb';
      }

      // Add reply data if replying
      if (replyingTo) {
        messageData.replyTo = {
          message: replyingTo.message,
          sender: replyingTo.sender,
          messageId: replyingTo.messageId
        };
      }

      // Save message to Firestore
      setUploadProgress('Saving message...');
      await addDoc(messagesRef, messageData);

      // Update chat's last message
      await updateDoc(doc(db, `chats/${id}`), {
        lastUpdated: serverTimestamp(),
        lastMessage: trimmedText || `📷 ${imageUrls.length > 1 ? `${imageUrls.length} Images` : 'Image'}`
      });

      // Reset form
      setTextBox('');
      setReplyingTo(null);
      setSelectedFiles([]);
      setUploadProgress('');
      console.log('✅ Message sent successfully');

    } catch (err) {
      console.error("Error sending message:", err);
      setError(`Failed to send message: ${err.message}`);
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleReply = (messageId, messageText, isOwnMessage) => {
    if (!messageId) return;
    
    console.log('Handling reply:', { messageId, messageText, isOwnMessage });
    
    // Find the message using multiple matching strategies
    const message = messages?.find((msg, index) => {
      return msg.id === messageId ||
             msg.timestamp?.seconds === messageId || 
             index.toString() === messageId.toString() ||
             `${msg.timestamp?.seconds || index}` === messageId.toString();
    });
    
    setReplyingTo({
      messageId: messageId,
      message: messageText,
      sender: message?.sender || (isOwnMessage ? user?.email : 'other')
    });
    textInputRef.current?.focus();
  };

  const handleReact = async (messageId, emoji) => {
    if (!user?.email || !messageId) return;

    try {
      console.log('Handling reaction:', { messageId, emoji, userEmail: user.email });
      console.log('Available messages:', messages.map(m => ({ id: m.id, timestamp: m.timestamp?.seconds })));
      
      // Find the message in our current messages array
      const message = messages?.find((msg, index) => {
        const match = msg.id === messageId || 
               msg.timestamp?.seconds === messageId || 
               index.toString() === messageId.toString() ||
               `${msg.timestamp?.seconds || index}` === messageId.toString();
        
        if (match) {
          console.log('Found matching message:', { msgId: msg.id, searchId: messageId, index });
        }
        return match;
      });
      
      if (!message) {
        console.error('Message not found for reaction. MessageId:', messageId);
        console.error('Available message IDs:', messages.map(m => m.id));
        setError('Message not found. Please try again.');
        return;
      }

      console.log('Found message for reaction:', { id: message.id, timestamp: message.timestamp?.seconds });
      
      // Use the message ID directly
      const docId = message.id;
      if (!docId) {
        console.error('No document ID available for message:', message);
        setError('Unable to identify message. Please refresh and try again.');
        return;
      }

      console.log('Using document ID:', docId);
      
      const messageRef = doc(db, `chats/${id}/messages`, docId);
      
      const currentReactions = message.reactions || {};
      const currentUsersForEmoji = currentReactions[emoji] || [];
      
      let updatedReactions = { ...currentReactions };
      
      if (currentUsersForEmoji.includes(user.email)) {
        // Remove reaction
        updatedReactions[emoji] = currentUsersForEmoji.filter(email => email !== user.email);
        if (updatedReactions[emoji].length === 0) {
          delete updatedReactions[emoji];
        }
        console.log('Removing reaction');
      } else {
        // Add reaction
        updatedReactions[emoji] = [...currentUsersForEmoji, user.email];
        console.log('Adding reaction');
      }

      console.log('Updating reactions from:', currentReactions, 'to:', updatedReactions);

      await updateDoc(messageRef, {
        reactions: updatedReactions
      });
      
      console.log('Reaction updated successfully');
      
      // Clear any previous errors
      setError(null);
    } catch (error) {
      console.error('Error updating reaction:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setError(`Failed to update reaction: ${error.message}`);
    }
  };

  const handleContextMenu = (messageId, position) => {
    setContextMenu({
      isVisible: true,
      messageId,
      position
    });
  };

  const handleCopyMessage = () => {
    if (!contextMenu.messageId) return;
    
    const message = messages?.find((msg, index) => {
      return msg.id === contextMenu.messageId ||
             msg.timestamp?.seconds === contextMenu.messageId || 
             index.toString() === contextMenu.messageId.toString() ||
             `${msg.timestamp?.seconds || index}` === contextMenu.messageId.toString();
    });
    if (message?.message) {
      navigator.clipboard.writeText(message.message);
    }
  };

  const handleDeleteMessage = async () => {
    // Implementation for message deletion
    console.log('Delete message:', contextMenu.messageId);
  };

  const handleKeys = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setTextBox(e.target.value || '');
  };

  const handleEmojiSelect = (emoji) => {
    setTextBox(prev => prev + emoji);
    textInputRef.current?.focus();
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    let hasErrors = false;

    files.forEach(file => {
      const validation = validateImageFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        console.error(`Invalid file ${file.name}:`, validation.error);
        setError(`${file.name}: ${validation.error}`);
        hasErrors = true;
      }
    });

    if (validFiles.length > 0) {
      // Limit to maximum 5 images
      const totalFiles = selectedFiles.length + validFiles.length;
      if (totalFiles > 5) {
        setError('Maximum 5 images allowed per message');
        const allowedCount = 5 - selectedFiles.length;
        setSelectedFiles(prev => [...prev, ...validFiles.slice(0, allowedCount)]);
      } else {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        if (!hasErrors) {
          setError(null);
        }
      }
    }

    // Reset file input
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFiles.length <= 1) {
      setError(null); // Clear errors when removing files
    }
  };

  useEffect(() => {
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [id]);

  useEffect(() => {
    if (scrollEnd.current && messages?.length) {
      scrollEnd.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  if (loadingChat) {
    return (
      <section className='bg-gray-100 dark:bg-gray-800 relative flex flex-col rounded-xl h-full shadow-lg w-full text-left'>
        <div className="flex items-center justify-center h-full">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-blue-500" />
        </div>
      </section>
    );
  }

  if (!chat) {
    return (
      <section className='bg-gray-100 dark:bg-gray-800 relative flex flex-col rounded-xl h-full shadow-lg w-full text-left'>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <FontAwesomeIcon icon={faUser} className="text-2xl text-gray-500 dark:text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Chat not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </section>
    );
  }

  const otherUserEmail = getOtherUser(chat.users, user?.email || '');
  const currentUserProfilePic = getUserProfilePicture(user, 32);

  return (
    <section className='bg-gray-100 dark:bg-gray-800 relative flex flex-col rounded-xl h-full shadow-lg w-full text-left'>
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-700 rounded-t-xl border-b border-gray-200 dark:border-gray-600 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            className='lg:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <FontAwesomeIcon
              icon={faArrowCircleLeft}
              className='text-blue-500 text-xl'
            />
          </button>

          <div className="relative">
            <img
              src={currentUserProfilePic}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-400"
              onError={(e) => handleProfilePictureError(e, user, 40)}
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-700"></div>
          </div>

          <div>
            <h1 className='text-lg font-semibold text-gray-800 dark:text-white'>
              {otherUserEmail || 'Unknown User'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {messages?.[messages.length - 1]?.timestamp?.toDate()
                ? `Last seen ${new Date(messages[messages.length - 1].timestamp.toDate()).toLocaleTimeString()}`
                : 'Online'}
            </p>
          </div>
        </div>

        <button
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors relative"
          onClick={() => setShowOptions(!showOptions)}
          aria-label="More options"
        >
          <FontAwesomeIcon
            icon={faEllipsisVertical}
            className="text-gray-600 dark:text-gray-300"
          />
          {showOptions && (
            <div className="absolute right-0 top-10 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-xl py-1 z-20 border border-gray-200 dark:border-gray-600">
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">
                View profile
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">
                Mute notifications
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-red-500">
                Delete chat
              </button>
            </div>
          )}
        </button>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 w-full p-2 overflow-y-auto bg-gray-50 dark:bg-gray-900/30">
        {loadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-500" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FontAwesomeIcon icon={faPaperPlane} className="text-3xl text-blue-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">
              No messages yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Start the conversation by sending your first message to {otherUserEmail || 'your contact'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages?.map((msg, i) => (
              <Message
                key={`${msg.id || msg.timestamp?.seconds || i}-${i}`}
                messageId={msg.timestamp?.seconds}
                messageIndex={i}
                messageDocId={msg.id}
                sender={msg.sender === user?.email}
                text={msg.message}
                time={msg.timestamp}
                isSameSender={i > 0 && messages[i - 1].sender === msg.sender}
                isLastMessage={i === messages.length - 1}
                userPhoto={currentUserProfilePic}
                otherUserPhoto={null}
                imageUrl={msg.imageUrl}
                images={msg.images}
                replyTo={msg.replyTo}
                reactions={msg.reactions}
                onReply={handleReply}
                onReact={handleReact}
                onContextMenu={handleContextMenu}
                currentUserEmail={user?.email}
              />
            ))}
          </div>
        )}
        <div ref={scrollEnd} />
      </div>

      {/* Message Context Menu */}
      <MessageContextMenu
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        onReply={() => {
          if (!contextMenu.messageId) return;
          
          const message = messages?.find((msg, index) => {
            return msg.id === contextMenu.messageId ||
                   msg.timestamp?.seconds === contextMenu.messageId || 
                   index.toString() === contextMenu.messageId.toString() ||
                   `${msg.timestamp?.seconds || index}` === contextMenu.messageId.toString();
          });
          if (message) {
            handleReply(contextMenu.messageId, message.message, message.sender === user?.email);
          }
        }}
        onReact={() => {
          // Show quick reactions for the selected message
          const messageElement = document.querySelector(`[data-message-id="${contextMenu.messageId}"]`);
          if (messageElement) {
            const rect = messageElement.getBoundingClientRect();
            // Trigger reaction picker
          }
        }}
        onCopy={handleCopyMessage}
        onDelete={handleDeleteMessage}
        onClose={() => setContextMenu({ isVisible: false, messageId: null, position: { top: 0, left: 0 } })}
        canDelete={contextMenu.messageId ? messages?.find((msg, index) => {
          return msg.id === contextMenu.messageId ||
                 msg.timestamp?.seconds === contextMenu.messageId || 
                 index.toString() === contextMenu.messageId.toString() ||
                 `${msg.timestamp?.seconds || index}` === contextMenu.messageId.toString();
        })?.sender === user?.email : false}
      />

      {/* Reply preview */}
      {replyingTo && (
        <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 border-t border-gray-300 dark:border-gray-600">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Replying to {replyingTo.sender === user?.email ? 'yourself' : 'other user'}
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <div className="text-sm truncate text-gray-800 dark:text-gray-200">
            {replyingTo.message}
          </div>
        </div>
      )}

      {/* File previews */}
      {selectedFiles.length > 0 && (
        <div className="p-3 bg-gray-100 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600">
          <div className="flex flex-wrap">
            {selectedFiles.map((file, index) => (
              <ImagePreview 
                key={index} 
                file={file} 
                onRemove={() => removeFile(index)}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
              />
            ))}
          </div>
          {selectedFiles.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {selectedFiles.length}/5 images selected
            </div>
          )}
        </div>
      )}

      {/* Message input */}
      <div className="p-3 bg-white dark:bg-gray-700 rounded-b-xl border-t border-gray-200 dark:border-gray-600 relative">
        {error && (
          <div className="mb-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Upload progress */}
        {uploadProgress && (
          <div className="mb-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg text-sm">
            {uploadProgress}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Emoji picker container */}
          <div className="emoji-picker-container relative">
            <button 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isSending}
            >
              <FontAwesomeIcon icon={faFaceSmile} />
            </button>
            <EmojiPicker 
              isVisible={showEmojiPicker}
              onEmojiSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>

          {/* Image upload */}
          <button 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || selectedFiles.length >= 5}
            title={selectedFiles.length >= 5 ? "Maximum 5 images allowed" : "Add images"}
          >
            <FontAwesomeIcon icon={faImage} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex-1 relative">
            <input
              type="text"
              placeholder='Type a message...'
              className='w-full px-4 py-3 pr-12 rounded-full bg-gray-100 dark:bg-gray-600 border-none focus:ring-2 focus:ring-blue-400 outline-none transition-all text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400'
              spellCheck={false}
              value={textBox}
              onChange={handleInputChange}
              ref={textInputRef}
              onKeyDown={handleKeys}
              disabled={isSending}
            />
            {textBox && (
              <button
                onClick={() => setTextBox('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Clear message"
              >
                ×
              </button>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={(!textBox?.trim() && selectedFiles.length === 0) || isSending}
            className={`p-3 rounded-full transition-all outline-none ${
              (!textBox?.trim() && selectedFiles.length === 0) || isSending
                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
            }`}
            aria-label="Send message"
          >
            {isSending ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} />
            )}
          </button>
        </div>

        {/* ImgBB API Key notice */}
        {(!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') && selectedFiles.length > 0 && (
          <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-600">
            ⚠️ ImgBB API key not configured. Images cannot be uploaded.
            <br />
            Get your free API key from <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="underline">api.imgbb.com</a>
          </div>
        )}
      </div>
    </section>
  );
};

export default ChatBox;