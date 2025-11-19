
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Match, Message, RelationshipGoal, Lifestyle } from './types';
import { INITIAL_USERS, EMOJIS, RELATIONSHIP_GOALS, LIFESTYLE_OPTIONS } from './constants';
import { generateIcebreakers, generateQuickReplies } from './services/geminiService';
import { HeartIcon, XMarkIcon, SparklesIcon, ChatBubbleIcon, FireIcon, UserIcon, AdjustmentsHorizontalIcon, EyeIcon, StarIcon, ShieldExclamationIcon, UndoIcon, UserPlusIcon, FaceSmileIcon, BoltIcon, VideoCameraIcon, MicrophoneIcon, PhoneIcon, VideoCameraSlashIcon, MicrophoneSlashIcon, PlayIcon, PauseIcon, MapPinIcon, GeminiCupidLogo, GoalIcon, SmokingIcon, DrinkingIcon, ExerciseIcon, CheckBadgeIcon, MagnifyingGlassIcon, BellIcon } from './components/Icons';

// --- Animation Constants ---
const SWIPE_THRESHOLD = 120; // Min drag distance to trigger a swipe
const VELOCITY_THRESHOLD = 0.3; // Min flick velocity to trigger a swipe
const ANIMATION_DURATION = 200; // ms for card animations

interface Filters {
  ageRange: { min: number; max: number };
  interests: string[];
  maxDistance: number;
  relationshipGoal?: string;
  lifestyle?: {
      smoking?: string[];
      drinking?: string[];
      exercise?: string[];
  }
}

// --- Helper Functions for Persistence ---
const getStoredLikes = (): Record<number, number[]> => {
    try {
        return JSON.parse(localStorage.getItem('gemini-cupid-likes') || '{}');
    } catch { return {}; }
};

const saveStoredLike = (fromId: number, toId: number) => {
    const likes = getStoredLikes();
    if (!likes[fromId]) likes[fromId] = [];
    if (!likes[fromId].includes(toId)) {
        likes[fromId].push(toId);
        localStorage.setItem('gemini-cupid-likes', JSON.stringify(likes));
    }
    return likes;
};

const removeStoredLike = (fromId: number, toId: number) => {
    const likes = getStoredLikes();
    if (likes[fromId]) {
        likes[fromId] = likes[fromId].filter(id => id !== toId);
        localStorage.setItem('gemini-cupid-likes', JSON.stringify(likes));
    }
    return likes;
};

const getDistanceFromLatLonInMi = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Radius of the earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in miles
    return Math.round(d);
};

// --- Reusable Components ---

const SplashScreen: React.FC<{ onFinished: () => void }> = ({ onFinished }) => {
    useEffect(() => {
        const timer = setTimeout(onFinished, 2500); // Show splash for 2.5 seconds
        return () => clearTimeout(timer);
    }, [onFinished]);

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-pink-500 to-orange-400 flex flex-col items-center justify-center">
            <div className="animate-pulse-subtle">
                <GeminiCupidLogo className="w-32 h-32 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold text-white mt-6 tracking-wider drop-shadow-md animate-fade-in-up">Gemini Cupid</h1>
            <p className="text-white/90 mt-2 text-lg animate-fade-in-up" style={{ animationDelay: '0.3s' }}>Find your cosmic connection</p>
        </div>
    );
};

const AuthScreen: React.FC<{
    existingUsers: User[];
    onLogin: (user: User) => void;
    onSignup: (newUser: User) => void;
}> = ({ existingUsers, onLogin, onSignup }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [loginId, setLoginId] = useState<string>("");
    
    // Signup Form State
    const [newName, setNewName] = useState("");
    const [newAge, setNewAge] = useState(18);
    const [newBio, setNewBio] = useState("");
    const [newInterest, setNewInterest] = useState("");
    const [newInterests, setNewInterests] = useState<string[]>([]);
    const [gender, setGender] = useState("female"); // Simple toggle for random avatar generation
    const [isCreating, setIsCreating] = useState(false);

    const handleAddInterest = () => {
        if (newInterest.trim() && !newInterests.includes(newInterest.trim())) {
            setNewInterests([...newInterests, newInterest.trim()]);
            setNewInterest("");
        }
    };

    const handleSubmitSignup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newBio || newInterests.length === 0) return;
        
        setIsCreating(true);

        // Simulate network delay for saving account
        setTimeout(() => {
            const newUser: User = {
                id: Date.now(),
                name: newName,
                age: newAge,
                bio: newBio,
                // Generate a random avatar based on basic selection
                imageUrl: `https://picsum.photos/seed/${newName}-${Date.now()}/800/1200`, 
                interests: newInterests,
                location: "San Francisco, CA", // Default for demo
                coordinates: { lat: 37.7749, lon: -122.4194 }, // Default to SF for demo
                viewCount: 0,
                profileVisibility: 'public',
                relationshipGoal: 'Figuring it out',
                lifestyle: { smoking: 'No', drinking: 'Socially', exercise: 'Sometimes' }
            };
            onSignup(newUser);
            setIsCreating(false);
        }, 2000);
    };

    const handleLogin = () => {
        const user = existingUsers.find(u => u.id === parseInt(loginId));
        if (user) {
            onLogin(user);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-y-auto">
             <div className="h-1/3 bg-gradient-to-br from-pink-500 to-orange-400 flex flex-col items-center justify-center rounded-b-[3rem] shadow-lg mb-6 shrink-0">
                <GeminiCupidLogo className="w-20 h-20 text-white mb-2" />
                <h1 className="text-3xl font-bold text-white">Gemini Cupid</h1>
                <p className="text-white/80">Sign in to find your match</p>
            </div>

            <div className="px-8 pb-8 flex-1">
                <div className="flex border-b mb-6">
                    <button 
                        className={`flex-1 pb-2 font-bold ${!isSignup ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400'}`}
                        onClick={() => setIsSignup(false)}
                    >
                        Log In
                    </button>
                    <button 
                        className={`flex-1 pb-2 font-bold ${isSignup ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400'}`}
                        onClick={() => setIsSignup(true)}
                    >
                        Sign Up
                    </button>
                </div>

                {!isSignup ? (
                    <div className="space-y-6 animate-fade-in-up">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select User (Demo Mode)</label>
                            <select 
                                className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-pink-500 focus:border-pink-500"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                            >
                                <option value="">-- Choose a profile --</option>
                                {existingUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.age})</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={handleLogin}
                            disabled={!loginId}
                            className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Swiping
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitSignup} className="space-y-4 animate-fade-in-up">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                            <input 
                                type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                                className="w-full p-3 border rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                placeholder="Your Name"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age</label>
                                <input 
                                    type="number" required min="18" max="99" value={newAge} onChange={e => setNewAge(parseInt(e.target.value))}
                                    className="w-full p-3 border rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Avatar Style</label>
                                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50">
                                    <option value="female">Style A</option>
                                    <option value="male">Style B</option>
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bio</label>
                            <textarea 
                                required value={newBio} onChange={e => setNewBio(e.target.value)} rows={3}
                                className="w-full p-3 border rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                placeholder="Tell us about yourself..."
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Interests</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" value={newInterest} onChange={e => setNewInterest(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                                    className="flex-1 p-3 border rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    placeholder="Add interest"
                                />
                                <button type="button" onClick={handleAddInterest} className="bg-pink-100 text-pink-600 px-4 rounded-xl font-bold">+</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {newInterests.map(i => (
                                    <span key={i} className="bg-pink-50 text-pink-600 px-2 py-1 rounded-lg text-sm border border-pink-100">{i}</span>
                                ))}
                            </div>
                        </div>
                        <button 
                            type="submit"
                            disabled={isCreating}
                            className={`w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white py-3 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform mt-4 flex items-center justify-center gap-2 ${isCreating ? 'opacity-80 cursor-not-allowed' : ''}`}
                        >
                            {isCreating ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

const SwipeableProfileCard: React.FC<{
  user: User;
  isTop: boolean;
  onSwipe: (direction: 'left' | 'right') => void;
  onBlock: (userId: number) => void;
  onTap: (user: User) => void;
  action: 'like' | 'pass' | 'superlike' | null;
  style?: React.CSSProperties;
}> = ({ user, isTop, onSwipe, onBlock, onTap, action, style: propStyle }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const gestureState = useRef({
        isDragging: false,
        startX: 0,
        currentX: 0,
        startTime: 0,
    }).current;

    const [style, setStyle] = useState({
        transform: 'translateX(0px) rotate(0deg)',
        transition: 'none',
    });

    const animateOut = useCallback((direction: 'left' | 'right') => {
        const endX = direction === 'right' ? window.innerWidth : -window.innerWidth;
        const rotation = gestureState.currentX / 15;
        setStyle({
            transform: `translateX(${endX}px) rotate(${rotation * 1.5}deg)`,
            transition: `transform ${ANIMATION_DURATION}ms ease-out`,
        });
        
        setTimeout(() => onSwipe(direction), ANIMATION_DURATION);
    }, [onSwipe, gestureState]);

    const animateReset = useCallback(() => {
        setStyle({
            transform: 'translateX(0px) rotate(0deg)',
            transition: `transform ${ANIMATION_DURATION}ms ease-out`,
        });
    }, []);
    
    useEffect(() => {
        if (!isTop || !action) return;
        
        if (action === 'pass') {
            gestureState.currentX = -20;
            animateOut('left');
        } else { // 'like' or 'superlike'
            gestureState.currentX = 20;
            animateOut('right');
        }
    }, [action, isTop, animateOut, gestureState]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isTop) return;
        gestureState.isDragging = true;
        gestureState.startX = e.clientX;
        gestureState.currentX = 0;
        gestureState.startTime = Date.now();
        cardRef.current?.setPointerCapture(e.pointerId);
        setStyle(s => ({ ...s, transition: 'none' }));
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!gestureState.isDragging) return;
        gestureState.currentX = e.clientX - gestureState.startX;
        const rotation = gestureState.currentX / 20;
        setStyle(s => ({ ...s, transform: `translateX(${gestureState.currentX}px) rotate(${rotation}deg)` }));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!gestureState.isDragging) return;
        gestureState.isDragging = false;
        cardRef.current?.releasePointerCapture(e.pointerId);

        const dragDistance = Math.abs(gestureState.currentX);
        const dragDuration = Date.now() - gestureState.startTime;
        const velocity = dragDuration > 0 ? dragDistance / dragDuration : 0;

        if (dragDistance < 15 && dragDuration < 250) { // It's a tap (more lenient)
            onTap(user);
            animateReset(); // Reset card position
            return;
        }

        if (dragDistance > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
            animateOut(gestureState.currentX > 0 ? 'right' : 'left');
        } else {
            animateReset();
        }
    };
    
    return (
        <div
            ref={cardRef}
            className="absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-white select-none cursor-grab active:cursor-grabbing"
            style={{ ...propStyle, ...(isTop ? style : {}), touchAction: 'none' }}
            onPointerDown={isTop ? handlePointerDown : undefined}
            onPointerMove={isTop ? handlePointerMove : undefined}
            onPointerUp={isTop ? handlePointerUp : undefined}
            onPointerCancel={isTop ? handlePointerUp : undefined}
        >
            <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover pointer-events-none" />
            <div className="absolute inset-0 w-full h-full pointer-events-none">
                {isTop && action === 'superlike' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                        <StarIcon className="w-32 h-32 text-blue-500/80 animate-ping" />
                    </div>
                )}
            </div>
            <div className="absolute bottom-0 left-0 w-full h-2/5 bg-gradient-to-t from-black via-black/70 to-transparent p-6 flex flex-col justify-end">
                 <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-4">
                            <h2 className="text-4xl font-bold text-white drop-shadow-lg">{user.name}, {user.age}</h2>
                        </div>
                         <div className="flex items-center gap-4 mt-2">
                             {typeof user.distance === 'number' && (
                                <div className="flex items-center bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-semibold">
                                    <MapPinIcon className="w-5 h-5 mr-1.5" />
                                    <span>{user.distance < 1 ? 'Less than a mile away' : `${user.distance} miles away`}</span>
                                </div>
                             )}
                            {(user.viewCount || 0) > 0 && (
                                <div className="flex items-center bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-semibold">
                                    <EyeIcon className="w-5 h-5 mr-1.5" />
                                    <span>{user.viewCount}</span>
                                </div>
                            )}
                        </div>
                        <p className="text-white text-lg mt-2 drop-shadow-md line-clamp-2">{user.bio}</p>
                    </div>
                     {isTop && (
                         <button title="Block User" onClick={(e) => { e.stopPropagation(); onBlock(user.id); }} className="text-white/60 hover:text-white transition-colors p-2 rounded-full bg-black/30 backdrop-blur-sm" aria-label={`Block ${user.name}`}>
                             <ShieldExclamationIcon className="w-6 h-6" />
                         </button>
                     )}
                </div>
            </div>
        </div>
    );
};

const NotificationModal: React.FC<{ 
    onClose: () => void; 
    requests: User[];
    unreadChats: { user: User, count: number }[];
    onClickRequest: () => void;
    onClickChat: (user: User) => void;
}> = ({ onClose, requests, unreadChats, onClickRequest, onClickChat }) => {
    return (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-pink-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <BellIcon className="w-5 h-5 text-pink-500" />
                        Notifications
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    {requests.length === 0 && unreadChats.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>No new notifications.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {requests.length > 0 && (
                                <div className="p-3 bg-pink-50/50 cursor-pointer hover:bg-pink-50 transition-colors" onClick={onClickRequest}>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-pink-100 p-2 rounded-full text-pink-600">
                                            <UserPlusIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{requests.length} New Likes</p>
                                            <p className="text-sm text-gray-600">Check your friend requests!</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {unreadChats.map(({ user, count }) => (
                                <div key={user.id} className="p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onClickChat(user)}>
                                    <div className="flex items-center gap-3">
                                        <img src={user.imageUrl} className="w-10 h-10 rounded-full object-cover border-2 border-pink-100" />
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800">{user.name}</p>
                                            <p className="text-sm text-gray-600">{count} unread message{count > 1 ? 's' : ''}</p>
                                        </div>
                                        <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const ProfileDetailScreen: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
    return (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-40 flex justify-center items-end" onClick={onClose}>
            <div className="bg-white w-full max-w-md h-[90vh] rounded-t-3xl shadow-xl relative animate-slide-up overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 sticky top-0 bg-white z-10 flex justify-end">
                    <button title="Close" onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-2">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>
                <div className="px-6 pb-6 -mt-12">
                    <img src={user.imageUrl} alt={user.name} className="w-full h-96 object-cover rounded-2xl shadow-lg" />
                    
                    <div className="mt-6">
                        <h2 className="text-4xl font-bold text-gray-800">{user.name}, <span className="font-light">{user.age}</span></h2>
                        <div className="flex items-center gap-4 mt-2 text-gray-500">
                             {typeof user.distance === 'number' && (
                                <div className="flex items-center">
                                    <MapPinIcon className="w-5 h-5 mr-1.5" />
                                    <span>{user.distance < 1 ? 'Less than a mile away' : `${user.distance} miles away`}</span>
                                </div>
                             )}
                             <div className="flex items-center">
                                <EyeIcon className="w-5 h-5 mr-1.5" />
                                <span>{user.viewCount} views</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 border-t pt-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">About</h3>
                        <p className="text-gray-700 text-base leading-relaxed">{user.bio}</p>
                    </div>
                    
                    {user.relationshipGoal && (
                        <div className="mt-6 border-t pt-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Looking For</h3>
                            <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg w-fit">
                                <GoalIcon className="w-5 h-5" />
                                <span className="font-medium">{user.relationshipGoal}</span>
                            </div>
                        </div>
                    )}
                    
                    {user.lifestyle && (
                        <div className="mt-6 border-t pt-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Lifestyle</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {user.lifestyle.smoking && (
                                    <div className="flex flex-col items-center justify-center bg-gray-50 p-3 rounded-xl">
                                        <SmokingIcon className="w-6 h-6 text-gray-500 mb-1" />
                                        <span className="text-xs text-gray-600">Smoking</span>
                                        <span className="text-sm font-semibold text-gray-800">{user.lifestyle.smoking}</span>
                                    </div>
                                )}
                                {user.lifestyle.drinking && (
                                    <div className="flex flex-col items-center justify-center bg-gray-50 p-3 rounded-xl">
                                        <DrinkingIcon className="w-6 h-6 text-gray-500 mb-1" />
                                        <span className="text-xs text-gray-600">Drinking</span>
                                        <span className="text-sm font-semibold text-gray-800">{user.lifestyle.drinking}</span>
                                    </div>
                                )}
                                {user.lifestyle.exercise && (
                                    <div className="flex flex-col items-center justify-center bg-gray-50 p-3 rounded-xl">
                                        <ExerciseIcon className="w-6 h-6 text-gray-500 mb-1" />
                                        <span className="text-xs text-gray-600">Exercise</span>
                                        <span className="text-sm font-semibold text-gray-800">{user.lifestyle.exercise}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                     <div className="mt-6 border-t pt-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Interests</h3>
                        <div className="flex flex-wrap gap-2">
                            {user.interests.map(interest => (
                                <span key={interest} className="bg-pink-100 text-pink-800 text-sm font-semibold px-3 py-1.5 rounded-full">{interest}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const MatchNotification: React.FC<{ currentUser: User; matchedUser: User; isSuperLike: boolean; onKeepSwiping: () => void; onStartChat: () => void; }> = ({ currentUser, matchedUser, isSuperLike, onKeepSwiping, onStartChat }) => {
    const [icebreakers, setIcebreakers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIcebreakers = async () => {
            setLoading(true);
            const result = await generateIcebreakers(currentUser, matchedUser);
            setIcebreakers(result);
            setLoading(false);
        };
        fetchIcebreakers();
    }, [currentUser, matchedUser]);

    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm text-center p-8 relative animate-fade-in-up">
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center space-x-4">
                    <img src={currentUser.imageUrl} alt={currentUser.name} className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg" />
                     {isSuperLike ? (
                        <StarIcon className="w-12 h-12 text-blue-500" />
                    ) : (
                        <span className="text-5xl text-pink-400">&hearts;</span>
                    )}
                    <img src={matchedUser.imageUrl} alt={matchedUser.name} className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg" />
                </div>
                <h2 className={`text-4xl font-bold text-transparent bg-clip-text ${isSuperLike ? 'bg-gradient-to-r from-blue-400 to-teal-300' : 'bg-gradient-to-r from-pink-500 to-orange-400'} mt-12`}>
                    {isSuperLike ? "It's a Super Match!" : "It's a Match!"}
                </h2>
                <p className="text-gray-600 mt-2">
                     {isSuperLike ? `You and ${matchedUser.name} have super liked each other!` : `You and ${matchedUser.name} have liked each other.`}
                </p>

                <div className="mt-6 text-left">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-pink-500" />
                        AI-Powered Icebreakers
                    </h3>
                    {loading ? (
                        <div className="space-y-2 mt-2">
                            <div className="bg-gray-200 h-4 w-full rounded animate-pulse"></div>
                            <div className="bg-gray-200 h-4 w-5/6 rounded animate-pulse"></div>
                            <div className="bg-gray-200 h-4 w-full rounded animate-pulse"></div>
                        </div>
                    ) : (
                        <ul className="list-none mt-2 space-y-2">
                            {icebreakers.map((q, i) => (
                                <li key={i} className="text-gray-700 bg-gray-100 p-3 rounded-lg text-sm">&ldquo;{q}&rdquo;</li>
                            ))}
                        </ul>
                    )}
                </div>

                <button onClick={onStartChat} className={`w-full mt-6 text-white font-bold py-3 rounded-full shadow-lg hover:scale-105 transition-transform ${isSuperLike ? 'bg-gradient-to-r from-blue-500 to-teal-400' : 'bg-gradient-to-r from-pink-500 to-orange-400'}`}>
                    Start Chatting
                </button>
                <button onClick={onKeepSwiping} className="w-full mt-3 text-gray-600 font-semibold py-3 rounded-full hover:bg-gray-100 transition-colors">
                    Keep Swiping
                </button>
            </div>
        </div>
    );
};

const RequestsScreen: React.FC<{
    usersWhoLikeYou: User[];
    onAccept: (userId: number) => void;
    onReject: (userId: number) => void;
    onBack: () => void;
}> = ({ usersWhoLikeYou, onAccept, onReject, onBack }) => {
    return (
        <div className="flex flex-col h-full bg-white">
            <header className="flex items-center p-4 border-b sticky top-0 bg-white z-10">
                <button title="Back" onClick={onBack} className="text-gray-600 mr-4 text-2xl" aria-label="Go back">&larr;</button>
                <h2 className="font-bold text-xl text-gray-800">Friend Requests</h2>
            </header>
            <div className="p-4 h-full overflow-y-auto">
                {usersWhoLikeYou.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="bg-gray-100 p-6 rounded-full mb-4">
                             <UserPlusIcon className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700">No new requests</h3>
                        <p className="text-gray-500 mt-2 px-8">When people like your profile, they will appear here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {usersWhoLikeYou.map(user => (
                             <div key={user.id} className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg group">
                                <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                                    <h3 className="font-bold text-lg text-white drop-shadow mb-10">{user.name}, {user.age}</h3>
                                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-6">
                                        <button title="Pass" onClick={() => onReject(user.id)} className="bg-white/90 backdrop-blur-sm rounded-full p-3 text-red-500 hover:scale-110 transition-transform shadow-md" aria-label={`Pass on ${user.name}`}>
                                            <XMarkIcon className="w-6 h-6" />
                                        </button>
                                        <button title="Accept" onClick={() => onAccept(user.id)} className="bg-white/90 backdrop-blur-sm rounded-full p-4 text-pink-500 hover:scale-110 transition-transform shadow-md" aria-label={`Match with ${user.name}`}>
                                            <HeartIcon className="w-7 h-7" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


const Header: React.FC<{ activeView: string, setActiveView: (view: string) => void, requestsCount: number, unreadMatchesCount: number }> = ({ activeView, setActiveView, requestsCount, unreadMatchesCount }) => {
    const baseClass = "relative p-3 text-gray-400 hover:text-pink-500 transition-colors";
    const activeClass = "text-pink-500";
    return (
        <header className="flex justify-around items-center bg-white p-2 rounded-t-3xl shadow-md">
             <button title="Profile" onClick={() => setActiveView('profile')} className={`${baseClass} ${activeView === 'profile' ? activeClass : ''}`} aria-label="Edit Profile">
                <UserIcon className="w-8 h-8"/>
            </button>
            <button title="Swipe" onClick={() => setActiveView('swipe')} className={`${baseClass} ${activeView === 'swipe' ? activeClass : ''}`} aria-label="Swipe">
                <FireIcon className="w-8 h-8"/>
            </button>
             <button title="Friend Requests" onClick={() => setActiveView('requests')} className={`${baseClass} ${activeView === 'requests' ? activeClass : ''}`} aria-label="Friend Requests">
                <UserPlusIcon className="w-8 h-8"/>
                {requestsCount > 0 && (
                    <span className="absolute top-1 right-1 block w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">{requestsCount}</span>
                )}
            </button>
             <button title="Filters" onClick={() => setActiveView('filters')} className={`${baseClass} ${activeView === 'filters' ? activeClass : ''}`} aria-label="Filters">
                <AdjustmentsHorizontalIcon className="w-8 h-8"/>
            </button>
            <button title="Matches" onClick={() => setActiveView('matches')} className={`${baseClass} ${activeView === 'matches' ? activeClass : ''}`} aria-label="View Matches">
                <ChatBubbleIcon className="w-8 h-8"/>
                {unreadMatchesCount > 0 && (
                    <span className="absolute top-1 right-1 block w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">{unreadMatchesCount}</span>
                )}
            </button>
        </header>
    );
};

const MatchesScreen: React.FC<{ matches: Match[], onSelectChat: (user: User) => void, currentUser: User, messages: Record<string, Message[]> }> = ({ matches, onSelectChat, currentUser, messages }) => {
    return (
        <div className="p-4 h-full overflow-y-auto bg-white">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Matches</h2>
            {matches.length === 0 ? (
                <p className="text-gray-500 text-center mt-8">No matches yet. Keep swiping!</p>
            ) : (
                <div className="space-y-4">
                    {matches.map(match => {
                        const otherUser = match.users.find(u => u.id !== currentUser.id);
                        if (!otherUser) return null; // Should not happen
                        
                        // Check for unread messages
                        const chatMessages = messages[match.id] || [];
                        const lastMessage = chatMessages[chatMessages.length - 1];
                        const isUnread = lastMessage && lastMessage.senderId !== currentUser.id && !lastMessage.read;

                        return (
                            <div key={match.id} onClick={() => onSelectChat(otherUser)} className="flex items-center p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden">
                                {match.isSuperLike && (
                                    <div className="absolute top-1 right-1">
                                        <StarIcon className="w-5 h-5 text-blue-400" />
                                    </div>
                                )}
                                <div className="relative">
                                    <img src={otherUser.imageUrl} alt={otherUser.name} className="w-16 h-16 rounded-full object-cover mr-4"/>
                                    {isUnread && <div className="absolute top-0 right-3 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h3 className={`font-semibold text-lg ${isUnread ? 'text-black' : 'text-gray-800'}`}>{otherUser.name}</h3>
                                        {lastMessage && <span className="text-xs text-gray-400">{new Date(lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                                    </div>
                                    <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                        {lastMessage ? (
                                            <>
                                                {lastMessage.senderId === currentUser.id && 'You: '}
                                                {lastMessage.type === 'sticker' ? 'Sent a sticker' : lastMessage.type === 'voice' ? 'Sent a voice message' : lastMessage.content}
                                            </>
                                        ) : (
                                            "You matched recently."
                                        )}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}

const AudioPlayer: React.FC<{ base64Content: string; isCurrentUser: boolean }> = ({ base64Content, isCurrentUser }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const audio = new Audio(base64Content);
        audio.onloadedmetadata = () => {
            setDuration(audio.duration);
        };
        audioRef.current = audio;
        
        const updateProgress = () => {
            if (audioRef.current) {
                 setProgress(audioRef.current.currentTime);
            }
        };
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [base64Content]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-2 w-56 p-2 rounded-lg ${isCurrentUser ? 'bg-pink-600' : 'bg-gray-300'}`}>
            <button title={isPlaying ? "Pause" : "Play"} onClick={togglePlay} className={`text-white ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </button>
            <div className="flex-1 h-2 bg-white/30 rounded-full">
                 <div className="h-2 bg-white rounded-full" style={{ width: `${(progress / duration) * 100}%` }}></div>
            </div>
            <span className={`text-xs w-10 text-right ${isCurrentUser ? 'text-white/80' : 'text-gray-600'}`}>
                {formatTime(duration)}
            </span>
        </div>
    );
};

const VideoCallScreen: React.FC<{ user: User; onEndCall: () => void }> = ({ user, onEndCall }) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    useEffect(() => {
        const startStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing media devices.", err);
                alert("Could not access camera and microphone. Please check permissions.");
                onEndCall();
            }
        };
        startStream();

        return () => {
            streamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, [onEndCall]);

    const toggleMute = () => {
        streamRef.current?.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(prev => !prev);
    };
    
    const toggleCamera = () => {
        streamRef.current?.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsCameraOff(prev => !prev);
    };

    return (
        <div className="absolute inset-0 bg-gray-900 z-50 flex flex-col">
            {/* Remote Video (Placeholder) */}
            <div className="flex-1 bg-gray-800 flex items-center justify-center">
                 <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700">
                    <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                </div>
            </div>

            {/* Local Video */}
            <video ref={localVideoRef} autoPlay muted playsInline className="absolute w-28 h-40 object-cover rounded-lg shadow-lg bottom-24 right-4 border-2 border-white"></video>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm p-4 flex justify-center items-center gap-6">
                <button title={isMuted ? "Unmute" : "Mute"} onClick={toggleMute} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                    {isMuted ? <MicrophoneSlashIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
                </button>
                 <button title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"} onClick={toggleCamera} className={`p-3 rounded-full transition-colors ${isCameraOff ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                    {isCameraOff ? <VideoCameraSlashIcon className="w-6 h-6" /> : <VideoCameraIcon className="w-6 h-6" />}
                </button>
                <button title="End Call" onClick={onEndCall} className="p-4 bg-red-500 rounded-full text-white">
                    <PhoneIcon className="w-7 h-7 transform -scale-x-100" />
                </button>
            </div>
        </div>
    );
};


const ChatScreen: React.FC<{
    user: User;
    onBack: () => void;
    currentUser: User;
    messages: Message[];
    onSendMessage: (type: 'text' | 'sticker' | 'voice', content: string) => void;
}> = ({ user, onBack, currentUser, messages, onSendMessage }) => {
    const [inputValue, setInputValue] = useState('');
    const [isEmojiPanelOpen, setIsEmojiPanelOpen] = useState(false);
    const [quickReplies, setQuickReplies] = useState<string[]>([]);
    const [isLoadingReplies, setIsLoadingReplies] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isVideoCallActive, setIsVideoCallActive] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');


    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingTimerRef = useRef<number | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, inputValue]);

    const handleSendText = () => {
        if (inputValue.trim()) {
            onSendMessage('text', inputValue.trim());
            setInputValue('');
            setQuickReplies([]);
        }
    };

    const handleSendSticker = (sticker: string) => {
        onSendMessage('sticker', sticker);
        setIsEmojiPanelOpen(false);
    };
    
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };
    
    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const base64Audio = await blobToBase64(audioBlob);
                onSendMessage('voice', base64Audio);
                audioChunksRef.current = [];
                 stream.getTracks().forEach(track => track.stop()); // Release microphone
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            recordingTimerRef.current = window.setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please check permissions.");
        }
    };
    
    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
        }
        setRecordingTime(0);
    };

    const handleGenerateReplies = async () => {
        if (isLoadingReplies || messages.length === 0) return;
        setIsLoadingReplies(true);
        setQuickReplies([]);
        setIsEmojiPanelOpen(false); 
        const replies = await generateQuickReplies(messages, currentUser, user);
        setQuickReplies(replies);
        setIsLoadingReplies(false);
    };
    
    const handleSendQuickReply = (reply: string) => {
        onSendMessage('text', reply);
        setQuickReplies([]);
    };
    
    const toggleEmojiPanel = () => {
        if (!isEmojiPanelOpen) {
            setQuickReplies([]);
        }
        setIsEmojiPanelOpen(prev => !prev);
    };

    // Filter messages based on search query
    const filteredMessages = searchQuery 
        ? messages.filter(msg => msg.type === 'text' && msg.content.toLowerCase().includes(searchQuery.toLowerCase())) 
        : messages;


    // Highlighter function
    const highlightText = (text: string, highlight: string) => {
        if (!highlight.trim()) {
            return text;
        }
        const regex = new RegExp(`(${highlight})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => 
            regex.test(part) ? <span key={i} className="bg-yellow-200 text-black font-medium">{part}</span> : part
        );
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {isVideoCallActive && <VideoCallScreen user={user} onEndCall={() => setIsVideoCallActive(false)} />}
            <header className="flex items-center p-4 border-b sticky top-0 bg-white z-10">
                <button title="Back" onClick={onBack} className="text-gray-600 mr-4 text-2xl" aria-label="Back to matches">&larr;</button>
                
                {isSearchOpen ? (
                    <div className="flex-1 flex items-center gap-2 animate-fade-in-up">
                        <input 
                            type="text" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search chat..." 
                            className="flex-1 bg-gray-100 rounded-full px-4 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                            autoFocus
                        />
                         <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-gray-500 text-sm">Cancel</button>
                    </div>
                ) : (
                    <>
                        <img src={user.imageUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                        <h2 className="font-bold text-lg text-gray-800 flex-1">{user.name}</h2>
                        <button title="Search Chat" onClick={() => setIsSearchOpen(true)} className="text-gray-500 hover:text-pink-500 p-2 mr-1">
                            <MagnifyingGlassIcon className="w-6 h-6"/>
                        </button>
                        <button title="Video Call" onClick={() => setIsVideoCallActive(true)} className="text-gray-500 hover:text-pink-500 p-2">
                            <VideoCameraIcon className="w-6 h-6"/>
                        </button>
                    </>
                )}
            </header>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-100 space-y-4">
                {filteredMessages.map((msg, index) => {
                    const isCurrentUser = msg.senderId === currentUser.id;
                    const isLastMessage = index === messages.length - 1;
                    const isRead = msg.read && isCurrentUser && isLastMessage; // Simple read logic for demo

                    if (msg.type === 'sticker') {
                        return (
                            <div key={msg.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                                <div className="text-6xl">{msg.content}</div>
                                {isRead && <div className="flex items-center text-xs text-pink-500 mt-1"><CheckBadgeIcon className="w-3 h-3 mr-1"/> Read</div>}
                            </div>
                        );
                    }
                    if (msg.type === 'voice') {
                         return (
                            <div key={msg.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {!isCurrentUser && <img src={user.imageUrl} className="w-6 h-6 rounded-full" />}
                                    <AudioPlayer base64Content={msg.content} isCurrentUser={isCurrentUser} />
                                    {isCurrentUser && <img src={currentUser.imageUrl} className="w-6 h-6 rounded-full" />}
                                </div>
                                {isRead && <div className="flex items-center text-xs text-pink-500 mt-1 mr-8"><CheckBadgeIcon className="w-3 h-3 mr-1"/> Read</div>}
                            </div>
                        )
                    }
                    return (
                         <div key={msg.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                {!isCurrentUser && <img src={user.imageUrl} className="w-6 h-6 rounded-full" />}
                                <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${isCurrentUser ? 'bg-pink-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                    <p>{highlightText(msg.content, searchQuery)}</p>
                                </div>
                                {isCurrentUser && <img src={currentUser.imageUrl} className="w-6 h-6 rounded-full" />}
                            </div>
                            {isRead && <div className="flex items-center text-xs text-pink-500 mt-1 mr-8"><CheckBadgeIcon className="w-3 h-3 mr-1"/> Read</div>}
                        </div>
                    );
                })}
                 {inputValue.trim() && (
                    <div className="flex items-end gap-2 justify-end opacity-50">
                        <div className="max-w-xs md:max-w-md px-4 py-2 rounded-2xl bg-pink-500 text-white rounded-br-none">
                            <p>{inputValue}</p>
                        </div>
                        <img src={currentUser.imageUrl} className="w-6 h-6 rounded-full" />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {quickReplies.length > 0 && (
                <div className="p-2 bg-gray-100 border-t flex flex-wrap gap-2 justify-center">
                    {quickReplies.map((reply, index) => (
                        <button
                            key={index}
                            onClick={() => handleSendQuickReply(reply)}
                            className="px-3 py-1.5 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                            {reply}
                        </button>
                    ))}
                </div>
            )}
            
            {isEmojiPanelOpen && (
                <div className="p-2 bg-gray-200 border-t h-64 overflow-y-auto">
                    {Object.entries(EMOJIS).map(([category, emojis]) => (
                        <div key={category}>
                             <h3 className="text-sm font-bold text-gray-500 px-2 pt-2">{category}</h3>
                            <div className="p-2 grid grid-cols-7 gap-2">
                                {emojis.map(emoji => (
                                    <button key={emoji} onClick={() => handleSendSticker(emoji)} className="text-3xl hover:scale-125 transition-transform">
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {isRecording && (
                <div className="p-4 bg-gray-50 border-t flex items-center justify-center text-red-500 font-semibold">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                    Recording... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                </div>
            )}

            <div className="p-2 border-t bg-gray-50">
                 <div className="flex items-center bg-white border rounded-full p-1 gap-1">
                    <input
                        type="text"
                        placeholder={`Message ${user.name}...`}
                        className="flex-1 px-4 py-2 bg-transparent focus:outline-none text-gray-800"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                    />
                     <button
                        title="Generate Replies"
                        onClick={handleGenerateReplies}
                        disabled={isLoadingReplies}
                        className="p-2 text-gray-500 hover:text-pink-500 disabled:opacity-50 disabled:cursor-wait"
                        aria-label="Generate quick replies"
                     >
                         <BoltIcon className={`w-6 h-6 ${isLoadingReplies ? 'animate-pulse text-yellow-500' : ''}`} />
                     </button>
                     <button title="Emoji" onClick={toggleEmojiPanel} className="p-2 text-gray-500 hover:text-pink-500">
                         <FaceSmileIcon className="w-6 h-6" />
                     </button>
                    
                    {inputValue.trim() === '' ? (
                         <button
                            title="Record Voice"
                            onMouseDown={handleStartRecording}
                            onMouseUp={handleStopRecording}
                            onTouchStart={handleStartRecording}
                            onTouchEnd={handleStopRecording}
                            className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-pink-500'}`}
                            aria-label="Record voice message"
                        >
                            <MicrophoneIcon className="w-6 h-6" />
                        </button>
                    ) : (
                        <button
                             title="Send Message"
                            onClick={handleSendText}
                            className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors shadow-md"
                            aria-label="Send message"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const FilterScreen: React.FC<{ filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>; onBack: () => void }> = ({ filters, setFilters, onBack }) => {
    const handleLifestyleChange = (category: keyof Lifestyle, value: string) => {
        setFilters(prev => {
            const current = prev.lifestyle?.[category] || [];
            const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
            return {
                ...prev,
                lifestyle: { ...prev.lifestyle, [category]: updated }
            };
        });
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-y-auto">
             <header className="flex items-center p-4 border-b sticky top-0 bg-white z-10">
                <button title="Back" onClick={onBack} className="text-gray-600 mr-4 text-2xl" aria-label="Go back">&larr;</button>
                <h2 className="font-bold text-xl text-gray-800">Filters</h2>
            </header>
            <div className="p-6 space-y-8">
                <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-4">Maximum Distance</label>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700">{filters.maxDistance} miles</span>
                    </div>
                    <input 
                        type="range" min="1" max="100" value={filters.maxDistance} 
                        onChange={(e) => setFilters({...filters, maxDistance: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-4">Age Range</label>
                    <div className="flex items-center gap-4">
                        <input 
                            type="number" min="18" max="99" value={filters.ageRange.min}
                            onChange={(e) => setFilters({...filters, ageRange: {...filters.ageRange, min: parseInt(e.target.value)}})}
                            className="w-full p-2 border rounded-lg"
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                             type="number" min="18" max="99" value={filters.ageRange.max}
                            onChange={(e) => setFilters({...filters, ageRange: {...filters.ageRange, max: parseInt(e.target.value)}})}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                </div>
                
                 <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-4">Relationship Goal</label>
                    <select 
                        value={filters.relationshipGoal || ''} 
                        onChange={(e) => setFilters({...filters, relationshipGoal: e.target.value || undefined})}
                        className="w-full p-3 border rounded-lg bg-gray-50"
                    >
                        <option value="">Any</option>
                        {RELATIONSHIP_GOALS.map(goal => (
                            <option key={goal} value={goal}>{goal}</option>
                        ))}
                    </select>
                </div>
                
                 <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-4">Lifestyle</label>
                    <div className="space-y-4">
                        <div>
                            <span className="block text-xs font-semibold text-gray-600 mb-2">Smoking</span>
                            <div className="flex flex-wrap gap-2">
                                {LIFESTYLE_OPTIONS.smoking.map(opt => (
                                    <button 
                                        key={opt}
                                        onClick={() => handleLifestyleChange('smoking', opt)}
                                        className={`px-3 py-1 rounded-full text-sm border ${filters.lifestyle?.smoking?.includes(opt) ? 'bg-pink-500 text-white border-pink-500' : 'text-gray-600 border-gray-300'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-gray-600 mb-2">Drinking</span>
                             <div className="flex flex-wrap gap-2">
                                {LIFESTYLE_OPTIONS.drinking.map(opt => (
                                    <button 
                                        key={opt}
                                        onClick={() => handleLifestyleChange('drinking', opt)}
                                        className={`px-3 py-1 rounded-full text-sm border ${filters.lifestyle?.drinking?.includes(opt) ? 'bg-pink-500 text-white border-pink-500' : 'text-gray-600 border-gray-300'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-gray-600 mb-2">Exercise</span>
                             <div className="flex flex-wrap gap-2">
                                {LIFESTYLE_OPTIONS.exercise.map(opt => (
                                    <button 
                                        key={opt}
                                        onClick={() => handleLifestyleChange('exercise', opt)}
                                        className={`px-3 py-1 rounded-full text-sm border ${filters.lifestyle?.exercise?.includes(opt) ? 'bg-pink-500 text-white border-pink-500' : 'text-gray-600 border-gray-300'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={onBack}
                    className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl shadow-lg mt-8"
                >
                    Apply Filters
                </button>
            </div>
        </div>
    );
};

const ProfileEditScreen: React.FC<{ user: User; onSave: (u: User) => void; onBack: () => void; allUsers: User[]; onSwitchUser: (id: number) => void; onForceMatch: (userId: number) => void; }> = ({ user, onSave, onBack, allUsers, onSwitchUser, onForceMatch }) => {
    const [editedUser, setEditedUser] = useState(user);
    const [interestInput, setInterestInput] = useState("");

    const handleAddInterest = () => {
        if (interestInput.trim() && !editedUser.interests.includes(interestInput.trim())) {
            setEditedUser({...editedUser, interests: [...editedUser.interests, interestInput.trim()]});
            setInterestInput("");
        }
    };
    
    const removeInterest = (interest: string) => {
        setEditedUser({...editedUser, interests: editedUser.interests.filter(i => i !== interest)});
    };

    const handleLifestyleChange = (key: keyof Lifestyle, value: string) => {
        setEditedUser({
            ...editedUser,
            lifestyle: { ...editedUser.lifestyle, [key]: value }
        });
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-y-auto">
             <header className="flex items-center p-4 border-b sticky top-0 bg-white z-10">
                <button title="Back" onClick={onBack} className="text-gray-600 mr-4 text-2xl" aria-label="Go back">&larr;</button>
                <h2 className="font-bold text-xl text-gray-800">Edit Profile</h2>
                <button onClick={() => onSave(editedUser)} className="ml-auto text-pink-500 font-bold">Save</button>
            </header>
            <div className="p-6 space-y-6">
                <div className="flex justify-center">
                    <div className="relative">
                        <img src={editedUser.imageUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-pink-100"/>
                        <button className="absolute bottom-0 right-0 bg-pink-500 text-white p-2 rounded-full shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Visibility</label>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setEditedUser({...editedUser, profileVisibility: 'public'})}
                            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${editedUser.profileVisibility === 'public' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                            Public
                        </button>
                        <button 
                            onClick={() => setEditedUser({...editedUser, profileVisibility: 'private'})}
                            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${editedUser.profileVisibility === 'private' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                            Private
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {editedUser.profileVisibility === 'public' 
                            ? "Your profile is visible in the swipe deck." 
                            : "Your profile is hidden. You can still chat with existing matches."}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Bio</label>
                    <textarea 
                        value={editedUser.bio} onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})}
                        className="w-full p-3 border rounded-xl bg-gray-50" rows={3}
                    />
                </div>
                
                 <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Relationship Goal</label>
                    <select 
                        value={editedUser.relationshipGoal} 
                        onChange={(e) => setEditedUser({...editedUser, relationshipGoal: e.target.value})}
                        className="w-full p-3 border rounded-xl bg-gray-50"
                    >
                        {RELATIONSHIP_GOALS.map(goal => (
                            <option key={goal} value={goal}>{goal}</option>
                        ))}
                    </select>
                </div>

                 <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Lifestyle</label>
                    <div className="grid grid-cols-3 gap-2">
                        <select 
                            value={editedUser.lifestyle?.smoking} onChange={(e) => handleLifestyleChange('smoking', e.target.value)}
                            className="p-2 border rounded-lg text-sm bg-gray-50"
                        >
                             <option value="">Smoking...</option>
                            {LIFESTYLE_OPTIONS.smoking.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <select 
                             value={editedUser.lifestyle?.drinking} onChange={(e) => handleLifestyleChange('drinking', e.target.value)}
                             className="p-2 border rounded-lg text-sm bg-gray-50"
                        >
                            <option value="">Drinking...</option>
                            {LIFESTYLE_OPTIONS.drinking.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <select 
                             value={editedUser.lifestyle?.exercise} onChange={(e) => handleLifestyleChange('exercise', e.target.value)}
                             className="p-2 border rounded-lg text-sm bg-gray-50"
                        >
                            <option value="">Exercise...</option>
                            {LIFESTYLE_OPTIONS.exercise.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Interests</label>
                    <div className="flex gap-2 mb-2">
                        <input 
                            type="text" value={interestInput} onChange={(e) => setInterestInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                            className="flex-1 p-3 border rounded-xl bg-gray-50" placeholder="Add interest"
                        />
                        <button onClick={handleAddInterest} className="bg-pink-100 text-pink-600 px-4 rounded-xl font-bold">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {editedUser.interests.map(i => (
                            <span key={i} className="bg-pink-50 text-pink-600 px-2 py-1 rounded-lg text-sm border border-pink-100 flex items-center gap-1">
                                {i}
                                <button onClick={() => removeInterest(i)} className="hover:text-pink-800">&times;</button>
                            </span>
                        ))}
                    </div>
                </div>

                 {/* Developer Tools Section */}
                <div className="mt-8 p-4 border-t border-dashed border-gray-300 bg-gray-50 rounded-lg">
                    <h3 className="font-bold text-gray-700 mb-2">Developer Tools</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Switch User</label>
                            <select 
                                onChange={(e) => onSwitchUser(parseInt(e.target.value))}
                                className="w-full p-2 border rounded bg-white text-sm"
                                value={editedUser.id}
                            >
                                {allUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.id === editedUser.id ? 'Current' : u.id})</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Force Match With</label>
                            <select 
                                onChange={(e) => {
                                    if(e.target.value) {
                                        onForceMatch(parseInt(e.target.value));
                                        e.target.value = ""; // Reset
                                    }
                                }}
                                className="w-full p-2 border rounded bg-white text-sm"
                            >
                                <option value="">Select user to match...</option>
                                {allUsers.filter(u => u.id !== editedUser.id).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeView, setActiveView] = useState('swipe');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // App Data State
  const [users, setUsers] = useState<User[]>([]);
  const [likes, setLikes] = useState<Record<number, number[]>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [blockedUsers, setBlockedUsers] = useState<number[]>([]);
  
  // UI State
  const [matchNotification, setMatchNotification] = useState<{ user: User; isSuperLike: boolean } | null>(null);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [currentChatUser, setCurrentChatUser] = useState<User | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    ageRange: { min: 18, max: 50 },
    interests: [],
    maxDistance: 50,
    relationshipGoal: '',
    lifestyle: {}
  });

  // Initialize Data
  useEffect(() => {
    // Load Users (merge initial with any stored new users if we were to persist them properly in a real app)
    // For now, we check localStorage for a custom users array, else use constants
    const storedUsersStr = localStorage.getItem('gemini-cupid-users');
    let loadedUsers = INITIAL_USERS;
    if (storedUsersStr) {
        try {
            loadedUsers = JSON.parse(storedUsersStr);
        } catch (e) { console.error("Failed to load users", e); }
    } else {
        localStorage.setItem('gemini-cupid-users', JSON.stringify(INITIAL_USERS));
    }
    setUsers(loadedUsers);

    // Load Likes
    setLikes(getStoredLikes());
    
    // Load Matches (Simulated persistence)
    const storedMatches = localStorage.getItem('gemini-cupid-matches');
    if (storedMatches) setMatches(JSON.parse(storedMatches));

    // Load Messages
    const storedMessages = localStorage.getItem('gemini-cupid-messages');
    if (storedMessages) setMessages(JSON.parse(storedMessages));
  }, []);

  // Geolocation Effect
  useEffect(() => {
      if (!currentUser) return;
      if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  const updatedUser = {
                      ...currentUser,
                      coordinates: {
                          lat: position.coords.latitude,
                          lon: position.coords.longitude
                      }
                  };
                  setCurrentUser(updatedUser);
                  // Update in users array too
                  setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
              },
              (error) => {
                  console.error("Geolocation error:", error.message);
                  // Fallback is already handled by default data, no action needed
              }
          );
      }
  }, [currentUser?.id]);

  // Derived State: Unread Counts
  const unreadMatchesCount = useMemo(() => {
      if (!currentUser) return 0;
      let count = 0;
      matches.forEach(m => {
          const other = m.users.find(u => u.id !== currentUser.id);
          if (!other) return;
          const chatMsgs = messages[m.id] || [];
          const last = chatMsgs[chatMsgs.length - 1];
          if (last && last.senderId !== currentUser.id && !last.read) {
              count++;
          }
      });
      return count;
  }, [matches, messages, currentUser]);

  const requestsCount = useMemo(() => {
      if (!currentUser) return 0;
      // Users who liked current user, but current user hasn't liked back yet (no match)
      const likerIds = Object.entries(likes).filter(([fromId, toIds]) => {
          return (toIds as number[]).includes(currentUser.id);
      }).map(([fromId]) => parseInt(fromId));

      // Filter out existing matches
      const matchIds = matches.flatMap(m => m.users.map(u => u.id));
      return likerIds.filter(id => !matchIds.includes(id)).length;
  }, [likes, matches, currentUser]);

  const unreadChatsList = useMemo(() => {
      if (!currentUser) return [];
      return matches.map(m => {
          const other = m.users.find(u => u.id !== currentUser.id);
          if (!other) return null;
          const chatMsgs = messages[m.id] || [];
          const unreadCount = chatMsgs.filter(msg => msg.senderId !== currentUser.id && !msg.read).length;
          return unreadCount > 0 ? { user: other, count: unreadCount } : null;
      }).filter(Boolean) as { user: User, count: number }[];
  }, [matches, messages, currentUser]);

  const pendingRequestsList = useMemo(() => {
      if (!currentUser) return [];
      const likerIds = Object.entries(likes)
        .filter(([fromId, toIds]) => (toIds as number[]).includes(currentUser.id))
        .map(([fromId]) => parseInt(fromId));
      
       // Filter out matches and blocked
      const matchUserIds = matches.flatMap(m => m.users.map(u => u.id));
      return users.filter(u => likerIds.includes(u.id) && !matchUserIds.includes(u.id) && !blockedUsers.includes(u.id));
  }, [likes, matches, currentUser, users, blockedUsers]);


  // --- Actions ---

  const handleSignup = (newUser: User) => {
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('gemini-cupid-users', JSON.stringify(updatedUsers));
      setCurrentUser(newUser);
      setActiveView('swipe');
  };

  const handleSwipe = (direction: 'left' | 'right', swipedUser: User) => {
    if (!currentUser) return;

    if (direction === 'right') {
        // Save Like
        const newLikes = saveStoredLike(currentUser.id, swipedUser.id);
        setLikes(newLikes);

        // Check Match
        if (newLikes[swipedUser.id]?.includes(currentUser.id)) {
            const newMatch: Match = {
                id: `${Math.min(currentUser.id, swipedUser.id)}-${Math.max(currentUser.id, swipedUser.id)}`,
                users: [currentUser, swipedUser],
                timestamp: new Date(),
                isSuperLike: false
            };
            const updatedMatches = [...matches, newMatch];
            setMatches(updatedMatches);
            localStorage.setItem('gemini-cupid-matches', JSON.stringify(updatedMatches));
            setMatchNotification({ user: swipedUser, isSuperLike: false });
        }
    }
  };

  const handleBlock = (userId: number) => {
      setBlockedUsers([...blockedUsers, userId]);
  };

  const handleSendMessage = (type: 'text' | 'sticker' | 'voice', content: string) => {
      if (!currentUser || !currentChatUser) return;
      
      const match = matches.find(m => 
          (m.users[0].id === currentUser.id && m.users[1].id === currentChatUser.id) || 
          (m.users[1].id === currentUser.id && m.users[0].id === currentChatUser.id)
      );

      if (match) {
          const newMessage: Message = {
              id: Date.now().toString(),
              senderId: currentUser.id,
              timestamp: new Date(),
              type,
              content,
              read: false
          };
          
          const updatedMessages = {
              ...messages,
              [match.id]: [...(messages[match.id] || []), newMessage]
          };
          setMessages(updatedMessages);
          localStorage.setItem('gemini-cupid-messages', JSON.stringify(updatedMessages));
      }
  };

  const handleOpenChat = (user: User) => {
      setCurrentChatUser(user);
      setActiveView('chat');
      setIsNotificationModalOpen(false);

      // Mark messages as read
      if (!currentUser) return;
      const match = matches.find(m => m.users.some(u => u.id === user.id) && m.users.some(u => u.id === currentUser.id));
      if (match && messages[match.id]) {
          const updatedChatMessages = messages[match.id].map(msg => 
              msg.senderId !== currentUser.id ? { ...msg, read: true } : msg
          );
          const updatedMessages = { ...messages, [match.id]: updatedChatMessages };
          setMessages(updatedMessages);
          localStorage.setItem('gemini-cupid-messages', JSON.stringify(updatedMessages));
      }
  };

  const handleSwitchUser = (userId: number) => {
      const user = users.find(u => u.id === userId);
      if (user) {
          setCurrentUser(user);
          setActiveView('swipe'); // Reset view
          window.location.reload(); // Simple way to ensure full state reset for demo
      }
  };

  const handleForceMatch = (targetId: number) => {
      if (!currentUser) return;
      const targetUser = users.find(u => u.id === targetId);
      if (!targetUser) return;

      // Force mutual likes
      const l1 = saveStoredLike(currentUser.id, targetId);
      const l2 = saveStoredLike(targetId, currentUser.id);
      setLikes({...l1, ...l2}); // Merge for safety, though saveStoredLike reads from storage

      // Create Match
      const matchId = `${Math.min(currentUser.id, targetId)}-${Math.max(currentUser.id, targetId)}`;
      if (!matches.some(m => m.id === matchId)) {
          const newMatch: Match = {
              id: matchId,
              users: [currentUser, targetUser],
              timestamp: new Date(),
          };
          const updatedMatches = [...matches, newMatch];
          setMatches(updatedMatches);
          localStorage.setItem('gemini-cupid-matches', JSON.stringify(updatedMatches));
          alert(`Forced match with ${targetUser.name}! Check your matches tab.`);
      } else {
          alert("Already matched!");
      }
  };

  // --- Filter Logic for Swipe Deck ---
  const profiles = useMemo(() => {
      if (!currentUser) return [];
      
      // 1. Filter out self, blocked, already matched, already liked (passed handled by UI usually, but let's filter for now)
      let candidates = users.filter(u => u.id !== currentUser.id && !blockedUsers.includes(u.id));

      // Filter out private profiles
      candidates = candidates.filter(u => u.profileVisibility === 'public');

      // Filter out existing matches
      const matchIds = matches.flatMap(m => m.users.map(u => u.id));
      candidates = candidates.filter(u => !matchIds.includes(u.id));
      
      // Filter out people we already liked (Friend requests handle the reverse)
      const myLikes = likes[currentUser.id] || [];
      candidates = candidates.filter(u => !myLikes.includes(u.id));

      // 2. Apply Preferences Filters
      candidates = candidates.filter(u => u.age >= filters.ageRange.min && u.age <= filters.ageRange.max);
      
      if (filters.relationshipGoal) {
          candidates = candidates.filter(u => u.relationshipGoal === filters.relationshipGoal);
      }
      
      if (filters.lifestyle) {
          if (filters.lifestyle.smoking && filters.lifestyle.smoking.length > 0) {
              candidates = candidates.filter(u => u.lifestyle?.smoking && filters.lifestyle!.smoking!.includes(u.lifestyle.smoking));
          }
          if (filters.lifestyle.drinking && filters.lifestyle.drinking.length > 0) {
              candidates = candidates.filter(u => u.lifestyle?.drinking && filters.lifestyle!.drinking!.includes(u.lifestyle.drinking));
          }
          if (filters.lifestyle.exercise && filters.lifestyle.exercise.length > 0) {
              candidates = candidates.filter(u => u.lifestyle?.exercise && filters.lifestyle!.exercise!.includes(u.lifestyle.exercise));
          }
      }

      // 3. Calculate Distance & Sort
      const withDist = candidates.map(u => {
          const dist = getDistanceFromLatLonInMi(
              currentUser.coordinates.lat, currentUser.coordinates.lon,
              u.coordinates.lat, u.coordinates.lon
          );
          return { ...u, distance: dist };
      });

      // Filter by max distance
      const nearby = withDist.filter(u => u.distance <= filters.maxDistance);
      
      // Sort by distance
      return nearby.sort((a, b) => a.distance - b.distance);

  }, [users, currentUser, blockedUsers, matches, likes, filters]);


  if (showSplash) {
      return <SplashScreen onFinished={() => setShowSplash(false)} />;
  }

  if (!currentUser) {
      return <AuthScreen existingUsers={users} onLogin={setCurrentUser} onSignup={handleSignup} />;
  }

  return (
      <div className="max-w-md mx-auto h-[100dvh] bg-gray-100 shadow-2xl overflow-hidden relative font-sans">
        {/* Top Navigation / Header (except in chat) */}
        {activeView !== 'chat' && (
            <>
                 {/* Top Bar for Swipe View */}
                 {activeView === 'swipe' && (
                    <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-center pointer-events-none">
                         <div className="pointer-events-auto">
                            <GeminiCupidLogo className="w-8 h-8 text-pink-500 drop-shadow-md" />
                         </div>
                         <div className="pointer-events-auto relative">
                            <button title="Notifications" onClick={() => setIsNotificationModalOpen(true)} className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-md hover:bg-white transition-colors">
                                <BellIcon className="w-6 h-6 text-gray-600" />
                                {(unreadMatchesCount > 0 || requestsCount > 0) && (
                                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>
                         </div>
                    </div>
                 )}
            </>
        )}

        <main className={`flex-1 relative h-[calc(100%-4rem)] ${activeView === 'chat' ? 'h-full' : ''}`}>
            {activeView === 'swipe' && (
                <div className="w-full h-full relative">
                    {profiles.length > 0 ? (
                        profiles.map((profile, index) => (
                            <SwipeableProfileCard
                                key={profile.id}
                                user={profile}
                                isTop={index === profiles.length - 1}
                                onSwipe={(dir) => handleSwipe(dir, profile)}
                                onBlock={handleBlock}
                                onTap={setSelectedUserForDetail}
                                action={null} // Simple demo, no programmatic swipe action state shown here for brevity
                                style={{ zIndex: index }}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="bg-white p-6 rounded-full shadow-lg mb-4 animate-bounce">
                                <SparklesIcon className="w-12 h-12 text-pink-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-700">No more profiles!</h2>
                            <p className="text-gray-500 mt-2">Try adjusting your filters or check back later.</p>
                            <button onClick={() => setActiveView('filters')} className="mt-6 text-pink-500 font-bold hover:underline">Adjust Filters</button>
                        </div>
                    )}
                </div>
            )}

            {activeView === 'matches' && (
                <MatchesScreen 
                    matches={matches} 
                    currentUser={currentUser} 
                    onSelectChat={handleOpenChat} 
                    messages={messages}
                />
            )}

            {activeView === 'requests' && (
                <RequestsScreen 
                    usersWhoLikeYou={pendingRequestsList}
                    onBack={() => setActiveView('swipe')}
                    onAccept={(id) => handleSwipe('right', users.find(u => u.id === id)!)}
                    onReject={(id) => handleBlock(id)}
                />
            )}

            {activeView === 'filters' && (
                <FilterScreen 
                    filters={filters} 
                    setFilters={setFilters} 
                    onBack={() => setActiveView('swipe')} 
                />
            )}

            {activeView === 'profile' && (
                <ProfileEditScreen 
                    user={currentUser} 
                    allUsers={users}
                    onSave={(updatedUser) => {
                        const updatedList = users.map(u => u.id === updatedUser.id ? updatedUser : u);
                        setUsers(updatedList);
                        setCurrentUser(updatedUser);
                        localStorage.setItem('gemini-cupid-users', JSON.stringify(updatedList));
                        setActiveView('swipe');
                    }}
                    onBack={() => setActiveView('swipe')}
                    onSwitchUser={handleSwitchUser}
                    onForceMatch={handleForceMatch}
                />
            )}

            {activeView === 'chat' && currentChatUser && (
                <ChatScreen 
                    user={currentChatUser} 
                    currentUser={currentUser}
                    onBack={() => setActiveView('matches')} 
                    messages={matches.find(m => m.users.some(u => u.id === currentChatUser.id)) ? (messages[matches.find(m => m.users.some(u => u.id === currentChatUser.id))!.id] || []) : []}
                    onSendMessage={handleSendMessage}
                />
            )}
        </main>

        {/* Bottom Navigation */}
        {activeView !== 'chat' && (
            <Header 
                activeView={activeView} 
                setActiveView={setActiveView} 
                requestsCount={requestsCount}
                unreadMatchesCount={unreadMatchesCount}
            />
        )}

        {/* Overlays */}
        {matchNotification && (
            <MatchNotification 
                currentUser={currentUser}
                matchedUser={matchNotification.user}
                isSuperLike={matchNotification.isSuperLike}
                onKeepSwiping={() => setMatchNotification(null)}
                onStartChat={() => {
                    setMatchNotification(null);
                    handleOpenChat(matchNotification.user);
                }}
            />
        )}

        {selectedUserForDetail && (
            <ProfileDetailScreen 
                user={selectedUserForDetail} 
                onClose={() => setSelectedUserForDetail(null)} 
            />
        )}

        {isNotificationModalOpen && (
            <NotificationModal 
                onClose={() => setIsNotificationModalOpen(false)}
                requests={pendingRequestsList}
                unreadChats={unreadChatsList}
                onClickRequest={() => { setIsNotificationModalOpen(false); setActiveView('requests'); }}
                onClickChat={(u) => handleOpenChat(u)}
            />
        )}

      </div>
  );
};

export default App;
