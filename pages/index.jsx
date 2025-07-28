import React, { useState } from 'react';
import { useRouter } from 'next/router';
import SideBar from '../components/SideBar';

const Home = () => {
  const router = useRouter();
  
  // Function to handle chat selection - navigate to chat page
  const handleChatSelection = (chat) => {
    router.push(`/chat/${chat.id}`);
  };

  return (
    <main className='w-full h-screen flex bg-gradient-to-br from-mSec to-dSec p-4 gap-4'>
      {/* Sidebar */}
      <div className="w-full md:w-1/3 lg:w-1/4">
        <SideBar onChatSelect={handleChatSelection} />
      </div>
      
      {/* Welcome Area - Show when no chat is selected */}
      <div className="hidden md:flex md:w-2/3 lg:w-3/4">
        <div className="w-full bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg shadow-lg flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Chat App</h2>
          <p className="text-gray-300 mb-4">Select a chat to start messaging</p>
          <div className="text-center text-gray-400 text-sm">
            <p>• Choose an existing chat from the sidebar</p>
            <p>• Or start a new conversation with any user</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;