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
  faHeart,
  faFile,
  faVideo,
  faMusic,
  faFileArchive,
  faCode,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faEye,
  faCloudUpload,
  faPlus
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
import { 
  validateFile, 
  uploadFileToStorage, 
  createFileMetadata, 
  formatFileSize, 
  getFileCategory,
  getFileIcon,
  isImageFile,
  generateThumbnail,
  FILE_CATEGORIES 
} from '../utlis/fileUpload';

// File type selector component (excluding images since we have a separate image button)
const FileTypeSelector = ({ onFileTypeSelect, onClose, isVisible }) => {
  const fileTypes = [
    { key: 'documents', label: 'Documents', icon: faFilePdf, extensions: FILE_CATEGORIES.DOCUMENTS.extensions },
    { key: 'videos', label: 'Videos', icon: faVideo, extensions: FILE_CATEGORIES.VIDEOS.extensions },
    { key: 'audio', label: 'Audio', icon: faMusic, extensions: FILE_CATEGORIES.AUDIO.extensions },
    { key: 'archives', label: 'Archives', icon: faFileArchive, extensions: FILE_CATEGORIES.ARCHIVES.extensions },
    { key: 'code', label: 'Code', icon: faCode, extensions: FILE_CATEGORIES.CODE.extensions },
    { key: 'other', label: 'Other Files', icon: faFile, extensions: [] }
  ];

  if (!isVisible) return null;

  const getAcceptString = (extensions) => {
    if (extensions.length === 0) {
      // For "other files", exclude common image, video, audio, document extensions
      return '*/*';
    }
    return extensions.map(ext => `.${ext}`).join(',');
  };

  return (
    <div className="absolute bottom-14 left-0 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-3 w-64 z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-800 dark:text-white">Choose file type</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <div className="space-y-1">
        {fileTypes.map((type) => (
          <button
            key={type.key}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = getAcceptString(type.extensions);
              input.onchange = (e) => onFileTypeSelect(e.target.files);
              input.click();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-800 dark:text-gray-200"
          >
            <FontAwesomeIcon icon={type.icon} className="text-blue-500 w-4" />
            <div>
              <div className="font-medium">{type.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {type.extensions.length > 0 
                  ? type.extensions.slice(0, 3).join(', ') + (type.extensions.length > 3 ? '...' : '')
                  : 'Other file types'
                }
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 Use the image button for photos
        </p>
      </div>
    </div>
  );
};

// Enhanced File Preview Component
const FilePreview = ({ 
  file, 
  fileInfo, 
  onRemove, 
  uploadProgress = null, 
  isUploading = false,
  error = null 
}) => {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (file && isImageFile(file.name)) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }, [file]);

  if (!file) return null;

  const fileCategory = getFileCategory(file.name);
  const fileIcon = getFileIcon(file.name);

  return (
    <div className="relative inline-block mr-2 mb-2 group">
      <div className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center p-2 ${
        isUploading ? 'opacity-60' : ''
      } ${error ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''}`}>
        
        {/* Image preview */}
        {preview ? (
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <>
            {/* File icon */}
            <div className="text-blue-500 text-xl mb-1">
              {fileIcon}
            </div>
            
            {/* File extension */}
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
              {file.name.split('.').pop()}
            </div>
          </>
        )}
        
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
        
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="text-xs text-red-600 text-center p-1">
              Error
            </div>
          </div>
        )}
      </div>
      
      {/* File info */}
      <div className="mt-1 text-center">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-20" title={file.name}>
          {file.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(file.size)}
        </div>
      </div>
      
      {/* Remove button */}
      {!isUploading && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
          title="Remove file"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      )}
      
      {/* Error tooltip */}
      {error && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {error}
        </div>
      )}
    </div>
  );
};

// File Display Component for messages
const FileDisplay = ({ fileInfo, onDownload, onPreview, compact = true }) => {
  if (!fileInfo) return null;

  const fileIcon = getFileIcon(fileInfo.name);
  const canPreview = isImageFile(fileInfo.name) || fileInfo.type === 'application/pdf';

  return (
    <div className={`${compact ? 'inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm max-w-xs' : 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 max-w-sm'}`}>
      <span className="text-blue-500 text-lg">{fileIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 dark:text-gray-200 truncate" title={fileInfo.name}>
          {fileInfo.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(fileInfo.size)}
        </div>
      </div>
      <div className="flex gap-1">
        {canPreview && (
          <button
            onClick={() => onPreview?.(fileInfo)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
            title="Preview"
          >
            <FontAwesomeIcon icon={faEye} className="text-xs" />
          </button>
        )}
        <button
          onClick={() => onDownload?.(fileInfo)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
          title="Download"
        >
          <FontAwesomeIcon icon={faDownload} className="text-xs" />
        </button>
      </div>
    </div>
  );
};

// Simple emoji picker component (existing)
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

// Quick reaction picker component (existing)
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

// Message context menu component (existing)
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

// Reaction display component (existing)
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
  files,
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

  const handleFileDownload = (file) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFilePreview = (file) => {
    window.open(file.url, '_blank');
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

              {/* Files content */}
              {files && files.length > 0 && (
                <div className="mb-2 space-y-1">
                  {files.map((file, index) => (
                    <FileDisplay
                      key={index}
                      fileInfo={file}
                      onDownload={handleFileDownload}
                      onPreview={handleFilePreview}
                      compact={true}
                    />
                  ))}
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
  const [showFileTypeSelector, setShowFileTypeSelector] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [contextMenu, setContextMenu] = useState({ isVisible: false, messageId: null, position: { top: 0, left: 0 } });
  const [uploadingFiles, setUploadingFiles] = useState(new Map());

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
      let fileUrls = [];

      // Upload files
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        setUploadProgress('Starting file upload...');
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          try {
            setUploadProgress(`Uploading file ${i + 1} of ${selectedFiles.length}...`);
            console.log(`Uploading file ${i + 1}:`, file.name);
            
            // Validate file before upload
            const validation = validateFile(file);
            if (!validation.isValid) {
              throw new Error(`Invalid file ${file.name}: ${validation.error}`);
            }
            
            if (isImageFile(file.name)) {
              // Upload images to ImgBB (existing logic)
              if (!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') {
                console.warn('ImgBB API key not configured, uploading image to Firebase Storage instead');
                // Upload to Firebase Storage instead
                const uploadResult = await uploadFileToStorage(
                  file,
                  id, // chatId
                  user.email,
                  (progress) => {
                    setUploadProgress(`Uploading ${file.name}: ${Math.round(progress.progress)}%`);
                  }
                );
                
                // Create metadata document
                try {
                  const metadataId = await createFileMetadata(uploadResult, id);
                  if (metadataId) {
                    uploadResult.metadataId = metadataId;
                  }
                } catch (metadataError) {
                  console.warn('Failed to create metadata for image, continuing:', metadataError);
                }
                
                imageUrls.push(uploadResult.url);
              } else {
                const imageUrl = await uploadToImgBB(file, IMGBB_API_KEY);
                imageUrls.push(imageUrl);
              }
            } else {
              // Upload other files to Firebase Storage
              const uploadResult = await uploadFileToStorage(
                file,
                id, // chatId
                user.email,
                (progress) => {
                  setUploadProgress(`Uploading ${file.name}: ${Math.round(progress.progress)}%`);
                }
              );
              
              // Create metadata document
              try {
                const metadataId = await createFileMetadata(uploadResult, id);
                if (metadataId) {
                  uploadResult.metadataId = metadataId;
                }
              } catch (metadataError) {
                console.warn('Failed to create metadata, continuing:', metadataError);
              }
              
              fileUrls.push(uploadResult);
            }
            
            console.log(`✅ File ${i + 1} uploaded successfully`);
            
          } catch (uploadError) {
            console.error(`Failed to upload file ${i + 1}:`, uploadError);
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }
        }
        setIsUploading(false);
        setUploadProgress('Files uploaded successfully!');
        console.log('✅ All files uploaded:', { imageUrls, fileUrls });
      }

      // Create message data - FIX: Make sure required fields are always present
      const messageData = {
        message: trimmedText || '', // Always include message field, even if empty
        sender: user.email,
        timestamp: serverTimestamp(),
        read: false,
        reactions: {}
      };

      // Add image data if available (backward compatibility)
      if (imageUrls.length > 0) {
        messageData.images = imageUrls;
        messageData.imageUrl = imageUrls[0]; // Keep for backward compatibility
        messageData.imageUploadSource = 'imgbb';
      }

      // Add file data if available
      if (fileUrls.length > 0) {
        messageData.files = fileUrls;
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
      console.log('Saving message with data:', messageData);
      
      await addDoc(messagesRef, messageData);

      // Update chat's last message
      const lastMessageText = trimmedText || 
        (imageUrls.length > 0 ? `📷 ${imageUrls.length > 1 ? `${imageUrls.length} Images` : 'Image'}` : '') +
        (fileUrls.length > 0 ? `📎 ${fileUrls.length > 1 ? `${fileUrls.length} Files` : fileUrls[0]?.name || 'File'}` : '');

      await updateDoc(doc(db, `chats/${id}`), {
        lastUpdated: serverTimestamp(),
        lastMessage: lastMessageText || 'Files sent'
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

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    let hasErrors = false;

    fileArray.forEach(file => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        console.error(`Invalid file ${file.name}:`, validation.error);
        setError(`${file.name}: ${validation.error}`);
        hasErrors = true;
      }
    });

    if (validFiles.length > 0) {
      // Limit to maximum 10 files
      const totalFiles = selectedFiles.length + validFiles.length;
      if (totalFiles > 10) {
        setError('Maximum 10 files allowed per message');
        const allowedCount = 10 - selectedFiles.length;
        setSelectedFiles(prev => [...prev, ...validFiles.slice(0, allowedCount)]);
      } else {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        if (!hasErrors) {
          setError(null);
        }
      }
    }
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

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
      if (showFileTypeSelector && !event.target.closest('.file-selector-container')) {
        setShowFileTypeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showFileTypeSelector]);

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
                files={msg.files}
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
              <FilePreview 
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
              {selectedFiles.length}/10 files selected
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

          {/* Image upload container */}
          <div className="image-upload-container relative">
            <button 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*';
                input.onchange = (e) => handleFileSelect(e.target.files);
                input.click();
              }}
              disabled={isSending || selectedFiles.length >= 10}
              title={selectedFiles.length >= 10 ? "Maximum 10 files allowed" : "Add images"}
            >
              <FontAwesomeIcon icon={faImage} />
            </button>
          </div>

          {/* File upload container */}
          <div className="file-selector-container relative">
            <button 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50"
              onClick={() => setShowFileTypeSelector(!showFileTypeSelector)}
              disabled={isSending || selectedFiles.length >= 10}
              title={selectedFiles.length >= 10 ? "Maximum 10 files allowed" : "Add files"}
            >
              <FontAwesomeIcon icon={faCloudUpload} />
            </button>
            <FileTypeSelector
              isVisible={showFileTypeSelector}
              onFileTypeSelect={handleFileSelect}
              onClose={() => setShowFileTypeSelector(false)}
            />
          </div>

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

        {/* Configuration notices */}
        {(!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') && selectedFiles.some(f => isImageFile(f.name)) && (
          <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-600">
            ⚠️ ImgBB API key not configured. Images will upload to Firebase Storage instead.
            <br />
            Get your free API key from <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="underline">api.imgbb.com</a>
          </div>
        )}
      </div>
    </section>
  );
};

export default ChatBox;