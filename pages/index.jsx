import React, { useState } from 'react';
import SideBar from '../components/SideBar';
import ChatBox from '../components/ChatBox';

const Home = () => {
  const [selectedChat, setSelectedChat] = useState(null);

  return (
    <main className='w-full h-screen flex bg-gradient-to-br from-mSec to-dSec p-4 gap-4'>
      {/* Sidebar */}
      <div className="w-full md:w-1/3 lg:w-1/4">
        <SideBar setSelectedChat={setSelectedChat} />
      </div>
      
      {/* Chat Area */}
      <div className="hidden md:flex md:w-2/3 lg:w-3/4">
        {selectedChat ? (
          <ChatBox chat={selectedChat} />
        ) : (
          <div className="w-full bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg shadow-lg flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Chat App</h2>
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Home;