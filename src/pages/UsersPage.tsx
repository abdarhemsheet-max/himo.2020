import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, Users } from 'lucide-react';
import {
  createDocumenterUser,
  subscribeUsers,
  translateAuthError,
} from '../lib/firebase/auth';
import { formatEnglishDate } from '../lib/utils/geo';
import type { UserProfile } from '../types/mosque';

interface UsersPageProps {
  currentUser: UserProfile;
}

export function UsersPage({ currentUser }: UsersPageProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const unsub = subscribeUsers(
      (list) => setUsers(list),
      (err) => setErrorMsg(err.message)
    );
    return () => unsub();
  }, []);

  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto p-6 text-center text-sm text-red-700">
        هذه الشاشة مخصصة لمدير المكتب فقط.
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const created = await createDocumenterUser({
        name,
        email,
        tempPassword,
        adminUid: currentUser.uid,
      });
      setSuccessMsg(`تمت إضافة الموثِّق «${created.name}» بنجاح.`);
      setName('');
      setEmail('');
      setTempPassword('');
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        setErrorMsg(translateAuthError(err));
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'تعذّر إنشاء الحساب.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 pb-20 space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-[#0F4C3A] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#C9A24B]" />
          <span>إدارة المستخدمين</span>
        </h1>
        <p className="text-sm text-[#5A6561] mt-1">
          إضافة موثِّق جديد بحساب بريد إلكتروني وكلمة مرور مؤقتة.
        </p>
      </div>

      {/* Add Documenter Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E5E2D9] rounded-2xl p-5 space-y-4"
      >
        <h2 className="text-base font-bold text-[#1A2421] flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#0F4C3A]" />
          <span>إضافة موثِّق جديد</span>
        </h2>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="new-user-name" className="block text-xs font-bold text-[#1A2421] mb-1">
              الاسم الكامل
            </label>
            <input
              id="new-user-name"
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الثلاثي"
              className="w-full h-11 px-3 rounded-xl border border-[#D8D4C8] bg-[#FAF8F4] text-sm focus:outline-none focus:border-[#0F4C3A] focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="new-user-email" className="block text-xs font-bold text-[#1A2421] mb-1">
              البريد الإلكتروني
            </label>
            <input
              id="new-user-email"
              type="email"
              required
              dir="ltr"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@awqaf.ly"
              className="w-full h-11 px-3 rounded-xl border border-[#D8D4C8] bg-[#FAF8F4] text-sm text-left focus:outline-none focus:border-[#0F4C3A] focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="new-user-pass" className="block text-xs font-bold text-[#1A2421] mb-1">
              كلمة مرور مؤقتة
            </label>
            <input
              id="new-user-pass"
              type="text"
              required
              minLength={6}
              dir="ltr"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              className="w-full h-11 px-3 rounded-xl border border-[#D8D4C8] bg-[#FAF8F4] text-sm text-left focus:outline-none focus:border-[#0F4C3A] focus:bg-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] px-5 rounded-xl bg-[#0F4C3A] text-white font-bold text-sm hover:bg-[#0B3A2C] disabled:opacity-60 transition"
        >
          {submitting ? 'جاري إضافة الموثِّق...' : 'إضافة الموثِّق'}
        </button>
      </form>

      {/* Staff List */}
      <div className="bg-white border border-[#E5E2D9] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EFECE4] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1A2421] tabular-nums">
            الموظفون المسجلون ({users.length})
          </h2>
        </div>

        <div className="divide-y divide-[#EFECE4]">
          {users.map((u) => (
            <div
              key={u.uid}
              className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
            >
              <div>
                <p className="text-sm font-bold text-[#1A2421]">{u.name}</p>
                <p dir="ltr" className="text-xs text-[#5A6561] text-right sm:text-left">
                  {u.email}
                </p>
              </div>
              <div className="text-xs text-[#5A6561] tabular-nums flex items-center gap-2">
                <span className="font-semibold text-[#0F4C3A]">
                  {u.role === 'admin' ? 'مدير' : 'موثِّق'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatEnglishDate(u.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
