import React, { useState } from 'react';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage, faUser, faCamera } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/Button';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, storage } from '../firebaseconfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    const router = useRouter();

    const handleAuth = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                router.push('/');
            } else {
                // Create user
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                
                // Upload profile picture if exists
                let photoURL = null;
                if (profilePic) {
                    const storageRef = ref(storage, `profilePictures/${userCredential.user.uid}/${profilePic.name}`);
                    await uploadBytes(storageRef, profilePic);
                    photoURL = await getDownloadURL(storageRef);
                }
                
                // Update user profile with username and photo
                await updateProfile(userCredential.user, {
                    displayName: username,
                    photoURL: photoURL || `https://ui-avatars.com/api/?name=${username.replace(' ', '+')}&background=random`
                });

                router.push('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type and size
            if (!file.type.match('image.*')) {
                setError('Please select an image file');
                return;
            }
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setError('Image size should be less than 2MB');
                return;
            }

            setProfilePic(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const switchAuthMode = () => {
        setIsLogin(!isLogin);
        setError(null);
        setUsername('');
        setProfilePic(null);
        setPreviewImage(null);
    };

    return (
        <>
            <Head>
                <title>Chat App | {isLogin ? 'Login' : 'Sign Up'}</title>
            </Head>
            <main className='w-full font-disp h-screen flex justify-center flex-col items-center bg-gradient-to-br from-mSec to-dSec'>
                <div className='lg:px-20 lg:pb-12 px-10 py-8 bg-gray-700 text-white text-lg shadow-xl shadow-gray-800 rounded-3xl text-center'>
                    {/* Title */}
                    <h1 className="my-4 lg:text-3xl text-2xl mb-10">Chat App By Prio</h1>
                    
                    {/* Profile Picture Upload (Signup only) */}
                    {!isLogin && (
                        <div className='flex justify-center mb-6'>
                            <div className='relative'>
                                <label htmlFor="profilePic" className="cursor-pointer group">
                                    <div className="w-24 h-24 rounded-full bg-dPri flex items-center justify-center overflow-hidden border-4 border-gray-700">
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
                                <input 
                                    id="profilePic"
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
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
                                    className='p-2 w-full bg-transparent outline-0 border-b-2 border-dPri hover:border-lPri transition-all text-white'
                                    required
                                    minLength="3"
                                    maxLength="20"
                                />
                            </div>
                        )}

                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder='Email'
                                className='p-2 w-full bg-transparent outline-0 border-b-2 border-dPri hover:border-lPri transition-all text-white'
                                required
                            />
                        </div>

                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder='Password'
                                className='p-2 w-full bg-transparent outline-0 border-b-2 border-dPri hover:border-lPri transition-all text-white'
                                required
                                minLength="6"
                            />
                        </div>

                        {error && (
                            <div className='text-red-400 text-sm'>
                                {error}
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full mt-6 py-3 bg-dPri hover:bg-lPri text-white font-semibold rounded-lg transition-all"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className='flex items-center justify-center'>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : isLogin ? 'Login' : 'Sign Up'}
                        </Button>
                    </form>

                    <div className='mt-6 text-sm'>
                        <button 
                            onClick={switchAuthMode}
                            className="text-lPri hover:text-dPri underline cursor-pointer"
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                        </button>
                    </div>
                </div>
            </main>
        </>
    );
};

export default Login;
