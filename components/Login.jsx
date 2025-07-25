// components/Login.jsx - Complete fix with Firestore integration
import React, { useState } from 'react';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage, faUser, faCamera, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/Button';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, storage, db } from '../firebaseconfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/router';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [error, setError] = useState(null);
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const router = useRouter();

    const addProgress = (message) => {
        console.log('PROGRESS:', message);
        setUploadProgress(prev => prev + '\n' + message);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError(null);
        setUploadProgress('');
        setIsLoading(true);
        
        try {
            if (isLogin) {
                addProgress('Attempting to login...');
                await signInWithEmailAndPassword(auth, email, password);
                addProgress('Login successful');
                router.push('/');
            } else {
                addProgress('Starting signup process...');
                
                // Validate inputs
                if (!username.trim()) {
                    throw new Error('Username is required');
                }
                if (username.length < 3) {
                    throw new Error('Username must be at least 3 characters');
                }
                
                // Create user account
                addProgress('Creating user account...');
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                addProgress(`User account created successfully. UID: ${user.uid}`);
                
                let finalPhotoURL = null;
                
                // Handle profile picture upload
                if (profilePic) {
                    try {
                        addProgress('Starting profile picture upload...');
                        addProgress(`File details: ${profilePic.name}, ${(profilePic.size / 1024).toFixed(1)}KB, ${profilePic.type}`);
                        
                        // Create storage reference with timestamp for uniqueness
                        const timestamp = Date.now();
                        const fileExtension = profilePic.name.split('.').pop().toLowerCase();
                        const fileName = `profile_${timestamp}.${fileExtension}`;
                        const storagePath = `profilePictures/${user.uid}/${fileName}`;
                        
                        addProgress(`Upload path: ${storagePath}`);
                        
                        const storageRef = ref(storage, storagePath);
                        
                        // Upload file with metadata
                        addProgress('Uploading file to Firebase Storage...');
                        const metadata = {
                            contentType: profilePic.type,
                            customMetadata: {
                                'uploadedBy': user.uid,
                                'uploadedAt': new Date().toISOString(),
                                'originalName': profilePic.name
                            }
                        };
                        
                        const uploadResult = await uploadBytes(storageRef, profilePic, metadata);
                        addProgress('File uploaded successfully');
                        console.log('Upload result:', uploadResult);
                        
                        // Get download URL
                        addProgress('Getting download URL...');
                        finalPhotoURL = await getDownloadURL(storageRef);
                        addProgress(`Download URL obtained: ${finalPhotoURL}`);
                        
                        // Test the URL immediately
                        addProgress('Testing uploaded image URL...');
                        await testImageURL(finalPhotoURL);
                        addProgress('✅ Image URL test passed');
                        
                    } catch (uploadError) {
                        console.error('Profile picture upload failed:', uploadError);
                        addProgress(`❌ Upload failed: ${uploadError.message}`);
                        
                        // Log detailed error information
                        if (uploadError.code) {
                            addProgress(`Error code: ${uploadError.code}`);
                        }
                        
                        // Don't fail the entire signup for image upload failure
                        setError('Account created but profile picture upload failed. You can update it later in settings.');
                        finalPhotoURL = null;
                    }
                }
                
                // Create fallback avatar if no profile picture or upload failed
                if (!finalPhotoURL) {
                    const encodedName = encodeURIComponent(username);
                    finalPhotoURL = `https://ui-avatars.com/api/?name=${encodedName}&background=4F46E5&color=fff&size=200&bold=true`;
                    addProgress(`Using fallback avatar: ${finalPhotoURL}`);
                }
                
                // Update Firebase Auth profile
                addProgress('Updating Firebase Auth profile...');
                await updateProfile(user, {
                    displayName: username,
                    photoURL: finalPhotoURL
                });
                addProgress('✅ Firebase Auth profile updated successfully');
                
                // Create/Update Firestore user document
                addProgress('Creating Firestore user document...');
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        email: user.email.toLowerCase(),
                        displayName: username,
                        photoURL: finalPhotoURL,
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        emailVerified: user.emailVerified
                    }, { merge: true });
                    
                    addProgress('✅ Firestore user document created successfully');
                } catch (firestoreError) {
                    console.error('Firestore document creation failed:', firestoreError);
                    addProgress(`⚠️ Firestore document creation failed: ${firestoreError.message}`);
                    // Continue anyway as this isn't critical for auth
                }
                
                // Wait for profile update to propagate
                addProgress('Waiting for profile update to propagate...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Force reload user profile
                addProgress('Reloading Firebase Auth profile...');
                await user.reload();
                
                // Get fresh user data
                const updatedUser = auth.currentUser;
                addProgress(`Updated profile check:`);
                addProgress(`- Name: ${updatedUser.displayName}`);
                addProgress(`- Photo: ${updatedUser.photoURL}`);
                addProgress(`- Email: ${updatedUser.email}`);
                
                // Verify the profile was updated correctly
                if (updatedUser.displayName === username && updatedUser.photoURL === finalPhotoURL) {
                    addProgress('✅ Profile update verification successful');
                } else {
                    addProgress('⚠️ Profile update verification failed');
                    addProgress(`Expected: name="${username}", photo="${finalPhotoURL}"`);
                    addProgress(`Actual: name="${updatedUser.displayName}", photo="${updatedUser.photoURL}"`);
                }
                
                // Final verification - test the photoURL one more time
                if (updatedUser.photoURL) {
                    try {
                        await testImageURL(updatedUser.photoURL);
                        addProgress('✅ Final image URL verification passed');
                    } catch (testError) {
                        addProgress(`⚠️ Final image URL test failed: ${testError.message}`);
                    }
                }
                
                // Set up auth state listener for navigation
                addProgress('Setting up navigation...');
                const unsubscribe = onAuthStateChanged(auth, (authUser) => {
                    if (authUser && authUser.displayName) {
                        addProgress('✅ Auth state confirmed, navigating to home...');
                        unsubscribe(); // Clean up listener
                        setTimeout(() => {
                            setIsLoading(false);
                            router.push('/');
                        }, 1000);
                    }
                });
                
                // Fallback navigation after 8 seconds
                setTimeout(() => {
                    addProgress('⏰ Fallback navigation triggered');
                    unsubscribe();
                    setIsLoading(false);
                    router.push('/');
                }, 8000);
                
                return; // Don't set loading to false yet
            }
        } catch (err) {
            console.error('Authentication error:', err);
            addProgress(`❌ Fatal Error: ${err.message}`);
            
            // Handle specific Firebase Auth errors
            const errorMessages = {
                'auth/email-already-in-use': 'This email is already registered. Please use a different email or try logging in.',
                'auth/weak-password': 'Password should be at least 6 characters long.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/user-not-found': 'No account found with this email. Please check your email or sign up.',
                'auth/wrong-password': 'Incorrect password. Please try again.',
                'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
                'auth/network-request-failed': 'Network error. Please check your internet connection.',
                'storage/unauthorized': 'Upload failed: Storage permissions denied. Please contact support.',
                'storage/canceled': 'Upload was canceled.',
                'storage/unknown': 'Upload failed due to an unknown error.',
            };
            
            setError(errorMessages[err.code] || err.message);
        } finally {
            if (isLogin) {
                setIsLoading(false);
            }
            // For signup, loading will be set to false after navigation
        }
    };

    // Helper function to test if an image URL is accessible
    const testImageURL = (url) => {
        return new Promise((resolve, reject) => {
            if (!url) {
                reject(new Error('No URL provided'));
                return;
            }
            
            const img = new Image();
            img.onload = () => {
                console.log('✅ Image loaded successfully:', url);
                resolve(true);
            };
            img.onerror = (error) => {
                console.error('❌ Image failed to load:', url, error);
                reject(new Error('Image URL not accessible'));
            };
            
            // Set crossOrigin to handle CORS
            img.crossOrigin = 'anonymous';
            img.src = url;
            
            // Timeout after 15 seconds
            setTimeout(() => {
                reject(new Error('Image load timeout'));
            }, 15000);
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified)
            });
            
            // Validate file
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Image size should be less than 5MB');
                return;
            }
            
            // Validate file extension
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            if (!allowedExtensions.includes(fileExtension)) {
                setError('Please select a valid image format (JPG, PNG, GIF, WebP)');
                return;
            }

            setProfilePic(file);
            setError(null);
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
                console.log('✅ Preview created successfully');
            };
            reader.onerror = () => {
                console.error('❌ Failed to create preview');
                setError('Failed to process image file');
            };
            reader.readAsDataURL(file);
        }
    };

    const switchAuthMode = () => {
        setIsLogin(!isLogin);
        setError(null);
        setUploadProgress('');
        setUsername('');
        setProfilePic(null);
        setPreviewImage(null);
    };

    const clearImage = () => {
        setProfilePic(null);
        setPreviewImage(null);
        setError(null);
        // Reset the file input
        const fileInput = document.getElementById('profilePic');
        if (fileInput) fileInput.value = '';
    };

    return (
        <>
            <Head>
                <title>Chat App | {isLogin ? 'Login' : 'Sign Up'}</title>
            </Head>
            <main className='w-full font-disp h-screen flex justify-center flex-col items-center bg-gradient-to-br from-mSec to-dSec'>
                <div className='lg:px-20 lg:pb-12 px-10 py-8 bg-gray-700 text-white text-lg shadow-xl shadow-gray-800 rounded-3xl text-center max-w-lg w-full mx-4'>
                    {/* Title */}
                    <h1 className="my-4 lg:text-3xl text-2xl mb-10">Chat App By Prio</h1>
                    
                    {/* Profile Picture Upload (Signup only) */}
                    {!isLogin && (
                        <div className='flex justify-center mb-6'>
                            <div className='relative'>
                                <label htmlFor="profilePic" className="cursor-pointer group">
                                    <div className="w-24 h-24 rounded-full bg-dPri flex items-center justify-center overflow-hidden border-4 border-gray-700 hover:border-gray-500 transition-all">
                                        {previewImage ? (
                                            <img 
                                                src={previewImage} 
                                                alt="Profile preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <FontAwesomeIcon 
                                                icon={faUser} 
                                                className="text-4xl text-white"
                                            />
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-lPri p-2 rounded-full group-hover:bg-dPri transition-all">
                                        <FontAwesomeIcon 
                                            icon={faCamera} 
                                            className="text-white text-sm"
                                        />
                                    </div>
                                </label>
                                
                                {/* Clear image button */}
                                {previewImage && (
                                    <button
                                        type="button"
                                        onClick={clearImage}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                )}
                                
                                <input 
                                    id="profilePic"
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}

                    {/* Message Icon (Login only) */}
                    {isLogin && (
                        <div className='flex justify-center mb-6'>
                            <div className='p-6 bg-dPri rounded-full hover:bg-lPri transition-all'>
                                <FontAwesomeIcon icon={faMessage} className='text-4xl text-white' />
                            </div>
                        </div>
                    )}

                    {/* Auth Form */}
                    <form onSubmit={handleAuth} className='mt-6 space-y-4'>
                        {!isLogin && (
                            <div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder='Username'
                                    className='p-2 w-full bg-transparent outline-0 border-b-2 border-dPri hover:border-lPri focus:border-lPri transition-all text-white placeholder-gray-300'
                                    required
                                    minLength="3"
                                    maxLength="20"
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder='Email'
                                className='p-2 w-full bg-transparent outline-0 border-b-2 border-dPri hover:border-lPri focus:border-lPri transition-all text-white placeholder-gray-300'
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder='Password'
                                className='p-2 w-full bg-transparent outline-0 border-b-2 border-dPri hover:border-lPri focus:border-lPri transition-all text-white placeholder-gray-300'
                                required
                                minLength="6"
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className='text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-400/30'>
                                {error}
                            </div>
                        )}

                        {/* Progress Information */}
                        {uploadProgress && !isLogin && (
                            <div className='text-xs text-green-300 bg-green-900/20 p-3 rounded-lg border border-green-400/30 text-left max-h-40 overflow-y-auto'>
                                <div className="font-semibold mb-1">Signup Progress:</div>
                                <pre className="whitespace-pre-wrap font-mono">{uploadProgress}</pre>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full mt-6 py-3 bg-dPri hover:bg-lPri text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className='flex items-center justify-center'>
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-3" />
                                    {isLogin ? 'Signing in...' : 'Creating account...'}
                                </span>
                            ) : isLogin ? 'Login' : 'Sign Up'}
                        </Button>
                    </form>

                    <div className='mt-6 text-sm'>
                        <button 
                            onClick={switchAuthMode}
                            className="text-lPri hover:text-dPri underline cursor-pointer disabled:opacity-50"
                            type="button"
                            disabled={isLoading}
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                        </button>
                    </div>

                    {/* Debug note */}
                    {!isLogin && (
                        <div className="mt-4 text-xs text-gray-400">
                            Having issues? Check the browser console for detailed logs.
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export default Login;