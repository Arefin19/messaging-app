// utils/profilePicture.js - Enhanced with debugging

/**
 * Get user profile picture with proper fallback handling and debugging
 * @param {Object} user - Firebase user object or user data
 * @param {number} size - Size of the avatar (default: 40)
 * @returns {string} - Profile picture URL
 */
export const getUserProfilePicture = (user, size = 40) => {
  console.log('getUserProfilePicture called with:', {
    user: user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    } : null,
    size
  });

  if (!user) {
    console.log('No user provided, returning default avatar');
    return `https://ui-avatars.com/api/?name=U&background=4F46E5&color=fff&size=${size}`;
  }
  
  // Check if photoURL exists and is a valid URL
  if (user.photoURL && user.photoURL.trim() !== '') {
    console.log('User has photoURL:', user.photoURL);
    
    // Check if it's not already a fallback avatar
    if (!user.photoURL.includes('ui-avatars.com')) {
      console.log('Using uploaded profile picture:', user.photoURL);
      return user.photoURL;
    } else {
      console.log('PhotoURL is already a fallback avatar, checking if we should regenerate');
    }
  } else {
    console.log('User has no photoURL or it is empty');
  }
  
  // Generate a fallback avatar using the user's information
  const name = user.displayName || user.email?.split('@')[0] || 'User';
  const encodedName = encodeURIComponent(name);
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=4F46E5&color=fff&size=${size}`;
  
  console.log('Generated fallback avatar for user:', name, 'URL:', fallbackUrl);
  return fallbackUrl;
};

/**
 * Handle profile picture loading errors with detailed logging
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
  
  const name = user?.displayName || user?.email?.split('@')[0] || 'User';
  const encodedName = encodeURIComponent(name);
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=4F46E5&color=fff&size=${size}`;
  
  console.log('Setting fallback image:', fallbackUrl);
  e.target.src = fallbackUrl;
};

/**
 * Debug user authentication state and profile data
 * @param {Object} user - Firebase user object
 */
export const debugUserProfile = (user) => {
  if (!user) {
    console.log('DEBUG: No user authenticated');
    return;
  }

  console.log('DEBUG: User Profile Data:', {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    isAnonymous: user.isAnonymous,
    metadata: {
      creationTime: user.metadata?.creationTime,
      lastSignInTime: user.metadata?.lastSignInTime
    },
    providerData: user.providerData,
    refreshToken: user.refreshToken ? 'Present' : 'Not present'
  });

  // Test if photoURL is accessible
  if (user.photoURL) {
    const testImg = new Image();
    testImg.onload = () => {
      console.log('DEBUG: Profile picture URL is accessible and loads correctly');
    };
    testImg.onerror = (error) => {
      console.error('DEBUG: Profile picture URL failed to load:', error);
    };
    testImg.src = user.photoURL;
  }
};

/**
 * Refresh user profile data from Firebase
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
 * Validate image file for profile picture upload
 * @param {File} file - File to validate
 * @returns {Object} - Validation result with isValid and error
 */
export const validateProfilePicture = (file) => {
  console.log('Validating profile picture file:', {
    name: file?.name,
    size: file?.size,
    type: file?.type
  });

  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  // Check file type
  if (!file.type.match('image.*')) {
    return { isValid: false, error: 'Please select an image file' };
  }
  
  // Check file size (2MB limit)
  if (file.size > 2 * 1024 * 1024) {
    return { isValid: false, error: 'Image size should be less than 2MB' };
  }
  
  // Check file extension
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: 'Please select a valid image format (JPG, PNG, GIF, WebP)' };
  }
  
  console.log('File validation passed');
  return { isValid: true, error: null };
};

/**
 * Create a preview URL for an image file
 * @param {File} file - Image file
 * @returns {Promise<string>} - Preview URL
 */
export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject('No file provided');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log('Image preview created successfully');
      resolve(reader.result);
    };
    reader.onerror = () => {
      console.error('Failed to create image preview');
      reject('Failed to read file');
    };
    reader.readAsDataURL(file);
  });
};