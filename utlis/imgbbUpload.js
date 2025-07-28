// utils/imgbbUpload.js - Fixed version with proper FormData handling

/**
 * Upload image to ImgBB and return the URL
 * @param {File} file - Image file to upload
 * @param {string} apiKey - ImgBB API key
 * @returns {Promise<string>} - Image URL from ImgBB
 */
export const uploadToImgBB = async (file, apiKey) => {
  try {
    console.log('Starting ImgBB upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Validate inputs
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (!apiKey) {
      throw new Error('ImgBB API key is required');
    }

    // Convert file to base64 to avoid FormData cloning issues
    const base64Data = await fileToBase64(file);
    
    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64String = base64Data.split(',')[1];

    console.log('File converted to base64, uploading to ImgBB...');

    // Create URLSearchParams instead of FormData to avoid cloning issues
    const formData = new URLSearchParams();
    formData.append('image', base64String);
    formData.append('key', apiKey);
    formData.append('expiration', '0'); // 0 = never expires

    // Upload to ImgBB
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    const result = await response.json();

    console.log('ImgBB response:', result);

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || `HTTP error! status: ${response.status}`);
    }

    // Use display_url as it's optimized for display, fallback to url
    const imageUrl = result.data.display_url || result.data.url;
    
    console.log('Image uploaded successfully to ImgBB:', {
      id: result.data.id,
      url: result.data.url,
      display_url: result.data.display_url,
      size: result.data.size,
      dimensions: `${result.data.width}x${result.data.height}`
    });
    
    // Test the uploaded image URL
    await testImageURL(imageUrl);
    
    return imageUrl;

  } catch (error) {
    console.error('ImgBB upload failed:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Convert file to base64 string
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 data URL
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Test if an image URL is accessible
 * @param {string} url - Image URL to test
 * @returns {Promise<boolean>} - True if image loads successfully
 */
export const testImageURL = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      console.log('✅ Image URL test passed:', url);
      resolve(true);
    };
    img.onerror = (error) => {
      console.error('❌ Image URL test failed:', url, error);
      reject(new Error('Image URL not accessible'));
    };
    
    img.crossOrigin = 'anonymous';
    img.src = url;
    
    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 10000);
  });
};

/**
 * Validate image file before upload
 * @param {File} file - File to validate
 * @returns {Object} - Validation result
 */
export const validateImageFile = (file) => {
  console.log('Validating image file:', {
    name: file?.name,
    size: file?.size,
    type: file?.type
  });

  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Please select an image file' };
  }
  
  // Check file size (ImgBB free tier has 32MB limit, but we'll keep it reasonable)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `Image size should be less than ${maxSize / (1024 * 1024)}MB` 
    };
  }
  
  // Check file extension
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return { 
      isValid: false, 
      error: 'Please select a valid image format (JPG, PNG, GIF, WebP, BMP)' 
    };
  }
  
  console.log('✅ File validation passed');
  return { isValid: true, error: null };
};

/**
 * Create image preview from file
 * @param {File} file - Image file
 * @returns {Promise<string>} - Data URL for preview
 */
export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log('✅ Image preview created');
      resolve(reader.result);
    };
    reader.onerror = () => {
      console.error('❌ Failed to create image preview');
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Generate fallback avatar URL
 * @param {string} name - User name or email
 * @param {number} size - Avatar size
 * @returns {string} - Fallback avatar URL
 */
export const generateFallbackAvatar = (name, size = 40) => {
  const displayName = name || 'User';
  const encodedName = encodeURIComponent(displayName);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=4F46E5&color=fff&size=${size}&bold=true`;
};

/**
 * Alternative upload method using FormData (for environments that support it)
 * @param {File} file - Image file to upload
 * @param {string} apiKey - ImgBB API key
 * @returns {Promise<string>} - Image URL from ImgBB
 */
export const uploadToImgBBWithFormData = async (file, apiKey) => {
  try {
    console.log('Starting ImgBB upload with FormData method...');

    // Validate inputs
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (!apiKey) {
      throw new Error('ImgBB API key is required');
    }

    // Create FormData for the API request
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', apiKey);
    formData.append('expiration', '0');

    console.log('Uploading to ImgBB with FormData...');

    // Upload to ImgBB
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    console.log('ImgBB FormData response:', result);

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || `HTTP error! status: ${response.status}`);
    }

    const imageUrl = result.data.url;
    
    console.log('Image uploaded successfully via FormData:', imageUrl);
    
    return imageUrl;

  } catch (error) {
    console.error('ImgBB FormData upload failed:', error);
    
    // If FormData fails, try base64 method as fallback
    console.log('Falling back to base64 upload method...');
    return await uploadToImgBB(file, apiKey);
  }
};