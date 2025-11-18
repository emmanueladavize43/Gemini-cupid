
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Match, Message, RelationshipGoal, Lifestyle } from './types';
import { INITIAL_USERS, EMOJIS, RELATIONSHIP_GOALS, LIFESTYLE_OPTIONS } from './constants';
import { generateIcebreakers, generateQuickReplies } from './services/geminiService';
import { HeartIcon, XMarkIcon, SparklesIcon, ChatBubbleIcon, FireIcon, UserIcon, AdjustmentsHorizontalIcon, EyeIcon, StarIcon, ShieldExclamationIcon, UndoIcon, UserPlusIcon, FaceSmileIcon, BoltIcon, VideoCameraIcon, MicrophoneIcon, PhoneIcon, VideoCameraSlashIcon, MicrophoneSlashIcon, PlayIcon, PauseIcon, MapPinIcon, GeminiCupidLogo, GoalIcon, SmokingIcon, DrinkingIcon, ExerciseIcon, CheckBadgeIcon, MagnifyingGlassIcon } from './components/Icons';

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

// --- Helper Functions ---
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
                    <p className="text-gray-500 text-center mt-8">No new friend requests right now. Check back later!</p>
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


const Header: React.FC<{ activeView: string, setActiveView: (view: string) => void, requestsCount: number }> = ({ activeView, setActiveView, requestsCount }) => {
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
                    <span className="absolute top-1 right-1 block w-5 h-5 bg-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{requestsCount}</span>
                )}
            </button>
             <button title="Filters" onClick={() => setActiveView('filters')} className={`${baseClass} ${activeView === 'filters' ? activeClass : ''}`} aria-label="Filters">
                <AdjustmentsHorizontalIcon className="w-8 h-8"/>
            </button>
            <button title="Matches" onClick={() => setActiveView('matches')} className={`${baseClass} ${activeView === 'matches' ? activeClass : ''}`} aria-label="View Matches">
                <ChatBubbleIcon className="w-8 h-8"/>
            </button>
        </header>
    );
};

const MatchesScreen: React.FC<{ matches: Match[], onSelectChat: (user: User) => void, currentUser: User }> = ({ matches, onSelectChat, currentUser }) => {
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
                        return (
                            <div key={match.id} onClick={() => onSelectChat(otherUser)} className="flex items-center p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden">
                                {match.isSuperLike && (
                                    <div className="absolute top-1 right-1">
                                        <StarIcon className="w-5 h-5 text-blue-400" />
                                    </div>
                                )}
                                <img src={otherUser.imageUrl} alt={otherUser.name} className="w-16 h-16 rounded-full object-cover mr-4"/>
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-800">{otherUser.name}</h3>
                                    <p className="text-sm text-gray-500">You matched recently.</p>
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
                            className="p-2 text-gray-500 hover:text-pink-500"
                            aria-label="Record voice message"
                         >
                            <MicrophoneIcon className="w-6 h-6" />
                        </button>
                    ) : (
                        <button title="Send" onClick={handleSendText} className="bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-full px-5 py-2">Send</button>
                    )}
                 </div>
            </div>
        </div>
    );
};

const ProfileEditScreen: React.FC<{
    user: User;
    allUsers: User[];
    onSwitchUser: (userId: number) => void;
    onForceMatch: (userId: number) => void;
    onSave: (updatedUser: User) => void;
    onBack: () => void;
    blockedUsers: User[];
    onUnblock: (userId: number) => void;
    onLogout: () => void;
}> = ({ user, allUsers, onSwitchUser, onForceMatch, onSave, onBack, blockedUsers, onUnblock, onLogout }) => {
    const [formData, setFormData] = useState<User>(user);
    const [newInterest, setNewInterest] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'age' ? parseInt(value) || 0 : value }));
    };
    
    const handleVisibilityChange = (visibility: 'public' | 'private') => {
        setFormData(prev => ({ ...prev, profileVisibility: visibility }));
    };

    const handleLifestyleChange = (type: keyof Lifestyle, value: string) => {
        setFormData(prev => ({
            ...prev,
            lifestyle: {
                ...prev.lifestyle,
                [type]: value
            }
        }));
    };

    const handleAddInterest = () => {
        if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
            setFormData(prev => ({ ...prev, interests: [...prev.interests, newInterest.trim()] }));
            setNewInterest('');
        }
    };
    
    const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddInterest();
        }
    }

    const handleRemoveInterest = (interestToRemove: string) => {
        setFormData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interestToRemove) }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <header className="flex items-center p-4 border-b sticky top-0 bg-white z-10">
                <button title="Back" onClick={onBack} className="text-gray-600 mr-4 text-2xl" aria-label="Go back">&larr;</button>
                <h2 className="font-bold text-xl text-gray-800">Edit Profile</h2>
                <button onClick={onLogout} className="ml-auto text-sm text-red-500 font-semibold">Log Out</button>
            </header>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="flex flex-col items-center">
                    <img src={formData.imageUrl} alt={formData.name} className="w-32 h-32 rounded-full object-cover shadow-lg" />
                </div>
                
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" required />
                </div>

                <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input type="number" name="age" id="age" value={formData.age} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" required />
                </div>

                <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea name="bio" id="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" required />
                </div>

                <div>
                    <label htmlFor="relationshipGoal" className="block text-sm font-medium text-gray-700 mb-1">Relationship Goal</label>
                    <select name="relationshipGoal" id="relationshipGoal" value={formData.relationshipGoal || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
                        <option value="">Select a goal</option>
                        {RELATIONSHIP_GOALS.map(goal => (
                            <option key={goal} value={goal}>{goal}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lifestyle</label>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-500">Smoking</label>
                            <select value={formData.lifestyle?.smoking || ''} onChange={(e) => handleLifestyleChange('smoking', e.target.value)} className="w-full text-sm border rounded-md p-1">
                                <option value="">-</option>
                                {LIFESTYLE_OPTIONS.smoking.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Drinking</label>
                             <select value={formData.lifestyle?.drinking || ''} onChange={(e) => handleLifestyleChange('drinking', e.target.value)} className="w-full text-sm border rounded-md p-1">
                                <option value="">-</option>
                                {LIFESTYLE_OPTIONS.drinking.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Exercise</label>
                             <select value={formData.lifestyle?.exercise || ''} onChange={(e) => handleLifestyleChange('exercise', e.target.value)} className="w-full text-sm border rounded-md p-1">
                                <option value="">-</option>
                                {LIFESTYLE_OPTIONS.exercise.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>
                </div>


                <div>
                    <label htmlFor="add-interest" className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {formData.interests.map(interest => (
                            <span key={interest} className="flex items-center bg-pink-100 text-pink-800 text-sm font-semibold px-3 py-1 rounded-full">
                                {interest}
                                <button title="Remove Interest" type="button" onClick={() => handleRemoveInterest(interest)} className="ml-2 text-pink-600 hover:text-pink-800" aria-label={`Remove ${interest} interest`}>
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" id="add-interest" value={newInterest} onChange={(e) => setNewInterest(e.target.value)} onKeyDown={handleInterestKeyDown} placeholder="Add an interest" className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" />
                        <button title="Add Interest" type="button" onClick={handleAddInterest} className="px-4 py-2 bg-pink-500 text-white rounded-md font-semibold hover:bg-pink-600">Add</button>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                        <button type="button" onClick={() => handleVisibilityChange('public')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${formData.profileVisibility === 'public' ? 'bg-white text-pink-600 shadow' : 'bg-transparent text-gray-600'}`}>
                            Public
                        </button>
                        <button type="button" onClick={() => handleVisibilityChange('private')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${formData.profileVisibility === 'private' ? 'bg-white text-pink-600 shadow' : 'bg-transparent text-gray-600'}`}>
                            Private
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {formData.profileVisibility === 'public' 
                        ? 'Your profile will be shown to others in the swipe deck.'
                        : 'Your profile will be hidden. You can still chat with your matches.'}
                    </p>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-800 pt-6 border-t mt-6 mb-3">Blocked Users</h3>
                     {blockedUsers.length > 0 ? (
                        <ul className="space-y-3">
                            {blockedUsers.map(blockedUser => (
                                <li key={blockedUser.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <img src={blockedUser.imageUrl} alt={blockedUser.name} className="w-10 h-10 rounded-full object-cover" />
                                        <span className="text-gray-800 font-medium">{blockedUser.name}</span>
                                    </div>
                                    <button title="Unblock" type="button" onClick={() => onUnblock(blockedUser.id)} className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors">
                                        Unblock
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">You haven't blocked anyone.</p>
                    )}
                </div>

                {/* Developer Mode: User Switcher */}
                <div className="mt-8 border-t-2 border-gray-200 pt-6 bg-gray-50 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <BoltIcon className="w-5 h-5 text-yellow-500" />
                        Developer Tools
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">Use these tools to simulate a conversation by switching between accounts.</p>
                    
                    <label className="block text-sm font-medium text-gray-700 mb-2">Switch Account</label>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                         {allUsers.map(u => (
                             <button
                                key={u.id}
                                type="button"
                                onClick={() => onSwitchUser(u.id)}
                                className={`px-3 py-2 rounded-lg text-sm text-left flex items-center gap-2 transition-colors ${u.id === user.id ? 'bg-pink-100 ring-2 ring-pink-500' : 'bg-white hover:bg-gray-100 border'}`}
                             >
                                 <img src={u.imageUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                                 <span className={`truncate ${u.id === user.id ? 'font-bold text-pink-800' : 'text-gray-700'}`}>
                                     {u.name} {u.id === user.id && '(You)'}
                                 </span>
                             </button>
                         ))}
                    </div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">Force Match</label>
                    <div className="grid grid-cols-1 gap-2">
                         {allUsers.filter(u => u.id !== user.id).map(u => (
                             <button
                                key={u.id}
                                type="button"
                                onClick={() => onForceMatch(u.id)}
                                className="px-3 py-2 bg-white border rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                             >
                                 <div className="flex items-center gap-2">
                                    <img src={u.imageUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                                    Match with {u.name}
                                 </div>
                                 <HeartIcon className="w-4 h-4 text-pink-500" />
                             </button>
                         ))}
                    </div>
                </div>


                <div className="pt-4 sticky bottom-0 bg-white pb-6">
                    <button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold py-3 rounded-full shadow-lg hover:scale-105 transition-transform">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

const FilterScreen: React.FC<{
    currentFilters: Filters;
    onApply: (newFilters: Filters) => void;
    onBack: () => void;
    allInterests: string[];
}> = ({ currentFilters, onApply, onBack, allInterests }) => {
    const [tempFilters, setTempFilters] = useState(currentFilters);

    const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let newMin = tempFilters.ageRange.min;
        let newMax = tempFilters.ageRange.max;

        if (name === 'min') {
            newMin = Math.min(parseInt(value), tempFilters.ageRange.max);
        } else {
            newMax = Math.max(parseInt(value), tempFilters.ageRange.min);
        }
        
        setTempFilters(prev => ({
            ...prev,
            ageRange: { min: newMin, max: newMax }
        }));
    };
    
    const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempFilters(prev => ({
            ...prev,
            maxDistance: parseInt(e.target.value)
        }));
    };

    const handleInterestToggle = (interest: string) => {
        setTempFilters(prev => {
            const newInterests = prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest];
            return { ...prev, interests: newInterests };
        });
    };
    
    const handleApply = () => {
        onApply(tempFilters);
    };

    const handleReset = () => {
      const resetFilters = { ageRange: { min: 18, max: 99 }, interests: [], maxDistance: 100 };
      setTempFilters(resetFilters);
    }
    
    const handleGoalChange = (goal: string) => {
        setTempFilters(prev => ({
            ...prev,
            relationshipGoal: goal === prev.relationshipGoal ? undefined : goal
        }));
    };
    
    const handleLifestyleToggle = (category: keyof Lifestyle, value: string) => {
        setTempFilters(prev => {
            const currentValues = prev.lifestyle?.[category] || [];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];
            
            return {
                ...prev,
                lifestyle: {
                    ...prev.lifestyle,
                    [category]: newValues.length > 0 ? newValues : undefined
                }
            };
        });
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <header className="flex items-center p-4 border-b sticky top-0 bg-white z-10">
                <button title="Back" onClick={onBack} className="text-gray-600 mr-4 text-2xl" aria-label="Go back">&larr;</button>
                <h2 className="font-bold text-xl text-gray-800">Filter Profiles</h2>
            </header>
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Distance</label>
                    <div className="flex items-center justify-between text-gray-600">
                        <span>1 mile</span>
                        <span className="font-semibold text-pink-600">{tempFilters.maxDistance} miles</span>
                        <span>100 miles</span>
                    </div>
                    <input type="range" value={tempFilters.maxDistance} onChange={handleDistanceChange} min="1" max="100" className="w-full accent-pink-500 mt-2" />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                    <div className="flex items-center justify-between text-gray-600">
                        <span className="font-semibold text-pink-600">{tempFilters.ageRange.min}</span>
                        <span className="font-semibold text-pink-600">{tempFilters.ageRange.max}</span>
                    </div>
                    <div className="mt-2 relative h-5 flex items-center">
                         <input type="range" name="min" value={tempFilters.ageRange.min} onChange={handleAgeChange} min="18" max="99" className="absolute w-full accent-pink-500" style={{ zIndex: tempFilters.ageRange.min > 58 ? 1 : 0 }}/>
                        <input type="range" name="max" value={tempFilters.ageRange.max} onChange={handleAgeChange} min="18" max="99" className="absolute w-full accent-pink-500" />
                    </div>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Goal</label>
                    <div className="flex flex-wrap gap-2">
                        {RELATIONSHIP_GOALS.map(goal => (
                            <button 
                                key={goal}
                                onClick={() => handleGoalChange(goal)}
                                className={`text-sm border px-3 py-1 rounded-full transition-colors ${tempFilters.relationshipGoal === goal ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-gray-300 text-gray-700'}`}
                            >
                                {goal}
                            </button>
                        ))}
                    </div>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lifestyle</label>
                    
                    <div className="mb-2">
                        <span className="text-xs text-gray-500 block mb-1">Smoking</span>
                        <div className="flex flex-wrap gap-2">
                            {LIFESTYLE_OPTIONS.smoking.map(opt => (
                                <button key={opt} onClick={() => handleLifestyleToggle('smoking', opt)} className={`text-xs border px-2 py-1 rounded-lg ${tempFilters.lifestyle?.smoking?.includes(opt) ? 'bg-gray-200 border-gray-400 font-semibold' : 'bg-white'}`}>{opt}</button>
                            ))}
                        </div>
                    </div>
                     <div className="mb-2">
                        <span className="text-xs text-gray-500 block mb-1">Drinking</span>
                        <div className="flex flex-wrap gap-2">
                            {LIFESTYLE_OPTIONS.drinking.map(opt => (
                                <button key={opt} onClick={() => handleLifestyleToggle('drinking', opt)} className={`text-xs border px-2 py-1 rounded-lg ${tempFilters.lifestyle?.drinking?.includes(opt) ? 'bg-gray-200 border-gray-400 font-semibold' : 'bg-white'}`}>{opt}</button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <span className="text-xs text-gray-500 block mb-1">Exercise</span>
                        <div className="flex flex-wrap gap-2">
                            {LIFESTYLE_OPTIONS.exercise.map(opt => (
                                <button key={opt} onClick={() => handleLifestyleToggle('exercise', opt)} className={`text-xs border px-2 py-1 rounded-lg ${tempFilters.lifestyle?.exercise?.includes(opt) ? 'bg-gray-200 border-gray-400 font-semibold' : 'bg-white'}`}>{opt}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                    <div className="flex flex-wrap gap-2">
                        {allInterests.map(interest => {
                            const isSelected = tempFilters.interests.includes(interest);
                            return (
                                <button
                                    key={interest}
                                    type="button"
                                    onClick={() => handleInterestToggle(interest)}
                                    className={`text-sm font-semibold px-3 py-1 rounded-full border transition-colors ${
                                        isSelected 
                                        ? 'bg-pink-500 border-pink-500 text-white' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {interest}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="p-4 border-t sticky bottom-0 bg-white z-10 grid grid-cols-2 gap-4">
                <button onClick={handleReset} className="w-full bg-gray-200 text-gray-700 font-bold py-3 rounded-full hover:bg-gray-300 transition-colors">
                    Reset
                </button>
                <button onClick={handleApply} className="w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold py-3 rounded-full shadow-lg hover:scale-105 transition-transform">
                    Apply
                </button>
            </div>
        </div>
    );
};


// --- Main App Component ---

export default function App() {
    const [showSplash, setShowSplash] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    // Initialize currentUserId from localStorage if available, else null
    const [currentUserId, setCurrentUserId] = useState<number | null>(() => {
        const savedId = localStorage.getItem('gemini-cupid-current-user-id');
        return savedId ? parseInt(savedId) : null;
    });
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
    const [superLikedIds, setSuperLikedIds] = useState<Set<number>>(new Set());
    const [blockedUserIds, setBlockedUserIds] = useState<Set<number>>(new Set());
    const [matches, setMatches] = useState<Match[]>([]);
    const [newMatch, setNewMatch] = useState<{ user: User, isSuperLike: boolean } | null>(null);
    const [activeView, setActiveView] = useState('swipe'); // 'swipe', 'profile', 'matches', 'chat', 'auth', 'requests', 'filters'
    const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
    const [detailedProfileUser, setDetailedProfileUser] = useState<User | null>(null);
    const [action, setAction] = useState<'like' | 'pass' | 'superlike' | null>(null);
    const [filters, setFilters] = useState<Filters>({ ageRange: { min: 18, max: 99 }, interests: [], maxDistance: 50 });
    const [messages, setMessages] = useState<Record<string, Message[]>>({});
    
    const [lastAction, setLastAction] = useState<{ user: User; index: number; type: 'like' | 'pass' | 'superlike' } | null>(null);
    const undoTimeoutRef = useRef<number | null>(null);
    const currentActionRef = useRef<'like' | 'pass' | 'superlike' | null>(null);
    
    const [friendRequests, setFriendRequests] = useState<Set<number>>(new Set([4, 7]));
    const [currentUserCoords, setCurrentUserCoords] = useState<{ lat: number; lon: number } | null>(null);

    // Load Users from LocalStorage or Seed
    useEffect(() => {
        const savedUsersJSON = localStorage.getItem('gemini-cupid-users');
        if (savedUsersJSON) {
            try {
                const savedUsers = JSON.parse(savedUsersJSON);
                setUsers(savedUsers);
            } catch (e) {
                console.error("Failed to load users", e);
                setUsers(INITIAL_USERS);
            }
        } else {
            setUsers(INITIAL_USERS);
        }
    }, []);

    // Save Users to LocalStorage whenever they change
    useEffect(() => {
        if (users.length > 0) {
            localStorage.setItem('gemini-cupid-users', JSON.stringify(users));
        }
    }, [users]);

    // Handle Login/Logout persistence
    useEffect(() => {
        if (currentUserId) {
            localStorage.setItem('gemini-cupid-current-user-id', currentUserId.toString());
            // Make sure we aren't in auth view if logged in
            if (activeView === 'auth') setActiveView('swipe');
        } else {
            localStorage.removeItem('gemini-cupid-current-user-id');
            setActiveView('auth');
        }
    }, [currentUserId, activeView]);

    // Load blocked users
    useEffect(() => {
        const savedBlockedIdsJSON = localStorage.getItem('gemini-cupid-blocked-ids');
        if (savedBlockedIdsJSON) {
            try {
                const savedBlockedIds = JSON.parse(savedBlockedIdsJSON);
                if (Array.isArray(savedBlockedIds)) {
                    const numericIds = savedBlockedIds.filter((id): id is number => typeof id === 'number');
                    setBlockedUserIds(new Set<number>(numericIds));
                }
            } catch (error) {
                console.error("Failed to parse blocked IDs from localStorage", error);
            }
        }
        
        // Get user location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCurrentUserCoords({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                });
            },
            (error) => {
                console.warn("Geolocation access denied or error:", error.message);
                // Fallback logic handled in profilesWithDistance
            }
        );
    }, []);

    const updateBlockedIds = (newBlockedIds: Set<number>) => {
        setBlockedUserIds(newBlockedIds);
        localStorage.setItem('gemini-cupid-blocked-ids', JSON.stringify(Array.from(newBlockedIds)));
    };
    
    const handleSignup = (newUser: User) => {
        setUsers(prev => [...prev, newUser]);
        setCurrentUserId(newUser.id);
        setActiveView('swipe');
    };

    const handleLogin = (user: User) => {
        setCurrentUserId(user.id);
        setActiveView('swipe');
    }

    const handleLogout = () => {
        setCurrentUserId(null);
        setActiveView('auth');
        setCurrentIndex(0);
        setMatches([]);
        setMessages({});
    }

    const currentUser = useMemo(() => users.find(u => u.id === currentUserId), [users, currentUserId]);
    
    const profilesWithDistance = useMemo(() => {
        if (!currentUser) return [];
        
        // Fallback if current user coords missing (GPS denied/error)
        const myCoords = currentUserCoords || currentUser.coordinates;

        return users
            .filter(u => u.id !== currentUserId)
            .map(user => ({
                ...user,
                distance: getDistanceFromLatLonInMi(
                    myCoords.lat,
                    myCoords.lon,
                    user.coordinates.lat,
                    user.coordinates.lon
                ),
            }))
            .sort((a, b) => a.distance - b.distance);
    }, [users, currentUserCoords, currentUserId, currentUser]);

    const filteredProfiles = useMemo(() => {
        return profilesWithDistance
            .filter(u => !blockedUserIds.has(u.id) && u.profileVisibility === 'public')
            .filter(user => {
                const isAgeMatch = user.age >= filters.ageRange.min && user.age <= filters.ageRange.max;
                const isInterestMatch = filters.interests.length === 0 || filters.interests.some(interest => user.interests.includes(interest));
                const isDistanceMatch = user.distance !== undefined && user.distance <= filters.maxDistance;
                
                const isGoalMatch = !filters.relationshipGoal || user.relationshipGoal === filters.relationshipGoal;
                
                // Lifestyle filters
                const isSmokingMatch = !filters.lifestyle?.smoking || (user.lifestyle?.smoking && filters.lifestyle.smoking.includes(user.lifestyle.smoking));
                const isDrinkingMatch = !filters.lifestyle?.drinking || (user.lifestyle?.drinking && filters.lifestyle.drinking.includes(user.lifestyle.drinking));
                const isExerciseMatch = !filters.lifestyle?.exercise || (user.lifestyle?.exercise && filters.lifestyle.exercise.includes(user.lifestyle.exercise));

                return isAgeMatch && isInterestMatch && isDistanceMatch && isGoalMatch && isSmokingMatch && isDrinkingMatch && isExerciseMatch;
            });
    }, [profilesWithDistance, filters, blockedUserIds]);
    
    const allInterests = useMemo(() => {
        const interestsSet = new Set<string>();
        users.forEach(user => {
            // Just collect all interests globally for the filter list
            user.interests.forEach(interest => interestsSet.add(interest));
        });
        return Array.from(interestsSet).sort();
    }, [users]); // Update when users change (e.g. new signup)

    const topProfileId = useMemo(() => {
        return currentIndex < filteredProfiles.length ? filteredProfiles[currentIndex].id : null;
    }, [currentIndex, filteredProfiles]);

    useEffect(() => {
        if (topProfileId !== null) {
            const timer = setTimeout(() => {
                // Update view count in local state and persist
                setUsers(prevUsers =>
                    prevUsers.map(u =>
                        u.id === topProfileId
                            ? { ...u, viewCount: (u.viewCount || 0) + 1 }
                            : u
                    )
                );
            }, 500); 
            return () => clearTimeout(timer);
        }
    }, [topProfileId]);

    const handleCardSwiped = (direction: 'right' | 'left') => {
        if (currentIndex >= filteredProfiles.length || !currentUser) return;

        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
        }

        const swipedUser = filteredProfiles[currentIndex];
        let swipeType: 'like' | 'pass' | 'superlike';

        if (currentActionRef.current) {
            swipeType = currentActionRef.current;
            currentActionRef.current = null;
        } else {
            swipeType = direction === 'right' ? 'like' : 'pass';
        }
        
        setLastAction({ user: swipedUser, index: currentIndex, type: swipeType });

        undoTimeoutRef.current = window.setTimeout(() => {
            setLastAction(null);
            undoTimeoutRef.current = null;
        }, 5000);

        if (direction === 'right') {
            const likedUser = swipedUser;
            const wasSuperLike = swipeType === 'superlike';
            // Super likes have a higher chance of matching
            const isMutual = Math.random() < (wasSuperLike ? 0.75 : 0.3);
            
            const newLikedIds = new Set<number>(likedIds).add(likedUser.id);
            setLikedIds(newLikedIds);

            if (wasSuperLike) {
                const newSuperLikedIds = new Set<number>(superLikedIds).add(likedUser.id);
                setSuperLikedIds(newSuperLikedIds);
            }

            if (isMutual) {
                setMatches(prevMatches => [
                    ...prevMatches,
                    { id: `${currentUser.id}-${likedUser.id}`, users: [currentUser, likedUser], timestamp: new Date(), isSuperLike: wasSuperLike }
                ]);
                setNewMatch({ user: likedUser, isSuperLike: wasSuperLike });
            } else {
                setCurrentIndex(prevIndex => prevIndex + 1);
            }
        } else { // 'left'
            setCurrentIndex(prevIndex => prevIndex + 1);
        }
    };

    const handleUndo = () => {
        if (!lastAction || !currentUser) return;

        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = null;
        }

        const { user, index, type } = lastAction;

        setCurrentIndex(index);

        if (type === 'like' || type === 'superlike') {
            setLikedIds(prev => {
                const newSet = new Set<number>(prev);
                newSet.delete(user.id);
                return newSet;
            });

            if (type === 'superlike') {
                setSuperLikedIds(prev => {
                    const newSet = new Set<number>(prev);
                    newSet.delete(user.id);
                    return newSet;
                });
            }

            const matchId = `${currentUser.id}-${user.id}`;
            const wasMatch = matches.some(m => m.id === matchId);
            if (wasMatch) {
                setMatches(prev => prev.filter(m => m.id !== matchId));
            }
        }
        
        if (newMatch?.user.id === user.id) {
            setNewMatch(null);
        }

        setLastAction(null);
    };
    
    const handleAcceptRequest = (userId: number) => {
        if (!currentUser) return;
        const likedUser = users.find(u => u.id === userId);
        if (!likedUser) return;
        
        setMatches(prevMatches => [
            ...prevMatches,
            { id: `${currentUser.id}-${likedUser.id}`, users: [currentUser, likedUser], timestamp: new Date(), isSuperLike: false }
        ]);
        
        setNewMatch({ user: likedUser, isSuperLike: false });
        
        setFriendRequests(prev => {
            const newSet = new Set<number>(prev);
            newSet.delete(userId);
            return newSet;
        });
    };

    const handleRejectRequest = (userId: number) => {
        setFriendRequests(prev => {
            const newSet = new Set<number>(prev);
            newSet.delete(userId);
            return newSet;
        });
    };

    const handleKeepSwiping = () => {
        setNewMatch(null);
        setCurrentIndex(prevIndex => prevIndex + 1);
    };
    
    useEffect(() => {
        if (action) {
            const timer = setTimeout(() => setAction(null), ANIMATION_DURATION);
            return () => clearTimeout(timer);
        }
    }, [action]);

    const handleSendMessage = (chatId: string, type: 'text' | 'sticker' | 'voice', content: string) => {
        if (content.trim() === '' && type === 'text') return;
        if (!currentUserId) return;

        const newMessage: Message = {
            id: `${Date.now()}-${Math.random()}`,
            senderId: currentUserId,
            timestamp: new Date(),
            type,
            content,
            read: false
        };
        
        // Mark previous messages from the other person as read when I send a message (simulated read logic)
        setMessages(prev => {
            const existingMessages = prev[chatId] || [];
            // For demo: assume if I am sending a message, I have read theirs.
            const updatedMessages = existingMessages.map(m => 
                m.senderId !== currentUserId ? { ...m, read: true } : m
            );

            return { ...prev, [chatId]: [...updatedMessages, newMessage] };
        });
    };

    const handleStartChat = () => {
        if(newMatch){
             setActiveChatUser(newMatch.user);
             setActiveView('chat');
             setNewMatch(null);
             
             // Mark messages as read when opening
             if (currentUser) {
                const chatId = [currentUser.id, newMatch.user.id].sort().join('-');
                markChatAsRead(chatId, newMatch.user.id);
             }
        }
    }
    
    const handleSelectChat = (user: User) => {
        setActiveChatUser(user);
        setActiveView('chat');
        
        if (currentUser) {
            const chatId = [currentUser.id, user.id].sort().join('-');
            markChatAsRead(chatId, user.id);
        }
    }

    const markChatAsRead = (chatId: string, otherUserId: number) => {
        setMessages(prev => {
            const chatMessages = prev[chatId] || [];
            const updatedMessages = chatMessages.map(m => 
                m.senderId === otherUserId ? { ...m, read: true } : m
            );
            return { ...prev, [chatId]: updatedMessages };
        });
    };
    
    const handleBackToMatches = () => {
        setActiveChatUser(null);
        setActiveView('matches');
    }
    
    const handleSaveProfile = (updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        // No need to manually save to LS here as the useEffect[users] handles it
        setActiveView('swipe');
    };
    
    const handleApplyFilters = (newFilters: Filters) => {
        setFilters(newFilters);
        setCurrentIndex(0); // Reset swipe deck
        setActiveView('swipe');
    };
    
    const handleBlockUser = (userIdToBlock: number) => {
        const userToBlock = users.find(u => u.id === userIdToBlock);
        if (!userToBlock) return;

        if (window.confirm(`Are you sure you want to block ${userToBlock.name}? You won't see their profile again.`)) {
            const newBlockedIds = new Set<number>(blockedUserIds);
            newBlockedIds.add(userIdToBlock);
            updateBlockedIds(newBlockedIds);
        }
    };
    
    const handleUnblockUser = (userIdToUnblock: number) => {
        const newBlockedIds = new Set<number>(blockedUserIds);
        newBlockedIds.delete(userIdToUnblock);
        updateBlockedIds(newBlockedIds);
    };
    
    const handleSwitchUser = (userId: number) => {
        setCurrentUserId(userId);
        setActiveView('swipe');
        setNewMatch(null);
        setActiveChatUser(null);
        setMessages({}); // Reset local chat view for demo
    };
    
    const handleForceMatch = (targetUserId: number) => {
        const targetUser = users.find(u => u.id === targetUserId);
        if (!targetUser || !currentUser) return;
        
        const matchId = [currentUserId!, targetUserId].sort().join('-');
        
        if (!matches.some(m => m.id === matchId)) {
            setMatches(prev => [...prev, {
                id: matchId,
                users: [currentUser, targetUser],
                timestamp: new Date(),
                isSuperLike: false
            }]);
            setNewMatch({ user: targetUser, isSuperLike: false });
        } else {
            alert(`You are already matched with ${targetUser.name}`);
        }
    };

    const handleBackToSwipe = () => {
        setActiveView('swipe');
    };

    const handleSplashFinished = () => {
        setShowSplash(false);
    };

    if (showSplash) {
        return <SplashScreen onFinished={handleSplashFinished} />;
    }

    if (!currentUserId || !currentUser || activeView === 'auth') {
        return <AuthScreen existingUsers={users} onLogin={handleLogin} onSignup={handleSignup} />;
    }

    const renderView = () => {
        const blockedUsers = users.filter(u => blockedUserIds.has(u.id));

        if (activeView === 'chat' && activeChatUser) {
            const chatId = [currentUser.id, activeChatUser.id].sort().join('-');
            return <ChatScreen
                user={activeChatUser}
                onBack={handleBackToMatches}
                currentUser={currentUser}
                messages={messages[chatId] || []}
                onSendMessage={(type, content) => handleSendMessage(chatId, type, content)}
            />;
        }
        
        if (activeView === 'matches') {
            return <MatchesScreen matches={matches} onSelectChat={handleSelectChat} currentUser={currentUser} />;
        }
        
        if (activeView === 'profile') {
            return <ProfileEditScreen 
                user={currentUser} 
                allUsers={users}
                onSwitchUser={handleSwitchUser}
                onForceMatch={handleForceMatch}
                onSave={handleSaveProfile} 
                onBack={handleBackToSwipe} 
                blockedUsers={blockedUsers} 
                onUnblock={handleUnblockUser}
                onLogout={handleLogout}
            />;
        }

        if (activeView === 'filters') {
            return <FilterScreen currentFilters={filters} onApply={handleApplyFilters} onBack={handleBackToSwipe} allInterests={allInterests} />;
        }
        
        if (activeView === 'requests') {
            const usersWhoLikeYou = users.filter(u => friendRequests.has(u.id));
            return <RequestsScreen usersWhoLikeYou={usersWhoLikeYou} onAccept={handleAcceptRequest} onReject={handleRejectRequest} onBack={handleBackToSwipe} />;
        }

        // Default to swipe view
        return (
             <div className="flex-grow flex flex-col bg-gray-200 rounded-b-3xl overflow-hidden">
                <div className="relative flex-grow p-4">
                    {filteredProfiles.length > 0 && currentIndex < filteredProfiles.length ? (
                        filteredProfiles.map((user, index) => {
                             if (index < currentIndex) return null;
                            const isTop = index === currentIndex;
                            return (
                                <SwipeableProfileCard
                                    key={user.id}
                                    user={user}
                                    isTop={isTop}
                                    onSwipe={handleCardSwiped}
                                    onBlock={handleBlockUser}
                                    onTap={setDetailedProfileUser}
                                    action={isTop ? action : null}
                                    style={{
                                        zIndex: filteredProfiles.length - index,
                                        transform: `scale(${1 - (index - currentIndex) * 0.05}) translateY(${(index - currentIndex) * -10}px)`,
                                        opacity: index - currentIndex < 3 ? 1 : 0,
                                        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                                    }}
                                />
                            );
                        }).reverse()
                    ) : (
                        <div className="flex items-center justify-center h-full text-center text-gray-500">
                            <div>
                                <p className="text-xl font-semibold">That's everyone for now!</p>
                                <p>Adjust your filters or check back later.</p>
                            </div>
                        </div>
                    )}
                </div>
                {currentIndex < filteredProfiles.length && (
                    <div className="flex justify-center items-center gap-4 p-4 bg-white/50 backdrop-blur-sm">
                         <button title="Undo" onClick={handleUndo} disabled={!lastAction} className="bg-white rounded-full p-3 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg" aria-label="Undo">
                            <UndoIcon className="w-6 h-6" />
                        </button>
                        <button title="Pass" onClick={() => { currentActionRef.current = 'pass'; setAction('pass'); }} className="bg-white rounded-full p-4 text-red-500 hover:scale-110 transition-transform shadow-lg" aria-label="Pass">
                            <XMarkIcon className="w-8 h-8" />
                        </button>
                        <button title="Super Like" onClick={() => { currentActionRef.current = 'superlike'; setAction('superlike'); }} className="bg-white rounded-full p-3 text-blue-500 hover:scale-110 transition-transform shadow-lg" aria-label="Super Like">
                            <StarIcon className="w-7 h-7" />
                        </button>
                        <button title="Like" onClick={() => { currentActionRef.current = 'like'; setAction('like'); }} className="bg-white rounded-full p-4 text-pink-500 hover:scale-110 transition-transform shadow-lg" aria-label="Like">
                            <HeartIcon className="w-8 h-8" />
                        </button>
                    </div>
                )}
             </div>
        );
    };

    return (
        <div className="h-screen w-screen max-w-md mx-auto flex flex-col font-sans bg-gray-100 antialiased relative">
            {newMatch && currentUser && (
                <MatchNotification
                    currentUser={currentUser}
                    matchedUser={newMatch.user}
                    isSuperLike={newMatch.isSuperLike}
                    onKeepSwiping={handleKeepSwiping}
                    onStartChat={handleStartChat}
                />
            )}
            {detailedProfileUser && (
                <ProfileDetailScreen user={detailedProfileUser} onClose={() => setDetailedProfileUser(null)} />
            )}
            
            <main className="flex-grow flex flex-col overflow-hidden">
                {renderView()}
            </main>
            
            <Header activeView={activeView} setActiveView={setActiveView} requestsCount={friendRequests.size} />
        </div>
    );
}
