// components/ProfileDebug.jsx - Add this to debug profile picture issues
import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, storage } from '../firebaseconfig';
import { ref, listAll, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';

const ProfileDebug = () => {
  const [user, loading, error] = useAuthState(auth);
  const [debugData, setDebugData] = useState({});
  const [storageFiles, setStorageFiles] = useState([]);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    if (user) {
      debugUserProfile();
      checkStorageFiles();
    }
  }, [user]);

  const debugUserProfile = () => {
    console.log('=== PROFILE DEBUG START ===');
    console.log('User object:', user);
    console.log('User UID:', user.uid);
    console.log('User email:', user.email);
    console.log('User displayName:', user.displayName);
    console.log('User photoURL:', user.photoURL);
    console.log('=== PROFILE DEBUG END ===');

    setDebugData({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      metadata: user.metadata,
      providerData: user.providerData
    });

    // Test photoURL accessibility
    if (user.photoURL) {
      testImageUrl(user.photoURL, 'user-photo');
    }
  };

  const checkStorageFiles = async () => {
    try {
      console.log('Checking Firebase Storage files for user:', user.uid);
      
      // List all files in the user's profile pictures folder
      const profilePicsRef = ref(storage, `profilePictures/${user.uid}`);
      const result = await listAll(profilePicsRef);
      
      console.log('Storage files found:', result.items.length);
      
      const files = [];
      for (const itemRef of result.items) {
        try {
          const downloadURL = await getDownloadURL(itemRef);
          files.push({
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            downloadURL: downloadURL
          });
          console.log('File found:', itemRef.name, 'URL:', downloadURL);
          
          // Test each file URL
          testImageUrl(downloadURL, `storage-${itemRef.name}`);
        } catch (urlError) {
          console.error('Error getting download URL for:', itemRef.name, urlError);
          files.push({
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            error: urlError.message
          });
        }
      }
      
      setStorageFiles(files);
    } catch (storageError) {
      console.error('Error accessing Firebase Storage:', storageError);
      setStorageFiles([{ error: storageError.message }]);
    }
  };

  const testImageUrl = (url, testName) => {
    console.log(`Testing image URL (${testName}):`, url);
    
    const img = new Image();
    img.onload = () => {
      console.log(`✅ Image loaded successfully (${testName}):`, url);
      setTestResults(prev => ({
        ...prev,
        [testName]: { status: 'success', url, message: 'Image loaded successfully' }
      }));
    };
    
    img.onerror = (error) => {
      console.error(`❌ Image failed to load (${testName}):`, url, error);
      setTestResults(prev => ({
        ...prev,
        [testName]: { status: 'error', url, message: 'Image failed to load', error }
      }));
    };
    
    img.src = url;
  };

  const refreshUserProfile = async () => {
    try {
      console.log('Refreshing user profile...');
      await user.reload();
      const refreshedUser = auth.currentUser;
      console.log('Profile refreshed:', refreshedUser);
      debugUserProfile();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const testStorageAccess = async () => {
    try {
      // Test creating a simple file to check write permissions
      const testRef = ref(storage, `profilePictures/${user.uid}/test.txt`);
      
      // Create a simple test blob
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      console.log('Testing storage write access...');
      // This will fail if we don't have write permissions
      const uploadResult = await uploadBytes(testRef, testBlob);
      console.log('✅ Storage write test successful:', uploadResult);
      
      // Clean up the test file
      await deleteObject(testRef);
      console.log('Test file cleaned up');
      
    } catch (error) {
      console.error('❌ Storage write test failed:', error);
      setTestResults(prev => ({
        ...prev,
        storageWrite: { status: 'error', message: error.message }
      }));
    }
  };

  if (loading) return <div className="p-4 bg-yellow-100">Loading user...</div>;
  if (error) return <div className="p-4 bg-red-100">Error: {error.message}</div>;
  if (!user) return <div className="p-4 bg-gray-100">No user authenticated</div>;

  return (
    <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-md max-h-96 overflow-y-auto border border-gray-200 z-50">
      <div className="mb-4">
        <h3 className="font-bold text-lg text-gray-800 mb-2">Profile Picture Debug</h3>
        
        <div className="space-y-2">
          <button
            onClick={refreshUserProfile}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 mr-2"
          >
            Refresh Profile
          </button>
          
          <button
            onClick={checkStorageFiles}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 mr-2"
          >
            Check Storage
          </button>
          
          <button
            onClick={testStorageAccess}
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            Test Storage Access
          </button>
        </div>
      </div>

      {/* User Profile Data */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">User Profile:</h4>
        <div className="text-xs space-y-1">
          <div><strong>UID:</strong> {debugData.uid}</div>
          <div><strong>Email:</strong> {debugData.email}</div>
          <div><strong>Display Name:</strong> {debugData.displayName || 'Not set'}</div>
          <div><strong>Photo URL:</strong> 
            {debugData.photoURL ? (
              <div className="mt-1">
                <div className="break-all text-blue-600">{debugData.photoURL}</div>
                <img 
                  src={debugData.photoURL} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full mt-1"
                  onLoad={() => console.log('DEBUG: Main profile image loaded')}
                  onError={(e) => console.error('DEBUG: Main profile image failed:', e)}
                />
              </div>
            ) : (
              <span className="text-red-500"> Not set</span>
            )}
          </div>
        </div>
      </div>

      {/* Storage Files */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Storage Files:</h4>
        {storageFiles.length === 0 ? (
          <div className="text-xs text-gray-500">No files found or not checked yet</div>
        ) : (
          <div className="space-y-2">
            {storageFiles.map((file, index) => (
              <div key={index} className="text-xs border border-gray-200 p-2 rounded">
                {file.error ? (
                  <div className="text-red-500">Error: {file.error}</div>
                ) : (
                  <>
                    <div><strong>Name:</strong> {file.name}</div>
                    <div><strong>Path:</strong> {file.fullPath}</div>
                    {file.downloadURL && (
                      <div>
                        <strong>URL:</strong> 
                        <div className="break-all text-blue-600">{file.downloadURL}</div>
                        <img 
                          src={file.downloadURL} 
                          alt={file.name} 
                          className="w-8 h-8 rounded mt-1"
                          onLoad={() => console.log('Storage image loaded:', file.name)}
                          onError={(e) => console.error('Storage image failed:', file.name, e)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Results */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">Image Load Tests:</h4>
        {Object.keys(testResults).length === 0 ? (
          <div className="text-xs text-gray-500">No tests run yet</div>
        ) : (
          <div className="space-y-1">
            {Object.entries(testResults).map(([testName, result]) => (
              <div key={testName} className={`text-xs p-2 rounded ${
                result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <strong>{testName}:</strong> {result.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileDebug;