
import { User } from './types';

// We remove the hardcoded CURRENT_USER_ID as it will be determined by Auth
export const INITIAL_USERS: User[] = [
  {
    id: 1,
    name: 'Jordan',
    age: 28,
    bio: "Adventurous soul who loves hiking, trying new food trucks, and spending weekends with my dog, Rusty. Looking for someone to join my next adventure.",
    imageUrl: 'https://picsum.photos/seed/you/800/1200',
    interests: ['Hiking', 'Dogs', 'Foodie', 'Travel', 'Camping', 'Road Trips'],
    location: "San Francisco, CA",
    coordinates: { lat: 37.7749, lon: -122.4194 },
    viewCount: 0,
    profileVisibility: 'public',
    relationshipGoal: 'Long-term',
    lifestyle: { smoking: 'No', drinking: 'Socially', exercise: 'Active' },
    gender: 'male',
    interestedIn: 'female'
  },
  {
    id: 2,
    name: 'Alex',
    age: 29,
    bio: 'Software engineer by day, aspiring chef by night. I can whip up a mean carbonara. My hobbies include board games, sci-fi movies, and finding the best espresso in town.',
    imageUrl: 'https://picsum.photos/seed/alex/800/1200',
    interests: ['Cooking', 'Board Games', 'Sci-Fi', 'Coffee', 'Technology', 'Puzzles'],
    location: "San Francisco, CA",
    coordinates: { lat: 37.7577, lon: -122.4376 },
    viewCount: 152,
    profileVisibility: 'public',
    relationshipGoal: 'Life Partner',
    lifestyle: { smoking: 'No', drinking: 'Socially', exercise: 'Sometimes' },
    gender: 'male',
    interestedIn: 'female'
  },
  {
    id: 3,
    name: 'Brianna',
    age: 26,
    bio: "Graphic designer with a passion for painting and pottery. I'm usually covered in clay or paint. I love gallery hopping, live music, and rainy days with a good book.",
    imageUrl: 'https://picsum.photos/seed/brianna/800/1200',
    interests: ['Art', 'Music', 'Reading', 'Museums', 'Crafts', 'Indie Films'],
    location: "Los Angeles, CA",
    coordinates: { lat: 34.0522, lon: -118.2437 },
    viewCount: 203,
    profileVisibility: 'public',
    relationshipGoal: 'Figuring it out',
    lifestyle: { smoking: 'No', drinking: 'No', exercise: 'Active' },
    gender: 'female',
    interestedIn: 'male'
  },
  {
    id: 4,
    name: 'Carlos',
    age: 31,
    bio: "Fitness enthusiast and personal trainer. If I'm not at the gym, I'm probably running a marathon or meal prepping. Looking for a workout partner and a life partner.",
    imageUrl: 'https://picsum.photos/seed/carlos/800/1200',
    interests: ['Fitness', 'Running', 'Health', 'Outdoors', 'Weightlifting', 'Nutrition'],
    location: "San Diego, CA",
    coordinates: { lat: 32.7157, lon: -117.1611 },
    viewCount: 410,
    profileVisibility: 'public',
    relationshipGoal: 'Long-term',
    lifestyle: { smoking: 'No', drinking: 'Socially', exercise: 'Active' },
    gender: 'male',
    interestedIn: 'female'
  },
  {
    id: 5,
    name: 'Diana',
    age: 30,
    bio: 'Animal lover and veterinarian. My life is a happy chaos of fur and paws. I enjoy volunteering, yoga, and documentaries. My golden retriever is my world.',
    imageUrl: 'https://picsum.photos/seed/diana/800/1200',
    interests: ['Animals', 'Yoga', 'Volunteering', 'Documentaries', 'Nature', 'Meditation'],
    location: "Portland, OR",
    coordinates: { lat: 45.5051, lon: -122.6750 },
    viewCount: 351,
    profileVisibility: 'public',
    relationshipGoal: 'New friends',
    lifestyle: { smoking: 'No', drinking: 'Socially', exercise: 'Sometimes' },
    gender: 'female',
    interestedIn: 'male'
  },
  {
    id: 6,
    name: 'Ethan',
    age: 27,
    bio: "Musician and songwriter. I play guitar in a local band. I'm inspired by old-school rock and new-school indie. Let's go to a concert or just jam.",
    imageUrl: 'https://picsum.photos/seed/ethan/800/1200',
    interests: ['Music', 'Guitar', 'Concerts', 'Songwriting', 'Vinyl Records', 'Live Gigs'],
    location: "Oakland, CA",
    coordinates: { lat: 37.8044, lon: -122.2712 },
    viewCount: 188,
    profileVisibility: 'public',
    relationshipGoal: 'Short-term',
    lifestyle: { smoking: 'Yes', drinking: 'Yes', exercise: 'Rarely' },
    gender: 'male',
    interestedIn: 'female'
  },
  {
    id: 7,
    name: 'Fiona',
    age: 25,
    bio: 'World traveler and photographer. I have a goal to visit 30 countries before I turn 30. I love learning new languages and capturing moments. Where to next?',
    imageUrl: 'https://picsum.photos/seed/fiona/800/1200',
    interests: ['Travel', 'Photography', 'Languages', 'Adventure', 'Backpacking', 'Culture'],
    location: "New York, NY",
    coordinates: { lat: 40.7128, lon: -74.0060 },
    viewCount: 520,
    profileVisibility: 'public',
    relationshipGoal: 'Long-term',
    lifestyle: { smoking: 'No', drinking: 'Socially', exercise: 'Active' },
    gender: 'female',
    interestedIn: 'everyone'
  },
  {
    id: 8,
    name: 'George',
    age: 33,
    bio: "History teacher who geeks out about ancient civilizations. I enjoy trivia nights, historical films, and a good debate over a pint. Tell me your favorite historical fact.",
    imageUrl: 'https://picsum.photos/seed/george/800/1200',
    interests: ['History', 'Trivia', 'Movies', 'Debate', 'Podcasts', 'Politics'],
    location: "Chicago, IL",
    coordinates: { lat: 41.8781, lon: -87.6298 },
    viewCount: 98,
    profileVisibility: 'public',
    relationshipGoal: 'Life Partner',
    lifestyle: { smoking: 'No', drinking: 'Yes', exercise: 'Sometimes' },
    gender: 'male',
    interestedIn: 'female'
  },
];

export const EMOJIS: Record<string, string[]> = {
  'Smileys & Emotion': ['😀', '😂', '😍', '🤔', '😢', '😡', '👍', '👎', '🙌', '❤️‍🔥', '💖', '🔥', '🤯', '🎉'],
  'People & Body': ['👋', '🙋‍♀️', '👨‍💻', '👩‍🎨', '🧑‍🚀', '🏃‍♂️', '💃', '💪', '👀', '🧠'],
  'Animals & Nature': ['🐶', '🐱', '🦄', '🦊', '🌿', '🌸', '☀️', '🌙', '🌎', '🌊'],
  'Food & Drink': ['🍕', '🍔', '🍣', '🥑', '☕️', '🍻', '🎂', '🍦', '🍓'],
  'Objects': ['📱', '💻', '🎸', '⚽️', '✈️', '🚀', '💡', '💎', '🎁', '🔑'],
};

export const RELATIONSHIP_GOALS = [
    'Long-term',
    'Short-term',
    'New friends',
    'Figuring it out',
    'Life Partner'
];

export const LIFESTYLE_OPTIONS = {
    smoking: ['Yes', 'No', 'Socially'],
    drinking: ['Yes', 'No', 'Socially'],
    exercise: ['Active', 'Sometimes', 'Rarely', 'Never']
};
