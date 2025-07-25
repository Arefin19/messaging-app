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
  faImage
} from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/router';
import { useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { addDoc, collection, doc, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseconfig';
import { useAuthState } from 'react-firebase-hooks/auth';
import getOtherUser from '../utlis/getOtherUser';

const Message = ({ sender, text, time, isSameSender, isLastMessage, userPhoto, otherUserPhoto }) => {
  const formattedTime = time?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '';

  return (
    <div className={`flex ${sender ? 'justify-end' : 'justify-start'} mb-1 px-2`}>
      <div className={`flex max-w-xs md:max-w-md lg:max-w-lg ${isSameSender ? 'mt-1' : 'mt-3'}`}>
        {!sender && !isSameSender && (
          <div className="flex-shrink-0 mr-2 self-end">
            {otherUserPhoto ? (
              <img
                src={otherUserPhoto}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                {sender ? 'You' : 'U'}
              </div>
            )}
          </div>
        )}

        {!sender && isSameSender && <div className="flex-shrink-0 mr-2 w-8"></div>}

        <div className={`flex flex-col ${sender ? 'items-end' : 'items-start'}`}>
          {!isSameSender && (
            <span className={`text-xs font-medium mb-1 ${sender ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
              {sender ? 'You' : 'Other User'}
            </span>
          )}

          <div
            className={`px-4 py-2 rounded-lg relative ${
              sender
                ? 'bg-blue-500 text-white rounded-tr-none'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none'
            } ${isSameSender ? sender ? 'rounded-tr-lg' : 'rounded-tl-lg' : ''}`}
          >
            <p className="whitespace-pre-wrap break-words">{text}</p>
          </div>

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
  );
};

const ChatBox = () => {
  const [user] = useAuthState(auth);
  const [textBox, setTextBox] = useState('');
  const router = useRouter();
  const { id } = router.query;
  const messagesRef = collection(db, `chats/${id}/messages`);
  const messagesQuery = query(messagesRef, orderBy('timestamp'));
  const [messages, loadingMessages] = useCollectionData(messagesQuery);
  const [chat, loadingChat] = useDocumentData(doc(db, `chats/${id}`));
  const scrollEnd = useRef();
  const textInputRef = useRef();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const handleSend = async () => {
    const trimmedText = textBox?.trim() || '';
    if (!trimmedText || !user?.email || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      const messageData = {
        message: trimmedText,
        sender: user.email,
        timestamp: serverTimestamp(),
        read: false
      };

      if (replyingTo) {
        messageData.replyTo = {
          message: replyingTo.message,
          sender: replyingTo.sender
        };
      }

      await addDoc(messagesRef, messageData);

      await updateDoc(doc(db, `chats/${id}`), {
        lastUpdated: serverTimestamp(),
        lastMessage: trimmedText
      });

      setTextBox('');
      setReplyingTo(null);
    } catch (err) {
      console.error("Error sending message:", err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
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
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-400"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border-2 border-blue-400">
                <span className="text-white font-medium">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
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
                key={`${msg.timestamp?.seconds || i}`}
                sender={msg.sender === user?.email}
                text={msg.message}
                time={msg.timestamp}
                isSameSender={i > 0 && messages[i - 1].sender === msg.sender}
                isLastMessage={i === messages.length - 1}
                userPhoto={user?.photoURL}
                otherUserPhoto={null} // You would replace this with the actual other user's photo
              />
            ))}
          </div>
        )}
        <div ref={scrollEnd} />
      </div>

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

      {/* Message input */}
      <div className="p-3 bg-white dark:bg-gray-700 rounded-b-xl border-t border-gray-200 dark:border-gray-600">
        {error && (
          <div className="mb-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">
            <FontAwesomeIcon icon={faFaceSmile} />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">
            <FontAwesomeIcon icon={faImage} />
          </button>

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
            disabled={!textBox?.trim() || isSending}
            className={`p-3 rounded-full transition-all outline-none ${
              !textBox?.trim() || isSending
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
      </div>
    </section>
  );
};

export default ChatBox;