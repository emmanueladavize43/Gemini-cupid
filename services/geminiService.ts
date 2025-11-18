
import { GoogleGenAI, Type } from "@google/genai";
import { User, Message } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

interface IcebreakerResponse {
  icebreakers: string[];
}

export const generateIcebreakers = async (user1: User, user2: User): Promise<string[]> => {
  const prompt = `
    You are a witty and charming dating coach. Based on these two user profiles, generate 3 fun, open-ended icebreaker questions one person could ask the other. The questions should be creative and tailored to their shared or complementary interests.

    Profile 1:
    Name: ${user1.name}
    Bio: ${user1.bio}
    Interests: ${user1.interests.join(', ')}

    Profile 2:
    Name: ${user2.name}
    Bio: ${user2.bio}
    Interests: ${user2.interests.join(', ')}

    Return a JSON object with a key "icebreakers" containing an array of 3 string questions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            icebreakers: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "An icebreaker question."
              }
            }
          },
          required: ["icebreakers"]
        }
      }
    });

    const jsonText = response.text.trim();
    const parsedResponse: IcebreakerResponse = JSON.parse(jsonText);
    
    if (parsedResponse.icebreakers && parsedResponse.icebreakers.length > 0) {
      return parsedResponse.icebreakers;
    }
    
    return ["What's the most exciting thing you've done recently?", "What's something you're passionate about?", "If you could travel anywhere, where would you go?"];

  } catch (error) {
    console.error("Error generating icebreakers:", error);
    // Return generic icebreakers on error
    return ["What's the most exciting thing you've done recently?", "What's something you're passionate about?", "If you could travel anywhere, where would you go?"];
  }
};

interface QuickReplyResponse {
  replies: string[];
}

export const generateQuickReplies = async (
  messages: Message[],
  currentUser: User,
  otherUser: User
): Promise<string[]> => {
  const lastMessages = messages.slice(-5).map(msg => {
    const senderName = msg.senderId === currentUser.id ? currentUser.name : otherUser.name;
    return `${senderName}: ${msg.type === 'sticker' ? `(sent a sticker: ${msg.content})` : msg.content}`;
  }).join('\n');
  
  const lastSenderName = messages.length > 0 ? (messages[messages.length - 1].senderId === currentUser.id ? currentUser.name : otherUser.name) : 'none';

  const prompt = `
    You are a fun and helpful chat assistant. Given the last few messages in a conversation between ${currentUser.name} and ${otherUser.name}, generate 3 short, natural-sounding, and context-aware replies for ${currentUser.name}.

    The last message was sent by ${lastSenderName}.

    Conversation context:
    ${lastMessages}

    Keep the replies concise (ideally under 10 words) and engaging. Vary the tone of the suggestions (e.g., one enthusiastic, one inquisitive, one casual).

    Return a JSON object with a key "replies" containing an array of 3 string replies.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replies: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "A short, contextual reply."
              }
            }
          },
          required: ["replies"]
        }
      }
    });

    const jsonText = response.text.trim();
    const parsedResponse: QuickReplyResponse = JSON.parse(jsonText);

    if (parsedResponse.replies && parsedResponse.replies.length > 0) {
      return parsedResponse.replies;
    }
    return [];
  } catch (error) {
    console.error("Error generating quick replies:", error);
    return []; // Return empty array on error
  }
};
