// components/UserDebug.jsx - Add this component temporarily to debug user state

import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseconfig';
import { debugUserProfile, refreshUserProfile } from '../utlis/profilePicture';

const UserDebug = () => {
  const [user, loading, error] = useAuthState(auth);
  const [debugData, setDebugData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      debugUserProfile(user);
      setDebugData({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        lastSignInTime: user.metadata?.lastSignInTime,
        creationTime: user.metadata?.creationTime
      });
    }
  }, [user]);

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      const refreshedUser = await refreshUserProfile(auth);
      if (refreshedUser) {
        setDebugData({
          uid: refreshedUser.uid,
          email: refreshedUser.email,
          displayName: refreshedUser.displayName,
          photoURL: refreshedUser.photoURL,
          emailVerified: refreshedUser.emailVerified,
          lastSignInTime: refreshedUser.metadata?.lastSignInTime,
          creationTime: refreshedUser.metadata?.creationTime
        });
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <div className="p-4 bg-yellow-100 text-yellow-800">Loading user...</div>;
  if (error) return <div className="p-4 bg-red-100 text-red-800">Error: {error.message}</div>;
  if (!user) return <div className="p-4 bg-gray-100 text-gray-800">No user authenticated</div>;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-md border border-gray-200 z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg text-gray-800">User Debug Info</h3>
        <button
          onClick={handleRefreshProfile}
          disabled={refreshing}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {debugData && (
        <div className="space-y-2 text-sm">
          <div><strong>UID:</strong> {debugData.uid}</div>
          <div><strong>Email:</strong> {debugData.email}</div>
          <div><strong>Display Name:</strong> {debugData.displayName || 'Not set'}</div>
          <div><strong>Email Verified:</strong> {debugData.emailVerified ? 'Yes' : 'No'}</div>
          <div><strong>Photo URL:</strong> 
            {debugData.photoURL ? (
              <div className="mt-1">
                <div className="text-xs break-all text-blue-600">{debugData.photoURL}</div>
                <img 
                  src={debugData.photoURL} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full mt-1"
                  onLoad={() => console.log('DEBUG: Image loaded successfully')}
                  onError={(e) => {
                    console.error('DEBUG: Image failed to load:', e);
                  }}
                />
              </div>
            ) : (
              <span className="text-red-500"> Not set</span>
            )}
          </div>
          <div><strong>Created:</strong> {debugData.creationTime}</div>
          <div><strong>Last Sign In:</strong> {debugData.lastSignInTime}</div>
        </div>
      )}
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Check browser console for detailed logs
        </div>
      </div>
    </div>
  );
};

export default UserDebug;