# 💘 Gemini Cupid

**Gemini Cupid** is a modern, AI-powered dating application experience. It combines a familiar swipe-based interface with the power of Google's Gemini AI to generate creative icebreakers, smart replies, and facilitate meaningful connections.

## ✨ Features

*   **AI-Powered Interactions:**
    *   **Icebreakers:** Generates personalized conversation starters based on shared interests using Gemini AI.
    *   **Smart Replies:** Context-aware quick replies suggested by AI based on chat history.
*   **Interactive Swipe Deck:** Smooth, gesture-based profile cards with Like, Pass, and Super Like functionalities.
*   **Rich Profiles:** detailed views including bio, interests, location, lifestyle habits (smoking, drinking, exercise), and relationship goals.
*   **Location-Based Matching:** Sorts profiles by distance and allows filtering by proximity.
*   **Dynamic Chat:**
    *   Real-time message filtering/search.
    *   **Voice Messages:** Record and send audio clips.
    *   **Video Call Simulation:** A realistic video call interface.
    *   **Read Receipts:** See when messages are read.
    *   **Emoji Keyboard:** Categorized emoji selection.
*   **Privacy Controls:** Users can toggle their profile visibility (Public/Private) and block users.

## 🛠 Tech Stack

*   **Frontend:** React (TypeScript)
*   **Styling:** Tailwind CSS
*   **AI:** Google Gemini API (`@google/genai`)
*   **Build Tool:** Vite

---

## 🚀 How to Deploy on Vercel

Vercel is the easiest way to deploy this React application. Follow these steps to get your site live.

### Prerequisites
1.  A GitHub account.
2.  A [Vercel account](https://vercel.com/).
3.  A Google Gemini API Key (get one at [aistudio.google.com](https://aistudio.google.com/)).

### Step 1: Organize Your Code
Ensure your project is set up as a standard Vite React project. If you haven't already:
1.  Initialize a project: `npm create vite@latest gemini-cupid -- --template react-ts`
2.  Copy the files provided (`App.tsx`, `types.ts`, etc.) into the `src/` folder.
3.  Ensure you have a `package.json` with dependencies installed (`npm install`).

### Step 2: Push to GitHub
1.  Create a new repository on GitHub.
2.  Push your code to the repository:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin <your-repo-url>
    git push -u origin main
    ```

### Step 3: Import to Vercel
1.  Log in to your **Vercel Dashboard**.
2.  Click **"Add New..."** -> **"Project"**.
3.  Select **"Import"** next to your `gemini-cupid` GitHub repository.

### Step 4: Configure Project
1.  **Framework Preset:** Vercel should automatically detect **Vite**. If not, select it from the dropdown.
2.  **Root Directory:** Leave as `./` (unless your app is in a subfolder).

### Step 5: Environment Variables (Crucial!)
This app requires the Gemini API key to function.
1.  Expand the **"Environment Variables"** section.
2.  Add the variable:
    *   **Key:** `API_KEY`
    *   **Value:** `Your_Actual_Google_Gemini_API_Key`
3.  Click **Add**.

> **⚠️ Security Note:** Vercel stores this securely on the server side for build processes, but since this is a client-side React app, the key will be exposed in the browser. For a production app, you should proxy these requests through a backend (like Vercel Functions) to hide the key.

### Step 6: Deploy
1.  Click **"Deploy"**.
2.  Wait for Vercel to build your project (usually takes about 1 minute).
3.  Once complete, you will get a live URL (e.g., `https://gemini-cupid.vercel.app`).

---

## 💻 Local Development

To run the app locally on your machine:

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd gemini-cupid
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory:
    ```
    VITE_API_KEY=your_google_gemini_api_key
    ```
    *(Note: In Vite, you may need to update the code to use `import.meta.env.VITE_API_KEY` instead of `process.env.API_KEY` depending on your config).*

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  Open your browser to the local URL provided (usually `http://localhost:5173`).
