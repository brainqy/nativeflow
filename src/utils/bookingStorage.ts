import { PracticeSessionBooking } from '../types';

const STORAGE_KEY_BOOKINGS = 'nativeflow_upcoming_bookings';
const STORAGE_KEY_WALLET_COINS = 'nativeflow_wallet_coins';
const DEFAULT_WALLET_COINS = 450;

export function getWalletBalance(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WALLET_COINS);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY_WALLET_COINS, String(DEFAULT_WALLET_COINS));
      return DEFAULT_WALLET_COINS;
    }
    const val = parseInt(raw, 10);
    return isNaN(val) ? DEFAULT_WALLET_COINS : val;
  } catch {
    return DEFAULT_WALLET_COINS;
  }
}

export function updateWalletBalance(delta: number): number {
  const current = getWalletBalance();
  const next = Math.max(0, current + delta);
  try {
    localStorage.setItem(STORAGE_KEY_WALLET_COINS, String(next));
  } catch (e) {
    console.error('Failed to update wallet coins:', e);
  }
  return next;
}

export function getUpcomingBookings(): PracticeSessionBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (!raw) return [];
    const parsed: PracticeSessionBooking[] = JSON.parse(raw);
    return parsed.sort((a, b) => (a.scheduledTimestamp || 0) - (b.scheduledTimestamp || 0));
  } catch {
    return [];
  }
}

export function saveBooking(booking: PracticeSessionBooking): PracticeSessionBooking[] {
  const current = getUpcomingBookings();
  const updated = [booking, ...current.filter((b) => b.id !== booking.id)];
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save booking:', e);
  }
  return updated;
}

export function cancelBooking(bookingId: string): { updatedBookings: PracticeSessionBooking[]; refundedCoins: number } {
  const current = getUpcomingBookings();
  const target = current.find((b) => b.id === bookingId);
  const refundAmount = target ? target.totalCoins : 0;

  if (refundAmount > 0) {
    updateWalletBalance(refundAmount);
  }

  const updated = current.filter((b) => b.id !== bookingId);
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete booking:', e);
  }
  return { updatedBookings: updated, refundedCoins: refundAmount };
}
