// utils/profilePicture.js - Updated for ImgBB integration and better Firestore support

/**
 * Get user profile picture with proper fallback handling
 * This version prioritizes Firestore data over Firebase Auth for better consistency
 * @param {Object} user - Firebase user object or Firestore user data
 * @param {number} size - Size of the avatar (default: 40)
 * @returns {string} - Profile picture URL
 */
export const getUserProfilePicture = (user, size = 40) => {
  console.log('getUserProfilePicture called with:', {
    user: user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      profilePictureSource: user.profilePictureSource
    } : null,
    size
  });

  if (!user) {
    console.log('No user provided, returning default avatar');
    return generateFallbackAvatar('U', size);
  }
  
  // Check if photoURL exists and is a valid URL
  if (user.photoURL && user.photoURL.trim() !== '' && !isGeneratedAvatar(user.photoURL)) {
    console.log('User has valid photoURL:', user.photoURL);
    return user.photoURL;
  }
  
  console.log('User has no valid photoURL, generating fallback');
  
  // Generate a fallback avatar using the user's information
  const name = user.displayName || user.email?.split('@')[0] || 'User';
  return generateFallbackAvatar(name, size);
};

/**
 * Check if a URL is a generated ui-avatars.com URL
 * @param {string} url - URL to check
 * @returns {boolean} - True if it's a generated avatar URL
 */
export const isGeneratedAvatar = (url) => {
  return url && url.includes('ui-avatars.com');
};

/**
 * Generate fallback avatar URL
 * @param {string} name - User name or identifier
 * @param {number} size - Avatar size
 * @returns {string} - Fallback avatar URL
 */
export const generateFallbackAvatar = (name, size = 40) => {
  const displayName = name || 'User';
  const encodedName = encodeURIComponent(displayName);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=4F46E5&color=fff&size=${size}&bold=true`;
};

/**
 * Handle profile picture loading errors with proper fallback
 * @param {Event} e - Error event
 * @param {Object} user - User object
 * @param {number} size - Avatar size
 */
export const handleProfilePictureError = (e, user, size = 40) => {
  console.error('Profile picture failed to load:', {
    originalSrc: e.target.src,
    user: user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    } : null,
    error: e
  });
  
  // Don't create infinite loops with fallback avatars
  if (isGeneratedAvatar(e.target.src)) {
    console.log('Fallback avatar also failed, using generic avatar');
    e.target.src = generateFallbackAvatar('?', size);
    e.target.onerror = null;
    return;
  }
  
  const name = user?.displayName || user?.email?.split('@')[0] || 'User';
  const fallbackUrl = generateFallbackAvatar(name, size);
  
  console.log('Setting fallback image:', fallbackUrl);
  e.target.src = fallbackUrl;
  
  // Prevent infinite error loops
  e.target.onerror = null;
};

/**
 * Get user data from Firestore with fallback to Firebase Auth
 * This ensures we get the most up-to-date profile information
 * @param {Object} authUser - Firebase Auth user
 * @param {Object} firestoreUser - Firestore user document data
 * @returns {Object} - Combined user data
 */
export const getCombinedUserData = (authUser, firestoreUser) => {
  if (!authUser) return null;
  
  // Prioritize Firestore data, fallback to Auth data
  return {
    uid: authUser.uid,
    email: authUser.email,
    displayName: firestoreUser?.displayName || authUser.displayName || authUser.email?.split('@')[0],
    photoURL: firestoreUser?.photoURL || authUser.photoURL,
    profilePictureSource: firestoreUser?.profilePictureSource || 'unknown',
    isOnline: firestoreUser?.isOnline || false,
    lastSeen: firestoreUser?.lastSeen,
    createdAt: firestoreUser?.createdAt
  };
};

/**
 * Debug user profile data from multiple sources
 * @param {Object} authUser - Firebase Auth user
 * @param {Object} firestoreUser - Firestore user data
 */
export const debugUserProfile = (authUser, firestoreUser) => {
  console.log('=== USER PROFILE DEBUG ===');
  
  if (!authUser) {
    console.log('❌ No Firebase Auth user');
    return;
  }

  console.log('🔐 Firebase Auth User:', {
    uid: authUser.uid,
    email: authUser.email,
    emailVerified: authUser.emailVerified,
    displayName: authUser.displayName,
    photoURL: authUser.photoURL,
    lastSignInTime: authUser.metadata?.lastSignInTime,
    creationTime: authUser.metadata?.creationTime
  });

  if (firestoreUser) {
    console.log('🔥 Firestore User Data:', {
      uid: firestoreUser.uid,
      email: firestoreUser.email,
      displayName: firestoreUser.displayName,
      photoURL: firestoreUser.photoURL,
      profilePictureSource: firestoreUser.profilePictureSource,
      isOnline: firestoreUser.isOnline,
      lastSeen: firestoreUser.lastSeen,
      createdAt: firestoreUser.createdAt
    });
  } else {
    console.log('❌ No Firestore user data');
  }

  const combinedUser = getCombinedUserData(authUser, firestoreUser);
  console.log('✅ Combined User Data:', combinedUser);
  
  // Test profile picture URL if available
  if (combinedUser.photoURL && !isGeneratedAvatar(combinedUser.photoURL)) {
    testImageURL(combinedUser.photoURL)
      .then(() => console.log('✅ Profile picture URL is accessible'))
      .catch(error => console.error('❌ Profile picture URL test failed:', error.message));
  }
  
  console.log('=== END PROFILE DEBUG ===');
};

/**
 * Test if an image URL is accessible
 * @param {string} url - Image URL to test
 * @returns {Promise<boolean>} - True if image loads successfully
 */
const testImageURL = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = (error) => reject(new Error('Image URL not accessible'));
    
    img.crossOrigin = 'anonymous';
    img.src = url;
    
    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 10000);
  });
};

/**
 * Refresh user profile data from Firebase Auth
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<Object>} - Refreshed user object
 */
export const refreshUserProfile = async (auth) => {
  try {
    console.log('Refreshing user profile data...');
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const refreshedUser = auth.currentUser;
      console.log('User profile refreshed:', {
        displayName: refreshedUser.displayName,
        photoURL: refreshedUser.photoURL
      });
      return refreshedUser;
    }
  } catch (error) {
    console.error('Error refreshing user profile:', error);
  }
  return null;
};

/**
 * Force refresh the Firebase Auth user profile and get fresh ID token
 * @param {Object} auth - Firebase auth instance
 * @returns {Promise<boolean>} - Success status
 */
export const forceRefreshUser = async (auth) => {
  try {
    if (!auth.currentUser) {
      console.log('No current user to refresh');
      return false;
    }

    console.log('Force refreshing user profile...');
    
    // Get the ID token with force refresh
    await auth.currentUser.getIdToken(true);
    
    // Reload the user profile
    await auth.currentUser.reload();
    
    console.log('User profile force refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error force refreshing user profile:', error);
    return false;
  }
};