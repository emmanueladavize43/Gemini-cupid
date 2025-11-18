
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Match, Message } from './types';
import { USERS as initialUsers, CURRENT_USER_ID, EMOJIS } from './constants';
import { generateIcebreakers, generateQuickReplies } from './services/geminiService';
import { HeartIcon, XMarkIcon, SparklesIcon, ChatBubbleIcon, FireIcon, UserIcon, AdjustmentsHorizontalIcon, EyeIcon, StarIcon, ShieldExclamationIcon, UndoIcon, UserPlusIcon, FaceSmileIcon, BoltIcon, VideoCameraIcon, MicrophoneIcon, PhoneIcon, VideoCameraSlashIcon, MicrophoneSlashIcon, PlayIcon, PauseIcon, MapPinIcon } from './components/Icons';

// --- Animation Constants ---
const SWIPE_THRESHOLD = 120; // Min drag distance to trigger a swipe
const VELOCITY_THRESHOLD = 0.3; // Min flick velocity to trigger a swipe
const ANIMATION_DURATION = 200; // ms for card animations

interface Filters {
  ageRange: { min: number; max: number };
  interests: string[];
  maxDistance: number;
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
                        const otherUser = match.users.find(u => u.id !== currentUser.id)!;
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

    return (
        <div className="flex flex-col h-full bg-white relative">
            {isVideoCallActive && <VideoCallScreen user={user} onEndCall={() => setIsVideoCallActive(false)} />}
            <header className="flex items-center p-4 border-b sticky top-0 bg-white z-10">
                <button title="Back" onClick={onBack} className="text-gray-600 mr-4 text-2xl" aria-label="Back to matches">&larr;</button>
                <img src={user.imageUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                <h2 className="font-bold text-lg text-gray-800 flex-1">{user.name}</h2>
                <button title="Video Call" onClick={() => setIsVideoCallActive(true)} className="text-gray-500 hover:text-pink-500 p-2">
                    <VideoCameraIcon className="w-6 h-6"/>
                </button>
            </header>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-100 space-y-4">
                {messages.map((msg) => {
                    const isCurrentUser = msg.senderId === currentUser.id;
                    if (msg.type === 'sticker') {
                        return (
                            <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-6xl">{msg.content}</span>
                            </div>
                        );
                    }
                    if (msg.type === 'voice') {
                         return (
                            <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                 {!isCurrentUser && <img src={user.imageUrl} className="w-6 h-6 rounded-full" />}
                                 <AudioPlayer base64Content={msg.content} isCurrentUser={isCurrentUser} />
                                {isCurrentUser && <img src={currentUser.imageUrl} className="w-6 h-6 rounded-full" />}
                            </div>
                        )
                    }
                    return (
                         <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            {!isCurrentUser && <img src={user.imageUrl} className="w-6 h-6 rounded-full" />}
                            <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${isCurrentUser ? 'bg-pink-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                <p>{msg.content}</p>
                            </div>
                             {isCurrentUser && <img src={currentUser.imageUrl} className="w-6 h-6 rounded-full" />}
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
    onSave: (updatedUser: User) => void;
    onBack: () => void;
    blockedUsers: User[];
    onUnblock: (userId: number) => void;
}> = ({ user, onSave, onBack, blockedUsers, onUnblock }) => {
    const [formData, setFormData] = useState<User>(user);
    const [newInterest, setNewInterest] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'age' ? parseInt(value) || 0 : value }));
    };
    
    const handleVisibilityChange = (visibility: 'public' | 'private') => {
        setFormData(prev => ({ ...prev, profileVisibility: visibility }));
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
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
    const [superLikedIds, setSuperLikedIds] = useState<Set<number>>(new Set());
    const [blockedUserIds, setBlockedUserIds] = useState<Set<number>>(new Set());
    const [matches, setMatches] = useState<Match[]>([]);
    const [newMatch, setNewMatch] = useState<{ user: User, isSuperLike: boolean } | null>(null);
    const [activeView, setActiveView] = useState('swipe');
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


    useEffect(() => {
        // Load user profile
        const savedUserJSON = localStorage.getItem(`gemini-cupid-user-${CURRENT_USER_ID}`);
        if (savedUserJSON) {
            try {
                const savedUser = JSON.parse(savedUserJSON);
                setUsers(prevUsers => prevUsers.map(u => u.id === CURRENT_USER_ID ? { ...u, ...savedUser } : u));
            } catch (error) {
                console.error("Failed to parse user data from localStorage", error);
            }
        }
        
        // Load blocked users
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
                console.error("Geolocation error:", error);
                const user = users.find(u => u.id === CURRENT_USER_ID);
                if (user) {
                    setCurrentUserCoords(user.coordinates);
                }
            }
        );
    }, []);

    const updateBlockedIds = (newBlockedIds: Set<number>) => {
        setBlockedUserIds(newBlockedIds);
        localStorage.setItem('gemini-cupid-blocked-ids', JSON.stringify(Array.from(newBlockedIds)));
    };

    const currentUser = useMemo(() => users.find(u => u.id === CURRENT_USER_ID)!, [users]);
    
    const profilesWithDistance = useMemo(() => {
        if (!currentUserCoords) return [];
        
        return users
            .filter(u => u.id !== CURRENT_USER_ID)
            .map(user => ({
                ...user,
                distance: getDistanceFromLatLonInMi(
                    currentUserCoords.lat,
                    currentUserCoords.lon,
                    user.coordinates.lat,
                    user.coordinates.lon
                ),
            }))
            .sort((a, b) => a.distance - b.distance);
    }, [users, currentUserCoords]);

    const filteredProfiles = useMemo(() => {
        return profilesWithDistance
            .filter(u => !blockedUserIds.has(u.id) && u.profileVisibility === 'public')
            .filter(user => {
                const isAgeMatch = user.age >= filters.ageRange.min && user.age <= filters.ageRange.max;
                const isInterestMatch = filters.interests.length === 0 || filters.interests.some(interest => user.interests.includes(interest));
                const isDistanceMatch = user.distance !== undefined && user.distance <= filters.maxDistance;
                return isAgeMatch && isInterestMatch && isDistanceMatch;
            });
    }, [profilesWithDistance, filters, blockedUserIds]);
    
    const allInterests = useMemo(() => {
        const interestsSet = new Set<string>();
        initialUsers.forEach(user => {
            if (user.id !== CURRENT_USER_ID) {
                user.interests.forEach(interest => interestsSet.add(interest));
            }
        });
        return Array.from(interestsSet).sort();
    }, []);

    const topProfileId = useMemo(() => {
        return currentIndex < filteredProfiles.length ? filteredProfiles[currentIndex].id : null;
    }, [currentIndex, filteredProfiles]);

    useEffect(() => {
        if (topProfileId !== null) {
            const timer = setTimeout(() => {
                setUsers(prevUsers =>
                    prevUsers.map(u =>
                        u.id === topProfileId
                            ? { ...u, viewCount: (u.viewCount || 0) + 1 }
                            : u
                    )
                );
            }, 500); // Increment after a short delay to feel more natural
            return () => clearTimeout(timer);
        }
    }, [topProfileId]);

    const handleCardSwiped = (direction: 'right' | 'left') => {
        if (currentIndex >= filteredProfiles.length) return;

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
        if (!lastAction) return;

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

        const newMessage: Message = {
            id: `${Date.now()}-${Math.random()}`,
            senderId: CURRENT_USER_ID,
            timestamp: new Date(),
            type,
            content,
        };

        setMessages(prev => {
            const existingMessages = prev[chatId] || [];
            return { ...prev, [chatId]: [...existingMessages, newMessage] };
        });
    };

    const handleStartChat = () => {
        if(newMatch){
             setActiveChatUser(newMatch.user);
             setActiveView('chat');
             setNewMatch(null);
        }
    }
    
    const handleSelectChat = (user: User) => {
        setActiveChatUser(user);
        setActiveView('chat');
    }
    
    const handleBackToMatches = () => {
        setActiveChatUser(null);
        setActiveView('matches');
    }
    
    const handleSaveProfile = (updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        localStorage.setItem(`gemini-cupid-user-${CURRENT_USER_ID}`, JSON.stringify(updatedUser));
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

    const handleBackToSwipe = () => {
        setActiveView('swipe');
    };

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
            return <ProfileEditScreen user={currentUser} onSave={handleSaveProfile} onBack={handleBackToSwipe} blockedUsers={blockedUsers} onUnblock={handleUnblockUser} />;
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
            {newMatch && (
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
