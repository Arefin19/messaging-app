import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebaseconfig';
import SideBar from '../../components/SideBar';
import ChatBox from '../../components/ChatBox';
import Loader from '../../components/Loader'; // Create this component for loading states

const ChatPage = () => {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const { id } = router.query;
  const [chatReady, setChatReady] = useState(false);

  // Check authentication and chat ID
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!id) {
        router.push('/');
      } else {
        setChatReady(true);
      }
    }
  }, [loading, user, id, router]);

  // Show loader while checking auth state
  if (loading || !chatReady) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-mSec to-dSec">
        <Loader />
      </div>
    );
  }

  return (
    <main className='w-full font-disp h-screen flex justify-between gap-x-4 p-2 lg:p-4 items-center bg-gradient-to-br from-mSec to-dSec'>
      {/* Side Bar - Hidden on mobile */}
      <div className='hidden lg:block lg:w-4/12 h-full'>
        <SideBar activeChatId={id} />
      </div>
      
      {/* Chat Box */}
      <div className='w-full lg:w-8/11 h-full'>
        <ChatBox />
      </div>
    </main>
  );
};

export default ChatPage;