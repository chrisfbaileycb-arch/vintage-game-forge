import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { db, auth } from "./firebase";
import { normalizeSpec, type CartridgeSpec, type MouldKind } from "./game/moulds";

export interface FirebaseGame {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  mould: MouldKind;
  category: "NES" | "SNES" | "GENESIS" | "ARCADE" | "GB";
  palette: string;
  spec: CartridgeSpec;
  plays: number;
  likes: number;
  tags: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseScore {
  id: string;
  gameId: string;
  gameTitle: string;
  userId: string;
  userName: string;
  score: number;
  level: number;
  createdAt: string;
}

const CREATOR_NAME_KEY = "replay_arcade_creator_name";
const PILOT_ID_KEY = "replay_arcade_pilot_id";
const SAVED_GAMES_KEY = "replay_saved_cartridge_ids";

export function getLocalCreatorName(): string {
  if (typeof window === "undefined") return "RetroDev";
  return localStorage.getItem(CREATOR_NAME_KEY) || "RetroDev";
}

export function setLocalCreatorName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CREATOR_NAME_KEY, name.trim() || "RetroDev");
}

export function getLocalPilotId(): string {
  if (typeof window === "undefined") return "pilot_guest";
  let id = localStorage.getItem(PILOT_ID_KEY);
  if (!id) {
    id = `pilot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(PILOT_ID_KEY, id);
  }
  return id;
}

export function getLocalSavedGameIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_GAMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLocalSavedGameId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalSavedGameIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(list));
    }
  } catch {
    // Ignore
  }
}

export function removeLocalSavedGameId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalSavedGameIds().filter((x) => x !== id);
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

/**
 * Sign in using Google OAuth popup.
 */
export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Sign out current user.
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribe to Firebase Auth state changes.
 */
export function onAuthUserChanged(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get active identity (either logged-in Google account or persistent local guest pilot).
 */
export function getActiveCreatorIdentity(): { uid: string; name: string; isGoogle: boolean; email?: string | null } {
  const user = auth.currentUser;
  if (user) {
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || getLocalCreatorName(),
      email: user.email,
      isGoogle: true,
    };
  }
  return {
    uid: getLocalPilotId(),
    name: getLocalCreatorName(),
    isGoogle: false,
  };
}

/**
 * Save or update a retro game cartridge in Firestore.
 */
export async function saveGameToFirestore(params: {
  id?: string;
  title: string;
  description: string;
  mould: MouldKind;
  category: "NES" | "SNES" | "GENESIS" | "ARCADE" | "GB";
  palette: string;
  spec: Partial<CartridgeSpec>;
  tags?: string[];
  published?: boolean;
}): Promise<FirebaseGame> {
  const identity = getActiveCreatorIdentity();
  const gameId = params.id || `game_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const creatorName = identity.name || getLocalCreatorName();

  const fullSpec = normalizeSpec({
    ...params.spec,
    mould: params.mould,
    title: params.title,
    description: params.description,
  });

  const now = new Date().toISOString();

  const gameDocRef = doc(db, "games", gameId);
  const existingDoc = await getDoc(gameDocRef);
  const existingData = existingDoc.exists() ? existingDoc.data() : null;

  const gameData: FirebaseGame = {
    id: gameId,
    title: params.title.trim() || "Untitled Cartridge",
    description: params.description.trim() || "Custom game crafted in REPLAY Studio",
    creatorId: existingData?.creatorId || identity.uid,
    creatorName: existingData?.creatorName || creatorName,
    mould: params.mould,
    category: params.category || "ARCADE",
    palette: params.palette || fullSpec.palette || "blueprint",
    spec: fullSpec,
    plays: existingData?.plays || 0,
    likes: existingData?.likes || 0,
    tags: params.tags && params.tags.length > 0 ? params.tags : [params.mould, params.category],
    published: params.published !== undefined ? params.published : true,
    createdAt: existingData?.createdAt || now,
    updatedAt: now,
  };

  await setDoc(gameDocRef, gameData, { merge: true });
  addLocalSavedGameId(gameId);
  return gameData;
}

/**
 * Fetch all published games from Firestore.
 */
export async function getPublishedGames(): Promise<FirebaseGame[]> {
  try {
    const q = query(
      collection(db, "games"),
      where("published", "==", true),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const games: FirebaseGame[] = [];
    snapshot.forEach((docSnap) => {
      games.push(docSnap.data() as FirebaseGame);
    });
    // Sort descending by updatedAt
    games.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return games;
  } catch (error) {
    console.error("[Firestore] Failed to get published games:", error);
    return [];
  }
}

/**
 * Fetch all games created by the current user or guest pilot from Firestore.
 */
export async function getUserGames(): Promise<FirebaseGame[]> {
  try {
    const currentUid = auth.currentUser?.uid;
    const localPilotId = getLocalPilotId();
    const localSavedIds = getLocalSavedGameIds();

    const gamesMap = new Map<string, FirebaseGame>();

    // 1. If user is logged in with Google, fetch their created games
    if (currentUid) {
      try {
        const qUser = query(
          collection(db, "games"),
          where("creatorId", "==", currentUid),
          limit(50)
        );
        const snapUser = await getDocs(qUser);
        snapUser.forEach((docSnap) => {
          gamesMap.set(docSnap.id, docSnap.data() as FirebaseGame);
        });
      } catch (err) {
        console.warn("[Firestore] Could not query user games by uid:", err);
      }
    }

    // 2. Fetch games created under the local guest pilot ID
    if (localPilotId && localPilotId !== currentUid) {
      try {
        const qGuest = query(
          collection(db, "games"),
          where("creatorId", "==", localPilotId),
          limit(50)
        );
        const snapGuest = await getDocs(qGuest);
        snapGuest.forEach((docSnap) => {
          gamesMap.set(docSnap.id, docSnap.data() as FirebaseGame);
        });
      } catch (err) {
        console.warn("[Firestore] Could not query user games by guestId:", err);
      }
    }

    // 3. Check any individually saved IDs in local storage
    for (const id of localSavedIds) {
      if (!gamesMap.has(id)) {
        try {
          const dSnap = await getDoc(doc(db, "games", id));
          if (dSnap.exists()) {
            gamesMap.set(dSnap.id, dSnap.data() as FirebaseGame);
          }
        } catch {
          // ignore single doc read failures
        }
      }
    }

    const games = Array.from(gamesMap.values());
    games.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return games;
  } catch (error) {
    console.error("[Firestore] Failed to get user games:", error);
    return [];
  }
}

/**
 * Delete a game from Firestore.
 */
export async function deleteGameFromFirestore(gameId: string): Promise<boolean> {
  try {
    const gameDocRef = doc(db, "games", gameId);
    await deleteDoc(gameDocRef);
    removeLocalSavedGameId(gameId);
    return true;
  } catch (error) {
    console.error("[Firestore] Failed to delete game:", error);
    throw error;
  }
}

/**
 * Record a game score to Firestore leaderboard.
 */
export async function recordScoreToFirestore(params: {
  gameId: string;
  gameTitle: string;
  score: number;
  level: number;
  userName?: string;
}): Promise<void> {
  try {
    const identity = getActiveCreatorIdentity();
    const scoreId = `score_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const scoreDocRef = doc(db, "scores", scoreId);
    const scoreData: FirebaseScore = {
      id: scoreId,
      gameId: params.gameId,
      gameTitle: params.gameTitle,
      userId: identity.uid,
      userName: params.userName || identity.name || "PILOT",
      score: params.score,
      level: params.level,
      createdAt: new Date().toISOString(),
    };
    await setDoc(scoreDocRef, scoreData);
  } catch (error) {
    console.warn("[Firestore] Failed to record score:", error);
  }
}

/**
 * Get top scores for a game from Firestore.
 */
export async function getGameScores(gameId: string): Promise<FirebaseScore[]> {
  try {
    const q = query(
      collection(db, "scores"),
      where("gameId", "==", gameId),
      limit(10)
    );
    const snapshot = await getDocs(q);
    const list: FirebaseScore[] = [];
    snapshot.forEach((d) => list.push(d.data() as FirebaseScore));
    return list.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("[Firestore] Failed to fetch game scores:", error);
    return [];
  }
}
