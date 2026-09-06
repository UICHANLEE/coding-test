export type MemberId = 'member-1' | 'member-2';
export type PublicMember = { id: MemberId; name: string };
export type TeamProgress = PublicMember & {
  completed: number;
  todayCompleted: number;
};
export function isMemberId(value: unknown): value is MemberId {
  return value === 'member-1' || value === 'member-2';
}
