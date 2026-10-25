import {
  collection, doc, getDoc, onSnapshot, query, where,
  setDoc, updateDoc, serverTimestamp, limit, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './config';

/** Mỗi UID được gửi 1 đánh giá; đánh giá mới chờ Owner duyệt trước khi công khai. */
export type ReviewStatus = 'pending' | 'approved' | 'hidden';
export interface SiteReview {
  uid: string;
  authorName: string;
  rating: number;
  message: string;
  status: ReviewStatus;
  createdAt: number | null;
  updatedAt: number | null;
}
const reviewCollection = () => collection(db, 'siteFeedback');
function millis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}
function parseReview(uid: string, d: Record<string, unknown>): SiteReview {
  return {
    uid,
    authorName: typeof d.authorName === 'string' ? d.authorName : 'Học viên VanTien',
    rating: typeof d.rating === 'number' ? d.rating : 0,
    message: typeof d.message === 'string' ? d.message : '',
    status: d.status === 'approved' || d.status === 'hidden' ? d.status : 'pending',
    createdAt: millis(d.createdAt),
    updatedAt: millis(d.updatedAt),
  };
}
export function subscribePublicReviews(onChange: (items: SiteReview[], limited: boolean) => void, onError: (err: Error) => void): Unsubscribe {
  // Query có bộ lọc status để Firestore Rules chỉ trả về đánh giá đã duyệt.
  return onSnapshot(query(reviewCollection(), where('status', '==', 'approved'), limit(101)), snap => {
    const items = snap.docs.slice(0, 100).map(d => parseReview(d.id, d.data()));
    items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    onChange(items, snap.size > 100);
  }, onError);
}
export function subscribeMyReview(uid: string, onChange: (item: SiteReview | null) => void, onError: (err: Error) => void): Unsubscribe {
  return onSnapshot(doc(db, 'siteFeedback', uid), snap => onChange(snap.exists() ? parseReview(snap.id, snap.data()) : null), onError);
}
export async function submitSiteReview(authorName: string, rating: number, message: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Hãy đăng nhập để gửi đánh giá.');
  const name = authorName.trim().slice(0, 80);
  const body = message.trim();
  if (!name || name.length < 2) throw new Error('Tên hiển thị cần tối thiểu 2 ký tự.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Chọn từ 1 đến 5 sao.');
  if (body.length < 10 || body.length > 800) throw new Error('Phản hồi cần từ 10 đến 800 ký tự.');
  const ref = doc(db, 'siteFeedback', user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { authorName: name, rating, message: body, status: 'pending', updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      uid: user.uid, authorName: name, rating, message: body, status: 'pending',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  }
}
export function subscribeAllReviews(onChange: (items: SiteReview[], limited: boolean) => void, onError: (err: Error) => void): Unsubscribe {
  return onSnapshot(query(reviewCollection(), limit(501)), snap => {
    const items = snap.docs.slice(0, 500).map(d => parseReview(d.id, d.data()));
    items.sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0));
    onChange(items, snap.size > 500);
  }, onError);
}
export async function moderateReview(uid: string, next: ReviewStatus): Promise<void> {
  if (next !== 'approved' && next !== 'hidden') throw new Error('Trạng thái không hợp lệ.');
  await updateDoc(doc(db, 'siteFeedback', uid), { status: next, updatedAt: serverTimestamp() });
}
